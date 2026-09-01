const axios = require("axios");
const FormData = require("form-data");
const { performance } = require("perf_hooks");

const { connectConsumer, getProducer } = require("../../shared/kafka.js");
const db = require("../../shared/db.js");

const { buildEnvelope, eventTypes } = require("../../shared/contracts.js");

const config = require("../../shared/config.js");
const { LogController, LogLevel_e } = require("../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error, "storage-service");
logger.logInfo("Iniciando serviço de storage...");

let currentNodeIndex = 0;

const nodeCooldowns = new Map();
const COOLDOWN_MS = process.env.IPFS_NODE_COOLDOWN_MS ? parseInt(process.env.IPFS_NODE_COOLDOWN_MS) : 10000;

let ipfs_nodes = "";
const ipfs_env = process.env.IPFS_ENV || "development";

if (ipfs_env === "development") {
    logger.logInfo("IPFS_ENV: development");
    ipfs_nodes = process.env.IPFS_API_URL;
}
else if (ipfs_env === null || ipfs_env === undefined) {
    logger.logInfo("IPFS_ENV: null");
    ipfs_nodes = process.env.IPFS_API_URL;
}
else {
    logger.logInfo("IPFS_ENV: production");
    ipfs_nodes = process.env.IPFS_API_NODES;
}

async function uploadToIPFSDist(payload) {
    logger.logInfo("Enviando para IPFS");

    const nodes = ipfs_nodes.split(",").map(node => node.trim());

    let lastError;
    const now = Date.now();

    for (let attempt = 0; attempt < nodes.length; attempt++) {
        const index = (currentNodeIndex + attempt) % nodes.length;
        const node = nodes[index];

        const cooldownUntil = nodeCooldowns.get(node);
        if (cooldownUntil && cooldownUntil > now) {
            logger.logInfo(
                `Pulando ${node} (cooldown por mais ${cooldownUntil - now} ms)`
            );
            continue;
        }

        const form = new FormData();
        form.append(
            "file",
            Buffer.from(JSON.stringify(payload)),
            {
                filename: "encrypted.json"
            }
        );

        const nodeHost = new URL(node).hostname;

        try {
            logger.logInfo(`Tentando upload para ${node}`);

            const startedAt = performance.now();

            const response = await axios.post(
                `${node}/api/v0/add?pin=true`,
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 3000
                }
            );

            const uploadTime = performance.now() - startedAt;

            logger.logInfo(`Upload realizado em ${node}`);
            nodeCooldowns.delete(node);
            currentNodeIndex = (index + 1) % nodes.length;

            return {
                cid: response.data.Hash,
                node,
                nodeHost,
                uploadTime
            };

        } catch (error) {
            logger.logError(`Falha em ${node}`);
            nodeCooldowns.set(node, Date.now() + COOLDOWN_MS);
            lastError = error;
        }
    }

    throw lastError || new Error("Nenhum nó IPFS disponível.");
}

async function update_clinical_asset(cid, requestId) {
    await db.markClinicalAssetStatusByRequestId(cid, requestId, 'STORED');
}

async function verifyIPFSContent(node, cid) {
    logger.logInfo(`Verificando conteúdo em ${node} para CID: ${cid}`);
    await axios.post(
        `${node}/api/v0/pin/add?arg=${encodeURIComponent(cid)}`,
        null,
        { timeout: 3000 }
    );
    
    logger.logInfo(`Tentando recuperar conteúdo em ${node} para CID: ${cid}`);
    await axios.post(
        `${node}/api/v0/cat?arg=${encodeURIComponent(cid)}`,
        null,
        { responseType: "arraybuffer", timeout: 3000 }
    );
}

async function update_metrics(ipfsTime, node, requestId, totalTime) {
    await db.updateProcessingMetrics(ipfsTime, node, totalTime, requestId);
}

async function getTotalTime(requestId) {
    return db.getRequestTotalTime(requestId);
}

async function handleReadyForStorage(event) {
    logger.logInfo("Entrou no storage-service");
    const ipfsStart = Date.now();
    logger.logInfo("Início: " + ipfsStart);

    const {
        assetId,
        resourceType,
        resourceIdentifier,
        encrypted
    } = event.data;
    logger.logInfo("Processando assetId: " + assetId);

    const {
        cid,
        node,
        nodeHost,
        uploadTime
    } = await uploadToIPFSDist(encrypted);
    logger.logInfo("Upload response: " + cid + " from node: " + nodeHost + " in " + uploadTime + "ms");

    await verifyIPFSContent(node, cid);

    const ipfsTime = Date.now() - ipfsStart;
    logger.logInfo("Fim: " + ipfsTime);
    logger.logInfo("Atualizando clinical asset: " + event.requestId);
    await update_clinical_asset(cid, event.requestId);

    logger.logInfo("Construindo envelope para evento RESOURCE_UPLOAD_COMPLETED: " + event.requestId);
    const producer = await getProducer();
    const envelope = buildEnvelope(
        eventTypes.RESOURCE_UPLOAD_COMPLETED,
        event.requestId,
        "storage",
        {
            assetId,
            resourceType,
            resourceIdentifier,
            cid,
            metrics: {
                ipfsUpload: uploadTime,
                payloadSize: Buffer.byteLength(JSON.stringify(encrypted))
            }
        }
    );
    
    const totalResult = Date.now() - new Date(event.timestamp).getTime();
    logger.logInfo("Tempo total: " + totalResult + "ms");
    logger.logInfo("Atualizando métricas com os tempos para requestId: " + event.requestId);
    await update_metrics(ipfsTime, nodeHost, event.requestId, totalResult);

    logger.logInfo("Enviando evento RESOURCE_UPLOAD_COMPLETED para Kafka com requestId: " + event.requestId);
    await producer.send({
        topic: eventTypes.RESOURCE_UPLOAD_COMPLETED,
        messages: [
            {
                key: event.requestId,
                value: JSON.stringify(envelope),                   
                metrics:{
                    ipfsUploadTime: ipfsTime,
                    totalResult
                }
            }
        ]
    });

    logger.logInfo("Evento RESOURCE_UPLOAD_COMPLETED enviado para Kafka: " + event.requestId);
    logger.logInfo(`${assetId} armazenado (${cid})`);
}

async function run() {
    logger.logInfo("Conectando Storage ao Kafka...")
    const kafkaConsumer = await connectConsumer(
        "storage-service",
        [{
            topic: eventTypes.RESOURCE_READY_FOR_STORAGE,
            fromBeginning: false
        }],
        "storage"
    );
    logger.logInfo("Conectado e inscrito no evento RESOURCE_READY_FOR_STORAGE");
    await kafkaConsumer.run({
        eachMessage:
            async ({ message }) => {
                try {
                    const event = JSON.parse(
                        message.value.toString()
                    );
                    if (
                        event.eventType ===
                        eventTypes.RESOURCE_READY_FOR_STORAGE
                    ) {
                        await handleReadyForStorage(event);
                    }
                }
                catch (err) {
                    logger.logError(err.message);
                }
            }
    });
}

run().catch(console.error);
