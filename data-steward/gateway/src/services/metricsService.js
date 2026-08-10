const os = require("os");

const ipfsClient = require("./ipfsClient");

class MetricsService {
    async getSystemMetrics() {
        return {
            hostname: os.hostname(),
            platform: os.platform(),
            cpus: os.cpus().length,
            loadavg: os.loadavg(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
            uptime: os.uptime()
        };
    }

    async getIPFSMetrics() {
        const repoStat = await ipfsClient.repo.stat();
        return {
            repoSize: repoStat.repoSize,
            numObjects: repoStat.numObjects,
            storageMax: repoStat.storageMax
        };
    }
}