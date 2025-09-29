import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
const { Pool } = pg;
export class Database {
    static instance;
    pool;
    constructor() {
        this.pool = new Pool({
            host: config.database.host,
            port: config.database.port,
            database: config.database.database,
            user: config.database.username,
            password: config.database.password,
            ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('connect', (_client) => {
            logger.debug('数据库连接已建立');
        });
        this.pool.on('error', (err, _client) => {
            logger.error('数据库连接错误:', err);
        });
    }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    getPool() {
        return this.pool;
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug(`SQL查询执行完成: ${text} - 耗时: ${duration}ms`);
            return result;
        }
        catch (error) {
            logger.error(`SQL查询错误: ${text}`, error);
            throw error;
        }
    }
    async getClient() {
        return await this.pool.connect();
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async testConnection() {
        try {
            await this.query('SELECT NOW()');
            logger.info('数据库连接测试成功');
            return true;
        }
        catch (error) {
            logger.error('数据库连接测试失败:', error);
            return false;
        }
    }
    async close() {
        await this.pool.end();
        logger.info('数据库连接已关闭');
    }
}
export const database = Database.getInstance();
//# sourceMappingURL=connection.js.map