// This file runs before the Vite dev server starts
// It initializes OpenTelemetry tracing for the server-side portion of the SPA

// Use a relative path to import the tracing module
import './tracing.js';
console.log('OpenTelemetry initialized for Vite server');
