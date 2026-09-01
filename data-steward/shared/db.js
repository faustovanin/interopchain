const pool = require("./database");
const config = require("./config");
const { LogController, LogLevel_e } = require("./log-controller.js");

const logger = new LogController(config.logLevel === "all" ? LogLevel_e.All : LogLevel_e.Error, "db");

async function getPatientKmsKey(patientIdentifier) {
    logger.logInfo(`Buscando KMS key para paciente: ${patientIdentifier}`);
    const result = await pool.query(
        `
        SELECT id, kms_key_id
        FROM patients
        WHERE patient_identifier = $1
        `,
        [patientIdentifier]
    );
    logger.logInfo(`Resultado da busca de KMS key para paciente ${patientIdentifier}: ${JSON.stringify(result.rows)}`);

    if (result.rows.length === 0) {
        logger.logError(`Paciente não encontrado: ${patientIdentifier}`);
        throw new Error("Paciente não encontrado.");
    }

    return result.rows[0];
}

async function insertPendingClinicalAsset(requestId, metadata, encrypted, patientId) {
    logger.logInfo(`Inserindo clinical asset pendente para requestId: ${requestId}, metadata: ${JSON.stringify(metadata)}, encrypted: ${JSON.stringify(encrypted)}, patientId: ${patientId}`);
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
            Buffer.from(encrypted.ciphertext, "base64"),
            Buffer.from(encrypted.encryptedKey, "base64"),
            Buffer.from(encrypted.nonce, "base64"),
            Buffer.from(encrypted.authTag, "base64")
        ]
    );

    logger.logInfo(`Clinical asset inserido com sucesso para requestId: ${requestId}, id: ${result.rows[0].id}`);
    return result.rows[0].id;
}

async function markClinicalAssetStatusByRequestId(cid, requestId, status) {
    logger.logInfo(`Marcando clinical asset como ${status} para requestId: ${requestId}, cid: ${cid}`);
    await pool.query(
        `
        UPDATE clinical_assets
        SET
            ipfs_cid = $1,
            status = $3
        WHERE request_id = $2
        `,
        [cid, requestId, status]
    );
}

async function getClinicalAssetById(assetId) {
    logger.logInfo(`Buscando clinical asset por ID: ${assetId}`);
    const result = await pool.query(
        `
        SELECT id, patient_id, resource_type, resource_identifier, encrypted_aes_key
        FROM clinical_assets
        WHERE id = $1
        `,
        [assetId]
    );

    logger.logInfo(`Resultado da busca de clinical asset por ID ${assetId}: ${JSON.stringify(result.rows)}`);
    return result.rows[0];
}

async function updateClinicalAssetEncryptedKey(assetId, encryptedKey, patientId) {
    logger.logInfo(`Atualizando chave criptografada do clinical asset: ${assetId}`);
    await pool.query(
        `
        UPDATE clinical_assets
        SET
            encrypted_aes_key = $1,
            patient_id = $2
        WHERE id = $3
        `,
        [Buffer.from(encryptedKey, "base64"), patientId, assetId]
    );
}

async function getAssetOwnerKeyId(assetId) {
    logger.logInfo(`Buscando KMS key do proprietário do clinical asset: ${assetId}`);
    const result = await pool.query(
        `
        SELECT p.kms_key_id AS owner_kms_key_id
        FROM clinical_assets c
        JOIN patients p ON c.patient_id = p.id
        WHERE c.id = $1
        `,
        [assetId]
    );
    logger.logInfo(`Resultado da busca de KMS key para proprietário do clinical asset ${assetId}: ${JSON.stringify(result.rows)}`);
    return result.rows[0]?.owner_kms_key_id;
}

async function updateClinicalAssetStatusById(assetId, status) {
    logger.logInfo(`Atualizando status do clinical asset: ${assetId}, novo status: ${status}`);
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
    logger.logInfo(`Inserindo log de metadata para clinical asset: ${clinicalAssetId}`);
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
    logger.logInfo(`Inserindo métricas de processamento para requestId: ${requestId}`);
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
    logger.logInfo(`Atualizando métricas de processamento para requestId: ${requestId}`);
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
    logger.logInfo(`Buscando tempo total de processamento para requestId: ${requestId}`);
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

    logger.logInfo(`Tempo total de processamento para requestId ${requestId}: ${result.rows[0]?.total_time_ms || 0} ms`);
    return Number(result.rows[0]?.total_time_ms || 0);
}

async function insertAuditLog(event, data) {
    logger.logInfo(`Inserindo log de auditoria para requestId: ${event.requestId}`);
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
    getClinicalAssetById,
    markClinicalAssetStatusByRequestId,
    updateClinicalAssetEncryptedKey,
    getAssetOwnerKeyId,
    updateClinicalAssetStatusById,
    insertMetadataLog,
    insertProcessingMetrics,
    updateProcessingMetrics,
    getRequestTotalTime,
    insertAuditLog
};
