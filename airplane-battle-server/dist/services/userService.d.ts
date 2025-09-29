import { UserProfile, RegisterRequest, LoginRequest, LoginResponse, ApiResponse } from '../types/index.js';
export declare class UserService {
    private static readonly SALT_ROUNDS;
    static register(data: RegisterRequest): Promise<ApiResponse<UserProfile>>;
    static login(data: LoginRequest): Promise<LoginResponse>;
    static refreshToken(refreshToken: string): Promise<LoginResponse>;
    static logout(userId: string, refreshToken?: string): Promise<ApiResponse>;
    static getUserProfile(userId: string): Promise<ApiResponse<UserProfile>>;
    private static findByUsername;
    private static findById;
    private static findByUsernameOrEmail;
    private static generateAccessToken;
    private static generateRefreshToken;
    private static saveRefreshToken;
    private static verifyRefreshToken;
    private static updateRefreshToken;
}
//# sourceMappingURL=userService.d.ts.map