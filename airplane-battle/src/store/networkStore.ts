import { create } from 'zustand'
import { 
  AuthState, 
  NetworkState, 
  RoomState, 
  UserProfile, 
  ConnectionStatus,
  RoomListItem,
  RoomFilters,
  CreateRoomRequest,
  MessageType,
  ApiResponse,
  ViewState,
  AuthenticationStatus,
  SocketAuthStatus,
  SocketError,
  ERROR_MESSAGES,
  ErrorNotification
} from '../types/network'
import { apiClient } from '../utils/apiClient'
import { socketClient } from '../utils/socketClient'

// API响应类型定义
interface LoginResponse {
  token: string
  refreshToken: string
  user: UserProfile
}

interface RoomListResponse {
  items: RoomListItem[]
  total: number
  page: number
  limit: number
}

/**
 * 网络状态管理Store
 */
interface NetworkStore extends AuthState, NetworkState, RoomState {
  // 界面状态
  currentView: ViewState
  
  // 错误通知状态
  notifications: ErrorNotification[]
  
  // 认证方法
  login: (username: string, password: string) => Promise<boolean>
  register: (userData: {
    username: string
    email: string
    password: string
    displayName?: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  
  // 网络连接方法
  connect: () => Promise<boolean>
  disconnect: () => void
  
  // 房间方法
  loadRoomList: () => Promise<void>
  createRoom: (roomData: CreateRoomRequest) => Promise<boolean>
  joinRoom: (roomId: string, password?: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  updateRoomFilters: (filters: Partial<RoomFilters>) => void
  togglePlayerReady: () => void
  
  // 房主权限方法
  dissolveRoom: () => Promise<boolean>
  kickPlayer: (targetUserId: string) => Promise<boolean>
  
  // 界面导航
  setCurrentView: (view: ViewState) => void
  
  // 聊天功能
  sendChatMessage: (message: string) => void
  
  // 初始化方法
  initialize: () => Promise<void>
  
  // 错误处理方法
  handleAuthError: (error: SocketError) => void
  clearAuthState: () => void
  validateToken: (token: string) => boolean
  
  // 通知管理方法
  showNotification: (notification: Omit<ErrorNotification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  getErrorMessage: (errorCode: string) => string
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  // 初始状态
  isAuthenticated: false,
  authenticationStatus: AuthenticationStatus.CHECKING,
  user: null,
  token: null,
  refreshToken: null,
  socketAuthStatus: SocketAuthStatus.DISCONNECTED,
  
  status: ConnectionStatus.DISCONNECTED,
  isOnline: false,
  
  currentRoom: null,
  roomList: [],
  isJoining: false,
  isInLobby: false,
  lobbyPlayers: [],
  roomFilters: {
    status: 'all',
    type: 'all',
    searchText: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  
  currentView: 'login',
  notifications: [],

  /**
   * 用户登录
   */
  login: async (username: string, password: string) => {
    try {
      set({ authenticationStatus: AuthenticationStatus.CHECKING })
      
      const response = await apiClient.login({ username, password }) as ApiResponse<LoginResponse>
      
      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data
        
        // 保存认证信息
        set({
          isAuthenticated: true,
          authenticationStatus: AuthenticationStatus.AUTHENTICATED,
          user,
          token,
          refreshToken,
          currentView: 'mainMenu'
        })
        
        // 设置API客户端token
        apiClient.setToken(token)
        
        // 检查重连状态
        try {
          console.info('检查用户重连状态...')
          const reconnectResponse = await apiClient.checkReconnect() as ApiResponse<{ hasActiveRoom: boolean; roomDetails?: any }>
          
          if (reconnectResponse.success && reconnectResponse.data?.hasActiveRoom) {
            const roomDetails = reconnectResponse.data.roomDetails
            console.info('发现活跃房间，准备重连:', roomDetails.room_id)
            
            // 设置房间状态
            set({
              currentRoom: {
                roomId: roomDetails.room_id,
                roomName: roomDetails.room_name,
                roomType: roomDetails.room_type,
                currentPlayers: roomDetails.current_players,
                maxPlayers: roomDetails.max_players,
                status: roomDetails.status,
                hostUserId: roomDetails.host_user_id,
                players: roomDetails.players || [],
                createdAt: roomDetails.created_at,
                needPassword: roomDetails.room_type === 'private'
              },
              isInLobby: true,
              lobbyPlayers: roomDetails.players || [],
              currentView: roomDetails.status === 'playing' ? 'game' : 'gameLobby'
            })
            
            console.info('房间状态已恢复，将自动连接Socket')
          } else {
            console.info('无活跃房间，进入主菜单')
          }
        } catch (error) {
          console.warn('检查重连状态失败:', error)
          // 继续执行，不影响正常登录流程
        }
        
        // 尝试连接WebSocket
        await get().connect()
        
        return true
      } else {
        set({ authenticationStatus: AuthenticationStatus.UNAUTHENTICATED })
        return false
      }
    } catch (error) {
      console.error('登录失败:', error)
      set({ 
        authenticationStatus: AuthenticationStatus.AUTH_FAILED,
        error: '登录失败'
      })
      return false
    }
  },

  /**
   * 用户注册
   */
  register: async (userData) => {
    try {
      const response = await apiClient.register(userData) as ApiResponse
      return response.success
    } catch (error) {
      console.error('注册失败:', error)
      return false
    }
  },

  /**
   * 用户登出
   */
  logout: async () => {
    try {
      const { refreshToken } = get()
      
      if (refreshToken) {
        try {
          await apiClient.logout(refreshToken)
        } catch (error) {
          console.warn('服务端登出失败:', error)
          // 即使服务端登出失败，也要继续清理本地状态
        }
      }
      
      // 使用统一的清理方法
      get().clearAuthState()
      
    } catch (error) {
      console.error('登出失败:', error)
      // 即使出错也要清理状态
      get().clearAuthState()
    }
  },

  /**
   * 连接WebSocket
   */
  connect: async () => {
    try {
      const { token } = get()
      
      if (!token) {
        console.error('无认证token，无法连接')
        set({ 
          authenticationStatus: AuthenticationStatus.UNAUTHENTICATED,
          socketAuthStatus: SocketAuthStatus.DISCONNECTED 
        })
        return false
      }
      
      set({ 
        status: ConnectionStatus.CONNECTING,
        socketAuthStatus: SocketAuthStatus.CONNECTING
      })
      
      // 设置认证错误处理器
      socketClient.setAuthErrorHandler((error) => {
        get().handleAuthError(error)
      })
      
      const serverUrl = import.meta.env.VITE_WS_URL || 'http://120.26.106.214:3001'
      const connected = await socketClient.connect(serverUrl, token)
      
      if (connected) {
        set({ 
          status: ConnectionStatus.CONNECTED,
          authenticationStatus: AuthenticationStatus.AUTHENTICATED,
          socketAuthStatus: SocketAuthStatus.AUTHENTICATED,
          isOnline: true,
          lastConnected: new Date(),
          error: undefined
        })
        
        // 设置消息监听器
        socketClient.onMessage(MessageType.ROOM_JOINED, (data: any) => {
          // 确保 room 数据的完整性
          const roomData = {
            ...data.room,
            players: data.room.players || []
          }
          
          set({ 
            currentRoom: roomData, 
            isJoining: false,
            isInLobby: true,
            lobbyPlayers: roomData.players,
            currentView: 'gameLobby'
          })
        })
        
        socketClient.onMessage(MessageType.ROOM_UPDATED, (data: any) => {
          // 确保 room 数据的完整性
          const roomData = {
            ...data.room,
            players: data.room.players || []
          }
          
          set({ 
            currentRoom: roomData, 
            lobbyPlayers: roomData.players 
          })
        })
        
        socketClient.onMessage(MessageType.PLAYER_JOINED, (data: any) => {
          const { currentRoom } = get()
          if (currentRoom && currentRoom.players) {
            const updatedPlayers = [...currentRoom.players, data.player]
            set({
              currentRoom: {
                ...currentRoom,
                players: updatedPlayers,
                currentPlayers: updatedPlayers.length
              },
              lobbyPlayers: updatedPlayers
            })
          }
        })
        
        socketClient.onMessage(MessageType.PLAYER_LEFT, (data: any) => {
          const { currentRoom } = get()
          if (currentRoom && currentRoom.players) {
            const updatedPlayers = currentRoom.players.filter(p => p.userId !== data.userId)
            set({
              currentRoom: {
                ...currentRoom,
                players: updatedPlayers,
                currentPlayers: updatedPlayers.length
              },
              lobbyPlayers: updatedPlayers
            })
          }
        })
        
        socketClient.onMessage(MessageType.PLAYER_READY, (data: any) => {
          const { currentRoom } = get()
          if (currentRoom && currentRoom.players) {
            const updatedPlayers = currentRoom.players.map(p => 
              p.userId === data.userId ? { ...p, isReady: data.isReady } : p
            )
            set({
              currentRoom: {
                ...currentRoom,
                players: updatedPlayers
              },
              lobbyPlayers: updatedPlayers
            })
          }
        })
        
        socketClient.onMessage(MessageType.ROOM_LEFT, () => {
          set({ 
            currentRoom: null, 
            isInLobby: false,
            lobbyPlayers: [],
            currentView: 'mainMenu'
          })
        })
        
        // 房间解散事件
        socketClient.onMessage(MessageType.ROOM_DISSOLVED, (data: any) => {
          console.info('房间已被解散:', data)
          
          set({ 
            currentRoom: null, 
            isInLobby: false,
            lobbyPlayers: [],
            currentView: 'mainMenu'
          })
          
          get().showNotification({
            type: 'warning',
            title: '房间已解散',
            message: data.reason || '房主解散了房间',
            duration: 5000
          })
        })
        
        // 玩家被踢出事件
        socketClient.onMessage(MessageType.PLAYER_KICKED, (data: any) => {
          const { user } = get()
          if (user && data.userId === user.userId) {
            console.info('当前用户被踢出房间:', data)
            
            set({ 
              currentRoom: null, 
              isInLobby: false,
              lobbyPlayers: [],
              currentView: 'mainMenu'
            })
            
            get().showNotification({
              type: 'warning',
              title: '被踢出房间',
              message: data.reason || '您已被房主踢出房间',
              duration: 5000
            })
          } else {
            // 其他玩家被踢出，更新房间状态
            const { currentRoom } = get()
            if (currentRoom && currentRoom.players) {
              const updatedPlayers = currentRoom.players.filter(p => p.userId !== data.userId)
              set({
                currentRoom: {
                  ...currentRoom,
                  players: updatedPlayers,
                  currentPlayers: updatedPlayers.length
                },
                lobbyPlayers: updatedPlayers
              })
            }
          }
        })
        
        // 房主转移事件
        socketClient.onMessage(MessageType.HOST_TRANSFERRED, (data: any) => {
          console.info('房主已转移:', data)
          
          const { currentRoom } = get()
          if (currentRoom) {
            const updatedPlayers = currentRoom.players?.map(p => ({
              ...p,
              isHost: p.userId === data.newHostId
            })) || []
            
            set({
              currentRoom: {
                ...currentRoom,
                hostUserId: data.newHostId,
                players: updatedPlayers
              },
              lobbyPlayers: updatedPlayers
            })
            
            get().showNotification({
              type: 'info',
              title: '房主已转移',
              message: `房主权限已转移给 ${data.newHostUsername}`,
              duration: 5000
            })
          }
        })
        
        socketClient.onMessage(MessageType.GAME_START, () => {
          set({ currentView: 'game' })
        })
        
        socketClient.onMessage(MessageType.ERROR, (data: any) => {
          console.error('Socket错误:', data)
          set({ error: data.message })
        })
        
        return true
      }
      
      set({ status: ConnectionStatus.ERROR })
      return false
    } catch (error) {
      console.error('连接失败:', error)
      set({ status: ConnectionStatus.ERROR })
      return false
    }
  },

  /**
   * 断开连接
   */
  disconnect: () => {
    socketClient.disconnect()
    set({ 
      status: ConnectionStatus.DISCONNECTED,
      socketAuthStatus: SocketAuthStatus.DISCONNECTED,
      isOnline: false
    })
  },

  /**
   * 加载房间列表
   */
  loadRoomList: async () => {
    try {
      const response = await apiClient.getRoomList() as ApiResponse<RoomListResponse>
      
      if (response.success && response.data) {
        let rooms = response.data.items
        const { roomFilters } = get()
        
        // 应用筛选器
        if (roomFilters.status && roomFilters.status !== 'all') {
          rooms = rooms.filter(room => room.status === roomFilters.status)
        }
        
        if (roomFilters.type && roomFilters.type !== 'all') {
          rooms = rooms.filter(room => room.roomType === roomFilters.type)
        }
        
        if (roomFilters.searchText) {
          const searchLower = roomFilters.searchText.toLowerCase()
          rooms = rooms.filter(room => 
            room.roomName.toLowerCase().includes(searchLower) ||
            room.hostUsername.toLowerCase().includes(searchLower)
          )
        }
        
        // 应用排序
        if (roomFilters.sortBy) {
          rooms.sort((a, b) => {
            let compareResult = 0
            
            if (roomFilters.sortBy === 'createdAt') {
              compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            } else if (roomFilters.sortBy === 'playerCount') {
              compareResult = a.currentPlayers - b.currentPlayers
            }
            
            return roomFilters.sortOrder === 'desc' ? -compareResult : compareResult
          })
        }
        
        set({ roomList: rooms })
      }
    } catch (error) {
      console.error('加载房间列表失败:', error)
    }
  },

  /**
   * 创建房间
   */
  createRoom: async (roomData: CreateRoomRequest) => {
    try {
      const response = await apiClient.createRoom(roomData) as ApiResponse<{ roomId: string }>
      
      if (response.success && response.data) {
        // 刷新房间列表
        await get().loadRoomList()
        
        // 自动加入刚创建的房间
        await get().joinRoom(response.data.roomId, roomData.password)
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('创建房间失败:', error)
      return false
    }
  },

  /**
   * 加入房间
   */
  joinRoom: async (roomId: string, password?: string) => {
    try {
      set({ isJoining: true })
      
      // 通过WebSocket加入房间
      socketClient.joinRoom(roomId, password)
      
      return true
    } catch (error) {
      console.error('加入房间失败:', error)
      set({ isJoining: false })
      return false
    }
  },

  /**
   * 离开房间
   */
  leaveRoom: async () => {
    try {
      socketClient.leaveRoom()
      set({ 
        currentRoom: null,
        isInLobby: false,
        lobbyPlayers: [],
        currentView: 'mainMenu'
      })
    } catch (error) {
      console.error('离开房间失败:', error)
    }
  },

  /**
   * 初始化（从localStorage恢复状态）
   */
  initialize: async () => {
    try {
      // 设置初始检查状态
      set({ 
        authenticationStatus: AuthenticationStatus.CHECKING,
        socketAuthStatus: SocketAuthStatus.DISCONNECTED
      })
      
      const token = localStorage.getItem('auth_token')
      const refreshToken = localStorage.getItem('refresh_token')
      const userProfile = localStorage.getItem('user_profile')
      
      // 检查必要的数据是否存在
      if (!token || !refreshToken || !userProfile) {
        console.info('未找到完整的认证信息，跳转到登录页面')
        set({ 
          authenticationStatus: AuthenticationStatus.UNAUTHENTICATED,
          currentView: 'login'
        })
        return
      }
      
      // 验证token格式
      if (!get().validateToken(token)) {
        console.warn('Token格式无效，清理存储数据')
        get().clearAuthState()
        return
      }
      
      // 解析用户信息
      let user: UserProfile
      try {
        user = JSON.parse(userProfile)
        if (!user.userId || !user.username) {
          throw new Error('用户信息格式无效')
        }
      } catch (parseError) {
        console.error('用户信息解析失败:', parseError)
        get().clearAuthState()
        return
      }
      
      // 设置认证状态
      set({
        isAuthenticated: true,
        authenticationStatus: AuthenticationStatus.AUTHENTICATED,
        user,
        token,
        refreshToken,
        currentView: 'mainMenu'
      })
      
      // 设置API客户端token
      apiClient.setToken(token)
      
      // 尝试连接WebSocket
      console.info('尝试重新连接WebSocket...')
      const connected = await get().connect()
      
      if (!connected) {
        console.warn('WebSocket连接失败，但保持登录状态')
        // 不清理认证状态，用户可以手动重试或重新登录
      }
      
    } catch (error) {
      console.error('初始化失败:', error)
      // 清除可能损坏的数据
      get().clearAuthState()
    }
  },

  /**
   * 更新房间筛选器
   */
  updateRoomFilters: (filters: Partial<RoomFilters>) => {
    const { roomFilters } = get()
    set({ 
      roomFilters: { ...roomFilters, ...filters }
    })
    // 重新加载房间列表
    get().loadRoomList()
  },

  /**
   * 切换玩家准备状态
   */
  togglePlayerReady: () => {
    const { user, currentRoom } = get()
    if (!user || !currentRoom) {
      console.warn('用户或房间信息缺失，无法切换准备状态')
      return
    }
    
    // 检查 players 数组是否存在
    if (!currentRoom.players || !Array.isArray(currentRoom.players)) {
      console.warn('房间玩家列表不存在，无法切换准备状态', { currentRoom })
      return
    }
    
    const currentPlayer = currentRoom.players.find(p => p.userId === user.userId)
    if (!currentPlayer) {
      console.warn('在房间中未找到当前用户', { 
        userId: user.userId, 
        players: currentRoom.players.map(p => p.userId) 
      })
      return
    }
    
    const newReadyState = !currentPlayer.isReady
    console.log(`切换准备状态: ${currentPlayer.isReady} -> ${newReadyState}`)
    socketClient.sendMessage(MessageType.PLAYER_READY, { isReady: newReadyState })
  },

  /**
   * 设置当前界面
   */
  setCurrentView: (view: ViewState) => {
    set({ currentView: view })
  },

  /**
   * 发送聊天消息
   */
  sendChatMessage: (message: string) => {
    const { user } = get()
    if (!user || !message.trim()) return
    
    socketClient.sendMessage(MessageType.CHAT_MESSAGE, {
      message: message.trim(),
      timestamp: new Date()
    })
  },

  /**
   * 解散房间（房主权限）
   */
  dissolveRoom: async () => {
    try {
      const { user, currentRoom } = get()
      if (!user || !currentRoom) {
        console.warn('用户或房间信息缺失，无法解散房间')
        return false
      }

      // 检查是否为房主
      if (currentRoom.hostUserId !== user.userId) {
        get().showNotification({
          type: 'error',
          title: '权限不足',
          message: '只有房主可以解散房间',
          duration: 3000
        })
        return false
      }

      const response = await apiClient.dissolveRoom(currentRoom.roomId) as ApiResponse
      
      if (response.success) {
        // 清除房间状态
        set({
          currentRoom: null,
          isInLobby: false,
          lobbyPlayers: [],
          currentView: 'mainMenu'
        })
        
        get().showNotification({
          type: 'info',
          title: '房间已解散',
          message: '房间已成功解散',
          duration: 3000
        })
        
        // 刷新房间列表
        await get().loadRoomList()
        return true
      } else {
        get().showNotification({
          type: 'error',
          title: '解散失败',
          message: response.message || '解散房间失败',
          duration: 5000
        })
        return false
      }
    } catch (error) {
      console.error('解散房间失败:', error)
      get().showNotification({
        type: 'error',
        title: '解散失败',
        message: '解散房间时发生错误',
        duration: 5000
      })
      return false
    }
  },

  /**
   * 踢出玩家（房主权限）
   */
  kickPlayer: async (targetUserId: string) => {
    try {
      const { user, currentRoom } = get()
      if (!user || !currentRoom) {
        console.warn('用户或房间信息缺失，无法踢出玩家')
        return false
      }

      // 检查是否为房主
      if (currentRoom.hostUserId !== user.userId) {
        get().showNotification({
          type: 'error',
          title: '权限不足',
          message: '只有房主可以踢出玩家',
          duration: 3000
        })
        return false
      }

      const response = await apiClient.kickPlayer(currentRoom.roomId, targetUserId) as ApiResponse
      
      if (response.success) {
        get().showNotification({
          type: 'info',
          title: '踢出成功',
          message: '玩家已被踢出房间',
          duration: 3000
        })
        return true
      } else {
        get().showNotification({
          type: 'error',
          title: '踢出失败',
          message: response.message || '踢出玩家失败',
          duration: 5000
        })
        return false
      }
    } catch (error) {
      console.error('踢出玩家失败:', error)
      get().showNotification({
        type: 'error',
        title: '踢出失败',
        message: '踢出玩家时发生错误',
        duration: 5000
      })
      return false
    }
  },

  /**
   * 处理认证错误
   */
  handleAuthError: (error: SocketError) => {
    console.error('认证错误:', error)
    
    // 显示用户友好的错误通知
    const errorMessage = get().getErrorMessage(error.code)
    
    switch (error.code) {
      case 'AUTH_FAILED':
      case 'TOKEN_EXPIRED':
      case 'MISSING_TOKEN':
        // 显示认证失败通知
        get().showNotification({
          type: 'error',
          title: '认证失败',
          message: errorMessage,
          duration: 5000
        })
        
        // 清除认证状态并跳转到登录页面
        get().clearAuthState()
        break
        
      case 'CONNECTION_ERROR':
        // 连接错误，显示重试通知
        get().showNotification({
          type: 'warning',
          title: '连接错误',
          message: errorMessage,
          duration: 8000,
          showRetry: true,
          onRetry: () => {
            get().connect()
          }
        })
        
        // 连接错误，更新状态但不清除认证
        set({ 
          status: ConnectionStatus.ERROR,
          socketAuthStatus: SocketAuthStatus.AUTH_FAILED,
          error: error.message 
        })
        break
        
      default:
        console.warn('未知认证错误类型:', error.code)
        get().showNotification({
          type: 'error',
          title: '未知错误',
          message: errorMessage,
          duration: 5000
        })
    }
  },

  /**
   * 清除认证状态
   */
  clearAuthState: () => {
    // 断开WebSocket连接
    socketClient.disconnect()
    
    // 清除状态
    set({
      isAuthenticated: false,
      authenticationStatus: AuthenticationStatus.UNAUTHENTICATED,
      user: null,
      token: null,
      refreshToken: null,
      socketAuthStatus: SocketAuthStatus.DISCONNECTED,
      currentRoom: null,
      roomList: [],
      isInLobby: false,
      lobbyPlayers: [],
      status: ConnectionStatus.DISCONNECTED,
      isOnline: false,
      currentView: 'login',
      error: undefined
    })
    
    // 清除localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_profile')
    
    // 清除API客户端token
    apiClient.setToken(null)
  },

  /**
   * 验证token格式
   */
  validateToken: (token: string) => {
    if (!token || typeof token !== 'string') {
      return false
    }
    
    // 基本的token格式检查
    // 这里可以根据实际的token格式来调整
    if (token.length < 10) {
      return false
    }
    
    // 检查是否为JWT格式
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/
    if (jwtPattern.test(token)) {
      try {
        // 简单解析JWT的payload部分
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          // 检查是否已过期
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.warn('Token已过期')
            return false
          }
          return true
        }
      } catch (error) {
        console.warn('JWT解析失败:', error)
        return false
      }
    }
    
    // 如果不是JWT格式，但是有内容，也认为有效
    return true
  },

  /**
   * 显示通知
   */
  showNotification: (notification: Omit<ErrorNotification, 'id'>) => {
    const id = Date.now().toString()
    const newNotification: ErrorNotification = {
      ...notification,
      id
    } as ErrorNotification
    
    const { notifications } = get()
    set({ notifications: [...notifications, newNotification] })
    
    // 自动清除通知
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration || 5000)
    }
  },

  /**
   * 移除通知
   */
  removeNotification: (id: string) => {
    const { notifications } = get()
    set({ notifications: notifications.filter(n => n.id !== id) })
  },

  /**
   * 清除所有通知
   */
  clearNotifications: () => {
    set({ notifications: [] })
  },

  /**
   * 获取错误消息
   */
  getErrorMessage: (errorCode: string) => {
    return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.UNKNOWN_ERROR
  }
}))