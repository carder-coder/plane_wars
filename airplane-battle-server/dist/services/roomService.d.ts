import { Room, RoomDetails, CreateRoomRequest, JoinRoomRequest, RoomListItem, ApiResponse, PaginatedResponse } from '../types/index.js';
export declare class RoomService {
    static createRoom(hostUserId: string, data: CreateRoomRequest): Promise<ApiResponse<Room>>;
    static joinRoom(userId: string, data: JoinRoomRequest): Promise<ApiResponse<RoomDetails>>;
    static leaveRoom(roomId: string, userId: string): Promise<ApiResponse>;
    static getRoomList(page?: number, limit?: number): Promise<ApiResponse<PaginatedResponse<RoomListItem>>>;
    static getRoomDetails(roomId: string): Promise<RoomDetails | null>;
    private static findRoomById;
    private static checkUserInRoom;
}
//# sourceMappingURL=roomService.d.ts.map