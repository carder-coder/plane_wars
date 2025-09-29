import { RoomService } from '../services/serviceFactory.js';
import { logger } from '../utils/logger.js';
export class RoomController {
    static async createRoom(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '未认证的用户',
                    error: { code: 'UNAUTHORIZED' }
                });
                return;
            }
            const roomData = req.body;
            const result = await RoomService.createRoom(userId, roomData);
            const statusCode = result.success ? 201 : 400;
            res.status(statusCode).json(result);
            if (result.success) {
                logger.info(`用户 ${userId} 创建房间成功: ${roomData.roomName}`);
            }
        }
        catch (error) {
            logger.error('创建房间控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async joinRoom(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '未认证的用户',
                    error: { code: 'UNAUTHORIZED' }
                });
                return;
            }
            const joinData = req.body;
            const result = await RoomService.joinRoom(userId, joinData);
            const statusCode = result.success ? 200 : 400;
            res.status(statusCode).json(result);
            if (result.success) {
                logger.info(`用户 ${userId} 加入房间成功: ${joinData.roomId}`);
            }
        }
        catch (error) {
            logger.error('加入房间控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async leaveRoom(req, res) {
        try {
            const userId = req.user?.userId;
            const { roomId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '未认证的用户',
                    error: { code: 'UNAUTHORIZED' }
                });
                return;
            }
            const result = await RoomService.leaveRoom(roomId, userId);
            const statusCode = result.success ? 200 : 400;
            res.status(statusCode).json(result);
            if (result.success) {
                logger.info(`用户 ${userId} 离开房间: ${roomId}`);
            }
        }
        catch (error) {
            logger.error('离开房间控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async getRoomList(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await RoomService.getRoomList(page, limit);
            const statusCode = result.success ? 200 : 400;
            res.status(statusCode).json(result);
        }
        catch (error) {
            logger.error('获取房间列表控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async getRoomDetails(req, res) {
        try {
            const { roomId } = req.params;
            const roomDetails = await RoomService.getRoomDetails(roomId);
            if (!roomDetails) {
                res.status(404).json({
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                });
                return;
            }
            res.json({
                success: true,
                message: '获取房间详情成功',
                data: roomDetails
            });
        }
        catch (error) {
            logger.error('获取房间详情控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
}
//# sourceMappingURL=roomController.js.map