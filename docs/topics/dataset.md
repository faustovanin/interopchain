# HL7 FHIR Dataset

## Overview

The [`dataset/`](../../dataset/README.md) directory contains sample HL7 FHIR files used for testing, experiments, and demonstrations.

## What is HL7 FHIR?

[HL7 FHIR](https://hl7.org/fhir/) (Fast Healthcare Interoperability Resources) is the leading international standard for exchanging healthcare information electronically. Resources are represented as JSON (or XML) documents and cover clinical concepts such as Patient, Observation, Condition, Medication, and more.

## Dataset Contents

| Resource Type | Description |
|---|---|
| `Patient` | Demographic information about individuals |
| `Observation` | Clinical measurements and results |
| `Condition` | Diagnoses and health conditions |
| `Bundle` | Collections of FHIR resources |

## Usage

The sample files are used by:
- Chaincode unit tests to simulate realistic payloads.
- Integration tests and experiments run via [`scripts/run-experiments.sh`](../../scripts/run-experiments.sh).

## Data Privacy

All sample files in this directory use **synthetic (fictitious) data** and do not contain real patient information.
