// OpenTelemetry initialization for Vite with HTTP/2 protocol compatibility
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import enhanced HTTP/2 tracing module
import './tracing-http2-enhanced.js';

console.log('Vite OTLP setup complete with enhanced HTTP/2 protocol implementation');
