/**
 * HTTP API客户端
 */
export class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /**
   * 设置认证token
   */
  public setToken(token: string | null): void {
    this.token = token
  }

  /**
   * 发送HTTP请求
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    }

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, config)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || `HTTP错误: ${response.status}`)
      }

      return result
    } catch (error) {
      console.error(`API请求失败 ${method} ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * GET请求
   */
  public async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, headers)
  }

  /**
   * POST请求
   */
  public async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', endpoint, data, headers)
  }

  /**
   * PUT请求
   */
  public async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', endpoint, data, headers)
  }

  /**
   * DELETE请求
   */
  public async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, headers)
  }

  // 认证相关API
  public async register(userData: {
    username: string
    email: string
    password: string
    displayName?: string
  }) {
    return this.post('/auth/register', userData)
  }

  public async login(credentials: {
    username: string
    password: string
  }) {
    return this.post('/auth/login', credentials)
  }

  public async logout(refreshToken?: string) {
    return this.post('/auth/logout', { refreshToken })
  }

  public async refreshToken(refreshToken: string) {
    return this.post('/auth/refresh', { refreshToken })
  }

  public async getUserProfile() {
    return this.get('/auth/profile')
  }

  // 房间相关API
  public async getRoomList(page = 1, limit = 10) {
    return this.get(`/rooms?page=${page}&limit=${limit}`)
  }

  public async createRoom(roomData: {
    roomName: string
    roomType: 'public' | 'private'
    password?: string
  }) {
    return this.post('/rooms', roomData)
  }

  public async getRoomDetails(roomId: string) {
    return this.get(`/rooms/${roomId}`)
  }

  public async joinRoom(roomData: {
    roomId: string
    password?: string
  }) {
    return this.post('/rooms/join', roomData)
  }

  public async leaveRoom(roomId: string) {
    return this.delete(`/rooms/${roomId}/leave`)
  }
}

// 导出API客户端实例
export const apiClient = new ApiClient(import.meta.env.VITE_API_URL || 'http://localhost:3001/api')