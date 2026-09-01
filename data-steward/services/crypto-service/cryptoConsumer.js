const { encryptResource, reencryptAesKey } = require("../../shared/crypto.js");

const db = require("../../shared/db.js");
const { connectConsumer, getProducer } = require("../../shared/kafka.js");
const {
    buildEnvelope,
    eventTypes
} = require("../../shared/contracts.js");

const config = require("../../shared/config.js");
const { LogController, LogLevel_e } = require("../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error, "crypto-service");

logger.logInfo("Iniciando serviço de criptografia...");

async function handleEncryptRequested(event) {
    const requestId = event.requestId;
    logger.logInfo("Entrou no crypto service para processar evento RESOURCE_ENCRYPT_REQUESTED: " + requestId);

    const resource = event.data.resource;
    const metadata = event.data.metadata;
    const metadataTime = event.data.metrics?.metadataTime ?? 0;
    logger.logInfo("Métrica de metadata recebida pelo envelope: " + metadataTime);

    const patient = await db.getPatientKmsKey(metadata.patientIdentifier);
    logger.logInfo("Patient: " + patient.id + " - " + metadata.patientIdentifier);

    const encryptStart = Date.now();
    logger.logInfo("Início criptografia: " + encryptStart);
    const encrypted = await encryptResource(resource, patient.kms_key_id);
    const encryptTime = Date.now() - encryptStart;
    logger.logInfo("Fim criptografia: " + encryptTime);

    const assetId = await db.insertPendingClinicalAsset(requestId, metadata, encrypted, patient.id);
    logger.logInfo("Inserção em clinical_asset: " + assetId + " para requestId: " + requestId);

    await db.insertMetadataLog(assetId, metadata);
    await db.insertProcessingMetrics(
        requestId,
        metadataTime,
        encryptTime,
        Buffer.byteLength(JSON.stringify(resource))
    );
    logger.logInfo("Inserindo logs de métricas para requestId: " + requestId);

    logger.logInfo("Construindo envelope para evento RESOURCE_READY_FOR_STORAGE: " + requestId);
    const producer = await getProducer();

    await producer.send({
        topic: eventTypes.RESOURCE_READY_FOR_STORAGE,
        messages: [
            {
                key: requestId,
                value: JSON.stringify({
                    ...event,
                    eventType: eventTypes.RESOURCE_READY_FOR_STORAGE,
                    source: "crypto",
                    data: {
                        ...event.data,
                        assetId,
                        resourceType: metadata.resourceType,
                        resourceIdentifier: metadata.resourceIdentifier,
                        encrypted
                    }
                })
            }
        ]
    });

    logger.logInfo("Publicado evento RESOURCE_READY_FOR_STORAGE no Kafka para requestId: " + requestId);
}

async function handleUploadCompleted(event) {
    const {
        assetId,
        cid
    } = event.data;

    await db.markClinicalAssetStored(assetId, cid);
    logger.logInfo(`${assetId} atualizado com CID ${cid}`);
}

async function handleReencryptionRequested(event) {
    const { assetId, targetPatientIdentifier, proxyToken } = event.data;
    logger.logInfo(`Request de re-criptografia para asset ${assetId} targetPatientIdentifier=${targetPatientIdentifier}`);

    try {
        const assetOwnerKeyId = await db.getAssetOwnerKeyId(assetId);
        if (!assetOwnerKeyId) {
            logger.logError(`Owner key for asset ${assetId} não encontrado`);
            throw new Error(`Owner key for asset ${assetId} não encontrado`);
        }

        const asset = await db.getClinicalAssetById(assetId);
        if (!asset) {
            logger.logError(`Asset ${assetId} não encontrado`);
            throw new Error(`Asset ${assetId} não encontrado`);
        }

        const recipient = await db.getPatientKmsKey(targetPatientIdentifier);
        const reencryptToken = proxyToken || {
            type: "kms",
            ownerKeyId: assetOwnerKeyId,
            recipientKeyId: recipient.kms_key_id
        };

        const newEncryptedKey = await reencryptAesKey(asset.encrypted_aes_key, reencryptToken);

        await db.updateClinicalAssetEncryptedKey(assetId, newEncryptedKey, recipient.id);

        const producer = await getProducer();
        const envelope = buildEnvelope(
            eventTypes.RESOURCE_REENCRYPTION_COMPLETED,
            event.requestId,
            "metadata-crypto",
            {
                assetId,
                targetPatientIdentifier,
                recipientPatientId: recipient.id
            }
        );

        await producer.send({
            topic: eventTypes.RESOURCE_REENCRYPTION_COMPLETED,
            messages: [{ key: event.requestId, value: JSON.stringify(envelope) }]
        });

        logger.logInfo(`Asset ${assetId} re-criptografado para paciente ${recipient.id}`);
    } catch (err) {
        logger.logError(`Falha ao re-criptografar asset ${assetId}:`, err.message);
        const producer = await getProducer();
        const envelope = buildEnvelope(
            eventTypes.RESOURCE_REENCRYPTION_FAILED,
            event.requestId,
            "crypto",
            {
                assetId,
                targetPatientIdentifier,
                reason: err.message
            }
        );

        await producer.send({
            topic: eventTypes.RESOURCE_REENCRYPTION_FAILED,
            messages: [{ key: event.requestId, value: JSON.stringify(envelope) }]
        });
        throw err;
    }
}

async function run() {
    logger.logInfo("Conectando Crypto ao Kafka...");
    const kafkaConsumer = await connectConsumer(
        "crypto-service",
        [
            {
                topic: eventTypes.RESOURCE_ENCRYPT_REQUESTED,
                fromBeginning: false
            },
            {
                topic: eventTypes.RESOURCE_UPLOAD_COMPLETED,
                fromBeginning: false
            },
            {
                topic: eventTypes.RESOURCE_REENCRYPTION_REQUESTED,
                fromBeginning: false
            }
        ],
        "crypto"
    );

    logger.logInfo("Conectado e inscrito nos eventos RESOURCE_ENCRYPT_REQUESTED, RESOURCE_UPLOAD_COMPLETED e RESOURCE_REENCRYPTION_REQUESTED");
    await kafkaConsumer.run({
        eachMessage:
            async ({ message }) => {
                try {
                    const event = JSON.parse(message.value.toString());

                    switch (event.eventType) {
                        case eventTypes.RESOURCE_ENCRYPT_REQUESTED:
                            await handleEncryptRequested(event);
                            break;

                        case eventTypes.RESOURCE_REENCRYPTION_REQUESTED:
                            await handleReencryptionRequested(event);
                            break;
                    }
                }

                catch (err) {
                    logger.logError(err.message);
                }
            }
    });
}

if (require.main === module) {
    run().catch(console.error);
}