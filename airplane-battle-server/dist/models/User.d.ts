import { Document, Model } from 'mongoose';
export interface IUser extends Document {
    userId: string;
    username: string;
    email: string;
    passwordHash?: string;
    displayName?: string;
    avatarUrl?: string;
    level: number;
    experience: number;
    wins: number;
    losses: number;
    rating: number;
    isActive: boolean;
    createdAt: Date;
    lastLogin?: Date;
    currentRoomId?: string;
    updateStats(isWin: boolean, experienceGain?: number): void;
    updateCurrentRoom(roomId?: string): void;
    clearCurrentRoom(): void;
}
interface IUserModel extends Model<IUser> {
    findByUsername(username: string): Promise<IUser | null>;
    findByEmail(email: string): Promise<IUser | null>;
    getLeaderboard(limit: number): Promise<IUser[]>;
    findUsersInRoom(roomId: string): Promise<IUser[]>;
}
export declare const User: IUserModel;
export {};
//# sourceMappingURL=User.d.ts.map