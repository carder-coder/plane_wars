import { UserService } from '../services/serviceFactory.js';
import { logger } from '../utils/logger.js';
export class AuthController {
    static async register(req, res) {
        try {
            const registerData = req.body;
            const result = await UserService.register(registerData);
            const statusCode = result.success ? 201 : 400;
            res.status(statusCode).json(result);
            if (result.success) {
                logger.info(`用户注册成功: ${registerData.username}`);
            }
            else {
                logger.warn(`用户注册失败: ${registerData.username} - ${result.message}`);
            }
        }
        catch (error) {
            logger.error('注册控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async login(req, res) {
        try {
            const loginData = req.body;
            const result = await UserService.login(loginData);
            const statusCode = result.success ? 200 : 401;
            res.status(statusCode).json(result);
            if (result.success) {
                logger.info(`用户登录成功: ${loginData.username}`);
            }
            else {
                logger.warn(`用户登录失败: ${loginData.username} - ${result.message}`);
            }
        }
        catch (error) {
            logger.error('登录控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    message: '缺少refresh token',
                    error: { code: 'MISSING_REFRESH_TOKEN' }
                });
                return;
            }
            const result = await UserService.refreshToken(refreshToken);
            const statusCode = result.success ? 200 : 401;
            res.status(statusCode).json(result);
        }
        catch (error) {
            logger.error('刷新token控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async logout(req, res) {
        try {
            const userId = req.user?.userId;
            const { refreshToken } = req.body;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '未认证的用户',
                    error: { code: 'UNAUTHORIZED' }
                });
                return;
            }
            const result = await UserService.logout(userId, refreshToken);
            const statusCode = result.success ? 200 : 400;
            res.status(statusCode).json(result);
            if (result.success) {
                logger.info(`用户登出成功: ${userId}`);
            }
        }
        catch (error) {
            logger.error('登出控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async getProfile(req, res) {
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
            const result = await UserService.getUserProfile(userId);
            const statusCode = result.success ? 200 : 404;
            res.status(statusCode).json(result);
        }
        catch (error) {
            logger.error('获取用户资料控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async verifyToken(req, res) {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Token无效',
                    error: { code: 'INVALID_TOKEN' }
                });
                return;
            }
            res.json({
                success: true,
                message: 'Token有效',
                data: {
                    userId: user.userId,
                    username: user.username
                }
            });
        }
        catch (error) {
            logger.error('验证token控制器错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
}
export class UserController {
    static async getLeaderboard(_req, res) {
        try {
            res.json({
                success: true,
                message: '获取排行榜成功',
                data: {
                    leaderboard: [],
                    total: 0
                }
            });
        }
        catch (error) {
            logger.error('获取排行榜错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
    static async getOnlineUsers(_req, res) {
        try {
            res.json({
                success: true,
                message: '获取在线用户成功',
                data: {
                    onlineUsers: [],
                    total: 0
                }
            });
        }
        catch (error) {
            logger.error('获取在线用户错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                error: { code: 'INTERNAL_ERROR' }
            });
        }
    }
}
//# sourceMappingURL=authController.js.map