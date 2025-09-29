import { database } from './connection.js';
import { logger } from '../utils/logger.js';
export class Migration {
    static async createUsersTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        avatar_url VARCHAR(500),
        level INTEGER DEFAULT 1,
        experience BIGINT DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 1000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );
      
      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);
    `;
        await database.query(sql);
        logger.info('用户表创建完成');
    }
    static async createRoomsTable() {
        const sql = `
      CREATE TYPE room_type AS ENUM ('public', 'private');
      CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');
      
      CREATE TABLE IF NOT EXISTS rooms (
        room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_name VARCHAR(100) NOT NULL,
        room_type room_type NOT NULL DEFAULT 'public',
        password VARCHAR(50),
        max_players INTEGER NOT NULL DEFAULT 2,
        current_players INTEGER NOT NULL DEFAULT 0,
        status room_status NOT NULL DEFAULT 'waiting',
        host_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
      CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_user_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);
    `;
        await database.query(sql);
        logger.info('房间表创建完成');
    }
    static async createRoomMembersTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS room_members (
        room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
        is_ready BOOLEAN DEFAULT false,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id),
        UNIQUE (room_id, player_number)
      );
      
      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
    `;
        await database.query(sql);
        logger.info('房间成员表创建完成');
    }
    static async createGamesTable() {
        const sql = `
      CREATE TYPE game_phase AS ENUM ('waiting', 'placement', 'battle', 'finished');
      
      CREATE TABLE IF NOT EXISTS games (
        game_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
        player1_id UUID NOT NULL REFERENCES users(user_id),
        player2_id UUID NOT NULL REFERENCES users(user_id),
        winner_id UUID REFERENCES users(user_id),
        current_phase game_phase NOT NULL DEFAULT 'waiting',
        current_player INTEGER CHECK (current_player IN (1, 2)),
        turn_count INTEGER DEFAULT 0,
        game_duration INTEGER, -- 游戏时长(秒)
        player1_airplane JSON,
        player2_airplane JSON,
        attack_history JSON,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        finished_at TIMESTAMP WITH TIME ZONE
      );
      
      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_games_room ON games(room_id);
      CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
      CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
      CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner_id);
      CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at DESC);
    `;
        await database.query(sql);
        logger.info('游戏记录表创建完成');
    }
    static async createUserSessionsTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true
      );
      
      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
    `;
        await database.query(sql);
        logger.info('用户会话表创建完成');
    }
    static async runMigrations() {
        try {
            logger.info('开始执行数据库迁移...');
            const isConnected = await database.testConnection();
            if (!isConnected) {
                throw new Error('数据库连接失败');
            }
            await this.createUsersTable();
            await this.createRoomsTable();
            await this.createRoomMembersTable();
            await this.createGamesTable();
            await this.createUserSessionsTable();
            logger.info('数据库迁移完成！');
        }
        catch (error) {
            logger.error('数据库迁移失败:', error);
            throw error;
        }
    }
    static async dropAllTables() {
        try {
            logger.warn('清理数据库表...');
            const sql = `
        DROP TABLE IF EXISTS user_sessions CASCADE;
        DROP TABLE IF EXISTS games CASCADE;
        DROP TABLE IF EXISTS room_members CASCADE;
        DROP TABLE IF EXISTS rooms CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TYPE IF EXISTS room_type CASCADE;
        DROP TYPE IF EXISTS room_status CASCADE;
        DROP TYPE IF EXISTS game_phase CASCADE;
      `;
            await database.query(sql);
            logger.info('数据库表清理完成');
        }
        catch (error) {
            logger.error('清理数据库失败:', error);
            throw error;
        }
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    Migration.runMigrations()
        .then(() => {
        logger.info('迁移完成，正在退出...');
        process.exit(0);
    })
        .catch((error) => {
        logger.error('迁移失败:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map