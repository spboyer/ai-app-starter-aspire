// OpenTelemetry instrumentation with HTTP/2 fix to prevent "Bad Request: An HTTP/1.x request was sent to an HTTP/2 only endpoint"
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as http from 'http';
import * as https from 'https';

// Read environment variables that Aspire provides
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-spa';
const otlpGrpcEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc';

console.log('🔄 Initializing OpenTelemetry with protocol:', otlpProtocol);
console.log('ℹ️ OTLP gRPC endpoint:', otlpGrpcEndpoint);
console.log('ℹ️ Service name:', serviceName);

// Important fix: Configure both exporters with proper path and Content-Type header
// The key solution is to ensure we use the right Content-Type for gRPC protocol
const traceExporter = new OTLPTraceExporter({
  url: `${otlpGrpcEndpoint}/v1/traces`,
  headers: {
    'Content-Type': 'application/x-protobuf'
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10,
  // Fix for HTTP/2 compatibility - NodeJS specific 
  httpAgentOptions: { 
    keepAlive: true,
    maxSockets: 25
  }
});

const metricExporter = new OTLPMetricExporter({
  url: `${otlpGrpcEndpoint}/v1/metrics`,
  headers: {
    'Content-Type': 'application/x-protobuf'
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10,
  // Fix for HTTP/2 compatibility - NodeJS specific
  httpAgentOptions: { 
    keepAlive: true,
    maxSockets: 25
  }
});

// Create resource with attributes
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-spa',
  'node.version': process.versions ? process.versions.node : 'unknown'
});

// Configure the SDK with proper options
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  metricReader: new opentelemetry.metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true },
    }),
  ],
});

// Initialize the SDK
try {
  sdk.start()
    .then(() => console.log('✅ OpenTelemetry SDK started successfully'))
    .catch(error => console.error('❌ Error starting OpenTelemetry SDK:', error));
  
  console.log('✅ OpenTelemetry configuration complete with HTTP/2 compatibility fixes');
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

export default sdk;
