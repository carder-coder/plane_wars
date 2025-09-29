declare class Logger {
    private level;
    constructor();
    private getLevelFromString;
    private getTimestamp;
    private formatMessage;
    error(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    http(method: string, url: string, status: number, duration: number): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map