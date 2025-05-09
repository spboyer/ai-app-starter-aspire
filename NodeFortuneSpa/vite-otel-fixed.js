// OpenTelemetry initialization for Vite
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import fixed tracing module
import './tracing-fixed.js';

console.log('Vite OTLP setup complete with fixed implementation');
