const LogLevel_e = {
    All: 0,
    Error: 1
};

class LogController {
    logLevel = LogLevel_e.Error;
    service = "";

    constructor(logLevel) {
        this.setLevel(logLevel);
    }

    constructor(logLevel, service) {
        this.setLevel(logLevel);
        this.service = service;
    }

    logInfo(message) {
        if (this.logLevel === LogLevel_e.All) {
            console.debug(`[${this.service}] ${message}`);
        }
    }

    logWarning(message) {
        console.warn(`[${this.service}] ${message}`);
    }

    logError(message) {
        console.error(`[${this.service}] ${message}`);
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

module.exports = {
    LogController,
    LogLevel_e
};