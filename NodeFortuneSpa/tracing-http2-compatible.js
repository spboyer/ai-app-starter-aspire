// OpenTelemetry instrumentation for Node.js SPA - HTTP/2 protocol optimized
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import * as resources from '@opentelemetry/resources';
import * as semanticConventions from '@opentelemetry/semantic-conventions';
import * as http2 from 'http2';

// Read environment variables that Aspire provides
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:18890';
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-spa';

console.log('Initializing OpenTelemetry with HTTP/2 endpoint:', otlpEndpoint, 'for service:', serviceName);
console.log('Current environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL
});

// Configure the exporters to use HTTP/2 protocol
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000, // Increased timeout for better reliability
});

const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
  headers: {
    'Content-Type': 'application/x-protobuf',
  },
  concurrencyLimit: 10,
  timeoutMillis: 30000, // Increased timeout for better reliability
});

// Create resource directly with an attribute map using the correct API
const resource = resources.resourceFromAttributes({
  [semanticConventions.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [semanticConventions.SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-spa',
  'node.version': process.version,
  'deployment.environment': process.env.NODE_ENV || 'development',
});

console.log('Resource created with attributes:', {
  serviceName,
  version: '1.0.0',
  applicationType: 'node.js-spa',
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development'
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

// Configure the SDK with detailed options
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  metricReader: new opentelemetry.metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000, // Export metrics every 60 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true },
    }),
  ],
});

// Initialize the SDK and register with the OpenTelemetry API
try {
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
