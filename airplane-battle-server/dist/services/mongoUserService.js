import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, UserSession } from '../models/index.js';
import { redis } from '../database/redis.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
export class MongoUserService {
    static SALT_ROUNDS = 12;
    static async register(data) {
        try {
            const { username, email, password, displayName } = data;
            const existingUser = await User.findOne({
                $or: [
                    { username },
                    { email }
                ]
            });
            if (existingUser) {
                return {
                    success: false,
                    message: '用户名或邮箱已存在',
                    error: { code: 'USER_EXISTS' }
                };
            }
            const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
            const userId = uuidv4();
            const newUser = new User({
                userId,
                username,
                email,
                passwordHash,
                displayName: displayName || username,
                level: 1,
                experience: 0,
                wins: 0,
                losses: 0,
                rating: 1000,
                isActive: true,
                createdAt: new Date()
            });
            await newUser.save();
            const userProfile = {
                userId: newUser.userId,
                username: newUser.username,
                displayName: newUser.displayName,
                level: newUser.level,
                experience: newUser.experience,
                wins: newUser.wins,
                losses: newUser.losses,
                rating: newUser.rating,
                avatarUrl: newUser.avatarUrl
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
            if (error instanceof Error && 'code' in error && error.code === 11000) {
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
            const user = await User.findByUsername(username);
            if (!user) {
                return {
                    success: false,
                    message: '用户名或密码错误',
                };
            }
            if (!user.isActive) {
                return {
                    success: false,
                    message: '账户已被禁用',
                };
            }
            if (!user.passwordHash) {
                return {
                    success: false,
                    message: '用户名或密码错误',
                };
            }
            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: '用户名或密码错误',
                };
            }
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            user.lastLogin = new Date();
            await user.save();
            await this.saveRefreshToken(user.userId, refreshToken);
            await redis.setJSON(`session:${user.userId}`, {
                userId: user.userId,
                username: user.username,
                loginTime: new Date().toISOString()
            }, 24 * 60 * 60);
            const userProfile = {
                userId: user.userId,
                username: user.username,
                displayName: user.displayName,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatarUrl
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
            const user = await User.findOne({ userId: decoded.userId, isActive: true });
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在或已被禁用'
                };
            }
            const tokenExists = await this.verifyRefreshToken(user.userId, refreshToken);
            if (!tokenExists) {
                return {
                    success: false,
                    message: '无效的refresh token'
                };
            }
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            await this.updateRefreshToken(user.userId, refreshToken, newRefreshToken);
            const userProfile = {
                userId: user.userId,
                username: user.username,
                displayName: user.displayName,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatarUrl
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
                await UserSession.findOneAndUpdate({ userId, refreshToken }, { isActive: false });
            }
            else {
                await UserSession.deactivateUserSessions(userId);
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
            const user = await User.findOne({ userId, isActive: true });
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在',
                    error: { code: 'USER_NOT_FOUND' }
                };
            }
            const userProfile = {
                userId: user.userId,
                username: user.username,
                displayName: user.displayName,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatarUrl
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
    static async updateUserProfile(userId, updates) {
        try {
            const user = await User.findOne({ userId, isActive: true });
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在',
                    error: { code: 'USER_NOT_FOUND' }
                };
            }
            if (updates.displayName !== undefined) {
                user.displayName = updates.displayName;
            }
            if (updates.avatarUrl !== undefined) {
                user.avatarUrl = updates.avatarUrl;
            }
            await user.save();
            const userProfile = {
                userId: user.userId,
                username: user.username,
                displayName: user.displayName,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatarUrl
            };
            return {
                success: true,
                message: '用户资料更新成功',
                data: userProfile
            };
        }
        catch (error) {
            logger.error('更新用户资料失败:', error);
            return {
                success: false,
                message: '更新用户资料失败'
            };
        }
    }
    static async getLeaderboard(limit = 10) {
        try {
            const users = await User.getLeaderboard(limit);
            const leaderboard = users.map((user) => ({
                userId: user.userId,
                username: user.username,
                displayName: user.displayName,
                level: user.level,
                experience: user.experience,
                wins: user.wins,
                losses: user.losses,
                rating: user.rating,
                avatarUrl: user.avatarUrl
            }));
            return {
                success: true,
                message: '获取排行榜成功',
                data: leaderboard
            };
        }
        catch (error) {
            logger.error('获取排行榜失败:', error);
            return {
                success: false,
                message: '获取排行榜失败'
            };
        }
    }
    static async updateGameStats(userId, isWin, experienceGain = 10) {
        try {
            const user = await User.findOne({ userId, isActive: true });
            if (!user) {
                return {
                    success: false,
                    message: '用户不存在',
                    error: { code: 'USER_NOT_FOUND' }
                };
            }
            user.updateStats(isWin, experienceGain);
            await user.save();
            logger.info(`用户游戏统计更新: ${userId}, 胜利: ${isWin}, 经验: ${experienceGain}`);
            return {
                success: true,
                message: '游戏统计更新成功'
            };
        }
        catch (error) {
            logger.error('更新游戏统计失败:', error);
            return {
                success: false,
                message: '更新游戏统计失败'
            };
        }
    }
    static generateAccessToken(user) {
        const payload = {
            userId: user.userId,
            username: user.username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60)
        };
        return jwt.sign(payload, config.jwt.secret);
    }
    static generateRefreshToken(user) {
        const payload = {
            userId: user.userId,
            username: user.username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        };
        return jwt.sign(payload, config.jwt.secret);
    }
    static async saveRefreshToken(userId, refreshToken) {
        try {
            const sessionId = uuidv4();
            await UserSession.createSession(sessionId, userId, refreshToken, 7 * 24 * 60 * 60);
        }
        catch (error) {
            logger.error('保存refresh token失败:', error);
            throw error;
        }
    }
    static async verifyRefreshToken(userId, refreshToken) {
        try {
            const session = await UserSession.findByRefreshToken(refreshToken);
            return !!session && session.userId === userId && session.isValid();
        }
        catch (error) {
            logger.error('验证refresh token失败:', error);
            return false;
        }
    }
    static async updateRefreshToken(_userId, oldToken, newToken) {
        try {
            await UserSession.refreshSession(oldToken, newToken, 7 * 24 * 60 * 60);
        }
        catch (error) {
            logger.error('更新refresh token失败:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=mongoUserService.js.map