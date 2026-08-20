const crypto = require("crypto");
const {
  KMSClient,
  EncryptCommand,
  DecryptCommand
} = require("@aws-sdk/client-kms");

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || "us-east-1"
});

function ensureBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  return Buffer.from(value, "base64");
}

async function encryptResource(resource, kmsKeyId) {
  const aesKey = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    aesKey,
    nonce
  );

  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(resource), "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  const encryptedKeyResult = await kmsClient.send(
    new EncryptCommand({
      KeyId: kmsKeyId,
      Plaintext: aesKey
    })
  );

  return {
    ciphertext: ciphertext.toString("base64"),
    encryptedKey: encryptedKeyResult.CiphertextBlob.toString("base64"),
    nonce: nonce.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

function createProxyReencryptionToken(ownerKeyId, recipientKeyId) {
  return {
    type: "kms",
    ownerKeyId,
    recipientKeyId
  };
}

async function reencryptAesKey(encryptedAesKey, proxyToken) {
  if (!proxyToken || proxyToken.type !== "kms") {
    throw new Error("Unsupported proxy re-encryption token.");
  }

  const decryptedKeyResult = await kmsClient.send(
    new DecryptCommand({
      CiphertextBlob: ensureBuffer(encryptedAesKey),
      KeyId: proxyToken.ownerKeyId
    })
  );

  const newEncryptedKeyResult = await kmsClient.send(
    new EncryptCommand({
      KeyId: proxyToken.recipientKeyId,
      Plaintext: decryptedKeyResult.Plaintext
    })
  );

  return newEncryptedKeyResult.CiphertextBlob.toString("base64");
}

module.exports = {
  encryptResource,
  createProxyReencryptionToken,
  reencryptAesKey
};
