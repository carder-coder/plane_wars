import { Schema, model, Document } from 'mongoose'

/**
 * 用户会话接口（MongoDB版本）
 */
export interface IUserSession extends Document {
  sessionId: string
  userId: string
  refreshToken: string
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  createdAt: Date
  expiresAt: Date
}

/**
 * 用户会话Schema
 */
const userSessionSchema = new Schema<IUserSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ipAddress: {
    type: String,
    validate: {
      validator: function(ip: string) {
        if (!ip) return true
        // 简单的IP地址验证
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip) ||
               /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip) // IPv6 简单验证
      },
      message: 'IP地址格式不正确'
    }
  },
  userAgent: {
    type: String,
    maxlength: 1000
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: false,
  versionKey: false,
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id
      delete ret.refreshToken // 敏感信息不返回
      return ret
    }
  }
})

// TTL索引 - 自动删除过期文档
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// 复合索引
userSessionSchema.index({ userId: 1, isActive: 1 })
userSessionSchema.index({ userId: 1, createdAt: -1 })

// 虚拟字段
userSessionSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt
})

userSessionSchema.virtual('remainingTime').get(function() {
  const now = new Date()
  if (now > this.expiresAt) {
    return 0
  }
  return Math.floor((this.expiresAt.getTime() - now.getTime()) / 1000)
})

// 实例方法
userSessionSchema.methods.extend = function(additionalSeconds: number = 7 * 24 * 60 * 60): void {
  const now = new Date()
  this.expiresAt = new Date(now.getTime() + additionalSeconds * 1000)
}

userSessionSchema.methods.deactivate = function(): void {
  this.isActive = false
}

userSessionSchema.methods.isValid = function(): boolean {
  return this.isActive && !this.isExpired
}

// 静态方法
userSessionSchema.statics.findByRefreshToken = function(refreshToken: string) {
  return this.findOne({ 
    refreshToken, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
}

userSessionSchema.statics.findUserSessions = function(userId: string, activeOnly: boolean = true) {
  const query: any = { userId }
  if (activeOnly) {
    query.isActive = true
    query.expiresAt = { $gt: new Date() }
  }
  return this.find(query).sort({ createdAt: -1 })
}

userSessionSchema.statics.deactivateUserSessions = function(userId: string) {
  return this.updateMany(
    { userId, isActive: true },
    { $set: { isActive: false } }
  )
}

userSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  })
}

userSessionSchema.statics.createSession = function(
  sessionId: string,
  userId: string, 
  refreshToken: string, 
  expiresIn: number = 7 * 24 * 60 * 60, // 默认7天
  ipAddress?: string, 
  userAgent?: string
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  
  return this.create({
    sessionId,
    userId,
    refreshToken,
    ipAddress,
    userAgent,
    expiresAt,
    isActive: true,
    createdAt: new Date()
  })
}

userSessionSchema.statics.refreshSession = function(
  oldRefreshToken: string,
  newRefreshToken: string,
  expiresIn: number = 7 * 24 * 60 * 60
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  
  return this.findOneAndUpdate(
    { 
      refreshToken: oldRefreshToken, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    },
    {
      $set: {
        refreshToken: newRefreshToken,
        expiresAt,
        createdAt: new Date()
      }
    },
    { new: true }
  )
}

// 中间件
userSessionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date()
    
    // 如果没有设置过期时间，默认7天
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  }
  next()
})

// 清理过期会话的定时任务
userSessionSchema.statics.startCleanupTask = function() {
  // 每小时清理一次过期会话
  setInterval(async () => {
    try {
      const result = await this.cleanupExpiredSessions()
      if (result.deletedCount > 0) {
        console.log(`清理了 ${result.deletedCount} 个过期会话`)
      }
    } catch (error) {
      console.error('清理过期会话失败:', error)
    }
  }, 60 * 60 * 1000) // 1小时
}

// 创建模型
export const UserSession = model<IUserSession>('UserSession', userSessionSchema)