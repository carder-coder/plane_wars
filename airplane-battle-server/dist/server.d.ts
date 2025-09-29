import express from 'express';
import { Server as SocketServer } from 'socket.io';
export declare class Server {
    private app;
    private httpServer;
    private io;
    private socketManager;
    constructor();
    private setupMiddlewares;
    private setupRoutes;
    private setupSocketIO;
    private setupErrorHandling;
    private initializeDatabase;
    private initializeRedis;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    getApp(): express.Application;
    getIO(): SocketServer;
}
//# sourceMappingURL=server.d.ts.map