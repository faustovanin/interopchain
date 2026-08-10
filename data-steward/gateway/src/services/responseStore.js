const pendingResponses = new Map();

function registerPendingResponse(requestId, res) {
  pendingResponses.set(requestId, res);
}

function resolvePendingResponse(requestId, payload) {
  const res = pendingResponses.get(requestId);
  if (res) {
    res.status(202).json(payload);
    pendingResponses.delete(requestId);
  }
}

module.exports = {
  registerPendingResponse,
  resolvePendingResponse
};
