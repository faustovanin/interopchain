
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_identifier VARCHAR(255) NOT NULL UNIQUE,
    kms_key_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinical_assets (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID UNIQUE,
    patient_id INTEGER NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_identifier VARCHAR(255) NOT NULL,
    ipfs_cid VARCHAR(255),
    encrypted_content BYTEA,
    encrypted_aes_key BYTEA,
    nonce BYTEA,
    auth_tag BYTEA,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient
        FOREIGN KEY(patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
);

CREATE TABLE metadata_log (
    id BIGSERIAL PRIMARY KEY,
    clinical_asset_id BIGINT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_asset
        FOREIGN KEY(clinical_asset_id)
        REFERENCES clinical_assets(id)
        ON DELETE CASCADE
);

CREATE TABLE processing_metrics (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL,
    metadata_time_ms BIGINT,
    encryption_time_ms BIGINT,
    ipfs_upload_time_ms BIGINT,
    storage_node VARCHAR(100),
    total_time_ms BIGINT,
    payload_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(50),
    asset_id BIGINT,
    resource_type VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinical_assets_patient
ON clinical_assets(patient_id);

CREATE INDEX idx_clinical_assets_resource
ON clinical_assets(resource_identifier);

CREATE INDEX idx_clinical_assets_cid
ON clinical_assets(ipfs_cid);

CREATE INDEX idx_assets_request
ON clinical_assets(request_id);

CREATE INDEX idx_metrics_request
ON processing_metrics(request_id);

INSERT INTO patients (
    patient_identifier,
    kms_key_id
)
VALUES (
    'patient001',
    'alias/patient001'
);

INSERT INTO patients (
    patient_identifier,
    kms_key_id
)
VALUES (
    'patient002',
    'alias/patient002'
);

INSERT INTO patients (
    patient_identifier,
    kms_key_id
)
VALUES (
    'patient003',
    'alias/patient003'
);
