import { Schema, model, Document, Model } from 'mongoose'

/**
 * 用户接口（MongoDB版本）
 */
export interface IUser extends Document {
  userId: string
  username: string
  email: string
  passwordHash?: string
  displayName?: string
  avatarUrl?: string
  level: number
  experience: number
  wins: number
  losses: number
  rating: number
  isActive: boolean
  createdAt: Date
  lastLogin?: Date

  // 实例方法
  updateStats(isWin: boolean, experienceGain?: number): void
}

// 定义 User 模型的静态方法接口
interface IUserModel extends Model<IUser> {
  findByUsername(username: string): Promise<IUser | null>
  findByEmail(email: string): Promise<IUser | null>
  getLeaderboard(limit: number): Promise<IUser[]>
}

/**
 * 用户Schema
 */
const userSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    index: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      },
      message: '邮箱格式不正确'
    }
  },
  passwordHash: {
    type: String,
    minlength: 60 // bcrypt hash length
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  avatarUrl: {
    type: String,
    maxlength: 500,
    validate: {
      validator: function(url: string) {
        if (!url) return true
        return /^https?:\/\/.+/.test(url)
      },
      message: '头像URL格式不正确'
    }
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  wins: {
    type: Number,
    default: 0,
    min: 0
  },
  losses: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 1000,
    min: 0,
    max: 3000
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
  lastLogin: {
    type: Date,
    index: true
  }
}, {
  timestamps: false, // 我们手动管理时间戳
  versionKey: false,
  toJSON: {
    transform: function(_doc, ret) {
      delete ret._id
      ret.passwordHash = undefined
      return ret
    }
  }
})

// 复合索引
userSchema.index({ rating: -1, createdAt: -1 }) // 排行榜查询
userSchema.index({ isActive: 1, lastLogin: -1 }) // 活跃用户查询

// 虚拟字段
userSchema.virtual('winRate').get(function() {
  const totalGames = this.wins + this.losses
  return totalGames > 0 ? (this.wins / totalGames) * 100 : 0
})

// 实例方法
userSchema.methods.updateStats = function(isWin: boolean, experienceGain: number = 10) {
  if (isWin) {
    this.wins += 1
    this.rating += Math.max(5, Math.floor(experienceGain / 2))
  } else {
    this.losses += 1
    this.rating = Math.max(800, this.rating - Math.max(3, Math.floor(experienceGain / 3)))
  }
  
  this.experience += experienceGain
  
  // 升级逻辑
  const nextLevelExp = this.level * 100
  if (this.experience >= nextLevelExp) {
    this.level += 1
    this.experience -= nextLevelExp
  }
}

// 静态方法
userSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username, isActive: true })
}

userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email, isActive: true })
}

userSchema.statics.getLeaderboard = function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ rating: -1, wins: -1 })
    .limit(limit)
    .select('userId username displayName level rating wins losses')
}

// 中间件
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date()
  }
  next()
})

// 创建模型
export const User = model<IUser, IUserModel>('User', userSchema)