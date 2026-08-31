const router = require("express").Router();
const axios = require("axios");
const config = require("../../../shared/config.js");
const { LogController, LogLevel_e } = require("../../../shared/log-controller.js");
const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error);

async function latency(url) {
  const startedAt = Date.now();
  await axios.get(url + "/health");
  return Date.now() - startedAt;
}

router.get("/", async (req, res) => {
  try {
    const url = req.query.url;
    const latencyValue = await latency(url);
    logger.logInfo(`Latência para ${url}: ${latencyValue} ms`);
    res.status(200).json({ url, latency: latencyValue });
  } catch (error) {
    logger.logError(`Erro ao medir latência: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;