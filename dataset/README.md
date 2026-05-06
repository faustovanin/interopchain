# Dataset

This directory contains HL7 FHIR sample files used for testing, integration experiments, and demonstrations in the Interopchain project.

## Contents

| Directory | Description |
|---|---|
| `samples/` | Individual FHIR resource files (Patient, Observation, Condition, Bundle) |

## Data Privacy

All files in this directory use **synthetic (fictitious) data**. No real patient information is stored here.

## FHIR Version

Resources are formatted according to **HL7 FHIR R4** (version 4.0.1).
See the [official FHIR R4 specification](https://hl7.org/fhir/R4/) for resource definitions and validation rules.

## Usage

Sample files are used by:
- Chaincode unit tests (see [`chaincodes/`](../chaincodes/README.md)).
- Experiment scripts (see [`scripts/run-experiments.sh`](../scripts/run-experiments.sh)).

## Adding New Samples

1. Create valid FHIR JSON files following the R4 specification.
2. Place them in the appropriate subdirectory under `samples/`.
3. Validate them against the FHIR specification using the [HL7 FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator).
