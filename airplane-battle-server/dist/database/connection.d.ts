import pg from 'pg';
export declare class Database {
    private static instance;
    private pool;
    private constructor();
    static getInstance(): Database;
    getPool(): pg.Pool;
    query(text: string, params?: any[]): Promise<pg.QueryResult>;
    getClient(): Promise<pg.PoolClient>;
    transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T>;
    testConnection(): Promise<boolean>;
    close(): Promise<void>;
}
export declare const database: Database;
//# sourceMappingURL=connection.d.ts.map