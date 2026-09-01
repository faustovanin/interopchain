const pool = require("../config/database");

exports.getPatientKmsKey = async (patientIdentifier) => {
    const result =
        await pool.query(
            `
            SELECT kms_key_id
            FROM patients
            WHERE patient_identifier = $1
            `,
            [patientIdentifier]
        );

    if (result.rows.length === 0) {
        throw new Error(
            "KMS key ID não encontrado"
        );
    }

    return result.rows[0].kms_key_id;
}

exports.save = async (
    metadata,
    encrypted,
    cid
) => {
    const patientQuery = await pool.query(
        `
        SELECT id
        FROM patients
        WHERE patient_identifier = $1
        `,
        [metadata.patientIdentifier]
    );

    if (patientQuery.rows.length === 0) {
        throw new Error(
            "Paciente não encontrado"
        );
    }

    const patientId =
        patientQuery.rows[0].id;

    const result = await pool.query(
        `
        INSERT INTO clinical_assets (
            patient_id,
            resource_type,
            resource_identifier,
            ipfs_cid,
            encrypted_content,
            encrypted_aes_key,
            nonce,
            auth_tag
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id
        `,
        [
            patientId,
            metadata.resourceType,
            metadata.resourceIdentifier,
            cid,
            Buffer.from(encrypted.ciphertext, "base64"),
            Buffer.from(encrypted.encryptedKey, "base64"),
            Buffer.from(encrypted.nonce, "base64"),
            Buffer.from(encrypted.authTag, "base64")
        ]
    );

    return result.rows[0].id;
};