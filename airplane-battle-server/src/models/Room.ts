import { Schema, model, Document, Model } from 'mongoose'

/**
 * 房间成员接口
 */
export interface IRoomMember {
  userId: string
  playerNumber: number
  isReady: boolean
  joinedAt: Date
}

/**
 * 房间接口（MongoDB版本）
 */
export interface IRoom extends Document {
  roomId: string
  roomName: string
  roomType: 'public' | 'private'
  password?: string
  maxPlayers: number
  currentPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  hostUserId: string
  members: IRoomMember[]
  createdAt: Date
  updatedAt: Date

  // 虚拟属性
  needPassword?: boolean
  isFull?: boolean
  isEmpty?: boolean

  // 实例方法
  addMember(userId: string): boolean
  removeMember(userId: string): boolean
  setMemberReady(userId: string, isReady: boolean): boolean
  areAllMembersReady(): boolean
  startGame(): boolean
}

// 添加静态方法接口
export interface IRoomModel extends Model<IRoom> {
  findWaitingRooms(page: number, limit: number): Promise<IRoom[]>
  findUserRooms(userId: string): Promise<IRoom[]>
  findByRoomId(roomId: string): Promise<IRoom | null>
}

/**
 * 房间成员Schema
 */
const roomMemberSchema = new Schema<IRoomMember>({
  userId: {
    type: String,
    required: true
    // 移除 index: true，使用roomSchema中的复合索引
  },
  playerNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 2
  },
  isReady: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false })

/**
 * 房间Schema
 */
const roomSchema = new Schema<IRoom>({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  roomType: {
    type: String,
    required: true,
    enum: ['public', 'private'],
    default: 'public',
    index: true
  },
  password: {
    type: String,
    maxlength: 50,
    validate: {
      validator: function(this: IRoom, password: string): boolean {
        // 如果是私人房间，必须有密码
        if (this.roomType === 'private') {
          return !!(password && password.length > 0)
        }
        return true
      },
      message: '私人房间必须设置密码'
    }
  },
  maxPlayers: {
    type: Number,
    required: true,
    default: 2,
    min: 2,
    max: 4
  },
  currentPlayers: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(this: IRoom, current: number): boolean {
        return current <= this.maxPlayers
      },
      message: '当前玩家数不能超过最大玩家数'
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
    index: true
  },
  hostUserId: {
    type: String,
    required: true,
    index: true
  },
  members: [roomMemberSchema],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // 我们手动管理时间戳
  versionKey: false,
  toJSON: {
    transform: function(_doc, ret) {
      delete ret._id
      return ret
    }
  }
})

// 复合索引
roomSchema.index({ status: 1, createdAt: -1 }) // 房间列表查询
roomSchema.index({ roomType: 1, status: 1 }) // 公共房间查询
roomSchema.index({ 'members.userId': 1 }) // 用户房间查询

// 虚拟字段
roomSchema.virtual('needPassword').get(function(this: IRoom) {
  return this.roomType === 'private' && !!this.password
})

roomSchema.virtual('isFull').get(function(this: IRoom) {
  return this.currentPlayers >= this.maxPlayers
})

roomSchema.virtual('isEmpty').get(function(this: IRoom) {
  return this.currentPlayers === 0
})

// 实例方法
roomSchema.methods.addMember = function(this: IRoom, userId: string): boolean {
  // 检查房间是否已满
  if (this.currentPlayers >= this.maxPlayers) {
    return false
  }
  
  // 检查用户是否已在房间中
  const existingMember = this.members.find((member: IRoomMember) => member.userId === userId)
  if (existingMember) {
    return false
  }
  
  // 确定玩家编号
  const playerNumber = this.currentPlayers + 1
  
  // 添加成员
  this.members.push({
    userId,
    playerNumber,
    isReady: false,
    joinedAt: new Date()
  })
  
  this.currentPlayers += 1
  this.updatedAt = new Date()
  
  return true
}

roomSchema.methods.removeMember = function(this: IRoom, userId: string): boolean {
  const memberIndex = this.members.findIndex((member: IRoomMember) => member.userId === userId)
  if (memberIndex === -1) {
    return false
  }
  
  this.members.splice(memberIndex, 1)
  this.currentPlayers -= 1
  this.updatedAt = new Date()
  
  // 如果房主离开且还有其他成员，转移房主权限
  if (this.hostUserId === userId && this.members.length > 0) {
    // 按加入时间排序，选择最早加入的成员作为新房主
    const newHost = this.members.sort((a: IRoomMember, b: IRoomMember) => 
      a.joinedAt.getTime() - b.joinedAt.getTime()
    )[0]
    this.hostUserId = newHost.userId
  }
  
  // 如果房间变空，标记为已结束
  if (this.currentPlayers === 0) {
    this.status = 'finished'
  }
  
  return true
}

roomSchema.methods.setMemberReady = function(this: IRoom, userId: string, isReady: boolean): boolean {
  const member = this.members.find((member: IRoomMember) => member.userId === userId)
  if (!member) {
    return false
  }
  
  member.isReady = isReady
  this.updatedAt = new Date()
  
  return true
}

roomSchema.methods.areAllMembersReady = function(this: IRoom): boolean {
  return this.members.length === this.maxPlayers && 
         this.members.every((member: IRoomMember) => member.isReady)
}

roomSchema.methods.startGame = function(this: IRoom): boolean {
  if (!this.areAllMembersReady()) {
    return false
  }
  
  this.status = 'playing'
  this.updatedAt = new Date()
  
  return true
}

// 静态方法
roomSchema.statics.findWaitingRooms = function(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit
  return this.find({ status: 'waiting' })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
}

roomSchema.statics.findUserRooms = function(userId: string) {
  return this.find({
    $or: [
      { hostUserId: userId },
      { 'members.userId': userId }
    ],
    status: { $ne: 'finished' }
  })
}

roomSchema.statics.findByRoomId = function(roomId: string) {
  return this.findOne({ roomId })
}

// 中间件
roomSchema.pre('save', function(this: IRoom, next) {
  if (this.isNew) {
    this.createdAt = new Date()
  }
  this.updatedAt = new Date()
  next()
})

// 验证：确保成员数组与当前玩家数一致
roomSchema.pre('save', function(this: IRoom, next) {
  if (this.members.length !== this.currentPlayers) {
    this.currentPlayers = this.members.length
  }
  next()
})

// 创建模型
export const Room = model<IRoom, IRoomModel>('Room', roomSchema)