# fhir-chaincode

Core Hyperledger Fabric chaincode for Interopchain, written in **Java**. Manages HL7 FHIR document records on the ledger by storing a hash and metadata of each file, together with the patient's public key. Full FHIR files are **not** stored on-chain.

## Data Model

Each ledger record (`FHIRRecord`) contains:

| Field | Type | Description |
|---|---|---|
| `id` | String | Composite ledger key (`resourceType~resourceId`) |
| `resourceType` | String | HL7 FHIR resource type (e.g., `Patient`, `Observation`) |
| `resourceId` | String | FHIR resource ID as declared in the resource itself |
| `fileHash` | String | SHA-256 hex digest of the original FHIR file |
| `patientPublicKey` | String | Base64-encoded public key of the associated patient |
| `metadata` | String | JSON string with additional metadata (date, category, etc.) |
| `timestamp` | String | ISO-8601 timestamp of the ledger operation |

## Functions

| Function | Type | Description |
|---|---|---|
| `registerRecord` | SUBMIT | Register a new FHIR document record on the ledger |
| `updateRecord` | SUBMIT | Update the hash and metadata of an existing record |
| `deleteRecord` | SUBMIT | Remove a record from the ledger |
| `getRecord` | EVALUATE | Retrieve a record by resource type and ID |
| `queryByPatientPublicKey` | EVALUATE | Return all records for a given patient public key |
| `queryByResourceType` | EVALUATE | Return all records of a given FHIR resource type |
| `queryByMetadata` | EVALUATE | Execute a CouchDB Mango selector query over metadata fields |

> **Note:** Rich queries (`queryByPatientPublicKey`, `queryByResourceType`, `queryByMetadata`) require the **CouchDB** state database. Ensure the Fabric network is configured with CouchDB before using these functions (see [`docker/fabric/README.md`](../../docker/fabric/README.md)).

## Project Structure

```
fhir-chaincode/
├── pom.xml
├── src/
│   └── main/
│       └── java/
│           └── org/interopchain/
│               ├── FHIRChaincode.java   # Contract logic
│               └── FHIRRecord.java      # Ledger data model
└── README.md
```

## Getting Started

```bash
cd chaincodes/fhir-chaincode
mvn test          # run unit tests
mvn package       # build the fat-jar for deployment
```

## Deploy

From the repository root:

```bash
./scripts/deploy.sh fhir-chaincode
```

## Ledger Key Format

Keys follow the composite key pattern: `RESOURCE_TYPE~ID`

Example: `Patient~example-patient-001`
