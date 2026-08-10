const fs = require("fs");
const path = require("path");

const { consumer } = require("../../../shared/kafka");
const { eventTypes } = require("../../../shared/contracts");
const db = require("../../../shared/db");

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
        console.log("[audit] completed sem assetId");
        return;
    }

    await db.updateClinicalAssetStatusById(assetId, "COMPLETED");

    console.log(
        `[audit] asset ${assetId} atualizado para COMPLETED`
    );
}

async function saveAudit(event) {
    console.log("Salvando evento em arquivo")
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

    console.log(line);
    fs.appendFileSync(
        OUTPUT,
        line + "\n"
    );

    await logAudit(event, data);
    console.log("Salvo com requestId: " + event.requestId);
}


async function run() {
    const kafkaConsumer = consumer("audit-service");

    console.log("Conectando ao Kafka...")
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_UPLOAD_REQUESTED,
        fromBeginning: true
    });
    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_READY_FOR_STORAGE,
        fromBeginning: true
    });
    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_UPLOAD_COMPLETED,
        fromBeginning: true
    });
    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_UPLOAD_FAILED,
        fromBeginning: true
    });
    console.log("Conectado e inscito nos eventos RESOURCE_UPLOAD_REQUESTED, RESOURCE_READY_FOR_STORAGE, RESOURCE_UPLOAD_COMPLETED e RESOURCE_UPLOAD_FAILED");

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
                    console.log(`[audit] ${event.eventType} - ${event.requestId}`);
                    await saveAudit(event);
                }

                catch(error) {
                    console.error(
                        "[audit]",
                        error.message
                    );
                }
            }
    });
}

run().catch(console.error);