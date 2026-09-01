
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_identifier VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) UNIQUE,
    cns VARCHAR(15) UNIQUE,
    birth_date DATE,
    sex_at_birth VARCHAR(30),
    gender_identity VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(255) UNIQUE,
    address JSONB,
    emergency_contact JSONB,
    consent_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    consent_updated_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash TEXT,
    last_login_at TIMESTAMP,
    kms_key_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_patient_cpf_digits
        CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
    CONSTRAINT chk_patient_cns_digits
        CHECK (cns IS NULL OR cns ~ '^[0-9]{15}$'),
    CONSTRAINT chk_patient_consent_status
        CHECK (consent_status IN ('pending', 'granted', 'revoked'))
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
    full_name,
    kms_key_id
)
VALUES (
    'patient001',
    'Paciente de Exemplo 001',
    'alias/paciente1'
);

INSERT INTO patients (
    patient_identifier,
    full_name,
    kms_key_id
)
VALUES (
    'patient002',
    'Paciente de Exemplo 002',
    'alias/patient002'
);

INSERT INTO patients (
    patient_identifier,
    full_name,
    kms_key_id
)
VALUES (
    'patient003',
    'Paciente de Exemplo 003',
    'alias/patient003'
);
