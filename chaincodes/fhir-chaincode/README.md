# fhir-chaincode

Core Hyperledger Fabric chaincode for Interopchain. Implements CRUD operations for HL7 FHIR resources on the ledger, as well as access control policies.

## Functions

| Function | Description |
|---|---|
| `CreateResource` | Store a new FHIR resource on the ledger |
| `ReadResource` | Retrieve a FHIR resource by type and ID |
| `UpdateResource` | Update an existing FHIR resource |
| `DeleteResource` | Mark a FHIR resource as deleted |
| `QueryResourcesByType` | Query all resources of a given FHIR type |

## Getting Started

```bash
cd chaincodes/fhir-chaincode
go mod tidy
go test ./...
```

## Deploy

From the repository root:

```bash
./scripts/deploy.sh fhir-chaincode
```

## Ledger Key Format

Keys follow the composite key pattern: `RESOURCE_TYPE~ID`

Example: `Patient~example-patient-001`

## Data Format

FHIR resources are stored as JSON strings. The ledger state for a Patient resource looks like:

```json
{
  "resourceType": "Patient",
  "id": "example-patient-001",
  ...
}
```
