const crypto = require("crypto");

function ensureBuffer(value) {
  return Buffer.isBuffer(value)
    ? value
    : Buffer.from(value, "base64");
}

function encryptResource(resource, publicKeyPem) {
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
  const encryptedKey = crypto.publicEncrypt(
    publicKeyPem,
    aesKey
  );

  return {
    ciphertext: ciphertext.toString("base64"),
    encryptedKey: encryptedKey.toString("base64"),
    nonce: nonce.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

function createProxyReencryptionToken(ownerPrivateKeyPem, recipientPublicKeyPem) {
  return {
    type: "rsa-hybrid-placeholder",
    ownerPrivateKeyPem,
    recipientPublicKeyPem
  };
}

function reencryptAesKey(encryptedAesKey, proxyToken) {
  if (!proxyToken || proxyToken.type !== "rsa-hybrid-placeholder") {
    throw new Error("Unsupported proxy re-encryption token.");
  }

  const aesKey = crypto.privateDecrypt(
    proxyToken.ownerPrivateKeyPem,
    ensureBuffer(encryptedAesKey)
  );

  const newEncryptedKey = crypto.publicEncrypt(
    proxyToken.recipientPublicKeyPem,
    aesKey
  );

  return newEncryptedKey.toString("base64");
}

module.exports = {
  encryptResource,
  createProxyReencryptionToken,
  reencryptAesKey
};
