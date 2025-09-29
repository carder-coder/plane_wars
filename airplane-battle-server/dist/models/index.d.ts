export { User, IUser } from './User.js';
export { Room, IRoom, IRoomMember } from './Room.js';
export { Game, IGame, ICoordinate, IAirplanePosition, IAttackRecord } from './Game.js';
export { UserSession, IUserSession } from './UserSession.js';
export { mongoDatabase, mongoose } from '../database/mongoConnection.js';
export declare function initializeIndexes(): Promise<void>;
export declare function dropAllCollections(): Promise<void>;
export declare function getDatabaseStats(): Promise<any>;
//# sourceMappingURL=index.d.ts.map