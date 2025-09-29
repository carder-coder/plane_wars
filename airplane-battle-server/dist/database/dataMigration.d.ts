export declare class DataMigration {
    private pgClient;
    private migrationLog;
    constructor();
    runFullMigration(): Promise<void>;
    private connectDatabases;
    private disconnectDatabases;
    private validateSourceData;
    private initializeMongoDB;
    private migrateUsers;
    private migrateRooms;
    private migrateGames;
    private migrateUserSessions;
    private validateMigration;
    private createIndexes;
    private logStep;
    private generateMigrationReport;
}
//# sourceMappingURL=dataMigration.d.ts.map