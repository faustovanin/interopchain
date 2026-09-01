export const LogLevel_e = {
    All: 0,
    Error: 1
};

export class LogController {
    logLevel = LogLevel_e.Error;

    constructor(logLevel) {
        this.setLevel(logLevel);
    }

    logInfo(message) {
        if (this.logLevel === LogLevel_e.All) {
            console.debug(message);
        }
    }

    logWarning(message) {
        console.warn(message);
    }

    logError(message) {
        console.error(message);
    }

    setLevel(level) {
    this.logLevel = level === LogLevel_e.All
        ? LogLevel_e.All
        : LogLevel_e.Error;
    }

    getLogLevel() {
        return this.logLevel;
    }
}