const router = require("express").Router();
const axios = require("axios");

async function latency(url) {
  const startedAt = Date.now();
  await axios.get(url + "/health");
  return Date.now() - startedAt;
}

router.get("/", async (req, res) => {
  try {
    const url = req.query.url;
    const latencyValue = await latency(url);
    res.status(200).json({ url, latency: latencyValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;