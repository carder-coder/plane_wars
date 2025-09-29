import { RoomDetails, CreateRoomRequest, JoinRoomRequest, RoomListItem, ApiResponse, PaginatedResponse } from '../types/index.js';
export declare class MongoRoomService {
    static createRoom(hostUserId: string, data: CreateRoomRequest): Promise<ApiResponse<any>>;
    static joinRoom(userId: string, data: JoinRoomRequest): Promise<ApiResponse<RoomDetails>>;
    static leaveRoom(roomId: string, userId: string): Promise<ApiResponse>;
    static setPlayerReady(roomId: string, userId: string, isReady: boolean): Promise<ApiResponse>;
    static getRoomList(page?: number, limit?: number): Promise<ApiResponse<PaginatedResponse<RoomListItem>>>;
    static getRoomDetails(roomId: string): Promise<RoomDetails | null>;
    static getUserRooms(userId: string): Promise<ApiResponse<any[]>>;
    static deleteRoom(roomId: string, userId: string): Promise<ApiResponse>;
    static kickPlayer(roomId: string, hostUserId: string, targetUserId: string): Promise<ApiResponse>;
}
//# sourceMappingURL=mongoRoomService.d.ts.map