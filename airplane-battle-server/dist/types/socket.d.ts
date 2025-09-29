export declare enum MessageType {
    JOIN_ROOM = "JOIN_ROOM",
    LEAVE_ROOM = "LEAVE_ROOM",
    ROOM_JOINED = "ROOM_JOINED",
    ROOM_LEFT = "ROOM_LEFT",
    PLAYER_JOINED = "PLAYER_JOINED",
    PLAYER_LEFT = "PLAYER_LEFT",
    ROOM_UPDATED = "ROOM_UPDATED",
    GAME_START = "GAME_START",
    GAME_END = "GAME_END",
    PLACE_AIRPLANE = "PLACE_AIRPLANE",
    AIRPLANE_PLACED = "AIRPLANE_PLACED",
    CONFIRM_PLACEMENT = "CONFIRM_PLACEMENT",
    PLACEMENT_CONFIRMED = "PLACEMENT_CONFIRMED",
    ATTACK = "ATTACK",
    ATTACK_RESULT = "ATTACK_RESULT",
    TURN_CHANGE = "TURN_CHANGE",
    ERROR = "ERROR",
    HEARTBEAT = "HEARTBEAT",
    DISCONNECT = "DISCONNECT",
    RECONNECT = "RECONNECT"
}
export interface BaseMessage {
    type: MessageType;
    payload?: any;
    timestamp: number;
    messageId: string;
}
export interface ErrorMessage extends BaseMessage {
    type: MessageType.ERROR;
    payload: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface JoinRoomMessage extends BaseMessage {
    type: MessageType.JOIN_ROOM;
    payload: {
        roomId: string;
        password?: string;
    };
}
export interface RoomJoinedMessage extends BaseMessage {
    type: MessageType.ROOM_JOINED;
    payload: {
        room: any;
        players: any[];
        gameState?: any;
    };
}
export interface PlaceAirplaneMessage extends BaseMessage {
    type: MessageType.PLACE_AIRPLANE;
    payload: {
        headX: number;
        headY: number;
        orientation: 'horizontal' | 'vertical';
    };
}
export interface AttackMessage extends BaseMessage {
    type: MessageType.ATTACK;
    payload: {
        coordinate: {
            x: number;
            y: number;
        };
    };
}
export interface AttackResultMessage extends BaseMessage {
    type: MessageType.ATTACK_RESULT;
    payload: {
        attacker: string;
        coordinate: {
            x: number;
            y: number;
        };
        result: 'hit_head' | 'hit_body' | 'miss';
        gameEnded: boolean;
        winner?: string;
        gameState: any;
    };
}
export type SocketMessage = BaseMessage | ErrorMessage | JoinRoomMessage | RoomJoinedMessage | PlaceAirplaneMessage | AttackMessage | AttackResultMessage;
//# sourceMappingURL=socket.d.ts.map