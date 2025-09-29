import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { redis } from '../database/redis.js';
import { MessageType } from '../types/index.js';
import { RoomService } from './serviceFactory.js';
export class SocketManager {
    io;
    connections = new Map();
    userSockets = new Map();
    constructor(io) {
        this.io = io;
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`新的Socket连接: ${socket.id}`);
            this.setupSocketMiddlewares(socket);
            socket.on('authenticate', (data) => this.handleAuthentication(socket, data));
            socket.on(MessageType.JOIN_ROOM, (data) => this.handleJoinRoom(socket, data));
            socket.on(MessageType.LEAVE_ROOM, (data) => this.handleLeaveRoom(socket, data));
            socket.on(MessageType.PLACE_AIRPLANE, (data) => this.handlePlaceAirplane(socket, data));
            socket.on(MessageType.CONFIRM_PLACEMENT, (data) => this.handleConfirmPlacement(socket, data));
            socket.on(MessageType.ATTACK, (data) => this.handleAttack(socket, data));
            socket.on(MessageType.HEARTBEAT, (data) => this.handleHeartbeat(socket, data));
            socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
            socket.on('error', (error) => this.handleError(socket, error));
        });
    }
    setupSocketMiddlewares(socket) {
        socket.use((packet, next) => {
            try {
                const [_eventName, _data] = packet;
                next();
            }
            catch (error) {
                logger.error(`Socket中间件错误 ${socket.id}:`, error);
                this.sendError(socket, 'INVALID_MESSAGE', error.message);
                next(new Error('消息格式错误'));
            }
        });
    }
    async handleAuthentication(socket, data) {
        try {
            const { token } = data;
            if (!token) {
                this.sendError(socket, 'MISSING_TOKEN', '缺少认证token');
                return;
            }
            const decoded = jwt.verify(token, config.jwt.secret);
            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                this.sendError(socket, 'TOKEN_EXPIRED', 'Token已过期');
                return;
            }
            const connection = {
                socketId: socket.id,
                userId: decoded.userId,
                username: decoded.username,
                connectedAt: new Date()
            };
            this.connections.set(socket.id, connection);
            if (!this.userSockets.has(decoded.userId)) {
                this.userSockets.set(decoded.userId, new Set());
            }
            this.userSockets.get(decoded.userId).add(socket.id);
            await redis.sAdd('online:users', decoded.userId);
            await redis.setJSON(`session:${decoded.userId}`, {
                userId: decoded.userId,
                username: decoded.username,
                socketId: socket.id,
                connectedAt: connection.connectedAt
            }, 24 * 60 * 60);
            logger.info(`用户认证成功: ${decoded.username} (${socket.id})`);
            this.sendMessage(socket, 'authenticated', {
                success: true,
                user: {
                    userId: decoded.userId,
                    username: decoded.username
                }
            });
        }
        catch (error) {
            logger.error(`认证失败 ${socket.id}:`, error);
            this.sendError(socket, 'AUTH_FAILED', '认证失败');
        }
    }
    async handleJoinRoom(socket, data) {
        try {
            const connection = this.connections.get(socket.id);
            if (!connection) {
                this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接');
                return;
            }
            logger.info(`用户 ${connection.username} 尝试加入房间:`, {
                dataType: typeof data,
                data: data
            });
            let payload = data;
            if (data && typeof data === 'object' && 'type' in data && 'payload' in data) {
                payload = data.payload;
                logger.info(`检测到SocketMessage格式，提取payload:`, payload);
            }
            const { roomId, password } = payload || {};
            if (!roomId || typeof roomId !== 'string') {
                logger.warn(`无效的房间ID:`, {
                    roomId,
                    type: typeof roomId,
                    payload: payload
                });
                this.sendError(socket, 'JOIN_ROOM_FAILED', '房间ID无效');
                return;
            }
            logger.info(`调用房间服务加入房间: roomId=${roomId}, userId=${connection.userId}`);
            const joinResult = await RoomService.joinRoom(connection.userId, { roomId, password });
            logger.info(`房间服务返回结果:`, {
                success: joinResult.success,
                message: joinResult.message,
                error: joinResult.error
            });
            if (!joinResult.success) {
                this.sendError(socket, 'JOIN_ROOM_FAILED', joinResult.message || '加入房间失败');
                return;
            }
            socket.join(roomId);
            connection.roomId = roomId;
            this.broadcastToRoom(roomId, MessageType.PLAYER_JOINED, {
                userId: connection.userId,
                username: connection.username
            }, socket.id);
            logger.info(`用户 ${connection.username} 成功加入房间 ${roomId}`);
            this.sendMessage(socket, MessageType.ROOM_JOINED, {
                room: joinResult.data,
                message: '成功加入房间'
            });
        }
        catch (error) {
            logger.error(`加入房间失败 ${socket.id}:`, error);
            this.sendError(socket, 'JOIN_ROOM_FAILED', '加入房间失败');
        }
    }
    async handleLeaveRoom(socket, _data) {
        try {
            const connection = this.connections.get(socket.id);
            if (!connection) {
                this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接');
                return;
            }
            logger.info(`用户 ${connection.username} 离开房间`);
            this.sendMessage(socket, MessageType.ROOM_LEFT, {
                message: '已离开房间'
            });
        }
        catch (error) {
            logger.error(`离开房间失败 ${socket.id}:`, error);
            this.sendError(socket, 'LEAVE_ROOM_FAILED', '离开房间失败');
        }
    }
    async handlePlaceAirplane(socket, data) {
        try {
            const connection = this.connections.get(socket.id);
            if (!connection) {
                this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接');
                return;
            }
            const { headX, headY, orientation } = data;
            logger.info(`用户 ${connection.username} 放置飞机: (${headX}, ${headY}) ${orientation}`);
            this.sendMessage(socket, MessageType.AIRPLANE_PLACED, {
                success: true,
                message: '飞机放置成功'
            });
        }
        catch (error) {
            logger.error(`放置飞机失败 ${socket.id}:`, error);
            this.sendError(socket, 'PLACE_AIRPLANE_FAILED', '放置飞机失败');
        }
    }
    async handleConfirmPlacement(socket, _data) {
        try {
            const connection = this.connections.get(socket.id);
            if (!connection) {
                this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接');
                return;
            }
            logger.info(`用户 ${connection.username} 确认飞机放置`);
            this.sendMessage(socket, MessageType.PLACEMENT_CONFIRMED, {
                success: true,
                message: '飞机放置已确认'
            });
        }
        catch (error) {
            logger.error(`确认放置失败 ${socket.id}:`, error);
            this.sendError(socket, 'CONFIRM_PLACEMENT_FAILED', '确认放置失败');
        }
    }
    async handleAttack(socket, data) {
        try {
            const connection = this.connections.get(socket.id);
            if (!connection) {
                this.sendError(socket, 'NOT_AUTHENTICATED', '未认证的连接');
                return;
            }
            const { coordinate } = data;
            logger.info(`用户 ${connection.username} 攻击坐标: (${coordinate.x}, ${coordinate.y})`);
            this.sendMessage(socket, MessageType.ATTACK_RESULT, {
                attacker: connection.username,
                coordinate,
                result: 'miss',
                gameEnded: false
            });
        }
        catch (error) {
            logger.error(`攻击失败 ${socket.id}:`, error);
            this.sendError(socket, 'ATTACK_FAILED', '攻击失败');
        }
    }
    async handleHeartbeat(socket, _data) {
        try {
            const connection = this.connections.get(socket.id);
            if (connection) {
                await redis.expire(`session:${connection.userId}`, 24 * 60 * 60);
                this.sendMessage(socket, MessageType.HEARTBEAT, {
                    timestamp: Date.now()
                });
            }
        }
        catch (error) {
            logger.error(`心跳处理失败 ${socket.id}:`, error);
        }
    }
    async handleDisconnect(socket, reason) {
        try {
            const connection = this.connections.get(socket.id);
            if (connection) {
                logger.info(`用户 ${connection.username} 断开连接: ${reason}`);
                const userSocketSet = this.userSockets.get(connection.userId);
                if (userSocketSet) {
                    userSocketSet.delete(socket.id);
                    if (userSocketSet.size === 0) {
                        this.userSockets.delete(connection.userId);
                        await redis.sRem('online:users', connection.userId);
                        await redis.del(`session:${connection.userId}`);
                    }
                }
                if (connection.roomId) {
                    this.broadcastToRoom(connection.roomId, MessageType.PLAYER_LEFT, {
                        userId: connection.userId,
                        username: connection.username
                    }, socket.id);
                }
                this.connections.delete(socket.id);
            }
        }
        catch (error) {
            logger.error(`处理断开连接失败 ${socket.id}:`, error);
        }
    }
    handleError(socket, error) {
        logger.error(`Socket错误 ${socket.id}:`, error);
        this.sendError(socket, 'SOCKET_ERROR', error.message);
    }
    sendMessage(socket, type, payload) {
        const message = {
            type: type,
            payload,
            timestamp: Date.now(),
            messageId: this.generateMessageId()
        };
        socket.emit(type, message);
    }
    sendError(socket, code, message) {
        const errorMessage = {
            type: MessageType.ERROR,
            payload: {
                code,
                message
            },
            timestamp: Date.now(),
            messageId: this.generateMessageId()
        };
        socket.emit(MessageType.ERROR, errorMessage);
    }
    broadcastToRoom(roomId, type, payload, excludeSocketId) {
        const message = {
            type,
            payload,
            timestamp: Date.now(),
            messageId: this.generateMessageId()
        };
        const room = this.io.to(roomId);
        if (excludeSocketId) {
            room.except(excludeSocketId);
        }
        room.emit(type, message);
        logger.debug(`向房间 ${roomId} 广播消息: ${type}`);
    }
    sendToUser(userId, type, payload) {
        const userSocketSet = this.userSockets.get(userId);
        if (!userSocketSet) {
            logger.warn(`用户 ${userId} 不在线`);
            return;
        }
        const message = {
            type,
            payload,
            timestamp: Date.now(),
            messageId: this.generateMessageId()
        };
        userSocketSet.forEach(socketId => {
            this.io.to(socketId).emit(type, message);
        });
        logger.debug(`向用户 ${userId} 发送消息: ${type}`);
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    getOnlineUserCount() {
        return this.userSockets.size;
    }
    notifyRoomDissolved(roomId, reason) {
        this.broadcastToRoom(roomId, MessageType.ROOM_DISSOLVED, {
            roomId,
            reason: reason || '房主解散了房间',
            timestamp: Date.now()
        });
        logger.info(`房间 ${roomId} 已解散通知已发送`);
    }
    notifyPlayerKicked(roomId, kickedUserId, reason) {
        this.sendToUser(kickedUserId, MessageType.PLAYER_KICKED, {
            roomId,
            userId: kickedUserId,
            reason: reason || '您被房主踢出了房间',
            timestamp: Date.now()
        });
        this.broadcastToRoom(roomId, MessageType.PLAYER_KICKED, {
            roomId,
            userId: kickedUserId,
            reason: reason || '用户被房主踢出',
            timestamp: Date.now()
        });
        const userSocketSet = this.userSockets.get(kickedUserId);
        if (userSocketSet) {
            userSocketSet.forEach(socketId => {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.leave(roomId);
                    const connection = this.connections.get(socketId);
                    if (connection) {
                        connection.roomId = undefined;
                    }
                }
            });
        }
        logger.info(`用户 ${kickedUserId} 被踢出房间 ${roomId} 通知已发送`);
    }
    notifyHostTransferred(roomId, oldHostId, newHostId, newHostUsername) {
        this.broadcastToRoom(roomId, MessageType.HOST_TRANSFERRED, {
            roomId,
            oldHostId,
            newHostId,
            newHostUsername,
            timestamp: Date.now()
        });
        logger.info(`房间 ${roomId} 房主从 ${oldHostId} 转移给 ${newHostId}`);
    }
    getStats() {
        return {
            totalConnections: this.connections.size,
            onlineUsers: this.userSockets.size,
            rooms: this.io.sockets.adapter.rooms.size
        };
    }
}
//# sourceMappingURL=socketManager.js.map