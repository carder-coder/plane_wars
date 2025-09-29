import { Document, Model } from 'mongoose';
export interface IRoomMember {
    userId: string;
    playerNumber: number;
    isReady: boolean;
    joinedAt: Date;
}
export interface IRoom extends Document {
    roomId: string;
    roomName: string;
    roomType: 'public' | 'private';
    password?: string;
    maxPlayers: number;
    currentPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    hostUserId: string;
    members: IRoomMember[];
    createdAt: Date;
    updatedAt: Date;
    needPassword?: boolean;
    isFull?: boolean;
    isEmpty?: boolean;
    addMember(userId: string): boolean;
    removeMember(userId: string): boolean;
    setMemberReady(userId: string, isReady: boolean): boolean;
    areAllMembersReady(): boolean;
    startGame(): boolean;
}
export interface IRoomModel extends Model<IRoom> {
    findWaitingRooms(page: number, limit: number): Promise<IRoom[]>;
    findUserRooms(userId: string): Promise<IRoom[]>;
    findByRoomId(roomId: string): Promise<IRoom | null>;
}
export declare const Room: IRoomModel;
//# sourceMappingURL=Room.d.ts.map