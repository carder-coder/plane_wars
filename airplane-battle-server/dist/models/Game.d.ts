import { Document, Model } from 'mongoose';
export interface ICoordinate {
    x: number;
    y: number;
}
export interface IAirplanePosition {
    head: ICoordinate;
    body: ICoordinate[];
    wings: ICoordinate[];
    tail: ICoordinate[];
    orientation: 'horizontal' | 'vertical';
    isPlaced: boolean;
}
export interface IAttackRecord {
    coordinate: ICoordinate;
    result: 'hit_head' | 'hit_body' | 'miss';
    timestamp: Date;
    attackerId: string;
}
export interface IGameMethods {
    placePlane(playerId: string, airplane: IAirplanePosition): boolean;
    attack(attackerId: string, coordinate: ICoordinate): string | null;
    validateAirplanePosition(airplane: IAirplanePosition): boolean;
    coordinateEquals(coord1: ICoordinate, coord2: ICoordinate): boolean;
    coordinateInArray(coordinate: ICoordinate, coordinates: ICoordinate[]): boolean;
}
export interface GameModel extends Model<IGame, {}, IGameMethods> {
    findPlayerGames(playerId: string, page: number, limit: number): Promise<(IGame & IGameMethods)[]>;
    findActiveGames(): Promise<(IGame & IGameMethods)[]>;
    getPlayerStats(playerId: string): Promise<any[]>;
}
export interface IGame extends Document, IGameMethods {
    gameId: string;
    roomId: string;
    player1Id: string;
    player2Id: string;
    winnerId?: string;
    currentPhase: 'waiting' | 'placement' | 'battle' | 'finished';
    currentPlayer?: number;
    turnCount: number;
    gameDuration?: number;
    player1Airplane?: IAirplanePosition;
    player2Airplane?: IAirplanePosition;
    attackHistory: IAttackRecord[];
    startedAt: Date;
    finishedAt?: Date;
    isFinished: boolean;
    isInProgress: boolean;
    bothPlayersPlaced: boolean;
}
export declare const Game: GameModel;
//# sourceMappingURL=Game.d.ts.map