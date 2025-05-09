// OpenTelemetry instrumentation for Node.js API - HTTP/2 protocol optimized
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as http2 from 'http2';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Read environment variables that Aspire provides
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:18890';
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-api';

console.log('Initializing OpenTelemetry with HTTP/2 endpoint:', otlpEndpoint, 'for service:', serviceName);
console.log('Current environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL
});

// Configure trace exporter with HTTP/2 protocol
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000, // Increased timeout for better reliability
});

// Configure metrics exporter with HTTP/2 protocol
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000, // Increased timeout for better reliability
});

// Create resource directly with an attribute map using the correct API
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

// Periodic OTLP check function
function checkOtlpConnection() {
  console.log('Checking OTLP collector connection...');
  try {
    const url = new URL(otlpEndpoint);
    const client = http2.connect(`${url.protocol}//${url.host}`);
    
    client.on('error', (err) => {
      console.error('🔴 OTLP collector connection check failed:', err);
    });
    
    client.on('connect', () => {
      console.log('✅ Successfully connected to OTLP collector');
      client.close();
    });
    
    setTimeout(() => {
      if (!client.destroyed) {
        console.log('⚠️ OTLP connection check timed out, closing');
        client.close();
      }
    }, 5000);
  } catch (error) {
    console.error('❌ Failed to check OTLP connection:', error);
  }
}

// Check connection every 30 seconds
setInterval(checkOtlpConnection, 30000);
// Initial check
setTimeout(checkOtlpConnection, 5000);

// Initialize the SDK and register with the OpenTelemetry API
try {
  // The TypeScript type for sdk.start() is void, so we just call it directly
  sdk.start();
  console.log('✅ OpenTelemetry SDK initialized successfully with HTTP/2 protocol');
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
