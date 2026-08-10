
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_identifier VARCHAR(255) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
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
    public_key
)
VALUES (
    'patient001',

    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvPwFyon4qwCImZ6KA58/
D9bN0C91nim3CWWDt81hT2zn3VaPHMTieWfQJPnbrgrr2QiUsU2RV++9nyJJ2Dvi
fcF3ma941pbptvoIGUyuYdazgV2Qvjz2yIbWoTb9XfC+UB5tfQnNwPnqQ28Hj2CN
3za+dhLYPPsJjSq7LevTr4D+u5ZACPPa2NdKZuQYrs9qYrXRD8GvzvO+5HfYiuy4
iVrbcJsOQKXHqLxZy1RtJZXdlUyfRIk14AWWqvYP7Xrr0AwGBaE+TEJD5uTPJ+Sf
zhRCXxXcuNB2Vyw44onqcc1Pkkk2WSKXvTkIXL4EoaByaQ29q10AJsf3Igc9vusC
rwIDAQAB
-----END PUBLIC KEY-----'
);

INSERT INTO patients (
    patient_identifier,
    public_key
)
VALUES (
    'patient002',

    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnDADoyK9QHaOUP7/Oho6
FNNC8HcjubvB/lW9bE8nffof/seNsjnum3MaYuDDJ6RcNNqlso270s9pBmHIX1KG
AV15etrrFq1bUmKs6CFLT5A8t8CpJXjc0Lt5EecXRTLt/b8LfhQIRBW7EPhU4f80
dmY6qdOPvlKPu5xKCi7gdSf4UlcQqHObEJVp19hII0mFxcfYmPe7zZ4rTs64k8gN
xZJXUajwDKOyJfXGVWLmIxmfWcbRufDFcg1Uje6p8Z8dNvfvX9LNUkDqafZD0qRN
sNN7aUiHhdhYB35jTzbaWpatk6+xABozimAOJyD+Hm6tO7c/mt65tbJzTGQeRxag
HwIDAQAB
-----END PUBLIC KEY-----'
);

INSERT INTO patients (
    patient_identifier,
    public_key
)
VALUES (
    'patient003',

    '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0tW3NpZO0rt8ZRvdFxy+
fSLEeq3VfgpMvvRRRYJyVABZSy40lxBtrmBdrzdbNSsTTxhmAXiFS5CJozlNPSv3
6cgs6jF9ruhentLnf79YVzpEr+QDVlbcGvn2hyWfvQwHNIWtuemrvYtA1UxmRMCN
nQX+BClb6tXMROH15+7pqbCIWqDGwOQywjAvmqiXoOUQTlevKZmbSYoxMDFXD93G
HamkbPy8pjM+VWdmYEfY7AqbC6tUmmp8JAl6iGKv8ufjgBJBW5i2gU3h6ZdaIhHG
IUMHyYm7jEioM0ZvCq8A+0DtmGKwxdrwB40sbbDl649rhSQfN54Dn9PyWTUlBf0m
IwIDAQAB
-----END PUBLIC KEY-----'
);