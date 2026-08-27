require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { KMSClient, CreateAliasCommand, CreateKeyCommand, DecryptCommand } = require("@aws-sdk/client-kms");
const pool = require("./db");

const app = express();
const port = process.env.API_PORT || 3000;
const jwtSecret = process.env.JWT_SECRET;
const awsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {})
    }
    : undefined;
const kms = new KMSClient({
    region: process.env.AWS_REGION || "sa-east-1",
    credentials: awsCredentials
});

if (!jwtSecret) {
    throw new Error("JWT_SECRET precisa estar configurado.");
}

app.use(cors({ origin: process.env.APP_ORIGIN || "http://localhost:3001" }));
app.use(express.json({ limit: "1mb" }));

function publicPatient(patient) {
    const { password_hash, ...safePatient } = patient;
    return safePatient;
}

function validateRegistration(body) {
    const required = ["patientIdentifier", "fullName", "email", "password"];
    const missing = required.filter((field) => !body[field]?.toString().trim());
    if (missing.length) {
        return `Campos obrigatórios: ${missing.join(", ")}`;
    }
    if (body.password.length < 8) {
        return "A senha deve ter pelo menos 8 caracteres.";
    }
    if (body.cpf && !/^\d{11}$/.test(body.cpf)) {
        return "O CPF deve conter 11 dígitos, sem pontuação.";
    }
    if (body.cns && !/^\d{15}$/.test(body.cns)) {
        return "O CNS deve conter 15 dígitos, sem pontuação.";
    }
    return null;
}

async function createPatientKey(patientIdentifier) {
    const result = await kms.send(new CreateKeyCommand({
        Description: `Chave KMS do paciente ${patientIdentifier}`,
        KeyUsage: "ENCRYPT_DECRYPT",
        KeySpec: "RSA_2048",
        Tags: [{ TagKey: "application", TagValue: "interopchain" }]
    }));
    const keyId = result.KeyMetadata.KeyId;
    const aliasName = `alias/patient-${patientIdentifier.trim().replace(/[^a-zA-Z0-9:/_-]/g, "-")}`;

    await kms.send(new CreateAliasCommand({
        AliasName: aliasName,
        TargetKeyId: keyId
    }));

    return keyId;
}

function authenticate(request, response, next) {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) return response.status(401).json({ error: "Autenticação necessária." });
    try {
        request.patientId = jwt.verify(token, jwtSecret).patientId;
        return next();
    } catch {
        return response.status(401).json({ error: "Sessão inválida ou expirada." });
    }
}

function asBuffer(value) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    return Buffer.from(value, "base64");
}

async function decryptResource(asset) {
    const keyResult = await kms.send(new DecryptCommand({
        CiphertextBlob: asBuffer(asset.encrypted_aes_key),
        KeyId: asset.kms_key_id,
        EncryptionAlgorithm: "RSAES_OAEP_SHA_256"
    }));

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        keyResult.Plaintext,
        asBuffer(asset.nonce)
    );
    decipher.setAuthTag(asBuffer(asset.auth_tag));

    const plaintext = Buffer.concat([
        decipher.update(asBuffer(asset.encrypted_content)),
        decipher.final()
    ]);
    return JSON.parse(plaintext.toString("utf8"));
}

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.post("/api/auth/register", async (request, response) => {
    console.log("Registrando novo paciente");
    const body = request.body;
    const validationError = validateRegistration(body);
    if (validationError) return response.status(400).json({ error: validationError });

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const passwordHash = await bcrypt.hash(body.password, 12);
        const kmsKeyId = await createPatientKey(body.patientIdentifier.trim());
        const result = await client.query(
            `INSERT INTO patients (
                patient_identifier, full_name, cpf, cns, birth_date,
                sex_at_birth, gender_identity, phone, email, address,
                emergency_contact, kms_key_id, password_hash
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING id, patient_identifier, full_name, cpf, cns, birth_date,
                sex_at_birth, gender_identity, phone, email, address,
                emergency_contact, consent_status, is_active, created_at`,
            [
                body.patientIdentifier.trim(), body.fullName.trim(), body.cpf || null,
                body.cns || null, body.birthDate || null, body.sexAtBirth || null,
                body.genderIdentity || null, body.phone || null, body.email.trim().toLowerCase(),
                body.address || null, body.emergencyContact || null, kmsKeyId, passwordHash
            ]
        );
        await client.query("COMMIT");
        const patient = result.rows[0];
        const token = jwt.sign({ patientId: patient.id }, jwtSecret, { expiresIn: "8h" });
        return response.status(201).json({ token, patient });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") return response.status(409).json({ error: "Identificador, CPF, CNS ou e-mail já cadastrado." });
        console.error(error);
        return response.status(500).json({ error: "Não foi possível criar o usuário." });
    } finally {
        client.release();
    }
});

app.post("/api/auth/login", async (request, response) => {
    const email = request.body.email?.trim().toLowerCase();
    if (!email || !request.body.password) return response.status(400).json({ error: "Informe e-mail e senha." });
    try {
        const result = await pool.query("SELECT * FROM patients WHERE email = $1 AND is_active = TRUE", [email]);
        const patient = result.rows[0];
        if (!patient || !(await bcrypt.compare(request.body.password, patient.password_hash))) {
            return response.status(401).json({ error: "E-mail ou senha inválidos." });
        }
        await pool.query("UPDATE patients SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [patient.id]);
        const token = jwt.sign({ patientId: patient.id }, jwtSecret, { expiresIn: "8h" });
        return response.json({ token, patient: publicPatient(patient) });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: "Não foi possível realizar o login." });
    }
});

app.get("/api/patients/me", authenticate, async (request, response) => {
    try {
        const result = await pool.query(
            `SELECT id, patient_identifier, full_name, cpf, cns, birth_date,
                sex_at_birth, gender_identity, phone, email, address,
                emergency_contact, consent_status, consent_updated_at,
                is_active, created_at, updated_at, last_login_at
             FROM patients WHERE id = $1`,
            [request.patientId]
        );
        if (!result.rows[0]) return response.status(404).json({ error: "Usuário não encontrado." });
        return response.json({ patient: result.rows[0] });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: "Não foi possível consultar o usuário." });
    }
});

app.get("/api/patients/me/resources", authenticate, async (request, response) => {
    try {
        const result = await pool.query(
            `SELECT ca.id, ca.resource_type, ca.resource_identifier, ca.ipfs_cid,
                ca.status, ca.created_at, ca.request_id
             FROM clinical_assets ca
             JOIN patients p ON p.id = ca.patient_id
             WHERE p.id = $1
             ORDER BY ca.created_at DESC`,
            [request.patientId]
        );
        return response.json({ resources: result.rows });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: "Não foi possível consultar os recursos clínicos." });
    }
});

app.get("/api/patients/me/resources/:assetId", authenticate, async (request, response) => {
    try {
        const result = await pool.query(
            `SELECT ca.id, ca.resource_type, ca.resource_identifier, ca.ipfs_cid,
                    ca.status, ca.created_at, ca.request_id, ca.encrypted_content,
                    ca.encrypted_aes_key, ca.nonce, ca.auth_tag, p.kms_key_id
             FROM clinical_assets ca
             JOIN patients p ON p.id = ca.patient_id
             WHERE ca.id = $1 AND p.id = $2`,
            [request.params.assetId, request.patientId]
        );
        const asset = result.rows[0];
        if (!asset) return response.status(404).json({ error: "Recurso não encontrado." });

        const resource = await decryptResource(asset);
        return response.json({ resource });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: "Não foi possível descriptografar o recurso clínico." });
    }
});

app.patch("/api/patients/me/consent", authenticate, async (request, response) => {
    const { status } = request.body;
    console.log(`Paciente ${request.patientId} atualizando consentimento para: ${status}`);
    if (!["granted", "revoked"].includes(status)) {
        return response.status(400).json({ error: "O consentimento deve ser granted ou revoked." });
    }
    try {
        const result = await pool.query(
            `UPDATE patients
             SET consent_status = $1, consent_updated_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING consent_status, consent_updated_at`,
            [status, request.patientId]
        );
        if (!result.rows[0]) return response.status(404).json({ error: "Usuário não encontrado." });
        return response.json({ consent: result.rows[0] });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: "Não foi possível atualizar o consentimento." });
    }
});

app.listen(port, () => console.log(`Interopchain API em http://localhost:${port}`));