const express = require("express");
const router = express.Router();
const { publishUploadRequested, publishReencryptionRequested } = require("../services/eventPublisher");

async function upload(req, res) {
  try {
    console.log("Publicando novo evento");
    const requestId = await publishUploadRequested(req.body);
    res.status(202).json({
      requestId,
      status: "accepted"
    });
    console.log("Sucesso");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "failed to publish upload event" });
  }
}

async function reencrypt(req, res) {
  try {
    console.log("Publicando evento de re-criptografia");
    const requestId = await publishReencryptionRequested(req.body);
    res.status(202).json({
      requestId,
      status: "accepted"
    });
    console.log("Sucesso da re-criptografia");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "failed to publish reencryption event" });
  }
}

router.post("/", upload);
router.post("/reencrypt", reencrypt);

module.exports = router;