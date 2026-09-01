const { randomUUID } = require("crypto");

function buildEnvelope(eventType, requestId, source, payload) {
  return {
    eventType,
    requestId,
    source,
    timestamp: new Date().toISOString(),
    data: payload
  };
}

function buildRequestId() {
  return randomUUID();
}

module.exports = {
  buildEnvelope,
  buildRequestId,
  eventTypes: {
    RESOURCE_UPLOAD_REQUESTED: "resource.upload.requested",
    RESOURCE_ENCRYPT_REQUESTED: "resource.encrypt.requested",
    RESOURCE_READY_FOR_STORAGE: "resource.ready.storage",
    RESOURCE_UPLOAD_COMPLETED: "resource.upload.completed",
    RESOURCE_UPLOAD_FAILED: "resource.upload.failed",
    RESOURCE_REENCRYPTION_REQUESTED: "resource.reencryption.requested",
    RESOURCE_REENCRYPTION_COMPLETED: "resource.reencryption.completed",
    RESOURCE_REENCRYPTION_FAILED: "resource.reencryption.failed"
  }
};
