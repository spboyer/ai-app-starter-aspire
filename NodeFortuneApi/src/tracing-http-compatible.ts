// OpenTelemetry instrumentation for Node.js API - HTTP protocol optimized
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Read environment variables that Aspire provides
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const otlpHttpEndpoint = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT || 'http://localhost:18890';
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-api';

// Extract the protocol (http or https) from the endpoints
let protocol = 'http:';
try {
  const endpointUrl = new URL(otlpHttpEndpoint);
  protocol = endpointUrl.protocol;
} catch (e) {
  console.error('Failed to parse OTLP endpoint URL:', e);
}

console.log('Initializing OpenTelemetry with HTTP endpoint:', otlpHttpEndpoint, 'for service:', serviceName);
console.log('Protocol detected:', protocol);
console.log('Current environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_HTTP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT,
  OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
  DOTNET_DASHBOARD_OTLP_ENDPOINT_URL: process.env.DOTNET_DASHBOARD_OTLP_ENDPOINT_URL
});

// Ensure we have a valid HTTP endpoint
if (!otlpHttpEndpoint) {
  console.error('⚠️ No HTTP OTLP endpoint specified in environment variables. Telemetry will not be collected.');
}

// Configure trace exporter with HTTP protocol
const traceExporter = new OTLPTraceExporter({
  url: `${otlpHttpEndpoint}/v1/traces`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000, // Increased timeout for better reliability
});

// Configure metrics exporter with HTTP protocol
const metricExporter = new OTLPMetricExporter({
  url: `${otlpHttpEndpoint}/v1/metrics`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000, // Increased timeout for better reliability
});

// Create a Resource with service name attribute and more details
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-api',
  'node.version': process.version,
  'deployment.environment': process.env.NODE_ENV || 'development',
});

console.log('Resource created with attributes:', {
  serviceName,
  version: '1.0.0',
  applicationType: 'node.js-api',
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development'
});

// Configure the OpenTelemetry SDK with auto-instrumentation
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  metricReader: new opentelemetry.metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000, // Export metrics every 60 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true },
    }),
  ],
});

// Initialize the SDK and register with the OpenTelemetry API
try {
  // The TypeScript type for sdk.start() is void, so we just call it directly
  sdk.start();
  console.log('✅ OpenTelemetry SDK initialized successfully with HTTP protocol');
} catch (error) {
  console.error('❌ Failed to initialize OpenTelemetry:', error);
}

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down OpenTelemetry...');
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated successfully'))
    .catch((error) => console.error('Error terminating OpenTelemetry:', error))
    .finally(() => process.exit(0));
});

// Also handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down OpenTelemetry...');
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated successfully'))
    .catch((error) => console.error('Error terminating OpenTelemetry:', error))
    .finally(() => process.exit(0));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default sdk;
