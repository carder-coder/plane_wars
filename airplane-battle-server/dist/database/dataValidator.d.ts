export declare class DataValidator {
    private validationResults;
    constructor();
    runFullValidation(): Promise<boolean>;
    private connectDatabase;
    private disconnectDatabase;
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