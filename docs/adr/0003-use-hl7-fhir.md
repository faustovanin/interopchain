# ADR 0003 — Use HL7 FHIR as the Health Data Standard

**Date:** 2026-05-05
**Status:** Accepted

## Context

The project focuses on healthcare data interoperability. A common, open standard is needed to represent clinical resources (patients, observations, conditions, etc.) consistently across organisations.

## Decision

We will use **HL7 FHIR** (Fast Healthcare Interoperability Resources) as the standard data format for health records stored and exchanged on the blockchain.

## Rationale

- HL7 FHIR is the leading international standard for healthcare data exchange.
- FHIR resources are JSON-serialisable, making them easy to store in chaincode state.
- Using a standard format reduces the integration burden when connecting external health information systems.
- Open-source FHIR validators and test datasets are readily available.

## Consequences

- Chaincode must validate and parse FHIR-formatted JSON payloads.
- The dataset directory will contain sample FHIR files for testing and experiments.
- Team members need familiarity with FHIR resource types and profiles.
