import mongoose from 'mongoose';
export declare class MongoDatabase {
    private static instance;
    private isConnected;
    private constructor();
    static getInstance(): MongoDatabase;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    testConnection(): Promise<boolean>;
    getConnectionState(): number;
    private buildConnectionString;
    aggregate<T>(collection: string, pipeline: any[]): Promise<T[]>;
    getClient(): mongoose.mongo.MongoClient;
    getDatabase(): mongoose.mongo.Db | undefined;
}
export declare const mongoDatabase: MongoDatabase;
export { mongoose };
//# sourceMappingURL=mongoConnection.d.ts.map