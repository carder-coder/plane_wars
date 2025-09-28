import { create } from 'zustand'
import { 
  AuthState, 
  NetworkState, 
  RoomState, 
  UserProfile, 
  ConnectionStatus,
  RoomListItem,
  MessageType,
  ApiResponse
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
  createRoom: (roomData: {
    roomName: string
    roomType: 'public' | 'private'
    password?: string
  }) => Promise<boolean>
  joinRoom: (roomId: string, password?: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  
  // 初始化方法
  initialize: () => Promise<void>
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  // 初始状态
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  
  status: ConnectionStatus.DISCONNECTED,
  isOnline: false,
  
  currentRoom: null,
  roomList: [],
  isJoining: false,

  /**
   * 用户登录
   */
  login: async (username: string, password: string) => {
    try {
      const response = await apiClient.login({ username, password }) as ApiResponse<LoginResponse>
      
      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data
        
        // 保存认证信息
        set({
          isAuthenticated: true,
          user,
          token,
          refreshToken
        })
        
        // 设置API客户端token
        apiClient.setToken(token)
        
        // 保存到localStorage
        localStorage.setItem('auth_token', token)
        localStorage.setItem('refresh_token', refreshToken)
        localStorage.setItem('user_profile', JSON.stringify(user))
        
        // 连接WebSocket
        await get().connect()
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('登录失败:', error)
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
        await apiClient.logout(refreshToken)
      }
      
      // 断开WebSocket连接
      get().disconnect()
      
      // 清除状态
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        currentRoom: null,
        status: ConnectionStatus.DISCONNECTED,
        isOnline: false
      })
      
      // 清除localStorage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_profile')
      
      // 清除API客户端token
      apiClient.setToken(null)
    } catch (error) {
      console.error('登出失败:', error)
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
        return false
      }
      
      set({ status: ConnectionStatus.CONNECTING })
      
      const serverUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001'
      const connected = await socketClient.connect(serverUrl, token)
      
      if (connected) {
        set({ 
          status: ConnectionStatus.CONNECTED,
          isOnline: true,
          lastConnected: new Date()
        })
        
        // 设置消息监听器
        socketClient.onMessage(MessageType.ROOM_JOINED, (data: any) => {
          set({ currentRoom: data.room, isJoining: false })
        })
        
        socketClient.onMessage(MessageType.PLAYER_JOINED, (data: any) => {
          const { currentRoom } = get()
          if (currentRoom) {
            // 更新房间玩家列表
            set({
              currentRoom: {
                ...currentRoom,
                players: [...currentRoom.players, data.player]
              }
            })
          }
        })
        
        socketClient.onMessage(MessageType.PLAYER_LEFT, (data: any) => {
          const { currentRoom } = get()
          if (currentRoom) {
            // 从房间玩家列表中移除
            set({
              currentRoom: {
                ...currentRoom,
                players: currentRoom.players.filter(p => p.userId !== data.userId)
              }
            })
          }
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
        set({ roomList: response.data.items })
      }
    } catch (error) {
      console.error('加载房间列表失败:', error)
    }
  },

  /**
   * 创建房间
   */
  createRoom: async (roomData) => {
    try {
      const response = await apiClient.createRoom(roomData) as ApiResponse
      
      if (response.success) {
        // 刷新房间列表
        await get().loadRoomList()
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
      set({ currentRoom: null })
    } catch (error) {
      console.error('离开房间失败:', error)
    }
  },

  /**
   * 初始化（从localStorage恢复状态）
   */
  initialize: async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const refreshToken = localStorage.getItem('refresh_token')
      const userProfile = localStorage.getItem('user_profile')
      
      if (token && refreshToken && userProfile) {
        const user = JSON.parse(userProfile)
        
        set({
          isAuthenticated: true,
          user,
          token,
          refreshToken
        })
        
        apiClient.setToken(token)
        
        // 尝试连接WebSocket
        await get().connect()
      }
    } catch (error) {
      console.error('初始化失败:', error)
      // 清除可能损坏的数据
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_profile')
    }
  }
}))