import { config } from '../config/index.js';
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};
class Logger {
    level;
    constructor() {
        this.level = this.getLevelFromString(config.logLevel);
    }
    getLevelFromString(level) {
        switch (level.toLowerCase()) {
            case 'error': return LogLevel.ERROR;
            case 'warn': return LogLevel.WARN;
            case 'info': return LogLevel.INFO;
            case 'debug': return LogLevel.DEBUG;
            default: return LogLevel.INFO;
        }
    }
    getTimestamp() {
        return new Date().toISOString();
    }
    formatMessage(level, message, data) {
        const timestamp = this.getTimestamp();
        const logData = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] ${level}: ${message}${logData}`;
    }
    error(message, data) {
        if (this.level >= LogLevel.ERROR) {
            const formattedMessage = this.formatMessage('ERROR', message, data);
            console.error(`${colors.red}${formattedMessage}${colors.reset}`);
        }
    }
    warn(message, data) {
        if (this.level >= LogLevel.WARN) {
            const formattedMessage = this.formatMessage('WARN', message, data);
            console.warn(`${colors.yellow}${formattedMessage}${colors.reset}`);
        }
    }
    info(message, data) {
        if (this.level >= LogLevel.INFO) {
            const formattedMessage = this.formatMessage('INFO', message, data);
            console.log(`${colors.green}${formattedMessage}${colors.reset}`);
        }
    }
    debug(message, data) {
        if (this.level >= LogLevel.DEBUG) {
            const formattedMessage = this.formatMessage('DEBUG', message, data);
            console.log(`${colors.blue}${formattedMessage}${colors.reset}`);
        }
    }
    http(method, url, status, duration) {
        const color = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
        const message = `${method} ${url} ${status} - ${duration}ms`;
        console.log(`${color}${this.formatMessage('HTTP', message)}${colors.reset}`);
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map