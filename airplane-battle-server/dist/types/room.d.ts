import { GameState, PlayerState, RoomType, RoomStatus } from './game.js';
export interface Room {
    room_id: string;
    room_name: string;
    room_type: RoomType;
    password?: string;
    max_players: number;
    current_players: number;
    status: RoomStatus;
    host_user_id: string;
    created_at: Date;
    updated_at: Date;
}
export interface RoomDetails extends Room {
    players: PlayerState[];
    gameState?: GameState;
}
export interface CreateRoomRequest {
    roomName: string;
    roomType: RoomType;
    password?: string;
}
export interface JoinRoomRequest {
    roomId: string;
    password?: string;
}
export interface RoomListItem {
    roomId: string;
    roomName: string;
    roomType: RoomType;
    currentPlayers: number;
    maxPlayers: number;
    status: RoomStatus;
    hostUsername: string;
    createdAt: Date;
    needPassword: boolean;
}
export interface RoomMember {
    userId: string;
    username: string;
    displayName?: string;
    isHost: boolean;
    isReady: boolean;
    isConnected: boolean;
    joinedAt: Date;
}
//# sourceMappingURL=room.d.ts.map