export declare class DataValidator {
    private pgClient;
    private validationResults;
    constructor();
    runFullValidation(): Promise<boolean>;
    private connectDatabases;
    private disconnectDatabases;
    private validateBasicStats;
    private validateDataIntegrity;
    private validateUserIntegrity;
    private validateRoomIntegrity;
    private validateGameIntegrity;
    private validateRelationships;
    private validateRoomUserRelationships;
    private validateGameUserRelationships;
    private validateSessionUserRelationships;
    private validateDataQuality;
    private validateRequiredFields;
    private validateDataFormats;
    private validateBusinessRules;
    private performanceTest;
    private recordValidation;
    private generateValidationReport;
}
//# sourceMappingURL=dataValidator.d.ts.map