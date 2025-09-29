import { ApiResponse, AirplanePosition, Coordinate, PaginatedResponse } from '../types/index.js';
export declare class MongoGameService {
    static createGame(roomId: string, player1Id: string, player2Id: string): Promise<ApiResponse<any>>;
    static placePlane(gameId: string, playerId: string, airplane: AirplanePosition): Promise<ApiResponse<any>>;
    static attack(gameId: string, attackerId: string, coordinate: Coordinate): Promise<ApiResponse<any>>;
    static getGameState(gameId: string): Promise<ApiResponse<any>>;
    static getPlayerGameHistory(playerId: string, page?: number, limit?: number): Promise<ApiResponse<PaginatedResponse<any>>>;
    static getPlayerStats(playerId: string): Promise<ApiResponse<any>>;
    static getActiveGames(): Promise<ApiResponse<any[]>>;
    static forceEndGame(gameId: string, reason?: string): Promise<ApiResponse>;
    static surrender(gameId: string, playerId: string): Promise<ApiResponse>;
    static cleanupExpiredGames(): Promise<ApiResponse<number>>;
    static batchUpdateGameStatus(): Promise<ApiResponse<number>>;
    static getGameHistory(playerId: string, page?: number, limit?: number): Promise<ApiResponse<any>>;
}
//# sourceMappingURL=mongoGameService.d.ts.map