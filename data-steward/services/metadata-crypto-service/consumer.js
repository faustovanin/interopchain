const { encryptResource, reencryptAesKey } = require("../../shared/crypto");

const db = require("../../shared/db");
const { consumer, getProducer } = require("../../shared/kafka");
const {
    buildEnvelope,
    eventTypes
} = require("../../shared/contracts");

const SENSITIVE_METADATA_TERMS = [
    "address",
    "birthdate",
    "communication",
    "contact",
    "deceased",
    "email",
    "emergencycontact",
    "family",
    "given",
    "gender",
    "identifier",
    "maritalstatus",
    "name",
    "password",
    "photo",
    "phone",
    "telecom",
    "text",
    "valueQuantity",
    "value",
];

function isSensitiveMetadataField(fieldName) {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return SENSITIVE_METADATA_TERMS.some(term => normalizedName.includes(term));
}

function filterMetadata(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => filterMetadata(item))
            .filter(item => item !== undefined);
    }

    if (value && typeof value === "object") {
        return Object.entries(value).reduce((metadata, [fieldName, fieldValue]) => {
            if (!isSensitiveMetadataField(fieldName)) {
                const filteredValue = filterMetadata(fieldValue);
                if (filteredValue !== undefined) {
                    metadata[fieldName] = filteredValue;
                }
            }
            return metadata;
        }, {});
    }

    return value;
}

function findPatientIdentifier(resource) {
    let patientIdentifier;
    let fallbackIdentifier;

    function visit(value) {
        if (patientIdentifier || value === null || value === undefined) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }

        if (typeof value !== "object") {
            return;
        }

        if (typeof value.reference === "string" && value.reference.startsWith("Patient/")) {
            patientIdentifier = value.reference.slice("Patient/".length);
            return;
        }

        if (value.identifier?.[0]?.value && !fallbackIdentifier) {
            fallbackIdentifier = value.identifier[0].value;
        }

        Object.values(value).forEach(visit);
    }

    visit(resource);
    return patientIdentifier || fallbackIdentifier || resource.id;
}

function extractMetadata(resource) {
    const metadata = filterMetadata(resource);

    return {
        ...metadata,
        resourceType: resource.resourceType,
        resourceIdentifier: resource.id,
        patientIdentifier: findPatientIdentifier(resource)
    };
}

//const extractObservationMetadata = extractMetadata;
//const extractPatientMetadata = extractMetadata;
//const extractPractitionerMetadata = extractMetadata;
//const extractGenericMetadata = extractMetadata;

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

if (require.main === module) {
    run().catch(console.error);
}

module.exports = {
    extractMetadata,
    //extractObservationMetadata,
    //extractPatientMetadata,
    //extractPractitionerMetadata,
    //extractGenericMetadata,
    SENSITIVE_METADATA_TERMS
};