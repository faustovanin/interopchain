const crypto = require("crypto");
const {
  KMSClient,
  EncryptCommand,
  DecryptCommand
} = require("@aws-sdk/client-kms");

const kmsEncryptionAlgorithm = "RSAES_OAEP_SHA_256";

const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN
        ? { sessionToken: process.env.AWS_SESSION_TOKEN }
        : {})
    }
  : undefined;

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || "sa-east-1",
  credentials
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

function toBase64(value) {
  return Buffer.from(value).toString("base64");
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
      Plaintext: aesKey,
      EncryptionAlgorithm: kmsEncryptionAlgorithm
    })
  );

  return {
    ciphertext: ciphertext.toString("base64"),
    encryptedKey: toBase64(encryptedKeyResult.CiphertextBlob),
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
      KeyId: proxyToken.ownerKeyId,
      EncryptionAlgorithm: kmsEncryptionAlgorithm
    })
  );

  const newEncryptedKeyResult = await kmsClient.send(
    new EncryptCommand({
      KeyId: proxyToken.recipientKeyId,
      Plaintext: decryptedKeyResult.Plaintext,
      EncryptionAlgorithm: kmsEncryptionAlgorithm
    })
  );

  return toBase64(newEncryptedKeyResult.CiphertextBlob);
}

module.exports = {
  encryptResource,
  createProxyReencryptionToken,
  reencryptAesKey
};
