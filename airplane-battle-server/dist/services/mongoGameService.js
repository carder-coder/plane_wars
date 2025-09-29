import { Game, Room, User } from '../models/index.js';
import { MongoUserService } from './mongoUserService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
export class MongoGameService {
    static async createGame(roomId, player1Id, player2Id) {
        try {
            const room = await Room.findOne({ roomId });
            if (!room) {
                return {
                    success: false,
                    message: '房间不存在',
                    error: { code: 'ROOM_NOT_FOUND' }
                };
            }
            const [player1, player2] = await Promise.all([
                User.findOne({ userId: player1Id, isActive: true }),
                User.findOne({ userId: player2Id, isActive: true })
            ]);
            if (!player1 || !player2) {
                return {
                    success: false,
                    message: '玩家不存在',
                    error: { code: 'PLAYER_NOT_FOUND' }
                };
            }
            const gameId = uuidv4();
            const newGame = new Game({
                gameId,
                roomId,
                player1Id,
                player2Id,
                currentPhase: 'placement',
                turnCount: 0,
                attackHistory: [],
                startedAt: new Date()
            });
            await newGame.save();
            room.status = 'playing';
            await room.save();
            logger.info(`游戏创建成功: ${gameId}`);
            return {
                success: true,
                message: '游戏创建成功',
                data: newGame.toJSON()
            };
        }
        catch (error) {
            logger.error('创建游戏失败:', error);
            return {
                success: false,
                message: '创建游戏失败',
                error: { code: 'CREATE_GAME_FAILED' }
            };
        }
    }
    static async placePlane(gameId, playerId, airplane) {
        try {
            const game = await Game.findOne({ gameId });
            if (!game) {
                return {
                    success: false,
                    message: '游戏不存在',
                    error: { code: 'GAME_NOT_FOUND' }
                };
            }
            if (game.player1Id !== playerId && game.player2Id !== playerId) {
                return {
                    success: false,
                    message: '无权限操作此游戏',
                    error: { code: 'NO_PERMISSION' }
                };
            }
            const success = game.placePlane(playerId, airplane);
            if (!success) {
                return {
                    success: false,
                    message: '飞机放置失败',
                    error: { code: 'PLACE_PLANE_FAILED' }
                };
            }
            await game.save();
            logger.info(`玩家 ${playerId} 在游戏 ${gameId} 中放置飞机`);
            return {
                success: true,
                message: '飞机放置成功',
                data: {
                    gamePhase: game.currentPhase,
                    currentPlayer: game.currentPlayer,
                    bothPlayersReady: game.bothPlayersPlaced
                }
            };
        }
        catch (error) {
            logger.error('放置飞机失败:', error);
            return {
                success: false,
                message: '放置飞机失败',
                error: { code: 'PLACE_PLANE_FAILED' }
            };
        }
    }
    static async attack(gameId, attackerId, coordinate) {
        try {
            const game = await Game.findOne({ gameId });
            if (!game) {
                return {
                    success: false,
                    message: '游戏不存在',
                    error: { code: 'GAME_NOT_FOUND' }
                };
            }
            const result = game.attack(attackerId, coordinate);
            if (!result) {
                return {
                    success: false,
                    message: '攻击失败',
                    error: { code: 'ATTACK_FAILED' }
                };
            }
            await game.save();
            if (game.currentPhase === 'finished' && game.winnerId) {
                const winnerId = game.winnerId;
                const loserId = winnerId === game.player1Id ? game.player2Id : game.player1Id;
                await Promise.all([
                    MongoUserService.updateGameStats(winnerId, true, 15),
                    MongoUserService.updateGameStats(loserId, false, 5)
                ]);
                const room = await Room.findOne({ roomId: game.roomId });
                if (room) {
                    room.status = 'finished';
                    await room.save();
                }
            }
            logger.info(`玩家 ${attackerId} 攻击 (${coordinate.x},${coordinate.y}): ${result}`);
            return {
                success: true,
                message: '攻击成功',
                data: {
                    result,
                    coordinate,
                    currentPlayer: game.currentPlayer,
                    gamePhase: game.currentPhase,
                    winnerId: game.winnerId,
                    turnCount: game.turnCount
                }
            };
        }
        catch (error) {
            logger.error('攻击失败:', error);
            return {
                success: false,
                message: '攻击失败',
                error: { code: 'ATTACK_FAILED' }
            };
        }
    }
    static async getGameState(gameId) {
        try {
            const game = await Game.findOne({ gameId });
            if (!game) {
                return {
                    success: false,
                    message: '游戏不存在',
                    error: { code: 'GAME_NOT_FOUND' }
                };
            }
            const [player1, player2] = await Promise.all([
                User.findOne({ userId: game.player1Id }, 'username displayName'),
                User.findOne({ userId: game.player2Id }, 'username displayName')
            ]);
            const gameState = {
                gameId: game.gameId,
                roomId: game.roomId,
                currentPhase: game.currentPhase,
                currentPlayer: game.currentPlayer,
                turnCount: game.turnCount,
                winnerId: game.winnerId,
                startedAt: game.startedAt,
                finishedAt: game.finishedAt,
                gameDuration: game.gameDuration,
                players: {
                    player1: {
                        userId: game.player1Id,
                        username: player1?.username,
                        displayName: player1?.displayName,
                        airplanePlaced: game.player1Airplane?.isPlaced || false
                    },
                    player2: {
                        userId: game.player2Id,
                        username: player2?.username,
                        displayName: player2?.displayName,
                        airplanePlaced: game.player2Airplane?.isPlaced || false
                    }
                },
                attackHistory: game.attackHistory
            };
            return {
                success: true,
                message: '获取游戏状态成功',
                data: gameState
            };
        }
        catch (error) {
            logger.error('获取游戏状态失败:', error);
            return {
                success: false,
                message: '获取游戏状态失败'
            };
        }
    }
    static async getPlayerGameHistory(playerId, page = 1, limit = 10) {
        try {
            const games = await Game.findPlayerGames(playerId, page, limit);
            const totalGames = await Game.countDocuments({
                $or: [
                    { player1Id: playerId },
                    { player2Id: playerId }
                ]
            });
            const gamesWithOpponents = await Promise.all(games.map(async (game) => {
                const opponentId = game.player1Id === playerId ? game.player2Id : game.player1Id;
                const opponent = await User.findOne({ userId: opponentId }, 'username displayName');
                return {
                    gameId: game.gameId,
                    opponentId,
                    opponentUsername: opponent?.username,
                    opponentDisplayName: opponent?.displayName,
                    isWinner: game.winnerId === playerId,
                    currentPhase: game.currentPhase,
                    turnCount: game.turnCount,
                    gameDuration: game.gameDuration,
                    startedAt: game.startedAt,
                    finishedAt: game.finishedAt
                };
            }));
            const totalPages = Math.ceil(totalGames / limit);
            return {
                success: true,
                message: '获取游戏历史成功',
                data: {
                    items: gamesWithOpponents,
                    total: totalGames,
                    page,
                    limit,
                    totalPages
                }
            };
        }
        catch (error) {
            logger.error('获取游戏历史失败:', error);
            return {
                success: false,
                message: '获取游戏历史失败'
            };
        }
    }
    static async getPlayerStats(playerId) {
        try {
            const stats = await Game.getPlayerStats(playerId);
            if (stats.length === 0) {
                return {
                    success: true,
                    message: '获取玩家统计成功',
                    data: {
                        totalGames: 0,
                        wins: 0,
                        losses: 0,
                        winRate: 0,
                        averageDuration: 0,
                        averageTurns: 0
                    }
                };
            }
            const stat = stats[0];
            const winRate = stat.totalGames > 0 ? (stat.wins / stat.totalGames) * 100 : 0;
            return {
                success: true,
                message: '获取玩家统计成功',
                data: {
                    totalGames: stat.totalGames,
                    wins: stat.wins,
                    losses: stat.totalGames - stat.wins,
                    winRate: Math.round(winRate * 100) / 100,
                    averageDuration: Math.round(stat.averageDuration || 0),
                    averageTurns: Math.round(stat.averageTurns || 0)
                }
            };
        }
        catch (error) {
            logger.error('获取玩家统计失败:', error);
            return {
                success: false,
                message: '获取玩家统计失败'
            };
        }
    }
    static async getActiveGames() {
        try {
            const games = await Game.findActiveGames();
            const gamesWithPlayers = await Promise.all(games.map(async (game) => {
                const [player1, player2] = await Promise.all([
                    User.findOne({ userId: game.player1Id }, 'username displayName'),
                    User.findOne({ userId: game.player2Id }, 'username displayName')
                ]);
                return {
                    gameId: game.gameId,
                    roomId: game.roomId,
                    currentPhase: game.currentPhase,
                    currentPlayer: game.currentPlayer,
                    turnCount: game.turnCount,
                    startedAt: game.startedAt,
                    players: {
                        player1: {
                            userId: game.player1Id,
                            username: player1?.username,
                            displayName: player1?.displayName
                        },
                        player2: {
                            userId: game.player2Id,
                            username: player2?.username,
                            displayName: player2?.displayName
                        }
                    }
                };
            }));
            return {
                success: true,
                message: '获取活跃游戏列表成功',
                data: gamesWithPlayers
            };
        }
        catch (error) {
            logger.error('获取活跃游戏列表失败:', error);
            return {
                success: false,
                message: '获取活跃游戏列表失败'
            };
        }
    }
    static async forceEndGame(gameId, reason = '管理员强制结束') {
        try {
            const game = await Game.findOne({ gameId });
            if (!game) {
                return {
                    success: false,
                    message: '游戏不存在',
                    error: { code: 'GAME_NOT_FOUND' }
                };
            }
            if (game.currentPhase === 'finished') {
                return {
                    success: false,
                    message: '游戏已结束',
                    error: { code: 'GAME_ALREADY_FINISHED' }
                };
            }
            game.currentPhase = 'finished';
            game.finishedAt = new Date();
            if (game.startedAt) {
                game.gameDuration = Math.floor((game.finishedAt.getTime() - game.startedAt.getTime()) / 1000);
            }
            await game.save();
            const room = await Room.findOne({ roomId: game.roomId });
            if (room) {
                room.status = 'finished';
                await room.save();
            }
            logger.info(`游戏 ${gameId} 被强制结束: ${reason}`);
            return {
                success: true,
                message: '游戏已强制结束'
            };
        }
        catch (error) {
            logger.error('强制结束游戏失败:', error);
            return {
                success: false,
                message: '强制结束游戏失败'
            };
        }
    }
    static async surrender(gameId, playerId) {
        try {
            const game = await Game.findOne({ gameId });
            if (!game) {
                return {
                    success: false,
                    message: '游戏不存在',
                    error: { code: 'GAME_NOT_FOUND' }
                };
            }
            if (game.player1Id !== playerId && game.player2Id !== playerId) {
                return {
                    success: false,
                    message: '无权限操作此游戏',
                    error: { code: 'NO_PERMISSION' }
                };
            }
            if (game.currentPhase === 'finished') {
                return {
                    success: false,
                    message: '游戏已结束',
                    error: { code: 'GAME_ALREADY_FINISHED' }
                };
            }
            const winnerId = game.player1Id === playerId ? game.player2Id : game.player1Id;
            game.currentPhase = 'finished';
            game.winnerId = winnerId;
            game.finishedAt = new Date();
            if (game.startedAt) {
                game.gameDuration = Math.floor((game.finishedAt.getTime() - game.startedAt.getTime()) / 1000);
            }
            await game.save();
            await Promise.all([
                MongoUserService.updateGameStats(winnerId, true, 10),
                MongoUserService.updateGameStats(playerId, false, 0)
            ]);
            const room = await Room.findOne({ roomId: game.roomId });
            if (room) {
                room.status = 'finished';
                await room.save();
            }
            logger.info(`玩家 ${playerId} 在游戏 ${gameId} 中投降`);
            return {
                success: true,
                message: '投降成功',
                data: {
                    winnerId,
                    gamePhase: 'finished'
                }
            };
        }
        catch (error) {
            logger.error('投降失败:', error);
            return {
                success: false,
                message: '投降失败'
            };
        }
    }
}
//# sourceMappingURL=mongoGameService.js.map