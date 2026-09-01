const { connectConsumer, getProducer } = require("../../shared/kafka.js");
const {
    buildEnvelope,
    eventTypes
} = require("../../shared/contracts.js");

const SENSITIVE_METADATA_TERMS = require("../../shared/metadata.js").SENSITIVE_METADATA_TERMS;

const config = require("../../shared/config.js");
const { LogController, LogLevel_e } = require("../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error, "metadata-service");

logger.logInfo("Iniciando serviço de metadata...");
logger.logInfo("Termos sensíveis de metadata: " + SENSITIVE_METADATA_TERMS.join(", "));

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

function buildEncryptRequestedEvent(event, metadataTime) {
    const resource = event.data?.resource;
    if (!resource) {
        throw new Error("Evento RESOURCE_UPLOAD_REQUESTED sem payload de resource");
    }

    const metadata = extractMetadata(resource);

    return buildEnvelope(eventTypes.RESOURCE_ENCRYPT_REQUESTED, event.requestId, "metadata", {
        resource,
        metadata,
        resourceType: metadata.resourceType,
        resourceIdentifier: metadata.resourceIdentifier,
        patientIdentifier: metadata.patientIdentifier,
        metrics: {
            metadataTime: Number(metadataTime) || 0
        }
    });
}

async function handleUploadRequested(event) {
    const requestId = event.requestId;
    logger.logInfo("Entrou no serviço de metadata para processar evento RESOURCE_UPLOAD_REQUESTED: " + requestId);

    const metadataStart = Date.now();
    logger.logInfo("Início metadata: " + metadataStart);
    const resource = event.data.resource;
    const metadata = extractMetadata(resource);
    const metadataTime = Date.now() - metadataStart;
    logger.logInfo("Fim metadata: " + metadataTime);

    const eventEnvelope = buildEncryptRequestedEvent({
        ...event,
        data: {
            ...event.data,
            resource,
            metadata
        }
    }, metadataTime);

    const producer = await getProducer();
    await producer.send({
        topic: eventTypes.RESOURCE_ENCRYPT_REQUESTED,
        messages: [
            {
                key: requestId,
                value: JSON.stringify(eventEnvelope)
            }
        ]
    });

    logger.logInfo("Publicado evento RESOURCE_ENCRYPT_REQUESTED no Kafka para requestId: " + requestId);
}

async function run() {
    logger.logInfo("Conectando Metadata ao Kafka...");
    const kafkaConsumer = await connectConsumer(
        "metadata-service",
        [
            {
                topic: eventTypes.RESOURCE_UPLOAD_REQUESTED,
                fromBeginning: false
            }
        ],
        "metadata"
    );

    logger.logInfo("Conectado e inscrito no evento RESOURCE_UPLOAD_REQUESTED");
    await kafkaConsumer.run({
        eachMessage:
            async ({ message }) => {
                try {
                    const event = JSON.parse(message.value.toString());

                    switch (event.eventType) {
                        case eventTypes.RESOURCE_UPLOAD_REQUESTED:
                            await handleUploadRequested(event);
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

module.exports = {
    extractMetadata,
    buildEncryptRequestedEvent
};