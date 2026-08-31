const { getProducer } = require("../../shared/kafka");
const { buildEnvelope, buildRequestId, eventTypes } = require("../../shared/contracts");
const config = require("../../../shared/config.js");
const { LogController, LogLevel_e } = require("../../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error);

async function publishUploadRequested(resource) {
  const requestId = buildRequestId();
  logger.logInfo("Construindo envelope com requestId: " + requestId);
  const envelope = buildEnvelope(eventTypes.RESOURCE_UPLOAD_REQUESTED, requestId, "gateway", {
    resource: resource
  });

  const producer = await getProducer();
  await producer.send({
    topic: eventTypes.RESOURCE_UPLOAD_REQUESTED,
    messages: [{ key: requestId, value: JSON.stringify(envelope) }]
  });
  logger.logInfo("Publicado evento RESOURCE_UPLOAD_REQUESTED no Kafka com requestId: " + requestId);

  return requestId;
}

async function publishReencryptionRequested({ assetId, targetPatientIdentifier, proxyToken }) {
  const requestId = buildRequestId();
  logger.logInfo("Construindo envelope de re-criptografia com requestId: " + requestId);
  const envelope = buildEnvelope(eventTypes.RESOURCE_REENCRYPTION_REQUESTED, requestId, "gateway", {
    assetId,
    targetPatientIdentifier,
    proxyToken
  });

  const producer = await getProducer();
  await producer.send({
    topic: eventTypes.RESOURCE_REENCRYPTION_REQUESTED,
    messages: [{ key: requestId, value: JSON.stringify(envelope) }]
  });
  logger.logInfo("Publicado evento RESOURCE_REENCRYPTION_REQUESTED no Kafka com requestId: " + requestId);

  return requestId;
}

module.exports = {
  publishUploadRequested,
  publishReencryptionRequested
};
