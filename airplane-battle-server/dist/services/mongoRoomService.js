import { Room, User } from '../models/index.js';
import { redis } from '../database/redis.js';
import { logger } from '../utils/logger.js';
import { RoomType, RoomStatus } from '../types/index.js';
import { Orientation } from '../types/game.js';
let socketManager = null;
export function setSocketManager(sm) {
    socketManager = sm;
}
export class MongoRoomService {
    static async createRoom(hostUserId, data) {
        try {
            const { roomName, roomType, password } = data;
            const host = await User.findOne({ userId: hostUserId, isActive: true });
            if (!host) {
                return {
                    success: false,
                    message: '用户不存在',
                    error: { code: 'USER_NOT_FOUND' }
                };
            }
            const existingRoom = await Room.findActiveRoomByHost(hostUserId);
            if (existingRoom) {
                logger.warn(`用户 ${hostUserId} 尝试创建房间，但已有未开始的房间: ${existingRoom.roomId}`);
                return {
                    success: false,
                    message: '您已有未开始的房间，请先完成或解散现有房间',
                    error: { code: 'ROOM_LIMIT_EXCEEDED', details: { existingRoomId: existingRoom.roomId } }
                };
            }
            const roomId = Room.generateRoomId(hostUserId);
            const newRoom = new Room({
                roomId,
                roomName,
                roomType,
                password: roomType === RoomType.PRIVATE ? password : undefined,
                maxPlayers: 2,
                currentPlayers: 0,
                status: RoomStatus.WAITING,
                hostUserId,
                members: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                isHostCreated: true
            });
            const hostJoinSuccess = newRoom.addMember(hostUserId);
            if (!hostJoinSuccess) {
                logger.error(`房主自动加入房间失败: userId=${hostUserId}`);
                return {
                    success: false,
                    message: '房主加入房间失败',
                    error: { code: 'CREATE_ROOM_FAILED' }
                };
            }
            await newRoom.save();
            host.updateCurrentRoom(roomId);
            await host.save();
            logger.info(`房间创建成功: ${roomName} (${roomId}), 房主已加入`);
            const roomDetails = await this.getRoomDetails(roomId);
            if (!roomDetails) {
                logger.error(`获取新房间详情失败: ${roomId}`);
                return {
                    success: false,
                    message: '创建房间后获取详情失败',
                    error: { code: 'CREATE_ROOM_FAILED' }
                };
            }
            await redis.setJSON(`room:${roomId}`, roomDetails, 60 * 60);
            return {
                success: true,
                message: '房间创建成功',
                data: roomDetails
            };
        }
        catch (error) {
            logger.error('创建房间失败:', error);
            return {
                success: false,
                message: '创建房间失败',
                error: { code: 'CREATE_ROOM_FAILED' }
            };
        }
    }
    static async joinRoom(userId, data) {
        try {
            const { roomId, password } = data;
            logger.info(`加入房间请求: userId=${userId}, roomId=${roomId}`, { password: password ? '[已设置]' : '无' });
            const user = await User.findOne({ userId, isActive: true });
            if (!user) {
                logger.warn(`用户不存在: ${userId}`);
                return {
                    success: false,
                    message: '用户不存在',
                    error: { code: 'USER_NOT_FOUND' }
                };
            }
            logger.info(`用户验证成功: ${user.username}`);
            logger.info(`查找房间: ${roomId}`);
            const room = await Room.findOne({ roomId });
            if (!room) {
                logger.warn(`房间不存在: ${roomId}`);
                const allRooms = await Room.find({}, 'roomId roomName status').limit(10);
                logger.info(`数据库中存在的房间:`, allRooms.map(r => ({
                    roomId: r.roomId,
                    roomName: r.roomName,
                    status: r.status
                })));
                return {
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                };
            }
            logger.info(`房间查找成功:`, {
                roomId: room.roomId,
                roomName: room.roomName,
                status: room.status,
                currentPlayers: room.currentPlayers,
                maxPlayers: room.maxPlayers
            });
            if (room.status !== RoomStatus.WAITING) {
                logger.warn(`房间状态不可加入: ${room.status}`);
                return {
                    success: false,
                    message: '房间不可加入',
                    error: { code: 'ROOM_NOT_AVAILABLE' }
                };
            }
            if (room.isFull) {
                logger.warn(`房间已满: ${room.currentPlayers}/${room.maxPlayers}`);
                return {
                    success: false,
                    message: '房间已满',
                    error: { code: 'ROOM_FULL' }
                };
            }
            if (room.roomType === RoomType.PRIVATE && room.password !== password) {
                logger.warn(`房间密码错误: expected=${room.password}, provided=${password}`);
                return {
                    success: false,
                    message: '房间密码错误',
                    error: { code: 'WRONG_PASSWORD' }
                };
            }
            const success = room.addMember(userId);
            if (!success) {
                logger.warn(`添加成员失败: userId=${userId}`);
                return {
                    success: false,
                    message: '加入房间失败',
                    error: { code: 'JOIN_ROOM_FAILED' }
                };
            }
            await room.save();
            user.updateCurrentRoom(roomId);
            await user.save();
            logger.info(`成员添加成功: userId=${userId}, 当前玩家数=${room.currentPlayers}`);
            const roomDetails = await this.getRoomDetails(roomId);
            if (!roomDetails) {
                logger.error(`获取房间详情失败: ${roomId}`);
                return {
                    success: false,
                    message: '获取房间详情失败',
                    error: { code: 'JOIN_ROOM_FAILED' }
                };
            }
            await redis.setJSON(`room:${roomId}`, roomDetails, 60 * 60);
            logger.info(`用户 ${userId} 成功加入房间 ${roomId}`);
            return {
                success: true,
                message: '加入房间成功',
                data: roomDetails
            };
        }
        catch (error) {
            logger.error('加入房间失败:', error);
            return {
                success: false,
                message: '加入房间失败',
                error: { code: 'JOIN_ROOM_FAILED' }
            };
        }
    }
    static async leaveRoom(roomId, userId) {
        try {
            const room = await Room.findOne({ roomId });
            if (!room) {
                return {
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                };
            }
            const success = room.removeMember(userId);
            if (!success) {
                return {
                    success: false,
                    message: '您不在该房间中',
                    error: { code: 'NOT_IN_ROOM' }
                };
            }
            await room.save();
            const user = await User.findOne({ userId });
            if (user) {
                user.clearCurrentRoom();
                await user.save();
            }
            await redis.del(`room:${roomId}`);
            logger.info(`用户 ${userId} 离开房间 ${roomId}`);
            return {
                success: true,
                message: '离开房间成功'
            };
        }
        catch (error) {
            logger.error('离开房间失败:', error);
            return {
                success: false,
                message: '离开房间失败',
                error: { code: 'LEAVE_ROOM_FAILED' }
            };
        }
    }
    static async setPlayerReady(roomId, userId, isReady) {
        try {
            const room = await Room.findOne({ roomId });
            if (!room) {
                return {
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                };
            }
            const success = room.setMemberReady(userId, isReady);
            if (!success) {
                return {
                    success: false,
                    message: '您不在该房间中',
                    error: { code: 'NOT_IN_ROOM' }
                };
            }
            await room.save();
            if (room.areAllMembersReady()) {
                room.startGame();
                await room.save();
            }
            await redis.del(`room:${roomId}`);
            logger.info(`用户 ${userId} 在房间 ${roomId} 设置准备状态: ${isReady}`);
            return {
                success: true,
                message: '准备状态设置成功'
            };
        }
        catch (error) {
            logger.error('设置准备状态失败:', error);
            return {
                success: false,
                message: '设置准备状态失败'
            };
        }
    }
    static async getRoomList(page = 1, limit = 10) {
        try {
            const rooms = await Room.findWaitingRooms(page, limit);
            const totalRooms = await Room.countDocuments({ status: RoomStatus.WAITING });
            const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
                const host = await User.findOne({ userId: room.hostUserId }, 'username displayName level rating avatarUrl');
                const memberDetails = await Promise.all(room.members.map(async (member) => {
                    const user = await User.findOne({ userId: member.userId }, 'username displayName level rating avatarUrl');
                    return {
                        userId: member.userId,
                        username: user?.username || 'Unknown',
                        displayName: user?.displayName,
                        level: user?.level || 1,
                        rating: user?.rating || 1000,
                        avatarUrl: user?.avatarUrl,
                        isReady: member.isReady,
                        isConnected: false,
                        isHost: member.userId === room.hostUserId,
                        joinedAt: member.joinedAt
                    };
                }));
                return {
                    roomId: room.roomId,
                    roomName: room.roomName,
                    roomType: room.roomType,
                    currentPlayers: room.currentPlayers,
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                    hostUsername: host?.username || 'Unknown',
                    hostDisplayName: host?.displayName,
                    hostLevel: host?.level,
                    hostRating: host?.rating,
                    createdAt: room.createdAt,
                    needPassword: room.needPassword || false,
                    memberDetails
                };
            }));
            const totalPages = Math.ceil(totalRooms / limit);
            return {
                success: true,
                message: '获取房间列表成功',
                data: {
                    items: roomsWithDetails,
                    total: totalRooms,
                    page,
                    limit,
                    totalPages
                }
            };
        }
        catch (error) {
            logger.error('获取房间列表失败:', error);
            return {
                success: false,
                message: '获取房间列表失败',
                error: { code: 'GET_ROOM_LIST_FAILED' }
            };
        }
    }
    static async getRoomDetails(roomId) {
        try {
            const cached = await redis.getJSON(`room:${roomId}`);
            if (cached) {
                return cached;
            }
            const room = await Room.findOne({ roomId });
            if (!room) {
                return null;
            }
            const memberUsers = await Promise.all(room.members.map(async (member) => {
                const user = await User.findOne({ userId: member.userId }, 'username displayName');
                return {
                    userId: member.userId,
                    username: user?.username || 'Unknown',
                    displayName: user?.displayName,
                    grid: Array(10).fill(null).map(() => Array(10).fill('empty')),
                    airplane: {
                        head: { x: -1, y: -1 },
                        body: [],
                        wings: [],
                        tail: [],
                        orientation: Orientation.HORIZONTAL,
                        isPlaced: false
                    },
                    attackHistory: [],
                    isReady: member.isReady,
                    isConnected: false,
                    joinedAt: member.joinedAt
                };
            }));
            const roomDetails = {
                room_id: room.roomId,
                room_name: room.roomName,
                room_type: room.roomType === 'public' ? RoomType.PUBLIC : RoomType.PRIVATE,
                password: room.password,
                max_players: room.maxPlayers,
                current_players: room.currentPlayers,
                status: room.status === 'waiting' ? RoomStatus.WAITING :
                    room.status === 'playing' ? RoomStatus.PLAYING : RoomStatus.FINISHED,
                host_user_id: room.hostUserId,
                created_at: room.createdAt,
                updated_at: room.updatedAt,
                players: memberUsers
            };
            await redis.setJSON(`room:${roomId}`, roomDetails, 60 * 60);
            return roomDetails;
        }
        catch (error) {
            logger.error('获取房间详情失败:', error);
            return null;
        }
    }
    static async getUserRooms(userId) {
        try {
            const rooms = await Room.findUserRooms(userId);
            const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
                const host = await User.findOne({ userId: room.hostUserId }, 'username');
                return {
                    ...room.toJSON(),
                    hostUsername: host?.username || 'Unknown'
                };
            }));
            return {
                success: true,
                message: '获取用户房间成功',
                data: roomsWithDetails
            };
        }
        catch (error) {
            logger.error('获取用户房间失败:', error);
            return {
                success: false,
                message: '获取用户房间失败'
            };
        }
    }
    static async deleteRoom(roomId, userId) {
        try {
            const room = await Room.findOne({ roomId });
            if (!room) {
                return {
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                };
            }
            if (room.hostUserId !== userId) {
                return {
                    success: false,
                    message: '只有房主可以删除房间',
                    error: { code: 'NOT_HOST' }
                };
            }
            if (socketManager) {
                socketManager.notifyRoomDissolved(roomId, '房主解散了房间');
            }
            const memberUserIds = room.members.map(member => member.userId);
            await User.updateMany({ userId: { $in: memberUserIds } }, { $unset: { currentRoomId: 1 } });
            await Room.findByIdAndDelete(room._id);
            await redis.del(`room:${roomId}`);
            logger.info(`房间删除成功: ${roomId}`);
            return {
                success: true,
                message: '房间删除成功'
            };
        }
        catch (error) {
            logger.error('删除房间失败:', error);
            return {
                success: false,
                message: '删除房间失败'
            };
        }
    }
    static async checkReconnect(userId) {
        try {
            const user = await User.findOne({ userId, isActive: true });
            if (!user || !user.currentRoomId) {
                return {
                    success: true,
                    message: '用户无活跃房间',
                    data: { hasActiveRoom: false }
                };
            }
            const room = await Room.findOne({
                roomId: user.currentRoomId,
                status: { $in: ['waiting', 'playing'] },
                'members.userId': userId
            });
            if (!room) {
                user.clearCurrentRoom();
                await user.save();
                return {
                    success: true,
                    message: '用户无活跃房间',
                    data: { hasActiveRoom: false }
                };
            }
            const roomDetails = await this.getRoomDetails(room.roomId);
            return {
                success: true,
                message: '用户有活跃房间',
                data: {
                    hasActiveRoom: true,
                    roomDetails
                }
            };
        }
        catch (error) {
            logger.error('检查重连状态失败:', error);
            return {
                success: false,
                message: '检查重连状态失败',
                error: { code: 'CHECK_RECONNECT_FAILED' }
            };
        }
    }
    static async kickPlayer(roomId, hostUserId, targetUserId) {
        try {
            const room = await Room.findOne({ roomId });
            if (!room) {
                return {
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                };
            }
            if (room.hostUserId !== hostUserId) {
                return {
                    success: false,
                    message: '只有房主可以踢出玩家',
                    error: { code: 'NOT_HOST' }
                };
            }
            if (hostUserId === targetUserId) {
                return {
                    success: false,
                    message: '不能踢出自己',
                    error: { code: 'CANNOT_KICK_SELF' }
                };
            }
            const success = room.removeMember(targetUserId);
            if (!success) {
                return {
                    success: false,
                    message: '目标玩家不在房间中',
                    error: { code: 'PLAYER_NOT_IN_ROOM' }
                };
            }
            await room.save();
            const targetUser = await User.findOne({ userId: targetUserId });
            if (targetUser) {
                targetUser.clearCurrentRoom();
                await targetUser.save();
            }
            if (socketManager) {
                socketManager.notifyPlayerKicked(roomId, targetUserId, '您被房主踢出了房间');
            }
            await redis.del(`room:${roomId}`);
            logger.info(`玩家 ${targetUserId} 被踢出房间 ${roomId}`);
            return {
                success: true,
                message: '玩家踢出成功'
            };
        }
        catch (error) {
            logger.error('踢出玩家失败:', error);
            return {
                success: false,
                message: '踢出玩家失败'
            };
        }
    }
}
//# sourceMappingURL=mongoRoomService.js.map