package org.interopchain;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;

import java.util.ArrayList;
import java.util.List;

/**
 * FHIRChaincode manages HL7 FHIR document records on a Hyperledger Fabric ledger.
 *
 * <p>The full FHIR file is <strong>not</strong> stored on-chain. Each ledger record
 * contains only:
 * <ul>
 *   <li>A SHA-256 hash of the FHIR file (integrity verification)</li>
 *   <li>Selected metadata (resource type, resource ID, timestamps, etc.)</li>
 *   <li>The patient's public key (used for access control and queries)</li>
 * </ul>
 */
@Contract(
    name = "FHIRChaincode",
    info = @Info(
        title = "FHIR Chaincode",
        description = "Manages HL7 FHIR document hashes, metadata, and patient public keys on-chain.",
        version = "1.0.0"
    )
)
@Default
public final class FHIRChaincode implements ContractInterface {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Composite ledger key: {@code resourceType~resourceId}. */
    private static String ledgerKey(String resourceType, String resourceId) {
        return resourceType + "~" + resourceId;
    }

    // -------------------------------------------------------------------------
    // Write transactions
    // -------------------------------------------------------------------------

    /**
     * Registers a new FHIR document record on the ledger.
     *
     * @param ctx              transaction context
     * @param resourceType     FHIR resource type (e.g., "Patient", "Observation")
     * @param resourceId       FHIR resource ID as defined in the resource itself
     * @param fileHash         SHA-256 hex digest of the original FHIR file
     * @param patientPublicKey base64-encoded public key of the associated patient
     * @param metadata         JSON string containing additional metadata fields
     * @param timestamp        ISO-8601 creation timestamp
     * @return JSON representation of the created {@link FHIRRecord}
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String registerRecord(Context ctx,
                                 String resourceType,
                                 String resourceId,
                                 String fileHash,
                                 String patientPublicKey,
                                 String metadata,
                                 String timestamp) {
        String key = ledgerKey(resourceType, resourceId);

        byte[] existing = ctx.getStub().getState(key);
        if (existing != null && existing.length > 0) {
            throw new ChaincodeException(
                "Record " + resourceType + "/" + resourceId + " already exists.",
                "RECORD_ALREADY_EXISTS"
            );
        }

        FHIRRecord record = new FHIRRecord(key, resourceType, resourceId,
                                           fileHash, patientPublicKey,
                                           metadata, timestamp);
        try {
            String json = MAPPER.writeValueAsString(record);
            ctx.getStub().putStringState(key, json);
            return json;
        } catch (Exception e) {
            throw new ChaincodeException("Failed to serialise record: " + e.getMessage(), "SERIALISATION_ERROR");
        }
    }

    /**
     * Updates the hash and/or metadata of an existing FHIR document record.
     *
     * @param ctx          transaction context
     * @param resourceType FHIR resource type
     * @param resourceId   FHIR resource ID
     * @param fileHash     new SHA-256 hex digest
     * @param metadata     updated metadata JSON string
     * @param timestamp    ISO-8601 update timestamp
     * @return JSON representation of the updated {@link FHIRRecord}
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String updateRecord(Context ctx,
                               String resourceType,
                               String resourceId,
                               String fileHash,
                               String metadata,
                               String timestamp) {
        String key = ledgerKey(resourceType, resourceId);
        FHIRRecord record = getExistingRecord(ctx, key, resourceType, resourceId);

        record.setFileHash(fileHash);
        record.setMetadata(metadata);
        record.setTimestamp(timestamp);

        try {
            String json = MAPPER.writeValueAsString(record);
            ctx.getStub().putStringState(key, json);
            return json;
        } catch (Exception e) {
            throw new ChaincodeException("Failed to serialise record: " + e.getMessage(), "SERIALISATION_ERROR");
        }
    }

    /**
     * Removes a FHIR document record from the ledger.
     *
     * @param ctx          transaction context
     * @param resourceType FHIR resource type
     * @param resourceId   FHIR resource ID
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public void deleteRecord(Context ctx, String resourceType, String resourceId) {
        String key = ledgerKey(resourceType, resourceId);
        getExistingRecord(ctx, key, resourceType, resourceId); // assert existence
        ctx.getStub().delState(key);
    }

    // -------------------------------------------------------------------------
    // Query transactions (evaluate only, no ledger writes)
    // -------------------------------------------------------------------------

    /**
     * Retrieves a FHIR document record by resource type and ID.
     *
     * @param ctx          transaction context
     * @param resourceType FHIR resource type
     * @param resourceId   FHIR resource ID
     * @return JSON representation of the {@link FHIRRecord}
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String getRecord(Context ctx, String resourceType, String resourceId) {
        String key = ledgerKey(resourceType, resourceId);
        String json = ctx.getStub().getStringState(key);
        if (json == null || json.isEmpty()) {
            throw new ChaincodeException(
                "Record " + resourceType + "/" + resourceId + " does not exist.",
                "RECORD_NOT_FOUND"
            );
        }
        return json;
    }

    /**
     * Returns all FHIR document records associated with a given patient public key.
     *
     * <p>Requires CouchDB state database (rich queries are not supported with LevelDB).
     *
     * @param ctx              transaction context
     * @param patientPublicKey base64-encoded public key of the patient
     * @return JSON array of matching {@link FHIRRecord} objects
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String queryByPatientPublicKey(Context ctx, String patientPublicKey) {
        String query = buildSelectorQuery("patientPublicKey", patientPublicKey);
        return executeRichQuery(ctx, query);
    }

    /**
     * Returns all FHIR document records of a given resource type.
     *
     * <p>Requires CouchDB state database.
     *
     * @param ctx          transaction context
     * @param resourceType FHIR resource type to filter by
     * @return JSON array of matching {@link FHIRRecord} objects
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String queryByResourceType(Context ctx, String resourceType) {
        String query = buildSelectorQuery("resourceType", resourceType);
        return executeRichQuery(ctx, query);
    }

    /**
     * Executes an arbitrary CouchDB Mango selector query and returns matching records.
     *
     * <p>Intended for advanced queries over metadata fields.
     * The caller is responsible for constructing a valid Mango query string.
     *
     * @param ctx         transaction context
     * @param mangoQuery  CouchDB Mango query JSON string
     * @return JSON array of matching {@link FHIRRecord} objects
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String queryByMetadata(Context ctx, String mangoQuery) {
        return executeRichQuery(ctx, mangoQuery);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private FHIRRecord getExistingRecord(Context ctx, String key,
                                         String resourceType, String resourceId) {
        String json = ctx.getStub().getStringState(key);
        if (json == null || json.isEmpty()) {
            throw new ChaincodeException(
                "Record " + resourceType + "/" + resourceId + " does not exist.",
                "RECORD_NOT_FOUND"
            );
        }
        try {
            return MAPPER.readValue(json, FHIRRecord.class);
        } catch (Exception e) {
            throw new ChaincodeException("Failed to deserialise record: " + e.getMessage(), "DESERIALISATION_ERROR");
        }
    }

    /**
     * Builds a CouchDB Mango selector query safely using Jackson to avoid
     * JSON injection from arbitrary field values.
     */
    private static String buildSelectorQuery(String field, String value) {
        try {
            ObjectNode selector = MAPPER.createObjectNode();
            selector.put(field, value);
            ObjectNode query = MAPPER.createObjectNode();
            query.set("selector", selector);
            return MAPPER.writeValueAsString(query);
        } catch (Exception e) {
            throw new ChaincodeException("Failed to build query: " + e.getMessage(), "QUERY_BUILD_ERROR");
        }
    }

    private String executeRichQuery(Context ctx, String query) {
        QueryResultsIterator<KeyValue> results = ctx.getStub().getQueryResult(query);
        List<FHIRRecord> records = new ArrayList<>();
        for (KeyValue kv : results) {
            try {
                records.add(MAPPER.readValue(kv.getStringValue(), FHIRRecord.class));
            } catch (Exception e) {
                throw new ChaincodeException(
                    "Failed to parse ledger record: " + e.getMessage(), "DESERIALISATION_ERROR");
            }
        }
        try {
            return MAPPER.writeValueAsString(records);
        } catch (Exception e) {
            throw new ChaincodeException("Failed to serialise results: " + e.getMessage(), "SERIALISATION_ERROR");
        }
    }
}
