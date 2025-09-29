import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: '缺少认证token',
                error: { code: 'MISSING_TOKEN' }
            });
            return;
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        if (!token) {
            res.status(401).json({
                success: false,
                message: '无效的token格式',
                error: { code: 'INVALID_TOKEN_FORMAT' }
            });
            return;
        }
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                res.status(401).json({
                    success: false,
                    message: 'Token已过期',
                    error: { code: 'TOKEN_EXPIRED' }
                });
                return;
            }
            req.user = {
                userId: decoded.userId,
                username: decoded.username
            };
            logger.debug(`用户认证成功: ${decoded.username}`);
            next();
        }
        catch (jwtError) {
            logger.warn('JWT验证失败:', jwtError);
            res.status(401).json({
                success: false,
                message: 'Token验证失败',
                error: { code: 'INVALID_TOKEN' }
            });
        }
    }
    catch (error) {
        logger.error('认证中间件错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: { code: 'INTERNAL_ERROR' }
        });
    }
};
export const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;
            if (token) {
                try {
                    const decoded = jwt.verify(token, config.jwt.secret);
                    if (decoded.exp && Date.now() < decoded.exp * 1000) {
                        req.user = {
                            userId: decoded.userId,
                            username: decoded.username
                        };
                        logger.debug(`可选认证成功: ${decoded.username}`);
                    }
                }
                catch (jwtError) {
                    logger.debug('可选认证失败，继续处理请求');
                }
            }
        }
        next();
    }
    catch (error) {
        logger.error('可选认证中间件错误:', error);
        next();
    }
};
//# sourceMappingURL=auth.js.map