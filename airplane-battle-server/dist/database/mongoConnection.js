import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
export class MongoDatabase {
    static instance;
    isConnected = false;
    constructor() { }
    static getInstance() {
        if (!MongoDatabase.instance) {
            MongoDatabase.instance = new MongoDatabase();
        }
        return MongoDatabase.instance;
    }
    async connect() {
        try {
            if (this.isConnected) {
                logger.debug('MongoDB已连接，跳过重复连接');
                return;
            }
            const mongoUri = this.buildConnectionString();
            await mongoose.connect(mongoUri, {
                maxPoolSize: 20,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
            });
            this.isConnected = true;
            mongoose.connection.on('connected', () => {
                logger.info('MongoDB连接已建立');
            });
            mongoose.connection.on('error', (error) => {
                logger.error('MongoDB连接错误:', error);
                this.isConnected = false;
            });
            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB连接已断开');
                this.isConnected = false;
            });
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });
            logger.info('MongoDB连接成功');
        }
        catch (error) {
            logger.error('MongoDB连接失败:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('MongoDB连接已关闭');
        }
        catch (error) {
            logger.error('MongoDB断开连接失败:', error);
            throw error;
        }
    }
    async testConnection() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            await mongoose.connection.db?.admin().ping();
            logger.info('MongoDB连接测试成功');
            return true;
        }
        catch (error) {
            logger.error('MongoDB连接测试失败:', error);
            return false;
        }
    }
    getConnectionState() {
        return mongoose.connection.readyState;
    }
    buildConnectionString() {
        const { host, port, database, username, password, authSource = 'admin', ssl = false, replicaSet } = config.mongodb;
        let uri = 'mongodb://';
        if (username && password) {
            uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
        }
        uri += `${host}:${port}/${database}`;
        const options = [];
        if (authSource)
            options.push(`authSource=${authSource}`);
        if (ssl)
            options.push('ssl=true');
        if (replicaSet)
            options.push(`replicaSet=${replicaSet}`);
        if (options.length > 0) {
            uri += '?' + options.join('&');
        }
        return uri;
    }
    async aggregate(collection, pipeline) {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                throw new Error('Database connection not available');
            }
            const result = await db
                .collection(collection)
                .aggregate(pipeline)
                .toArray();
            return result;
        }
        catch (error) {
            logger.error(`聚合查询失败 [${collection}]:`, error);
            throw error;
        }
    }
    getClient() {
        return mongoose.connection.getClient();
    }
    getDatabase() {
        return mongoose.connection.db;
    }
}
export const mongoDatabase = MongoDatabase.getInstance();
export { mongoose };
//# sourceMappingURL=mongoConnection.js.map