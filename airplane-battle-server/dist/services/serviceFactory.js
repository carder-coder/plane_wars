import { logger } from '../utils/logger.js';
import { MongoUserService } from './mongoUserService.js';
import { MongoRoomService } from './mongoRoomService.js';
import { MongoGameService } from './mongoGameService.js';
export class ServiceFactory {
    static initFromConfig() {
        logger.info('使用MongoDB作为数据库');
    }
    static getUserService() {
        return MongoUserService;
    }
    static getRoomService() {
        return MongoRoomService;
    }
    static getGameService() {
        return MongoGameService;
    }
    static async testConnection() {
        try {
            const { mongoDatabase } = await import('../models/index.js');
            return await mongoDatabase.testConnection();
        }
        catch (error) {
            logger.error('数据库连接测试失败:', error);
            return false;
        }
    }
    static async initializeDatabase() {
        try {
            const { mongoDatabase, initializeIndexes } = await import('../models/index.js');
            await mongoDatabase.connect();
            await initializeIndexes();
            logger.info('MongoDB初始化完成');
        }
        catch (error) {
            logger.error('数据库初始化失败:', error);
            throw error;
        }
    }
    static async closeDatabase() {
        try {
            const { mongoDatabase } = await import('../models/index.js');
            await mongoDatabase.disconnect();
            logger.info('MongoDB连接已关闭');
        }
        catch (error) {
            logger.error('关闭数据库连接失败:', error);
            throw error;
        }
    }
    static async getDatabaseStats() {
        try {
            const { getDatabaseStats } = await import('../models/index.js');
            return await getDatabaseStats();
        }
        catch (error) {
            logger.error('获取数据库统计失败:', error);
            throw error;
        }
    }
    static async runMigrations() {
        try {
            logger.info('MongoDB不需要运行传统迁移');
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