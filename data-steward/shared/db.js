const pool = require("./database");

async function getPatientKmsKey(patientIdentifier) {
    const result = await pool.query(
        `
        SELECT id, kms_key_id
        FROM patients
        WHERE patient_identifier = $1
        `,
        [patientIdentifier]
    );

    if (result.rows.length === 0) {
        throw new Error("Paciente não encontrado.");
    }

    return result.rows[0];
}

async function insertPendingClinicalAsset(requestId, metadata, encrypted, patientId) {
    let resolvedPatientId = patientId;
    if (!resolvedPatientId) {
        const patient = await getPatientKmsKey(metadata.patientIdentifier);
        resolvedPatientId = patient.id;
    }

    const result = await pool.query(
        `
        INSERT INTO clinical_assets (
            request_id,
            patient_id,
            resource_type,
            resource_identifier,
            encrypted_content,
            encrypted_aes_key,
            nonce,
            auth_tag,
            status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
        RETURNING id
        `,
        [
            requestId,
            resolvedPatientId,
            metadata.resourceType,
            metadata.resourceIdentifier,
            encrypted.ciphertext,
            encrypted.encryptedKey,
            encrypted.nonce,
            encrypted.authTag
        ]
    );

    return result.rows[0].id;
}

async function markClinicalAssetStored(assetId, cid) {
    await pool.query(
        `
        UPDATE clinical_assets
        SET
            ipfs_cid = $1,
            status = 'STORED'
        WHERE id = $2
        `,
        [cid, assetId]
    );
}

async function markClinicalAssetCompletedByRequestId(cid, requestId) {
    await pool.query(
        `
        UPDATE clinical_assets
        SET
            ipfs_cid = $1,
            status = 'completed'
        WHERE request_id = $2
        `,
        [cid, requestId]
    );
}

async function getClinicalAssetById(assetId) {
    const result = await pool.query(
        `
        SELECT id, patient_id, resource_type, resource_identifier, encrypted_aes_key
        FROM clinical_assets
        WHERE id = $1
        `,
        [assetId]
    );

    return result.rows[0];
}

async function updateClinicalAssetEncryptedKey(assetId, encryptedKey, patientId) {
    await pool.query(
        `
        UPDATE clinical_assets
        SET
            encrypted_aes_key = $1,
            patient_id = $2
        WHERE id = $3
        `,
        [encryptedKey, patientId, assetId]
    );
}

async function getAssetOwnerKeyId(assetId) {
    const result = await pool.query(
        `
        SELECT p.kms_key_id AS owner_kms_key_id
        FROM clinical_assets c
        JOIN patients p ON c.patient_id = p.id
        WHERE c.id = $1
        `,
        [assetId]
    );

    return result.rows[0]?.owner_kms_key_id;
}

async function updateClinicalAssetStatusById(assetId, status) {
    await pool.query(
        `
        UPDATE clinical_assets
        SET status = $1
        WHERE id = $2
        `,
        [status, assetId]
    );
}

async function insertMetadataLog(clinicalAssetId, metadata) {
    await pool.query(
        `
        INSERT INTO metadata_log
        (
            clinical_asset_id,
            metadata
        )
        VALUES
        ($1,$2)
        `,
        [clinicalAssetId, metadata]
    );
}

async function insertProcessingMetrics(requestId, metadataTime, encryptionTime, payloadSize) {
    await pool.query(
        `
        INSERT INTO processing_metrics
        (
            request_id,
            metadata_time_ms,
            encryption_time_ms,
            payload_size
        )
        VALUES
        ($1,$2,$3,$4)
        `,
        [
            requestId,
            metadataTime,
            encryptionTime,
            payloadSize
        ]
    );
}

async function updateProcessingMetrics(ipfsUploadTimeMs, storageNode, totalTimeMs, requestId) {
    await pool.query(
        `
        UPDATE processing_metrics
        SET
            ipfs_upload_time_ms=$1,
            storage_node=$2,
            total_time_ms=$3
        WHERE request_id=$4
        `,
        [
            ipfsUploadTimeMs,
            storageNode,
            totalTimeMs,
            requestId
        ]
    );
}

async function getRequestTotalTime(requestId) {
    const result = await pool.query(
        `
        SELECT 
            EXTRACT(
                EPOCH FROM 
                (NOW() - created_at)
            ) * 1000 AS total_time_ms
        FROM audit_logs
        WHERE request_id = $1
        AND event_type = 'resource.upload.requested'
        LIMIT 1
        `,
        [requestId]
    );

    return Number(result.rows[0]?.total_time_ms || 0);
}

async function insertAuditLog(event, data) {
    await pool.query(
        `
        INSERT INTO audit_log
        (
            request_id,
            event_type,
            source,
            asset_id,
            resource_type,
            payload
        )
        VALUES
        ($1,$2,$3,$4,$5,$6)
        `,
        [
            event.requestId,
            event.eventType,
            event.source,
            data.assetId,
            data.resourceType,
            data
        ]
    );
}

module.exports = {
    getPatientKmsKey,
    insertPendingClinicalAsset,
    markClinicalAssetStored,
    markClinicalAssetCompletedByRequestId,
    getClinicalAssetById,
    updateClinicalAssetEncryptedKey,
    getAssetOwnerKeyId,
    updateClinicalAssetStatusById,
    insertMetadataLog,
    insertProcessingMetrics,
    updateProcessingMetrics,
    getRequestTotalTime,
    insertAuditLog
};
