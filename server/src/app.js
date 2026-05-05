'use strict';

/**
 * app.js — Express application entry point for the Interopchain server.
 *
 * Responsibilities:
 *  - Set up Express middleware (JSON parsing, CORS, authentication).
 *  - Register API route handlers.
 *  - Start the HTTP server.
 */

const express = require('express');

const app = express();

app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// TODO: Register authentication routes (POST /auth/register, POST /auth/login)
// TODO: Register FHIR resource routes (GET/POST /fhir/:resourceType)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Interopchain server listening on port ${PORT}`);
});

module.exports = app;
