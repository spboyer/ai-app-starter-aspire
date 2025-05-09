// OpenTelemetry initialization for Vite with http protocol compatibility
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import http-compatible tracing module
import './tracing-http-compatible.js';

console.log('Vite OTLP setup complete with http protocol implementation');
