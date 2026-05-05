// Package main implements the fhir-chaincode for Interopchain.
// It provides CRUD operations for HL7 FHIR resources stored on a
// Hyperledger Fabric ledger.
package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// FHIRChaincode provides functions for managing FHIR resources on the ledger.
type FHIRChaincode struct {
	contractapi.Contract
}

// FHIRResource represents a generic HL7 FHIR resource stored on the ledger.
type FHIRResource struct {
	ResourceType string          `json:"resourceType"`
	ID           string          `json:"id"`
	Data         json.RawMessage `json:"data"`
}

// ledgerKey returns the composite key used to store a FHIR resource.
func ledgerKey(resourceType, id string) string {
	return fmt.Sprintf("%s~%s", resourceType, id)
}

// CreateResource stores a new FHIR resource on the ledger.
func (c *FHIRChaincode) CreateResource(ctx contractapi.TransactionContextInterface, resourceType, id, resourceJSON string) error {
	key := ledgerKey(resourceType, id)

	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read from ledger: %w", err)
	}
	if existing != nil {
		return fmt.Errorf("resource %s/%s already exists", resourceType, id)
	}

	resource := FHIRResource{
		ResourceType: resourceType,
		ID:           id,
		Data:         json.RawMessage(resourceJSON),
	}

	resourceBytes, err := json.Marshal(resource)
	if err != nil {
		return fmt.Errorf("failed to marshal resource: %w", err)
	}

	return ctx.GetStub().PutState(key, resourceBytes)
}

// ReadResource retrieves a FHIR resource from the ledger.
func (c *FHIRChaincode) ReadResource(ctx contractapi.TransactionContextInterface, resourceType, id string) (string, error) {
	key := ledgerKey(resourceType, id)

	resourceBytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return "", fmt.Errorf("failed to read from ledger: %w", err)
	}
	if resourceBytes == nil {
		return "", fmt.Errorf("resource %s/%s does not exist", resourceType, id)
	}

	return string(resourceBytes), nil
}

// UpdateResource updates an existing FHIR resource on the ledger.
func (c *FHIRChaincode) UpdateResource(ctx contractapi.TransactionContextInterface, resourceType, id, resourceJSON string) error {
	key := ledgerKey(resourceType, id)

	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read from ledger: %w", err)
	}
	if existing == nil {
		return fmt.Errorf("resource %s/%s does not exist", resourceType, id)
	}

	resource := FHIRResource{
		ResourceType: resourceType,
		ID:           id,
		Data:         json.RawMessage(resourceJSON),
	}

	resourceBytes, err := json.Marshal(resource)
	if err != nil {
		return fmt.Errorf("failed to marshal resource: %w", err)
	}

	return ctx.GetStub().PutState(key, resourceBytes)
}

// DeleteResource removes a FHIR resource from the ledger.
func (c *FHIRChaincode) DeleteResource(ctx contractapi.TransactionContextInterface, resourceType, id string) error {
	key := ledgerKey(resourceType, id)

	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read from ledger: %w", err)
	}
	if existing == nil {
		return fmt.Errorf("resource %s/%s does not exist", resourceType, id)
	}

	return ctx.GetStub().DelState(key)
}

func main() {
	chaincode, err := contractapi.NewChaincode(&FHIRChaincode{})
	if err != nil {
		panic(fmt.Sprintf("Error creating fhir-chaincode: %v", err))
	}

	if err := chaincode.Start(); err != nil {
		panic(fmt.Sprintf("Error starting fhir-chaincode: %v", err))
	}
}
