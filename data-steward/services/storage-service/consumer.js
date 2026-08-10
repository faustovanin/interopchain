const axios = require("axios");
const FormData = require("form-data");
const { performance } = require("perf_hooks");

const { consumer, getProducer } = require("../../shared/kafka");
const db = require("../../shared/db");

const { buildEnvelope, eventTypes } = require("../../shared/contracts");

let currentNodeIndex = 0;

// Guarda até quando cada nó deve ficar em cooldown
const nodeCooldowns = new Map();
const COOLDOWN_MS = 20000;

async function uploadToIPFSDist(payload) {
    console.log("Enviando para IPFS");

    const nodes = process.env.IPFS_API_NODES
        .split(",")
        .map(node => node.trim());

    let lastError;
    const now = Date.now();

    for (let attempt = 0; attempt < nodes.length; attempt++) {

        const index = (currentNodeIndex + attempt) % nodes.length;
        const node = nodes[index];

        // Ignora nós que ainda estão em cooldown
        const cooldownUntil = nodeCooldowns.get(node);
        if (cooldownUntil && cooldownUntil > now) {
            console.log(
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
            console.log(`Tentando upload para ${node}`);

            const startedAt = performance.now();

            const response = await axios.post(
                `${node}/api/v0/add`,
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 3000
                }
            );

            const uploadTime = performance.now() - startedAt;

            console.log(`Upload realizado em ${node}`);

            // Remove cooldown caso ele tenha voltado
            nodeCooldowns.delete(node);

            // Próxima chamada começa no próximo nó
            currentNodeIndex = (index + 1) % nodes.length;

            return {
                cid: response.data.Hash,
                nodeHost,
                uploadTime
            };

        } catch (error) {
            console.warn(`Falha em ${node}`);

            // Coloca o nó em cooldown
            nodeCooldowns.set(node, Date.now() + COOLDOWN_MS);

            lastError = error;
        }
    }

    // Todos os nós estão em cooldown ou falharam
    throw lastError || new Error("Nenhum nó IPFS disponível.");
}

async function update_clinical_asset(cid, requestId) {
    await db.markClinicalAssetCompletedByRequestId(cid, requestId);
}

async function update_metrics(ipfsTime, node, requestId, totalTime) {
    await db.updateProcessingMetrics(ipfsTime, node, totalTime, requestId);
}

async function getTotalTime(requestId) {
    return db.getRequestTotalTime(requestId);
}

async function handleReadyForStorage(event) {
    console.log("Entrou no storage-service")
    const ipfsStart = Date.now();
    console.log("Início: " + ipfsStart);

    const {
        assetId,
        resourceType,
        resourceIdentifier,
        encrypted
    } = event.data;
    console.log("Processando assetId: " + assetId);

    const {
        cid,
        nodeHost,
        uploadTime
    } = await uploadToIPFSDist(encrypted);
    console.log("Upload response: " + cid + " from node: " + nodeHost + " in " + uploadTime + "ms");

    const ipfsTime = Date.now() - ipfsStart;
    console.log("Fim: " + ipfsTime);
    console.log("Atualizando clinical asset: " + event.requestId);
    await update_clinical_asset(cid, event.requestId);
    
    console.log("Construindo envelope para evento RESOURCE_UPLOAD_COMPLETED: " + event.requestId);
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
    console.log("Tempo total: " + totalResult + "ms");
    console.log("Atualizando métricas com os tempos para requestId: " + event.requestId);
    await update_metrics(ipfsTime, nodeHost, event.requestId, totalResult);

    console.log("Enviando evento RESOURCE_UPLOAD_COMPLETED para Kafka com requestId: " + event.requestId);
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

    console.log("Evento RESOURCE_UPLOAD_COMPLETED enviado para Kafka: " + event.requestId);
    console.log(`[storage] ${assetId} armazenado (${cid})`);
}

async function run() {
    const kafkaConsumer = consumer("storage-service");

    console.log("Conectando ao Kafka...")
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_READY_FOR_STORAGE, fromBeginning:
            false
    });
    console.log("Conectado e inscrito no evento RESOURCE_READY_FOR_STORAGE");
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
                    console.error(
                        "[storage]",
                        err.message
                    );
                }
            }
    });
}

run().catch(console.error);
