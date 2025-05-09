// OpenTelemetry initialization for Vite
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import final fixed tracing module
import './tracing-final.js';

console.log('Vite OTLP setup complete with final fixed implementation');
