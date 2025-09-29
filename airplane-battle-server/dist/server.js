import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { database } from './database/connection.js';
import { redis } from './database/redis.js';
import { Migration } from './database/migrate.js';
import { errorHandler, notFoundHandler, requestLogger, generalRateLimit, corsOptions } from './middlewares/index.js';
import { SocketManager } from './services/socketManager.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/users.js';
import { roomRouter } from './routes/rooms.js';
export class Server {
    app;
    httpServer;
    io;
    socketManager = null;
    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new SocketServer(this.httpServer, {
            cors: corsOptions,
            pingTimeout: 60000,
            pingInterval: 25000
        });
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupSocketIO();
        this.setupErrorHandling();
    }
    setupMiddlewares() {
        this.app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));
        this.app.use(cors(corsOptions));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        if (config.nodeEnv === 'development') {
            this.app.use(morgan('dev'));
        }
        this.app.use(requestLogger);
        this.app.use(generalRateLimit);
        this.app.get('/health', (_req, res) => {
            res.json({
                success: true,
                message: '服务器运行正常',
                data: {
                    timestamp: new Date().toISOString(),
                    environment: config.nodeEnv,
                    version: '1.0.0'
                }
            });
        });
    }
    setupRoutes() {
        const apiPrefix = '/api';
        this.app.use(`${apiPrefix}/auth`, authRouter);
        this.app.use(`${apiPrefix}/users`, userRouter);
        this.app.use(`${apiPrefix}/rooms`, roomRouter);
        this.app.get(`${apiPrefix}/stats`, (_req, res) => {
            res.json({
                success: true,
                message: '服务器统计信息',
                data: this.socketManager ? this.socketManager.getStats() : {}
            });
        });
        this.app.get(`${apiPrefix}/test`, (_req, res) => {
            res.json({
                success: true,
                message: 'API正常工作',
                data: {
                    timestamp: new Date().toISOString()
                }
            });
        });
    }
    setupSocketIO() {
        this.socketManager = new SocketManager(this.io);
        logger.info('Socket.IO管理器已初始化');
    }
    setupErrorHandling() {
        this.app.use(notFoundHandler);
        this.app.use(errorHandler);
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('未处理的Promise拒绝:', { reason, promise });
        });
        process.on('uncaughtException', (error) => {
            logger.error('未捕获的异常:', error);
            process.exit(1);
        });
        process.on('SIGTERM', () => {
            logger.info('收到SIGTERM信号，开始优雅关闭...');
            this.shutdown();
        });
        process.on('SIGINT', () => {
            logger.info('收到SIGINT信号，开始优雅关闭...');
            this.shutdown();
        });
    }
    async initializeDatabase() {
        try {
            const isConnected = await database.testConnection();
            if (!isConnected) {
                throw new Error('数据库连接失败');
            }
            await Migration.runMigrations();
            logger.info('数据库初始化完成');
        }
        catch (error) {
            logger.error('数据库初始化失败:', error);
            throw error;
        }
    }
    async initializeRedis() {
        try {
            await redis.connect();
            logger.info('Redis连接初始化完成');
        }
        catch (error) {
            logger.error('Redis连接初始化失败:', error);
            throw error;
        }
    }
    async start() {
        try {
            await this.initializeDatabase();
            await this.initializeRedis();
            this.httpServer.listen(config.port, () => {
                logger.info(`服务器已启动 - http://localhost:${config.port}`);
                logger.info(`环境: ${config.nodeEnv}`);
                logger.info(`允许的域名: ${config.allowedOrigins.join(', ')}`);
            });
        }
        catch (error) {
            logger.error('服务器启动失败:', error);
            process.exit(1);
        }
    }
    async shutdown() {
        try {
            logger.info('正在关闭服务器...');
            this.httpServer.close(() => {
                logger.info('HTTP服务器已关闭');
            });
            this.io.close(() => {
                logger.info('Socket.IO服务已关闭');
            });
            await database.close();
            await redis.disconnect();
            logger.info('服务器已优雅关闭');
            process.exit(0);
        }
        catch (error) {
            logger.error('服务器关闭时发生错误:', error);
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
    getIO() {
        return this.io;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new Server();
    server.start().catch((error) => {
        logger.error('启动服务器失败:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map