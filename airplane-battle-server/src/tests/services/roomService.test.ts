import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { Room, User } from '../../models/index.js'
import { MongoRoomService } from '../../services/mongoRoomService.js'
import { RoomType, RoomStatus } from '../../types/index.js'

describe('MongoRoomService', () => {
  let mongoServer: MongoMemoryServer

  beforeEach(async () => {
    // 启动内存MongoDB实例
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)

    // 清空集合
    await Room.deleteMany({})
    await User.deleteMany({})
  })

  afterEach(async () => {
    // 断开连接并停止内存MongoDB
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  describe('房间创建限制测试', () => {
    it('应该允许用户创建第一个房间', async () => {
      // 创建测试用户
      const testUser = new User({
        userId: 'user001',
        username: 'testuser',
        email: 'test@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
      })
      await testUser.save()

      // 创建房间
      const roomData = {
        roomName: '测试房间1',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const result = await MongoRoomService.createRoom('user001', roomData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.room_name).toBe('测试房间1')
      expect(result.data.current_players).toBe(1) // 房主自动加入
    })

    it('应该阻止用户创建多个未开始的房间', async () => {
      // 创建测试用户
      const testUser = new User({
        userId: 'user002',
        username: 'testuser2',
        email: 'test2@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
      })
      await testUser.save()

      // 创建第一个房间
      const roomData1 = {
        roomName: '测试房间1',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const result1 = await MongoRoomService.createRoom('user002', roomData1)
      expect(result1.success).toBe(true)

      // 尝试创建第二个房间（应该失败）
      const roomData2 = {
        roomName: '测试房间2',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const result2 = await MongoRoomService.createRoom('user002', roomData2)
      expect(result2.success).toBe(false)
      expect(result2.error?.code).toBe('ROOM_LIMIT_EXCEEDED')
    })

    it('应该允许用户在完成游戏后创建新房间', async () => {
      // 创建测试用户
      const testUser = new User({
        userId: 'user003',
        username: 'testuser3',
        email: 'test3@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
      })
      await testUser.save()

      // 创建第一个房间
      const roomData1 = {
        roomName: '测试房间1',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const result1 = await MongoRoomService.createRoom('user003', roomData1)
      expect(result1.success).toBe(true)

      // 手动将房间状态设置为已完成
      const room = await Room.findOne({ roomId: result1.data.room_id })
      if (room) {
        room.status = 'finished'
        await room.save()
      }

      // 现在应该能够创建新房间
      const roomData2 = {
        roomName: '测试房间2',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const result2 = await MongoRoomService.createRoom('user003', roomData2)
      expect(result2.success).toBe(true)
    })
  })

  describe('房主权限管理测试', () => {
    let hostUser: any
    let memberUser: any
    let roomId: string

    beforeEach(async () => {
      // 创建房主用户
      hostUser = new User({
        userId: 'host001',
        username: 'hostuser',
        email: 'host@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
      })
      await hostUser.save()

      // 创建普通成员用户
      memberUser = new User({
        userId: 'member001',
        username: 'memberuser',
        email: 'member@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
      })
      await memberUser.save()

      // 创建房间
      const roomData = {
        roomName: '权限测试房间',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const createResult = await MongoRoomService.createRoom('host001', roomData)
      expect(createResult.success).toBe(true)
      roomId = createResult.data.room_id

      // 成员加入房间
      const joinResult = await MongoRoomService.joinRoom('member001', { roomId })
      expect(joinResult.success).toBe(true)
    })

    it('应该允许房主解散房间', async () => {
      const result = await MongoRoomService.deleteRoom(roomId, 'host001')
      
      expect(result.success).toBe(true)
      
      // 验证房间已被删除
      const room = await Room.findOne({ roomId })
      expect(room).toBeNull()
    })

    it('应该阻止非房主解散房间', async () => {
      const result = await MongoRoomService.deleteRoom(roomId, 'member001')
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_HOST')
      
      // 验证房间仍然存在
      const room = await Room.findOne({ roomId })
      expect(room).toBeTruthy()
    })

    it('应该允许房主踢出玩家', async () => {
      const result = await MongoRoomService.kickPlayer(roomId, 'host001', 'member001')
      
      expect(result.success).toBe(true)
      
      // 验证成员已被移除
      const room = await Room.findOne({ roomId })
      expect(room).toBeTruthy()
      expect(room!.members.length).toBe(1) // 只剩房主
      expect(room!.members[0].userId).toBe('host001')
      
      // 验证成员的currentRoomId已被清除
      const updatedMember = await User.findOne({ userId: 'member001' })
      expect(updatedMember!.currentRoomId).toBeNull()
    })

    it('应该阻止非房主踢出玩家', async () => {
      const result = await MongoRoomService.kickPlayer(roomId, 'member001', 'host001')
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_HOST')
      
      // 验证房间成员未变化
      const room = await Room.findOne({ roomId })
      expect(room!.members.length).toBe(2)
    })

    it('应该阻止房主踢出自己', async () => {
      const result = await MongoRoomService.kickPlayer(roomId, 'host001', 'host001')
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('CANNOT_KICK_SELF')
    })
  })

  describe('重连机制测试', () => {
    let testUser: any
    let roomId: string

    beforeEach(async () => {
      // 创建测试用户
      testUser = new User({
        userId: 'reconnect001',
        username: 'reconnectuser',
        email: 'reconnect@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
      })
      await testUser.save()

      // 创建房间并加入
      const roomData = {
        roomName: '重连测试房间',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const createResult = await MongoRoomService.createRoom('reconnect001', roomData)
      expect(createResult.success).toBe(true)
      roomId = createResult.data.room_id
    })

    it('应该能检测到用户有活跃房间', async () => {
      const result = await MongoRoomService.checkReconnect('reconnect001')
      
      expect(result.success).toBe(true)
      expect(result.data?.hasActiveRoom).toBe(true)
      expect(result.data?.roomDetails).toBeDefined()
      expect(result.data?.roomDetails.room_id).toBe(roomId)
    })

    it('应该能检测到用户无活跃房间', async () => {
      // 先删除房间
      await MongoRoomService.deleteRoom(roomId, 'reconnect001')
      
      const result = await MongoRoomService.checkReconnect('reconnect001')
      
      expect(result.success).toBe(true)
      expect(result.data?.hasActiveRoom).toBe(false)
    })

    it('应该在房间不存在时清除用户状态', async () => {
      // 直接删除房间记录（模拟异常情况）
      await Room.deleteOne({ roomId })
      
      const result = await MongoRoomService.checkReconnect('reconnect001')
      
      expect(result.success).toBe(true)
      expect(result.data?.hasActiveRoom).toBe(false)
      
      // 验证用户的currentRoomId已被清除
      const updatedUser = await User.findOne({ userId: 'reconnect001' })
      expect(updatedUser!.currentRoomId).toBeNull()
    })
  })

  describe('房间列表增强测试', () => {
    beforeEach(async () => {
      // 创建测试用户
      const users = [
        {
          userId: 'list001',
          username: 'listuser1',
          email: 'list1@example.com',
          displayName: '列表用户1',
          level: 5,
          rating: 1200
        },
        {
          userId: 'list002',
          username: 'listuser2',
          email: 'list2@example.com',
          displayName: '列表用户2',
          level: 3,
          rating: 1100
        }
      ]

      for (const userData of users) {
        const user = new User({
          ...userData,
          experience: 0,
          wins: 0,
          losses: 0,
          isActive: true
        })
        await user.save()
      }

      // 创建房间
      const roomData = {
        roomName: '列表测试房间',
        roomType: 'public' as const,
        maxPlayers: 2
      }

      const createResult = await MongoRoomService.createRoom('list001', roomData)
      expect(createResult.success).toBe(true)

      // 第二个用户加入
      await MongoRoomService.joinRoom('list002', { 
        roomId: createResult.data.room_id 
      })
    })

    it('应该返回包含详细成员信息的房间列表', async () => {
      const result = await MongoRoomService.getRoomList(1, 10)
      
      expect(result.success).toBe(true)
      expect(result.data?.items).toBeDefined()
      expect(result.data!.items.length).toBe(1)
      
      const room = result.data!.items[0]
      expect(room.hostUsername).toBe('listuser1')
      expect(room.memberDetails).toBeDefined()
      expect(room.memberDetails!.length).toBe(2)
      
      // 验证成员详细信息
      const hostMember = room.memberDetails!.find(m => m.isHost)
      expect(hostMember).toBeDefined()
      expect(hostMember!.username).toBe('listuser1')
      expect(hostMember!.level).toBe(5)
      expect(hostMember!.rating).toBe(1200)
    })
  })
})