/**
 * 用户相关类型定义
 */
export interface User {
  user_id: string
  username: string
  email: string
  password_hash: string
  display_name?: string
  avatar_url?: string
  level: number
  experience: number
  wins: number
  losses: number
  rating: number
  created_at: Date
  last_login?: Date
  is_active: boolean
}

/**
 * 用户注册请求接口
 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  displayName?: string
}

/**
 * 用户登录请求接口
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 用户登录响应接口
 */
export interface LoginResponse {
  success: boolean
  message: string
  data?: {
    token: string
    refreshToken: string
    user: UserProfile
  }
}

/**
 * 用户资料接口
 */
export interface UserProfile {
  userId: string
  username: string
  displayName?: string
  level: number
  experience: number
  wins: number
  losses: number
  rating: number
  avatarUrl?: string
}

/**
 * JWT Token Payload
 */
export interface JWTPayload {
  userId: string
  username: string
  iat: number
  exp: number
}

/**
 * 认证用户接口（请求上下文中的用户信息）
 */
export interface AuthenticatedUser {
  userId: string
  username: string
  displayName?: string
}