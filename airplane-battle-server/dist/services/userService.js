import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../database/connection.js';
import { redis } from '../database/redis.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
export class UserService {
    static SALT_ROUNDS = 12;
    static async register(data) {
        try {
            const { username, email, password, displayName } = data;
            const existingUser = await this.findByUsernameOrEmail(username, email);
            if (existingUser) {
                return {
                    success: false,
                    message: '用户名或邮箱已存在',
                    error: { code: 'USER_EXISTS' }
                };
            }
            const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
            const userId = uuidv4();
            const query = `
        INSERT INTO users (
          user_id, username, email, password_hash, display_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING user_id, username, email, display_name, level, experience, wins, losses, rating, created_at
      `;
            const result = await database.query(query, [
                userId,
                username,
                email,
                passwordHash,
                displayName || username
            ]);
            const newUser = result.rows[0];
            const userProfile = {
                userId: newUser.user_id,
                username: newUser.username,
                displayName: newUser.display_name,
                level: newUser.level,
                experience: newUser.experience,
                wins: newUser.wins,
                losses: newUser.losses,
                rating: newUser.rating
            };
            logger.info(`新用户注册成功: ${username}`);
            return {
                success: true,
                message: '注册成功',
                data: userProfile
            };
        }
        catch (error) {
            logger.error('用户注册失败:', error);
            if (error instanceof Error && 'code' in error && error.code === '23505') {
                return {
                    success: false,
                    message: '用户名或邮箱已存在',
                    error: { code: 'USER_EXISTS' }
                };
            }
            return {
                success: false,
                message: '注册失败',
                error: { code: 'REGISTRATION_FAILED' }
            };
        }
    }
    static async login(data) {
        try {
            const { username, password } = data;
            const user = await this.findByUsername(username);
            if (!user) {
                return {
                    success: false,
                    message: '用户名或密码错误',
                };
            }
            if (!user.is_active) {
                return {
                    success: false,
                    message: '账户已被禁用',
                };
            }
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: '用户名或密码错误',
                };
            }
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            await database.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
            await this.saveRefreshToken(user.user_id, refreshToken);
            await redis.setJSON(`session:${user.user_id}`, {
                userId: user.user_id,
                username: user.username,
                loginTime: new Date().toISOString()
            }, 24 * 60 * 60);
            const userProfile = {
                userId: user.user_id,
                username: user.username,
                displayName: user.display_name,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatar_url
            };
            logger.info(`用户登录成功: ${username}`);
            return {
                success: true,
                message: '登录成功',
                data: {
                    token: accessToken,
                    refreshToken,
                    user: userProfile
                }
            };
        }
        catch (error) {
            logger.error('用户登录失败:', error);
            return {
                success: false,
                message: '登录失败'
            };
        }
    }
    static async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.secret);
            const user = await this.findById(decoded.userId);
            if (!user || !user.is_active) {
                return {
                    success: false,
                    message: '用户不存在或已被禁用'
                };
            }
            const tokenExists = await this.verifyRefreshToken(user.user_id, refreshToken);
            if (!tokenExists) {
                return {
                    success: false,
                    message: '无效的refresh token'
                };
            }
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            await this.updateRefreshToken(user.user_id, refreshToken, newRefreshToken);
            const userProfile = {
                userId: user.user_id,
                username: user.username,
                displayName: user.display_name,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatar_url
            };
            return {
                success: true,
                message: 'Token刷新成功',
                data: {
                    token: newAccessToken,
                    refreshToken: newRefreshToken,
                    user: userProfile
                }
            };
        }
        catch (error) {
            logger.error('Token刷新失败:', error);
            return {
                success: false,
                message: 'Token刷新失败'
            };
        }
    }
    static async logout(userId, refreshToken) {
        try {
            await redis.del(`session:${userId}`);
            if (refreshToken) {
                await database.query('DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token = $2', [userId, refreshToken]);
            }
            else {
                await database.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
            }
            logger.info(`用户登出: ${userId}`);
            return {
                success: true,
                message: '登出成功'
            };
        }
        catch (error) {
            logger.error('用户登出失败:', error);
            return {
                success: false,
                message: '登出失败'
            };
        }
    }
    static async getUserProfile(userId) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在',
                    error: { code: 'USER_NOT_FOUND' }
                };
            }
            const userProfile = {
                userId: user.user_id,
                username: user.username,
                displayName: user.display_name,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatar_url
            };
            return {
                success: true,
                message: '获取用户资料成功',
                data: userProfile
            };
        }
        catch (error) {
            logger.error('获取用户资料失败:', error);
            return {
                success: false,
                message: '获取用户资料失败'
            };
        }
    }
    static async findByUsername(username) {
        try {
            const result = await database.query('SELECT * FROM users WHERE username = $1', [username]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger.error('查找用户失败:', error);
            return null;
        }
    }
    static async findById(userId) {
        try {
            const result = await database.query('SELECT * FROM users WHERE user_id = $1', [userId]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger.error('查找用户失败:', error);
            return null;
        }
    }
    static async findByUsernameOrEmail(username, email) {
        try {
            const result = await database.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger.error('查找用户失败:', error);
            return null;
        }
    }
    static generateAccessToken(user) {
        const payload = {
            userId: user.user_id,
            username: user.username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60)
        };
        return jwt.sign(payload, config.jwt.secret);
    }
    static generateRefreshToken(user) {
        const payload = {
            userId: user.user_id,
            username: user.username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        };
        return jwt.sign(payload, config.jwt.secret);
    }
    static async saveRefreshToken(userId, refreshToken) {
        try {
            const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
            await database.query(`
        INSERT INTO user_sessions (user_id, refresh_token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          created_at = NOW()
      `, [userId, refreshToken, expiresAt]);
        }
        catch (error) {
            logger.error('保存refresh token失败:', error);
            throw error;
        }
    }
    static async verifyRefreshToken(userId, refreshToken) {
        try {
            const result = await database.query(`
        SELECT session_id FROM user_sessions 
        WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW() AND is_active = true
      `, [userId, refreshToken]);
            return result.rows.length > 0;
        }
        catch (error) {
            logger.error('验证refresh token失败:', error);
            return false;
        }
    }
    static async updateRefreshToken(userId, oldToken, newToken) {
        try {
            const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
            await database.query(`
        UPDATE user_sessions 
        SET refresh_token = $1, expires_at = $2, created_at = NOW()
        WHERE user_id = $3 AND refresh_token = $4
      `, [newToken, expiresAt, userId, oldToken]);
        }
        catch (error) {
            logger.error('更新refresh token失败:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=userService.js.map