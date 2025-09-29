export declare enum CellType {
    EMPTY = "empty",
    HEAD = "head",
    BODY = "body",
    WINGS = "wings",
    TAIL = "tail",
    HIT = "hit",
    MISS = "miss"
}
export interface Coordinate {
    x: number;
    y: number;
}
export declare enum Orientation {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical"
}
export interface AirplanePosition {
    head: Coordinate;
    body: Coordinate[];
    wings: Coordinate[];
    tail: Coordinate[];
    orientation: Orientation;
    isPlaced: boolean;
}
export interface AttackRecord {
    coordinate: Coordinate;
    result: AttackResult;
    timestamp: number;
}
export type AttackResult = 'hit_head' | 'hit_body' | 'miss';
export declare enum GamePhase {
    WAITING = "waiting",
    PLACEMENT = "placement",
    BATTLE = "battle",
    FINISHED = "finished"
}
export declare enum RoomType {
    PUBLIC = "public",
    PRIVATE = "private"
}
export declare enum RoomStatus {
    WAITING = "waiting",
    PLAYING = "playing",
    FINISHED = "finished"
}
export interface PlayerState {
    userId: string;
    username: string;
    displayName?: string;
    grid: CellType[][];
    airplane: AirplanePosition;
    attackHistory: AttackRecord[];
    isReady: boolean;
    isConnected: boolean;
    joinedAt: Date;
}
export interface GameState {
    gameId: string;
    roomId: string;
    currentPhase: GamePhase;
    currentPlayer: number;
    players: {
        player1?: PlayerState;
        player2?: PlayerState;
    };
    winner?: number;
    turnCount: number;
    gameStartTime: Date;
    gameEndTime?: Date;
    lastActivity: Date;
}
//# sourceMappingURL=game.d.ts.map