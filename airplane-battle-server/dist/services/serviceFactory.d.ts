import { MongoUserService } from './mongoUserService.js';
import { MongoRoomService } from './mongoRoomService.js';
import { MongoGameService } from './mongoGameService.js';
export declare class ServiceFactory {
    static initFromConfig(): void;
    static getUserService(): typeof MongoUserService;
    static getRoomService(): typeof MongoRoomService;
    static getGameService(): typeof MongoGameService;
    static testConnection(): Promise<boolean>;
    static initializeDatabase(): Promise<void>;
    static closeDatabase(): Promise<void>;
    static getDatabaseStats(): Promise<any>;
    static runMigrations(): Promise<void>;
}
export declare const UserService: typeof MongoUserService;
export declare const RoomService: typeof MongoRoomService;
export declare const getGameService: () => typeof MongoGameService;
//# sourceMappingURL=serviceFactory.d.ts.map