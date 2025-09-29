import { Client } from 'pg';
import { mongoDatabase, User, Room, Game, UserSession, initializeIndexes } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
export class DataMigration {
    pgClient;
    migrationLog = [];
    constructor() {
        this.pgClient = new Client({
            host: config.database.host,
            port: config.database.port,
            database: config.database.database,
            user: config.database.username,
            password: config.database.password,
            ssl: config.database.ssl ? { rejectUnauthorized: false } : false
        });
    }
    async runFullMigration() {
        try {
            logger.info('开始执行数据库迁移...');
            this.logStep('migration_start', 'success', '开始数据迁移');
            await this.connectDatabases();
            await this.validateSourceData();
            await this.initializeMongoDB();
            await this.migrateUsers();
            await this.migrateRooms();
            await this.migrateGames();
            await this.migrateUserSessions();
            await this.validateMigration();
            await this.createIndexes();
            this.logStep('migration_complete', 'success', '数据迁移完成');
            logger.info('数据库迁移成功完成！');
        }
        catch (error) {
            this.logStep('migration_error', 'error', `迁移失败: ${error.message}`);
            logger.error('数据库迁移失败:', error);
            throw error;
        }
        finally {
            await this.disconnectDatabases();
            await this.generateMigrationReport();
        }
    }
    async connectDatabases() {
        try {
            await this.pgClient.connect();
            logger.info('PostgreSQL连接成功');
            await mongoDatabase.connect();
            logger.info('MongoDB连接成功');
            this.logStep('database_connection', 'success', '数据库连接成功');
        }
        catch (error) {
            this.logStep('database_connection', 'error', `数据库连接失败: ${error.message}`);
            throw error;
        }
    }
    async disconnectDatabases() {
        try {
            await this.pgClient.end();
            await mongoDatabase.disconnect();
            logger.info('数据库连接已关闭');
        }
        catch (error) {
            logger.error('关闭数据库连接失败:', error);
        }
    }
    async validateSourceData() {
        try {
            const tables = ['users', 'rooms', 'room_members', 'games', 'user_sessions'];
            for (const table of tables) {
                const result = await this.pgClient.query(`SELECT COUNT(*) FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                logger.info(`${table} 表记录数: ${count}`);
            }
            this.logStep('source_validation', 'success', '源数据验证完成');
        }
        catch (error) {
            this.logStep('source_validation', 'error', `源数据验证失败: ${error.message}`);
            throw error;
        }
    }
    async initializeMongoDB() {
        try {
            const collections = ['users', 'rooms', 'games', 'usersessions'];
            for (const collection of collections) {
                try {
                    const db = mongoDatabase.getDatabase();
                    if (db) {
                        await db.collection(collection).drop();
                        logger.info(`清空集合: ${collection}`);
                    }
                }
                catch (error) {
                    if (error.codeName !== 'NamespaceNotFound') {
                        throw error;
                    }
                }
            }
            this.logStep('mongodb_init', 'success', 'MongoDB初始化完成');
        }
        catch (error) {
            this.logStep('mongodb_init', 'error', `MongoDB初始化失败: ${error.message}`);
            throw error;
        }
    }
    async migrateUsers() {
        try {
            logger.info('开始迁移用户数据...');
            const result = await this.pgClient.query(`
        SELECT 
          user_id,
          username,
          email,
          password_hash,
          display_name,
          avatar_url,
          level,
          experience,
          wins,
          losses,
          rating,
          created_at,
          last_login,
          is_active
        FROM users
        ORDER BY created_at
      `);
            const users = result.rows;
            let migrated = 0;
            for (const user of users) {
                try {
                    await User.create({
                        userId: user.user_id,
                        username: user.username,
                        email: user.email,
                        passwordHash: user.password_hash,
                        displayName: user.display_name,
                        avatarUrl: user.avatar_url,
                        level: user.level,
                        experience: user.experience,
                        wins: user.wins,
                        losses: user.losses,
                        rating: user.rating,
                        isActive: user.is_active,
                        createdAt: user.created_at,
                        lastLogin: user.last_login
                    });
                    migrated++;
                }
                catch (error) {
                    const username = user.username ?? 'unknown';
                    logger.error(`迁移用户失败 ${username}:`, error);
                }
            }
            this.logStep('user_migration', 'success', `用户数据迁移完成: ${migrated}/${users.length}`);
            logger.info(`用户数据迁移完成: ${migrated}/${users.length}`);
        }
        catch (error) {
            this.logStep('user_migration', 'error', `用户数据迁移失败: ${error.message}`);
            throw error;
        }
    }
    async migrateRooms() {
        try {
            logger.info('开始迁移房间数据...');
            const result = await this.pgClient.query(`
        SELECT 
          r.room_id,
          r.room_name,
          r.room_type,
          r.password,
          r.max_players,
          r.current_players,
          r.status,
          r.host_user_id,
          r.created_at,
          r.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'userId', rm.user_id,
                'playerNumber', rm.player_number,
                'isReady', rm.is_ready,
                'joinedAt', rm.joined_at
              )
            ) FILTER (WHERE rm.user_id IS NOT NULL),
            '[]'::json
          ) as members
        FROM rooms r
        LEFT JOIN room_members rm ON r.room_id = rm.room_id
        GROUP BY r.room_id, r.room_name, r.room_type, r.password, r.max_players, 
                 r.current_players, r.status, r.host_user_id, r.created_at, r.updated_at
        ORDER BY r.created_at
      `);
            const rooms = result.rows;
            let migrated = 0;
            for (const room of rooms) {
                try {
                    const members = Array.isArray(room.members)
                        ? room.members.filter((member) => member.userId)
                        : [];
                    await Room.create({
                        roomId: room.room_id,
                        roomName: room.room_name,
                        roomType: room.room_type,
                        password: room.password,
                        maxPlayers: room.max_players,
                        currentPlayers: room.current_players,
                        status: room.status,
                        hostUserId: room.host_user_id,
                        members: members,
                        createdAt: room.created_at,
                        updatedAt: room.updated_at
                    });
                    migrated++;
                }
                catch (error) {
                    const roomName = room.room_name ?? 'unknown';
                    logger.error(`迁移房间失败 ${roomName}:`, error);
                }
            }
            if (migrated > 0) {
                this.logStep('room_migration', 'success', `房间数据迁移完成: ${migrated}/${rooms.length}`);
                logger.info(`房间数据迁移完成: ${migrated}/${rooms.length}`);
            }
            else {
                throw new Error(`所有房间迁移均失败`);
            }
        }
        catch (error) {
            this.logStep('room_migration', 'error', `房间数据迁移失败: ${error.message}`);
            throw error;
        }
    }
    async migrateGames() {
        try {
            logger.info('开始迁移游戏数据...');
            const result = await this.pgClient.query(`
        SELECT 
          game_id,
          room_id,
          player1_id,
          player2_id,
          winner_id,
          current_phase,
          current_player,
          turn_count,
          game_duration,
          player1_airplane,
          player2_airplane,
          attack_history,
          started_at,
          finished_at
        FROM games
        ORDER BY started_at
      `);
            const games = result.rows;
            let migrated = 0;
            for (const game of games) {
                try {
                    await Game.create({
                        gameId: game.game_id,
                        roomId: game.room_id,
                        player1Id: game.player1_id,
                        player2Id: game.player2_id,
                        winnerId: game.winner_id,
                        currentPhase: game.current_phase,
                        currentPlayer: game.current_player,
                        turnCount: game.turn_count,
                        gameDuration: game.game_duration,
                        player1Airplane: game.player1_airplane,
                        player2Airplane: game.player2_airplane,
                        attackHistory: game.attack_history || [],
                        startedAt: game.started_at,
                        finishedAt: game.finished_at
                    });
                    migrated++;
                }
                catch (error) {
                    logger.error(`迁移游戏失败 ${game.game_id}:`, error);
                }
            }
            this.logStep('game_migration', 'success', `游戏数据迁移完成: ${migrated}/${games.length}`);
            logger.info(`游戏数据迁移完成: ${migrated}/${games.length}`);
        }
        catch (error) {
            this.logStep('game_migration', 'error', `游戏数据迁移失败: ${error.message}`);
            throw error;
        }
    }
    async migrateUserSessions() {
        try {
            logger.info('开始迁移用户会话数据...');
            const result = await this.pgClient.query(`
        SELECT 
          session_id,
          user_id,
          refresh_token,
          ip_address,
          user_agent,
          created_at,
          expires_at,
          is_active
        FROM user_sessions
        WHERE expires_at > NOW() AND is_active = true
        ORDER BY created_at
      `);
            const sessions = result.rows;
            let migrated = 0;
            for (const session of sessions) {
                try {
                    await UserSession.create({
                        sessionId: session.session_id,
                        userId: session.user_id,
                        refreshToken: session.refresh_token,
                        ipAddress: session.ip_address,
                        userAgent: session.user_agent,
                        isActive: session.is_active,
                        createdAt: session.created_at,
                        expiresAt: session.expires_at
                    });
                    migrated++;
                }
                catch (error) {
                    logger.error(`迁移会话失败 ${session.session_id}:`, error);
                }
            }
            this.logStep('session_migration', 'success', `会话数据迁移完成: ${migrated}/${sessions.length}`);
            logger.info(`会话数据迁移完成: ${migrated}/${sessions.length}`);
        }
        catch (error) {
            this.logStep('session_migration', 'error', `会话数据迁移失败: ${error.message}`);
            throw error;
        }
    }
    async validateMigration() {
        try {
            logger.info('开始验证迁移结果...');
            const pgCounts = await Promise.all([
                this.pgClient.query('SELECT COUNT(*) FROM users'),
                this.pgClient.query('SELECT COUNT(*) FROM rooms'),
                this.pgClient.query('SELECT COUNT(*) FROM games'),
                this.pgClient.query('SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW() AND is_active = true')
            ]);
            const mongoCounts = await Promise.all([
                User.countDocuments(),
                Room.countDocuments(),
                Game.countDocuments(),
                UserSession.countDocuments()
            ]);
            const tables = ['users', 'rooms', 'games', 'user_sessions'];
            let validationPassed = true;
            for (let i = 0; i < tables.length; i++) {
                const pgCount = parseInt(pgCounts[i].rows[0].count);
                const mongoCount = mongoCounts[i];
                if (pgCount !== mongoCount && tables[i] !== 'user_sessions') {
                    logger.error(`${tables[i]} 记录数不匹配: PostgreSQL=${pgCount}, MongoDB=${mongoCount}`);
                    validationPassed = false;
                }
                else {
                    logger.info(`${tables[i]} 记录数验证通过: ${mongoCount}`);
                }
            }
            if (validationPassed) {
                this.logStep('migration_validation', 'success', '迁移验证通过');
            }
            else {
                this.logStep('migration_validation', 'error', '迁移验证失败');
                throw new Error('迁移验证失败');
            }
        }
        catch (error) {
            this.logStep('migration_validation', 'error', `迁移验证失败: ${error.message}`);
            throw error;
        }
    }
    async createIndexes() {
        try {
            logger.info('开始创建索引...');
            await initializeIndexes();
            this.logStep('index_creation', 'success', '索引创建完成');
        }
        catch (error) {
            this.logStep('index_creation', 'error', `索引创建失败: ${error.message}`);
            throw error;
        }
    }
    logStep(step, status, message) {
        this.migrationLog.push({
            step,
            status,
            message,
            timestamp: new Date()
        });
    }
    async generateMigrationReport() {
        try {
            const report = {
                migrationId: `migration_${Date.now()}`,
                startTime: this.migrationLog[0]?.timestamp,
                endTime: new Date(),
                steps: this.migrationLog,
                summary: {
                    totalSteps: this.migrationLog.length,
                    successSteps: this.migrationLog.filter(log => log.status === 'success').length,
                    errorSteps: this.migrationLog.filter(log => log.status === 'error').length
                }
            };
            const reportJson = JSON.stringify(report, null, 2);
            logger.info('迁移报告:', reportJson);
            console.log('\n========== 迁移报告 ==========');
            console.log(`迁移ID: ${report.migrationId}`);
            console.log(`开始时间: ${report.startTime}`);
            console.log(`结束时间: ${report.endTime}`);
            console.log(`总步骤数: ${report.summary.totalSteps}`);
            console.log(`成功步骤: ${report.summary.successSteps}`);
            console.log(`失败步骤: ${report.summary.errorSteps}`);
            console.log('================================\n');
        }
        catch (error) {
            logger.error('生成迁移报告失败:', error);
        }
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const migration = new DataMigration();
    migration.runFullMigration()
        .then(() => {
        logger.info('迁移完成，正在退出...');
        process.exit(0);
    })
        .catch((error) => {
        logger.error('迁移失败:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=dataMigration.js.map