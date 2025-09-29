import { Server as SocketServer } from 'socket.io';
import { MessageType } from '../types/index.js';
export declare class SocketManager {
    private io;
    private connections;
    private userSockets;
    constructor(io: SocketServer);
    private setupSocketHandlers;
    private setupSocketMiddlewares;
    private handleAuthentication;
    private handleJoinRoom;
    private handleLeaveRoom;
    private handlePlaceAirplane;
    private handleConfirmPlacement;
    private handleAttack;
    private handleHeartbeat;
    private handleDisconnect;
    private handleError;
    private sendMessage;
    private sendError;
    broadcastToRoom(roomId: string, type: MessageType, payload: any, excludeSocketId?: string): void;
    sendToUser(userId: string, type: MessageType, payload: any): void;
    private generateMessageId;
    getOnlineUserCount(): number;
    getStats(): object;
}
//# sourceMappingURL=socketManager.d.ts.map