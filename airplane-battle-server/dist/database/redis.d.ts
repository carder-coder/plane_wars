import { RedisClientType } from 'redis';
export declare class RedisService {
    private static instance;
    private client;
    private constructor();
    static getInstance(): RedisService;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    expire(key: string, seconds: number): Promise<void>;
    setJSON(key: string, value: any, ttl?: number): Promise<void>;
    getJSON<T>(key: string): Promise<T | null>;
    hSet(key: string, field: string, value: string): Promise<void>;
    hGet(key: string, field: string): Promise<string | undefined>;
    hGetAll(key: string): Promise<Record<string, string>>;
    hDel(key: string, field: string): Promise<void>;
    sAdd(key: string, member: string): Promise<void>;
    sRem(key: string, member: string): Promise<void>;
    sMembers(key: string): Promise<string[]>;
    getClient(): RedisClientType;
}
export declare const redis: RedisService;
//# sourceMappingURL=redis.d.ts.map