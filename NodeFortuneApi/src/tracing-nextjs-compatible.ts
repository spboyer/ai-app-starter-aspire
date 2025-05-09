// OpenTelemetry instrumentation for Node.js API - Compatible with NextJS approach
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// Import specific exporter types and alias them
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter as OTLPMetricExporterGrpc } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter as OTLPTraceExporterHttp } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter as OTLPMetricExporterHttp } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SpanExporter } from '@opentelemetry/sdk-trace-base'; // Correct import for SpanExporter
import { PushMetricExporter } from '@opentelemetry/sdk-metrics'; // Correct import for MetricExporter

// Read environment variables that Aspire provides
const otlpGrpcEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'; // Default for gRPC

// Determine the base HTTP endpoint.
// OTEL_EXPORTER_OTLP_HTTP_ENDPOINT is the most direct environment variable for this.
// If not set, fall back to a common Aspire default for HTTP/protobuf.
// DOTNET_DASHBOARD_OTLP_ENDPOINT_URL usually refers to the gRPC endpoint and should not be used here.
let baseHttpOtlpUrl = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT ||
                      'http://localhost:18890'; // Aspire's typical OTLP HTTP endpoint

// Ensure baseHttpOtlpUrl does not end with a slash
if (baseHttpOtlpUrl.endsWith('/')) {
  baseHttpOtlpUrl = baseHttpOtlpUrl.slice(0, -1);
}

const httpTraceUrl = `${baseHttpOtlpUrl}/v1/traces`;
const httpMetricsUrl = `${baseHttpOtlpUrl}/v1/metrics`;

const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-api';
const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc';

// Extract the protocol (http or https) from the gRPC endpoint for logging
let grpcEndpointProtocol = 'http:';
try {
  const endpointUrl = new URL(otlpGrpcEndpoint);
  grpcEndpointProtocol = endpointUrl.protocol;
} catch (e: any) {
  console.warn('Failed to parse OTLP gRPC endpoint URL for protocol detection:', e.message);
}

// Helper function to parse OTLP headers if provided
function parseOtlpHeaders(headerString?: string): Record<string, string> {
  if (!headerString) return {};
  
  return headerString.split(',')
    .map(pair => pair.trim())
    .reduce((headers, pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
      return headers;
    }, {} as Record<string, string>);
}

// Get any additional headers from environment
const additionalHeaders = parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

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
  console.error('⚠️ No OTLP gRPC endpoint specified. Telemetry will not be collected for gRPC.');
} else if (otlpProtocol === 'http/protobuf' && (!baseHttpOtlpUrl || baseHttpOtlpUrl === '/v1/traces')) {
  console.error('⚠️ No OTLP HTTP base endpoint specified or resolved. Telemetry will not be collected for HTTP.');
}

// Configuration based on protocol
let traceExporter: SpanExporter; // Use the imported SpanExporter type
let metricExporter: PushMetricExporter; // Use the imported PushMetricExporter type

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
  }),  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true },
    }),
  ],
  // Note: logLevel is set via OTEL_LOG_LEVEL environment variable instead
});

// Initialize the SDK and register with the OpenTelemetry API
try {
  // The TypeScript type for sdk.start() is void, so we just call it directly
  sdk.start();
  console.log('✅ OpenTelemetry SDK initialized successfully');
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

