import { createClient } from 'redis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
export class RedisService {
    static instance;
    client;
    constructor() {
        this.client = createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port
            },
            password: config.redis.password,
            database: config.redis.db
        });
        this.client.on('connect', () => {
            logger.info('Redis连接已建立');
        });
        this.client.on('error', (err) => {
            logger.error('Redis连接错误:', err);
        });
        this.client.on('ready', () => {
            logger.info('Redis已准备就绪');
        });
    }
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.client.isOpen) {
            await this.client.disconnect();
        }
    }
    async set(key, value, ttl) {
        try {
            if (ttl) {
                await this.client.setEx(key, ttl, value);
            }
            else {
                await this.client.set(key, value);
            }
            logger.debug(`Redis SET: ${key}`);
        }
        catch (error) {
            logger.error(`Redis SET错误 ${key}:`, error);
            throw error;
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            logger.debug(`Redis GET: ${key} = ${value ? '有值' : '无值'}`);
            return value;
        }
        catch (error) {
            logger.error(`Redis GET错误 ${key}:`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
            logger.debug(`Redis DEL: ${key}`);
        }
        catch (error) {
            logger.error(`Redis DEL错误 ${key}:`, error);
            throw error;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            logger.error(`Redis EXISTS错误 ${key}:`, error);
            throw error;
        }
    }
    async expire(key, seconds) {
        try {
            await this.client.expire(key, seconds);
            logger.debug(`Redis EXPIRE: ${key} ${seconds}s`);
        }
        catch (error) {
            logger.error(`Redis EXPIRE错误 ${key}:`, error);
            throw error;
        }
    }
    async setJSON(key, value, ttl) {
        const jsonString = JSON.stringify(value);
        await this.set(key, jsonString, ttl);
    }
    async getJSON(key) {
        const value = await this.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch (error) {
            logger.error(`Redis JSON解析错误 ${key}:`, error);
            return null;
        }
    }
    async hSet(key, field, value) {
        try {
            await this.client.hSet(key, field, value);
            logger.debug(`Redis HSET: ${key}.${field}`);
        }
        catch (error) {
            logger.error(`Redis HSET错误 ${key}.${field}:`, error);
            throw error;
        }
    }
    async hGet(key, field) {
        try {
            const value = await this.client.hGet(key, field);
            return value || undefined;
        }
        catch (error) {
            logger.error(`Redis HGET错误 ${key}.${field}:`, error);
            throw error;
        }
    }
    async hGetAll(key) {
        try {
            return await this.client.hGetAll(key);
        }
        catch (error) {
            logger.error(`Redis HGETALL错误 ${key}:`, error);
            throw error;
        }
    }
    async hDel(key, field) {
        try {
            await this.client.hDel(key, field);
            logger.debug(`Redis HDEL: ${key}.${field}`);
        }
        catch (error) {
            logger.error(`Redis HDEL错误 ${key}.${field}:`, error);
            throw error;
        }
    }
    async sAdd(key, member) {
        try {
            await this.client.sAdd(key, member);
            logger.debug(`Redis SADD: ${key} ${member}`);
        }
        catch (error) {
            logger.error(`Redis SADD错误 ${key}:`, error);
            throw error;
        }
    }
    async sRem(key, member) {
        try {
            await this.client.sRem(key, member);
            logger.debug(`Redis SREM: ${key} ${member}`);
        }
        catch (error) {
            logger.error(`Redis SREM错误 ${key}:`, error);
            throw error;
        }
    }
    async sMembers(key) {
        try {
            return await this.client.sMembers(key);
        }
        catch (error) {
            logger.error(`Redis SMEMBERS错误 ${key}:`, error);
            throw error;
        }
    }
    getClient() {
        return this.client;
    }
}
export const redis = RedisService.getInstance();
//# sourceMappingURL=redis.js.map