import { UserProfile, RegisterRequest, LoginRequest, LoginResponse, ApiResponse } from '../types/index.js';
export declare class MongoUserService {
    private static readonly SALT_ROUNDS;
    static register(data: RegisterRequest): Promise<ApiResponse<UserProfile>>;
    static login(data: LoginRequest): Promise<LoginResponse>;
    static refreshToken(refreshToken: string): Promise<LoginResponse>;
    static logout(userId: string, refreshToken?: string): Promise<ApiResponse>;
    static getUserProfile(userId: string): Promise<ApiResponse<UserProfile>>;
    static updateUserProfile(userId: string, updates: Partial<{
        displayName: string;
        avatarUrl: string;
    }>): Promise<ApiResponse<UserProfile>>;
    static getLeaderboard(limit?: number): Promise<ApiResponse<UserProfile[]>>;
    static updateGameStats(userId: string, isWin: boolean, experienceGain?: number): Promise<ApiResponse>;
    private static generateAccessToken;
    private static generateRefreshToken;
    private static saveRefreshToken;
    private static verifyRefreshToken;
    private static updateRefreshToken;
}
//# sourceMappingURL=mongoUserService.d.ts.map