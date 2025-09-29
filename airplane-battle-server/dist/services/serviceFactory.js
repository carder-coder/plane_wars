import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { UserService as PGUserService } from './userService.js';
import { RoomService as PGRoomService } from './roomService.js';
import { MongoUserService } from './mongoUserService.js';
import { MongoRoomService } from './mongoRoomService.js';
import { MongoGameService } from './mongoGameService.js';
export var DatabaseType;
(function (DatabaseType) {
    DatabaseType["POSTGRESQL"] = "postgresql";
    DatabaseType["MONGODB"] = "mongodb";
})(DatabaseType || (DatabaseType = {}));
export class ServiceFactory {
    static databaseType = DatabaseType.POSTGRESQL;
    static setDatabaseType(type) {
        this.databaseType = type;
        logger.info(`数据库类型设置为: ${type}`);
    }
    static getDatabaseType() {
        return this.databaseType;
    }
    static initFromConfig() {
        const dbType = process.env.DATABASE_TYPE?.toLowerCase();
        switch (dbType) {
            case 'mongodb':
            case 'mongo':
                this.setDatabaseType(DatabaseType.MONGODB);
                break;
            case 'postgresql':
            case 'postgres':
            case 'pg':
                this.setDatabaseType(DatabaseType.POSTGRESQL);
                break;
            default:
                if (config.mongodb && config.mongodb.host) {
                    this.setDatabaseType(DatabaseType.MONGODB);
                }
                else {
                    this.setDatabaseType(DatabaseType.POSTGRESQL);
                }
                break;
        }
    }
    static getUserService() {
        switch (this.databaseType) {
            case DatabaseType.MONGODB:
                return MongoUserService;
            case DatabaseType.POSTGRESQL:
            default:
                return PGUserService;
        }
    }
    static getRoomService() {
        switch (this.databaseType) {
            case DatabaseType.MONGODB:
                return MongoRoomService;
            case DatabaseType.POSTGRESQL:
            default:
                return PGRoomService;
        }
    }
    static getGameService() {
        switch (this.databaseType) {
            case DatabaseType.MONGODB:
                return MongoGameService;
            case DatabaseType.POSTGRESQL:
            default:
                throw new Error('PostgreSQL游戏服务暂未实现');
        }
    }
    static async testConnection() {
        try {
            switch (this.databaseType) {
                case DatabaseType.MONGODB:
                    const { mongoDatabase } = await import('../models/index.js');
                    return await mongoDatabase.testConnection();
                case DatabaseType.POSTGRESQL:
                default:
                    const { database } = await import('../database/connection.js');
                    return await database.testConnection();
            }
        }
        catch (error) {
            logger.error('数据库连接测试失败:', error);
            return false;
        }
    }
    static async initializeDatabase() {
        try {
            switch (this.databaseType) {
                case DatabaseType.MONGODB:
                    const { mongoDatabase, initializeIndexes } = await import('../models/index.js');
                    await mongoDatabase.connect();
                    await initializeIndexes();
                    logger.info('MongoDB初始化完成');
                    break;
                case DatabaseType.POSTGRESQL:
                default:
                    const { database } = await import('../database/connection.js');
                    await database.testConnection();
                    logger.info('PostgreSQL连接验证完成');
                    break;
            }
        }
        catch (error) {
            logger.error('数据库初始化失败:', error);
            throw error;
        }
    }
    static async closeDatabase() {
        try {
            switch (this.databaseType) {
                case DatabaseType.MONGODB:
                    const { mongoDatabase } = await import('../models/index.js');
                    await mongoDatabase.disconnect();
                    logger.info('MongoDB连接已关闭');
                    break;
                case DatabaseType.POSTGRESQL:
                default:
                    const { database } = await import('../database/connection.js');
                    await database.close();
                    logger.info('PostgreSQL连接已关闭');
                    break;
            }
        }
        catch (error) {
            logger.error('关闭数据库连接失败:', error);
            throw error;
        }
    }
    static async getDatabaseStats() {
        try {
            switch (this.databaseType) {
                case DatabaseType.MONGODB:
                    const { getDatabaseStats } = await import('../models/index.js');
                    return await getDatabaseStats();
                case DatabaseType.POSTGRESQL:
                default:
                    const { database } = await import('../database/connection.js');
                    const results = await Promise.all([
                        database.query('SELECT COUNT(*) FROM users'),
                        database.query('SELECT COUNT(*) FROM rooms'),
                        database.query('SELECT COUNT(*) FROM games'),
                        database.query('SELECT COUNT(*) FROM user_sessions')
                    ]);
                    return {
                        users: parseInt(results[0].rows[0].count),
                        rooms: parseInt(results[1].rows[0].count),
                        games: parseInt(results[2].rows[0].count),
                        sessions: parseInt(results[3].rows[0].count),
                        timestamp: new Date()
                    };
            }
        }
        catch (error) {
            logger.error('获取数据库统计失败:', error);
            throw error;
        }
    }
    static async runMigrations() {
        try {
            switch (this.databaseType) {
                case DatabaseType.MONGODB:
                    logger.info('MongoDB不需要运行传统迁移');
                    break;
                case DatabaseType.POSTGRESQL:
                default:
                    const { Migration } = await import('../database/migrate.js');
                    await Migration.runMigrations();
                    logger.info('PostgreSQL迁移完成');
                    break;
            }
        }
        catch (error) {
            logger.error('数据库迁移失败:', error);
            throw error;
        }
    }
}
export const UserService = ServiceFactory.getUserService();
export const RoomService = ServiceFactory.getRoomService();
export const getGameService = () => ServiceFactory.getGameService();
ServiceFactory.initFromConfig();
//# sourceMappingURL=serviceFactory.js.map