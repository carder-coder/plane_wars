import { Document, Model, Query } from 'mongoose';
export interface IUserSession extends Document {
    sessionId: string;
    userId: string;
    refreshToken?: string;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date;
    extend(additionalSeconds?: number): void;
    deactivate(): void;
    isValid(): boolean;
}
interface IUserSessionModel extends Model<IUserSession> {
    findByRefreshToken(refreshToken: string): Promise<IUserSession | null>;
    findUserSessions(userId: string, activeOnly?: boolean): Query<IUserSession[], IUserSession>;
    deactivateUserSessions(userId: string): Query<{
        acknowledged: boolean;
        modifiedCount: number;
    }, IUserSession>;
    cleanupExpiredSessions(): Query<{
        acknowledged: boolean;
        deletedCount: number;
    }, IUserSession>;
    createSession(sessionId: string, userId: string, refreshToken: string, expiresIn?: number, ipAddress?: string, userAgent?: string): Promise<IUserSession>;
    refreshSession(oldRefreshToken: string, newRefreshToken: string, expiresIn?: number): Query<IUserSession | null, IUserSession>;
    startCleanupTask(): void;
}
export declare const UserSession: IUserSessionModel;
export {};
//# sourceMappingURL=UserSession.d.ts.map