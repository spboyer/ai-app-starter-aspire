// OpenTelemetry instrumentation for Node.js API
// Simplified version for compatibility
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Read environment variables that Aspire provides
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-api';

console.log('Initializing OpenTelemetry with endpoint:', otlpEndpoint, 'service:', serviceName);

// Simple resource creation with service name
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
});

// Create exporters
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`
});

// Configure the SDK
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()]
});

// Initialize the SDK
sdk.start()
  .then(() => console.log('OpenTelemetry initialized'))
  .catch(error => console.error('Error initializing OpenTelemetry', error));

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch(error => console.error('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

export default sdk;
