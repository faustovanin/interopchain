const fs = require("fs");
const path = require("path");

const { connectConsumer } = require("../../../shared/kafka");
const { eventTypes } = require("../../../shared/contracts");
const db = require("../../../shared/db");

const config = require("../../../shared/config");
const { LogController, LogLevel_e } = require("../../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error);

const OUTPUT = path.join(
    __dirname,
    "audit.csv"
);

if (!fs.existsSync(OUTPUT)) {
    fs.writeFileSync(
        OUTPUT,
        "timestamp,eventType,requestId,assetId,resourceType,cid,status,ipfsUpload,payloadSize\n"
    );
}

async function logAudit(event, data) {
    await db.insertAuditLog(event, data);
}

async function updateCompletedStatus(event) {
    const assetId = event.data?.assetId;

    if (!assetId) {
        logger.logInfo("[audit] completed sem assetId");
        return;
    }

    await db.updateClinicalAssetStatusById(assetId, "COMPLETED");

    logger.logInfo(
        `[audit] asset ${assetId} atualizado para COMPLETED`
    );
}

async function saveAudit(event) {
    logger.logInfo("Salvando evento em arquivo");
    const data = event.data || {};

    const line = [
        event.timestamp,
        event.eventType,
        event.requestId,
        data.assetId || "",
        data.resourceType || "",
        data.status || "",
        data
    ].join(",");

    logger.logInfo(line);
    fs.appendFileSync(
        OUTPUT,
        line + "\n"
    );

    await logAudit(event, data);
    logger.logInfo("Salvo com requestId: " + event.requestId);
}


async function run() {
    logger.logInfo("Conectando Audit ao Kafka...");
    const kafkaConsumer = await connectConsumer(
        "audit-service",
        [
            {
                topic: eventTypes.RESOURCE_UPLOAD_REQUESTED,
                fromBeginning: true
            },
            {
                topic: eventTypes.RESOURCE_READY_FOR_STORAGE,
                fromBeginning: true
            },
            {
                topic: eventTypes.RESOURCE_UPLOAD_COMPLETED,
                fromBeginning: true
            },
            {
                topic: eventTypes.RESOURCE_UPLOAD_FAILED,
                fromBeginning: true
            }
        ],
        "audit"
    );
    logger.logInfo("Conectado e inscito nos eventos RESOURCE_UPLOAD_REQUESTED, RESOURCE_READY_FOR_STORAGE, RESOURCE_UPLOAD_COMPLETED e RESOURCE_UPLOAD_FAILED");

    await kafkaConsumer.run({
        eachMessage:
            async ({ message }) => {
                try {
                    const event = JSON.parse(
                        message.value.toString()
                    );
                    if (event.eventType === eventTypes.RESOURCE_UPLOAD_COMPLETED) {
                        await updateCompletedStatus(event);
                    }
                    logger.logInfo(`[audit] ${event.eventType} - ${event.requestId}`);
                    await saveAudit(event);
                }

                catch(error) {
                    logger.logError(
                        "[audit]",
                        error.message
                    );
                }
            }
    });
}

run().catch(console.error);