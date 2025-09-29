import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';
export const errorHandler = (error, req, res, _next) => {
    logger.error('服务器错误:', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        body: req.body,
        user: req.user
    });
    if (error.code === '23505') {
        res.status(409).json({
            success: false,
            message: '数据已存在',
            error: { code: 'DUPLICATE_ENTRY' }
        });
        return;
    }
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Token无效',
            error: { code: 'INVALID_TOKEN' }
        });
        return;
    }
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR' }
    });
};
export const notFoundHandler = (req, res, _next) => {
    logger.warn(`404错误: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: '请求的资源不存在',
        error: { code: 'NOT_FOUND' }
    });
};
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(req.method, req.url, res.statusCode, duration);
    });
    next();
};
export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试',
        error: { code: 'RATE_LIMIT_EXCEEDED' }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`通用限流触发: ${req.ip} ${req.method} ${req.url}`);
        res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试',
            error: { code: 'RATE_LIMIT_EXCEEDED' }
        });
    }
});
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: '登录尝试过于频繁，请稍后再试',
        error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        logger.warn(`认证限流触发: ${req.ip} ${req.method} ${req.url}`);
        res.status(429).json({
            success: false,
            message: '登录尝试过于频繁，请稍后再试',
            error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' }
        });
    }
});
export const gameRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        message: '游戏操作过于频繁，请稍后再试',
        error: { code: 'GAME_RATE_LIMIT_EXCEEDED' }
    },
    keyGenerator: (req) => {
        return req.user?.userId || req.ip || 'anonymous';
    },
    handler: (req, res) => {
        logger.warn(`游戏限流触发: ${req.user?.userId || req.ip} ${req.method} ${req.url}`);
        res.status(429).json({
            success: false,
            message: '游戏操作过于频繁，请稍后再试',
            error: { code: 'GAME_RATE_LIMIT_EXCEEDED' }
        });
    }
});
export const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger.warn(`CORS拒绝来源: ${origin}`);
            callback(new Error('CORS策略不允许此来源'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
};
//# sourceMappingURL=index.js.map