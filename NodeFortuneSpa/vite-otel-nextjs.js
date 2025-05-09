// OpenTelemetry initialization for Vite with NextJS compatibility
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import NextJS-compatible tracing module
import './tracing-nextjs-compatible.js';

console.log('Vite OTLP setup complete with NextJS-compatible implementation');
