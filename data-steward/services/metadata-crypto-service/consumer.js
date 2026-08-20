const { encryptResource, reencryptAesKey } = require("../../shared/crypto");

const db = require("../../shared/db");
const { consumer, getProducer } = require("../../shared/kafka");
const {
    buildEnvelope,
    eventTypes
} = require("../../shared/contracts");


function extractMetadata(resource) {
    switch (resource.resourceType) {
        case "Observation":
            return extractObservationMetadata(resource);
        case "Patient":
            return extractPatientMetadata(resource);
        case "Practitioner":
            return extractPractitionerMetadata(resource);
        default:
            return extractGenericMetadata(resource);
    }
}

function extractObservationMetadata(resource) {
    return {
        resourceType: resource.resourceType,
        resourceIdentifier: resource.id,
        patientIdentifier: resource.subject?.reference?.replace("Patient/", "") || resource.id,
        profile: resource.meta?.profile?.[0],
        status: resource.status,
        categoryCode: resource.category?.[0]?.coding?.[0]?.code,
        examCode: resource.code?.coding?.[0]?.code,
        effectiveDateTime: resource.effectiveDateTime,
        issued: resource.issued,
        performerCount: resource.performer?.length || 0,
        performerSystems: resource.performer?.map(p => p.identifier?.system) || [],
        referenceRange: resource.referenceRange?.[0]?.text
    };
}

function extractPatientMetadata(resource) {
    return {
        resourceType: resource.resourceType,
        resourceIdentifier: resource.id,
        patientIdentifier: resource.identifier?.[0]?.value || resource.id,
        profile: resource.meta?.profile?.[0],
        status: resource.active ? "active" : "inactive",
    };
}

function extractPractitionerMetadata(resource) {
    return {
        resourceType: resource.resourceType,
        resourceIdentifier: resource.id,
        patientIdentifier: resource.identifier?.[0]?.value || resource.id,
        profile: resource.meta?.profile?.[0],
        status: resource.active ? "active" : "inactive",
    };
}

function extractGenericMetadata(resource) {
    return {
        resourceType: resource.resourceType,
        resourceIdentifier: resource.id,
        patientIdentifier: resource.subject?.reference?.replace("Patient/", "") || resource.identifier?.[0]?.value || resource.id,
        profile: resource.meta?.profile?.[0],
        status: resource.status || resource.active,
        categoryCode: resource.category?.[0]?.coding?.[0]?.code,
        examCode: resource.code?.coding?.[0]?.code,
        effectiveDateTime: resource.effectiveDateTime,
        issued: resource.issued,
        performerCount: resource.performer?.length || 0,
        performerSystems: resource.performer?.map(p => p.identifier?.system) || [],
        referenceRange: resource.referenceRange?.[0]?.text
    };
}

async function handleUploadRequested(event) {
    const requestId = event.requestId;
    console.log("Entrou no metadata-crypto service para processar evento RESOURCE_UPLOAD_REQUESTED: " + requestId);

    const metadataStart = Date.now();
    console.log("Início metadata: " + metadataStart);
    const resource = event.data.resource;
    const metadata = extractMetadata(resource);
    const metadataTime = Date.now() - metadataStart;
    console.log("Fim metadata: " + metadataTime);

    const patient = await db.getPatientKmsKey(metadata.patientIdentifier);
    console.log("Patient: " + patient.id + " - " + metadata.patientIdentifier);

    const encryptStart = Date.now();
    console.log("Início criptografia: " + encryptStart);
    const encrypted = await encryptResource(resource, patient.kms_key_id);
    const encryptTime = Date.now() - encryptStart;
    console.log("Fim criptografia: " + encryptTime);

    const assetId = await db.insertPendingClinicalAsset(requestId, metadata, encrypted, patient.id);
    console.log("Inserção em clinical_asset: " + assetId + " para requestId: " + requestId);

    await db.insertMetadataLog(assetId, metadata);
    await db.insertProcessingMetrics(
        requestId,
        metadataTime,
        encryptTime,
        Buffer.byteLength(JSON.stringify(resource))
    );
    console.log("Inserindo logs de métricas para requestId: " + requestId);

    console.log("Construindo envelope para evento RESOURCE_READY_FOR_STORAGE: " + requestId);
    const producer = await getProducer();

    await producer.send({
    topic: eventTypes.RESOURCE_READY_FOR_STORAGE,
    messages: [
        {
            key: requestId,
            value: JSON.stringify({
                ...event,
                eventType: eventTypes.RESOURCE_READY_FOR_STORAGE,
                source: "metadata-crypto",
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
    console.log("Publicado evento RESOURCE_READY_FOR_STORAGE no Kafka para requestId: " + requestId);
}

async function handleUploadCompleted(event) {
    const {
        assetId,
        cid
    } = event.data;

    await db.markClinicalAssetStored(assetId, cid);
    console.log(`[metadata] ${assetId} atualizado com CID ${cid}`);
}

async function handleReencryptionRequested(event) {
    const { assetId, targetPatientIdentifier, proxyToken } = event.data;
    console.log(`[metadata] Request de re-criptografia para asset ${assetId} targetPatientIdentifier=${targetPatientIdentifier}`);

    try {
        const assetOwnerKeyId = await db.getAssetOwnerKeyId(assetId);
        if (!assetOwnerKeyId) {
            throw new Error(`Owner key for asset ${assetId} não encontrado`);
        }

        const asset = await db.getClinicalAssetById(assetId);
        if (!asset) {
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

        console.log(`[metadata] asset ${assetId} re-criptografado para paciente ${recipient.id}`);
    } catch (err) {
        console.error(`[metadata] falha ao re-criptografar asset ${assetId}:`, err.message);
        const producer = await getProducer();
        const envelope = buildEnvelope(
            eventTypes.RESOURCE_REENCRYPTION_FAILED,
            event.requestId,
            "metadata-crypto",
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
    const kafkaConsumer = consumer("metadata-crypto-service");
    console.log("Conectando ao Kafka...");
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_UPLOAD_REQUESTED,
        fromBeginning: false
    });

    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_UPLOAD_COMPLETED,
        fromBeginning: false
    });

    await kafkaConsumer.subscribe({
        topic: eventTypes.RESOURCE_REENCRYPTION_REQUESTED,
        fromBeginning: false
    });

    console.log("Conectado e inscrito nos eventos RESOURCE_UPLOAD_REQUESTED, RESOURCE_UPLOAD_COMPLETED e RESOURCE_REENCRYPTION_REQUESTED");
    await kafkaConsumer.run({
        eachMessage:
            async ({ message }) => {
                try {
                    const event = JSON.parse(message.value.toString());

                    switch (event.eventType) {
                        case eventTypes.RESOURCE_UPLOAD_REQUESTED:
                            await handleUploadRequested(event);
                            break;

                        case eventTypes.RESOURCE_UPLOAD_COMPLETED:
                            await handleUploadCompleted(event);
                            break;

                        case eventTypes.RESOURCE_REENCRYPTION_REQUESTED:
                            await handleReencryptionRequested(event);
                            break;
                    }
                }

                catch (err) {
                    console.error("[metadata]", err.message);
                }
            }
    });
}

run().catch(console.error);