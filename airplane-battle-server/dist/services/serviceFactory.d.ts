import { UserService as PGUserService } from './userService.js';
import { RoomService as PGRoomService } from './roomService.js';
import { MongoUserService } from './mongoUserService.js';
import { MongoRoomService } from './mongoRoomService.js';
import { MongoGameService } from './mongoGameService.js';
export declare enum DatabaseType {
    POSTGRESQL = "postgresql",
    MONGODB = "mongodb"
}
export declare class ServiceFactory {
    private static databaseType;
    static setDatabaseType(type: DatabaseType): void;
    static getDatabaseType(): DatabaseType;
    static initFromConfig(): void;
    static getUserService(): typeof PGUserService | typeof MongoUserService;
    static getRoomService(): typeof PGRoomService | typeof MongoRoomService;
    static getGameService(): typeof MongoGameService;
    static testConnection(): Promise<boolean>;
    static initializeDatabase(): Promise<void>;
    static closeDatabase(): Promise<void>;
    static getDatabaseStats(): Promise<any>;
    static runMigrations(): Promise<void>;
}
export declare const UserService: typeof PGUserService | typeof MongoUserService;
export declare const RoomService: typeof PGRoomService | typeof MongoRoomService;
export declare const getGameService: () => typeof MongoGameService;
//# sourceMappingURL=serviceFactory.d.ts.map