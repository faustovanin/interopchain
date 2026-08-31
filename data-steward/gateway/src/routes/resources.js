const express = require("express");
const router = express.Router();
const { publishUploadRequested, publishReencryptionRequested } = require("../services/eventPublisher");
const config = require("../../../shared/config.js");
const { LogController, LogLevel_e } = require("../../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error);

async function upload(req, res) {
  try {
    logger.logInfo("Publicando novo evento");
    const requestId = await publishUploadRequested(req.body);
    res.status(202).json({
      requestId,
      status: "accepted"
    });
    logger.logInfo("Sucesso");
  } catch (error) {
    logger.logError(`Erro ao publicar evento de upload: ${error.message}`);
    res.status(500).json({ error: "failed to publish upload event" });
  }
}

async function reencrypt(req, res) {
  try {
    logger.logInfo("Publicando evento de re-criptografia");
    const requestId = await publishReencryptionRequested(req.body);
    res.status(202).json({
      requestId,
      status: "accepted"
    });
    logger.logInfo("Sucesso da re-criptografia");
  } catch (error) {
    logger.logError(`Erro ao publicar evento de re-criptografia: ${error.message}`);
    res.status(500).json({ error: "failed to publish reencryption event" });
  }
}

router.post("/", upload);
router.post("/reencrypt", reencrypt);

module.exports = router;