export * from './user.js';
export * from './game.js';
export * from './room.js';
export * from './socket.js';
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: {
        code: string;
        details?: any;
    };
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface MongoDBConfig {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    authSource?: string;
    ssl?: boolean;
    replicaSet?: string;
}
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
}
export interface JWTConfig {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
}
export interface ServerConfig {
    port: number;
    nodeEnv: string;
    mongodb: MongoDBConfig;
    redis: RedisConfig;
    jwt: JWTConfig;
    allowedOrigins: string[];
    logLevel: string;
    maxRooms: number;
    maxPlayersPerRoom: number;
    roomTimeout: number;
}
//# sourceMappingURL=index.d.ts.map