// OpenTelemetry instrumentation for Node.js SPA - Compatible with NextJS approach
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// Import specific exporter types and alias them
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter as OTLPMetricExporterGrpc } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter as OTLPTraceExporterHttp } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter as OTLPMetricExporterHttp } from '@opentelemetry/exporter-metrics-otlp-http';
import * as resources from '@opentelemetry/resources';
import * as semanticConventions from '@opentelemetry/semantic-conventions';

// Read environment variables that Aspire provides
const otlpGrpcEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'; // Default for gRPC

// Determine the base HTTP endpoint.
// OTEL_EXPORTER_OTLP_HTTP_ENDPOINT is the most direct environment variable for this.
// If not set, fall back to a common Aspire default for HTTP/protobuf.
// DOTNET_DASHBOARD_OTLP_ENDPOINT_URL usually refers to the gRPC endpoint and should not be used here.
let baseHttpOtlpUrl = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT ||
                      'http://localhost:18890'; // Aspire's typical OTLP HTTP endpoint

// Ensure baseHttpOtlpUrl does not end with a slash if we are appending paths like /v1/traces
if (baseHttpOtlpUrl.endsWith('/')) {
  baseHttpOtlpUrl = baseHttpOtlpUrl.slice(0, -1);
}

const httpTraceUrl = `${baseHttpOtlpUrl}/v1/traces`;
const httpMetricsUrl = `${baseHttpOtlpUrl}/v1/metrics`;

const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-spa';
const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc';

// Extract the protocol (http or https) from the gRPC endpoint for logging purposes if needed
let grpcEndpointProtocol = 'http:';
try {
  const endpointUrl = new URL(otlpGrpcEndpoint);
  grpcEndpointProtocol = endpointUrl.protocol;
} catch (e) {
  console.warn('Failed to parse OTLP gRPC endpoint URL for protocol detection:', e.message);
}

// Helper function to parse OTLP headers if provided
function parseOtlpHeaders(headerString) {
  if (!headerString) return {};
  
  return headerString.split(',')
    .map(pair => pair.trim())
    .reduce((headers, pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
      return headers;
    }, {});
}

// Get any additional headers from environment
const additionalHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS
  ? parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
  : {};

console.log('Initializing OpenTelemetry for service:', serviceName);
console.log('OTLP Protocol selected:', otlpProtocol);

if (otlpProtocol === 'grpc') {
  console.log('Using gRPC OTLP Endpoint:', otlpGrpcEndpoint);
  console.log('gRPC Endpoint Protocol Detected:', grpcEndpointProtocol);
} else if (otlpProtocol === 'http/protobuf') {
  console.log('Using HTTP OTLP Trace Endpoint:', httpTraceUrl);
  console.log('Using HTTP OTLP Metrics Endpoint:', httpMetricsUrl);
}

console.log('Current environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT, // Will be otlpGrpcEndpoint effectively
  OTEL_EXPORTER_OTLP_HTTP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT, // Used in baseHttpOtlpUrl logic
  OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
  DOTNET_DASHBOARD_OTLP_ENDPOINT_URL: process.env.DOTNET_DASHBOARD_OTLP_ENDPOINT_URL // Used in baseHttpOtlpUrl logic
});

// Ensure we have a valid endpoint
if (otlpProtocol === 'grpc' && !otlpGrpcEndpoint) {
  console.error('⚠️ No OTLP gRPC endpoint specified in environment variables. Telemetry will not be collected for gRPC.');
} else if (otlpProtocol === 'http/protobuf' && (!baseHttpOtlpUrl || baseHttpOtlpUrl === '/v1/traces' /* check if only suffix exists */)) {
  // A more robust check for a valid base URL for HTTP might be needed depending on how baseHttpOtlpUrl is formed
  console.error('⚠️ No OTLP HTTP base endpoint specified or resolved. Telemetry will not be collected for HTTP.');
}

// Configuration based on protocol
let traceExporter;
let metricExporter;

// For gRPC protocol (default)
if (otlpProtocol === 'grpc') {
  traceExporter = new OTLPTraceExporterGrpc({ // Use gRPC exporter
    url: otlpGrpcEndpoint, // Base URL for gRPC
    headers: additionalHeaders,
    concurrencyLimit: 10,
    timeoutMillis: 15000,
  });
  
  metricExporter = new OTLPMetricExporterGrpc({ // Use gRPC exporter
    url: otlpGrpcEndpoint, // Base URL for gRPC
    headers: additionalHeaders,
    concurrencyLimit: 10,
    timeoutMillis: 15000,
  });
}
// For HTTP protocol
else if (otlpProtocol === 'http/protobuf') {
  const exporterHttpHeaders = {
    'Content-Type': 'application/x-protobuf', // Required for HTTP protocol
    // ...additionalHeaders // Temporarily remove to simplify
  };
  
  traceExporter = new OTLPTraceExporterHttp({ // Use HTTP exporter
    url: httpTraceUrl,
    headers: exporterHttpHeaders,
    // concurrencyLimit: 10, // Temporarily remove to simplify
    // timeoutMillis: 15000, // Temporarily remove to simplify
  });
  
  metricExporter = new OTLPMetricExporterHttp({ // Use HTTP exporter
    url: httpMetricsUrl,
    headers: exporterHttpHeaders,
    // concurrencyLimit: 10, // Temporarily remove to simplify
    // timeoutMillis: 15000, // Temporarily remove to simplify
  });
}
else {
  console.error(`⚠️ Unsupported OTLP protocol: ${otlpProtocol}. Using gRPC as fallback to ${otlpGrpcEndpoint}.`);
  traceExporter = new OTLPTraceExporterGrpc({ // Fallback to gRPC exporter
    url: otlpGrpcEndpoint,
    headers: additionalHeaders,
    concurrencyLimit: 10,
    timeoutMillis: 15000,
  });
  
  metricExporter = new OTLPMetricExporterGrpc({ // Fallback to gRPC exporter
    url: otlpGrpcEndpoint,
    headers: additionalHeaders,
    concurrencyLimit: 10,
    timeoutMillis: 15000,
  });
}

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
  // Note: logLevel is set via OTEL_LOG_LEVEL environment variable instead
});

// Initialize the SDK and register with the OpenTelemetry API
try {
  // For Node SDK v0.24.0 and later, start() returns a promise
  const startPromise = sdk.start();
  if (startPromise instanceof Promise) {
    startPromise
      .then(() => console.log('✅ OpenTelemetry SDK started successfully'))
      .catch(error => console.error('❌ Error starting OpenTelemetry SDK:', error));
  } else {
    console.log('✅ OpenTelemetry SDK initialized successfully (synchronous)');
  }
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

