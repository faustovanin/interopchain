package org.interopchain;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * FHIRRecord represents the data stored on the Hyperledger Fabric ledger for a
 * single HL7 FHIR document.
 *
 * <p>The full FHIR file is <strong>not</strong> stored on-chain. Instead, only:
 * <ul>
 *   <li>A SHA-256 hash of the FHIR file (for integrity verification)</li>
 *   <li>Selected metadata fields (resource type, resource ID, etc.)</li>
 *   <li>The patient's public key (used for access control and queries)</li>
 * </ul>
 * are persisted to the ledger.
 */
public class FHIRRecord {

    /** Unique ledger record ID (composite: resourceType~resourceId). */
    @JsonProperty("id")
    private String id;

    /** HL7 FHIR resource type (e.g., "Patient", "Observation", "Condition"). */
    @JsonProperty("resourceType")
    private String resourceType;

    /** The ID of the FHIR resource as defined in the resource itself. */
    @JsonProperty("resourceId")
    private String resourceId;

    /** SHA-256 hex digest of the original FHIR file. */
    @JsonProperty("fileHash")
    private String fileHash;

    /** Base64-encoded public key of the patient associated with this record. */
    @JsonProperty("patientPublicKey")
    private String patientPublicKey;

    /**
     * Arbitrary metadata about the FHIR resource stored as a JSON string.
     * May include fields such as subject reference, effective date, category, etc.
     */
    @JsonProperty("metadata")
    private String metadata;

    /** ISO-8601 timestamp of when this record was first registered on the ledger. */
    @JsonProperty("timestamp")
    private String timestamp;

    /** No-arg constructor required for JSON deserialisation. */
    public FHIRRecord() {}

    public FHIRRecord(String id, String resourceType, String resourceId,
                      String fileHash, String patientPublicKey,
                      String metadata, String timestamp) {
        this.id = id;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.fileHash = fileHash;
        this.patientPublicKey = patientPublicKey;
        this.metadata = metadata;
        this.timestamp = timestamp;
    }

    // --- Getters and setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }

    public String getResourceId() { return resourceId; }
    public void setResourceId(String resourceId) { this.resourceId = resourceId; }

    public String getFileHash() { return fileHash; }
    public void setFileHash(String fileHash) { this.fileHash = fileHash; }

    public String getPatientPublicKey() { return patientPublicKey; }
    public void setPatientPublicKey(String patientPublicKey) { this.patientPublicKey = patientPublicKey; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
