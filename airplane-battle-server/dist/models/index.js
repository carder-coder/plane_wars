export { User } from './User.js';
export { Room } from './Room.js';
export { Game } from './Game.js';
export { UserSession } from './UserSession.js';
export { mongoDatabase, mongoose } from '../database/mongoConnection.js';
export async function initializeIndexes() {
    const { User } = await import('./User.js');
    const { Room } = await import('./Room.js');
    const { Game } = await import('./Game.js');
    const { UserSession } = await import('./UserSession.js');
    try {
        console.log('开始创建数据库索引...');
        try {
            await User.createIndexes();
            console.log('✓ 用户索引创建完成');
        }
        catch (error) {
            if (error.code === 85) {
                console.log('✓ 用户索引已存在（跳过冒突）');
            }
            else {
                throw error;
            }
        }
        try {
            await Room.createIndexes();
            console.log('✓ 房间索引创建完成');
        }
        catch (error) {
            if (error.code === 85) {
                console.log('✓ 房间索引已存在（跳过冒突）');
            }
            else {
                throw error;
            }
        }
        try {
            await Game.createIndexes();
            console.log('✓ 游戏索引创建完成');
        }
        catch (error) {
            if (error.code === 85) {
                console.log('✓ 游戏索引已存在（跳过冗突）');
            }
            else {
                throw error;
            }
        }
        try {
            await UserSession.createIndexes();
            console.log('✓ 用户会话索引创建完成');
        }
        catch (error) {
            if (error.code === 85) {
                console.log('✓ 用户会话索引已存在（跳过冒突）');
            }
            else {
                throw error;
            }
        }
        console.log('所有数据库索引创建完成');
    }
    catch (error) {
        console.error('创建数据库索引失败:', error);
        throw error;
    }
}
export async function dropAllCollections() {
    const { mongoose } = await import('../database/mongoConnection.js');
    try {
        const collections = await mongoose.connection.db?.listCollections().toArray();
        for (const collection of collections || []) {
            await mongoose.connection.db?.dropCollection(collection.name);
            console.log(`✓ 删除集合: ${collection.name}`);
        }
        console.log('所有集合删除完成');
    }
    catch (error) {
        console.error('删除集合失败:', error);
        throw error;
    }
}
export async function getDatabaseStats() {
    const { User } = await import('./User.js');
    const { Room } = await import('./Room.js');
    const { Game } = await import('./Game.js');
    const { UserSession } = await import('./UserSession.js');
    try {
        const [userCount, roomCount, gameCount, sessionCount] = await Promise.all([
            User.countDocuments(),
            Room.countDocuments(),
            Game.countDocuments(),
            UserSession.countDocuments()
        ]);
        return {
            users: userCount,
            rooms: roomCount,
            games: gameCount,
            sessions: sessionCount,
            timestamp: new Date()
        };
    }
    catch (error) {
        console.error('获取数据库统计信息失败:', error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map