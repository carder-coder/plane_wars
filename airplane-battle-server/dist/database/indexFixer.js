import { mongoDatabase } from '../database/mongoConnection.js';
import { logger } from '../utils/logger.js';
export class IndexFixer {
    static async fixIndexConflicts() {
        try {
            await mongoDatabase.connect();
            logger.info('开始修复索引冲突...');
            await this.fixUserSessionIndexes();
            logger.info('索引冲突修复完成');
        }
        catch (error) {
            logger.error('修复索引冲突失败:', error);
            throw error;
        }
        finally {
            await mongoDatabase.disconnect();
        }
    }
    static async fixUserSessionIndexes() {
        try {
            const db = mongoDatabase.getDatabase();
            if (!db) {
                throw new Error('数据库连接不可用');
            }
            const collection = db.collection('usersessions');
            const indexes = await collection.listIndexes().toArray();
            logger.info('UserSession现有索引:', indexes.map(idx => idx.name));
            const conflictingIndex = indexes.find(idx => idx.name === 'expiresAt_1' && !idx.expireAfterSeconds);
            if (conflictingIndex) {
                logger.info('发现冲突的expiresAt索引，正在删除...');
                await collection.dropIndex('expiresAt_1');
                logger.info('已删除冲突的expiresAt索引');
            }
            const ttlIndex = indexes.find(idx => idx.name === 'expiresAt_1' && idx.expireAfterSeconds === 0);
            if (!ttlIndex) {
                logger.info('创建正确的TTL索引...');
                await collection.createIndex({ expiresAt: 1 }, {
                    name: 'expiresAt_1',
                    expireAfterSeconds: 0,
                    background: true
                });
                logger.info('TTL索引创建完成');
            }
            else {
                logger.info('TTL索引已存在且配置正确');
            }
        }
        catch (error) {
            logger.error('修复UserSession索引失败:', error);
            throw error;
        }
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    IndexFixer.fixIndexConflicts()
        .then(() => {
        logger.info('索引修复完成，正在退出...');
        process.exit(0);
    })
        .catch((error) => {
        logger.error('索引修复失败:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=indexFixer.js.map