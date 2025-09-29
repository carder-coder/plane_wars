import { MongoRoomService } from '../services/mongoRoomService.js';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { RoomType } from '../types/game.js';
async function verifyRoomOptimization() {
    logger.info('开始验证房间逻辑优化功能...');
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/airplane_battle_test';
        await mongoose.connect(mongoUri);
        logger.info('数据库连接成功');
        await Room.deleteMany({ roomId: { $regex: '^test_' } });
        await User.deleteMany({ userId: { $regex: '^test_' } });
        await verifyDataModelOptimization();
        await verifyRoomCreationLimit();
        await verifyHostPermissions();
        await verifyEnhancedRoomList();
        await verifyReconnectMechanism();
        logger.info('✅ 所有验证测试通过！');
    }
    catch (error) {
        logger.error('❌ 验证失败:', error);
        throw error;
    }
    finally {
        await Room.deleteMany({ roomId: { $regex: '^test_' } });
        await User.deleteMany({ userId: { $regex: '^test_' } });
        await mongoose.disconnect();
    }
}
async function verifyDataModelOptimization() {
    logger.info('验证数据模型优化...');
    const testUser = new User({
        userId: 'test_user_001',
        username: 'testuser001',
        email: 'test001@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true,
        currentRoomId: null
    });
    await testUser.save();
    logger.info('✓ User模型currentRoomId字段正常');
    testUser.updateCurrentRoom('test_room_123');
    await testUser.save();
    const updatedUser = await User.findOne({ userId: 'test_user_001' });
    if (updatedUser?.currentRoomId !== 'test_room_123') {
        throw new Error('User.updateCurrentRoom方法失效');
    }
    logger.info('✓ User.updateCurrentRoom方法正常');
    testUser.clearCurrentRoom();
    await testUser.save();
    const clearedUser = await User.findOne({ userId: 'test_user_001' });
    if (clearedUser?.currentRoomId !== null) {
        throw new Error('User.clearCurrentRoom方法失效');
    }
    logger.info('✓ User.clearCurrentRoom方法正常');
    const testRoom = new Room({
        roomId: 'test_room_001',
        roomName: '测试房间001',
        roomType: 'public',
        maxPlayers: 2,
        currentPlayers: 0,
        status: 'waiting',
        hostUserId: 'test_user_001',
        members: [],
        isHostCreated: true
    });
    await testRoom.save();
    logger.info('✓ Room模型isHostCreated字段正常');
    testRoom.dissolveRoom();
    if (testRoom.status !== 'finished' || testRoom.members.length !== 0) {
        throw new Error('Room.dissolveRoom方法失效');
    }
    logger.info('✓ Room.dissolveRoom方法正常');
    const generatedRoomId = Room.generateRoomId('test_user_001');
    if (!generatedRoomId.startsWith('test_user_001_')) {
        throw new Error('Room.generateRoomId方法失效');
    }
    logger.info('✓ Room.generateRoomId方法正常');
    logger.info('✅ 数据模型优化验证通过');
}
async function verifyRoomCreationLimit() {
    logger.info('验证房间创建限制...');
    const testUser = new User({
        userId: 'test_user_002',
        username: 'testuser002',
        email: 'test002@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
    });
    await testUser.save();
    const roomData1 = {
        roomName: '测试房间1',
        roomType: RoomType.PUBLIC,
        maxPlayers: 2
    };
    const result1 = await MongoRoomService.createRoom('test_user_002', roomData1);
    if (!result1.success) {
        throw new Error('第一个房间创建失败');
    }
    logger.info('✓ 第一个房间创建成功');
    const roomData2 = {
        roomName: '测试房间2',
        roomType: RoomType.PUBLIC,
        maxPlayers: 2
    };
    const result2 = await MongoRoomService.createRoom('test_user_002', roomData2);
    if (result2.success) {
        throw new Error('房间创建限制失效 - 应该阻止创建第二个房间');
    }
    if (result2.error?.code !== 'ROOM_LIMIT_EXCEEDED') {
        throw new Error('房间创建限制错误码不正确');
    }
    logger.info('✓ 房间创建限制正常工作');
    logger.info('✅ 房间创建限制验证通过');
}
async function verifyHostPermissions() {
    logger.info('验证房主权限管理...');
    const hostUser = new User({
        userId: 'test_host_001',
        username: 'testhost001',
        email: 'host@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
    });
    await hostUser.save();
    const memberUser = new User({
        userId: 'test_member_001',
        username: 'testmember001',
        email: 'member@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
    });
    await memberUser.save();
    const roomData = {
        roomName: '权限测试房间',
        roomType: RoomType.PUBLIC,
        maxPlayers: 2
    };
    const createResult = await MongoRoomService.createRoom('test_host_001', roomData);
    if (!createResult.success) {
        throw new Error('房间创建失败');
    }
    const roomId = createResult.data.room_id;
    logger.info('✓ 房主创建房间成功');
    const joinResult = await MongoRoomService.joinRoom('test_member_001', { roomId });
    if (!joinResult.success) {
        throw new Error('普通用户加入房间失败');
    }
    logger.info('✓ 普通用户加入房间成功');
    const kickResult1 = await MongoRoomService.kickPlayer(roomId, 'test_member_001', 'test_host_001');
    if (kickResult1.success) {
        throw new Error('非房主权限控制失效 - 应该阻止踢出操作');
    }
    logger.info('✓ 非房主无法踢出玩家');
    const kickResult2 = await MongoRoomService.kickPlayer(roomId, 'test_host_001', 'test_member_001');
    if (!kickResult2.success) {
        throw new Error('房主踢出玩家失败');
    }
    logger.info('✓ 房主可以踢出玩家');
    const dissolveResult = await MongoRoomService.deleteRoom(roomId, 'test_host_001');
    if (!dissolveResult.success) {
        throw new Error('房主解散房间失败');
    }
    logger.info('✓ 房主可以解散房间');
    logger.info('✅ 房主权限管理验证通过');
}
async function verifyEnhancedRoomList() {
    logger.info('验证房间列表增强...');
    const users = [
        {
            userId: 'test_list_user1',
            username: 'listuser1',
            email: 'list1@example.com',
            displayName: '列表用户1',
            level: 5,
            rating: 1200
        },
        {
            userId: 'test_list_user2',
            username: 'listuser2',
            email: 'list2@example.com',
            displayName: '列表用户2',
            level: 3,
            rating: 1100
        }
    ];
    for (const userData of users) {
        const user = new User({
            ...userData,
            experience: 0,
            wins: 0,
            losses: 0,
            isActive: true
        });
        await user.save();
    }
    const roomData = {
        roomName: '列表测试房间',
        roomType: RoomType.PUBLIC,
        maxPlayers: 2
    };
    const createResult = await MongoRoomService.createRoom('test_list_user1', roomData);
    if (!createResult.success) {
        throw new Error('创建测试房间失败');
    }
    const roomId = createResult.data.room_id;
    await MongoRoomService.joinRoom('test_list_user2', { roomId });
    const listResult = await MongoRoomService.getRoomList(1, 10);
    if (!listResult.success) {
        throw new Error('获取房间列表失败');
    }
    const rooms = listResult.data?.items || [];
    const testRoom = rooms.find(r => r.roomId === roomId);
    if (!testRoom) {
        throw new Error('测试房间未出现在列表中');
    }
    if (testRoom.currentPlayers !== 2) {
        throw new Error('房间成员数量不正确');
    }
    if (testRoom.hostUsername !== 'listuser1') {
        throw new Error('房主信息不正确');
    }
    logger.info('✓ 房间列表包含正确信息');
    logger.info('✅ 房间列表增强验证通过');
}
async function verifyReconnectMechanism() {
    logger.info('验证重连机制...');
    const testUser = new User({
        userId: 'test_reconnect_001',
        username: 'reconnectuser',
        email: 'reconnect@example.com',
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        rating: 1000,
        isActive: true
    });
    await testUser.save();
    const roomData = {
        roomName: '重连测试房间',
        roomType: RoomType.PUBLIC,
        maxPlayers: 2
    };
    const createResult = await MongoRoomService.createRoom('test_reconnect_001', roomData);
    if (!createResult.success) {
        throw new Error('创建测试房间失败');
    }
    const reconnectResult1 = await MongoRoomService.checkReconnect('test_reconnect_001');
    if (!reconnectResult1.success || !reconnectResult1.data?.hasActiveRoom) {
        throw new Error('重连检测失败 - 应该检测到活跃房间');
    }
    logger.info('✓ 重连检测到活跃房间');
    const roomId = createResult.data.room_id;
    await MongoRoomService.deleteRoom(roomId, 'test_reconnect_001');
    const reconnectResult2 = await MongoRoomService.checkReconnect('test_reconnect_001');
    if (!reconnectResult2.success || reconnectResult2.data?.hasActiveRoom) {
        throw new Error('重连检测失败 - 应该检测到无活跃房间');
    }
    logger.info('✓ 重连检测到无活跃房间');
    logger.info('✅ 重连机制验证通过');
}
if (process.argv[2] === 'run') {
    verifyRoomOptimization()
        .then(() => {
        logger.info('🎉 所有功能验证完成！');
        process.exit(0);
    })
        .catch((error) => {
        logger.error('💥 验证失败:', error);
        process.exit(1);
    });
}
export { verifyRoomOptimization };
//# sourceMappingURL=verifyRoomOptimization.js.map