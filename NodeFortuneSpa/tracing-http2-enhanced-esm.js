// OpenTelemetry instrumentation with HTTP/2 protocol for Node.js SPA - ESM compatible
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Safely import http2 module only in Node.js environment
let http2;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    // Using dynamic import for compatibility with both ESM and CommonJS
    http2 = await import('http2');
  } catch (e) {
    console.error('❌ Failed to import http2 module:', e);
  }
}

// Read environment variables that Aspire provides
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-spa';
const otlpGrpcEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const otlpHttpEndpoint = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT || 'http://localhost:18890';
const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc';
const useInsecure = process.env.OTEL_EXPORTER_OTLP_INSECURE === 'true';

// For Azure Application Insights integration
const azureMonitorTraceExporterEnabled = process.env.AZURE_MONITOR_TRACE_EXPORTER_ENABLED === 'true';
const appInsightsConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

// Determine active endpoint based on protocol
const activeEndpoint = otlpProtocol === 'grpc' ? otlpGrpcEndpoint : otlpHttpEndpoint;

// Ensure we have a valid endpoint URL
if (!activeEndpoint) {
  console.error('⚠️ No OTLP endpoint specified in environment variables. Telemetry will not be collected.');
  process.exit(1);
}

console.log('🔄 Initializing OpenTelemetry with protocol:', otlpProtocol);
console.log('ℹ️ Trace endpoint:', otlpGrpcEndpoint);
console.log('ℹ️ Metric endpoint:', otlpHttpEndpoint);
console.log('ℹ️ Service name:', serviceName);
console.log('ℹ️ Azure Monitor integration:', azureMonitorTraceExporterEnabled ? 'Enabled' : 'Disabled');

// Extract the base URL without protocol for HTTP/2 connections
let baseHttpUrl, baseGrpcUrl;
try {
  // Parse both endpoints
  const httpUrl = new URL(otlpHttpEndpoint);
  const grpcUrl = new URL(otlpGrpcEndpoint);
  
  baseHttpUrl = httpUrl.host;
  baseGrpcUrl = grpcUrl.host;
  
  console.log('ℹ️ OTLP HTTP host:', baseHttpUrl);
  console.log('ℹ️ OTLP gRPC host:', baseGrpcUrl);
} catch (e) {
  console.error('❌ Failed to parse OTLP endpoint URLs:', e);
  process.exit(1);
}

// Create HTTP/2 sessions for more efficient connections only if http2 module is available
let http2GrpcSession = null;

// Skip creating HTTP session since we're only using gRPC
console.log('ℹ️ Skipping HTTP/2 session for HTTP protocol since only gRPC is used');

// Establish HTTP/2 session for gRPC protocol if http2 module is available
if (http2) {
  try {
    if (otlpGrpcEndpoint.startsWith('http://')) {
      http2GrpcSession = http2.connect(`http://${baseGrpcUrl}`);
    } else {
      http2GrpcSession = http2.connect(`https://${baseGrpcUrl}`, {
        rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' 
      });
    }
    
    console.log('✅ HTTP/2 session for gRPC protocol established successfully');
    
    http2GrpcSession.on('error', (err) => {
      console.error('❌ HTTP/2 session for gRPC protocol error:', err);
    });
    
    http2GrpcSession.on('close', () => {
      console.log('HTTP/2 session for gRPC protocol closed');
    });
  } catch (e) {
    console.error('❌ Failed to establish HTTP/2 session for gRPC protocol:', e);
  }
} else {
  console.log('⚠️ HTTP/2 module not available, skipping HTTP/2 session creation');
}

// Configure exporters based on protocol settings
let traceExporter, metricExporter;

// Use gRPC protocol for both trace and metrics
console.log('🔵 Using gRPC protocol for telemetry via port 4317');

traceExporter = new OTLPTraceExporter({
  url: `${otlpGrpcEndpoint}/v1/traces`,  // Add the path component 
  headers: {
    'Content-Type': 'application/x-protobuf' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});

metricExporter = new OTLPMetricExporter({
  url: `${otlpGrpcEndpoint}/v1/metrics`,  // Add the path component
  headers: {
    'Content-Type': 'application/x-protobuf' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});

// Create resource directly with an attribute map
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-spa',
  'node.version': process.versions ? process.versions.node : 'unknown'
});

// Create the OpenTelemetry SDK with auto-instrumentation
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
  const startPromise = sdk.start();
  if (startPromise && typeof startPromise.then === 'function') {
    startPromise
      .then(() => console.log('✅ OpenTelemetry SDK started successfully'))
      .catch(error => console.error('❌ Error starting OpenTelemetry SDK:', error));
  } else {
    console.log('✅ OpenTelemetry SDK started (no promise returned)');
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

export default sdk;
