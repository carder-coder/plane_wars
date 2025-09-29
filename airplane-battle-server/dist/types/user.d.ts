export interface User {
    user_id: string;
    username: string;
    email: string;
    password_hash: string;
    display_name?: string;
    avatar_url?: string;
    level: number;
    experience: number;
    wins: number;
    losses: number;
    rating: number;
    created_at: Date;
    last_login?: Date;
    is_active: boolean;
}
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    displayName?: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface LoginResponse {
    success: boolean;
    message: string;
    data?: {
        token: string;
        refreshToken: string;
        user: UserProfile;
    };
}
export interface UserProfile {
    userId: string;
    username: string;
    displayName?: string;
    level: number;
    experience: number;
    wins: number;
    losses: number;
    rating: number;
    avatarUrl?: string;
}
export interface JWTPayload {
    userId: string;
    username: string;
    iat: number;
    exp: number;
}
export interface AuthenticatedUser {
    userId: string;
    username: string;
    displayName?: string;
}
//# sourceMappingURL=user.d.ts.map