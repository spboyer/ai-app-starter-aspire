// OpenTelemetry instrumentation with HTTP/2 protocol for Node.js SPA
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as http2 from 'http2';

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

// Create HTTP/2 sessions for more efficient connections
let http2GrpcSession = null;

// Skip creating HTTP session since we're only using gRPC
console.log('ℹ️ Skipping HTTP/2 session for HTTP protocol since only gRPC is used');

// Establish HTTP/2 session for gRPC protocol
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

// Create a Resource with enhanced attributes for better diagnostics and Azure integration
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'aspire',
  'application.type': 'node.js-spa',
  'node.version': process.version,
  'deployment.environment': process.env.NODE_ENV || 'development',
  'otlp.protocol': otlpProtocol,
  'otlp.endpoint.http': otlpHttpEndpoint,
  'otlp.endpoint.grpc': otlpGrpcEndpoint,
  'cloud.provider': 'azure', // For Azure deployments
  'cloud.platform': 'azure_app_service', // Assuming deployment to App Service
  'azure.sdk.language': 'javascript',
  'azure.deployment.id': process.env.WEBSITE_DEPLOYMENT_ID || 'local-development',
  'azure.location': process.env.REGION_NAME || 'unknown'
});

// SDK configuration with retry logic and proper shutdown
const sdk = new opentelemetry.NodeSDK({
  resource,
  traceExporter,
  metricReader: new opentelemetry.metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15000, // Export metrics every 15 seconds for more frequent updates
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: true }
    }),
  ],
});

// Initialize the SDK with proper error handling
try {
  sdk.start();
  console.log('✅ OpenTelemetry SDK started successfully with protocol:', otlpProtocol);
  // Verify OTLP connections - Azure recommends validating connections
  setTimeout(async () => {
    // Skip HTTP protocol connection test since we're only using gRPC
    console.log('ℹ️ Skipping HTTP OTLP collector connection test since only gRPC is used');

    // Test the gRPC protocol connection
    try {
      if (http2GrpcSession && !http2GrpcSession.destroyed) {
        const req = http2GrpcSession.request({ 
          ':path': '/opentelemetry.proto.collector.trace.v1.TraceService/Export',
          ':method': 'HEAD'
        });
        
        req.on('response', (headers) => {
          console.log('✅ gRPC OTLP collector connection test: Response status:', headers[':status']);
        });
        
        req.on('error', (err) => {
          console.error('🔴 gRPC OTLP collector connection test failed:', err);
        });
        
        req.end();
      }
    } catch (err) {
      console.error('🔴 gRPC OTLP collector connection check failed:', err);
    }
  }, 5000);
} catch (error) {
  console.error('❌ Failed to initialize OpenTelemetry:', error);
}

// Graceful shutdown handling - following Azure best practices for resource cleanup
function shutdown() {
  console.log('📕 Shutting down OpenTelemetry connections...');

  // Close HTTP/2 session for gRPC
  if (http2GrpcSession && !http2GrpcSession.destroyed) {
    try {
      http2GrpcSession.close();
      console.log('✅ HTTP/2 session for gRPC protocol closed');
    } catch (err) {
      console.error('❌ Error closing HTTP/2 session for gRPC protocol:', err);
    }
  }
  
  // Flush and shutdown OpenTelemetry - Azure recommends ensuring all telemetry is flushed before shutdown
  console.log('📕 Flushing and shutting down OpenTelemetry SDK...');
  sdk.shutdown()
    .then(() => console.log('✅ OpenTelemetry SDK shut down successfully'))
    .catch(err => console.error('❌ Error shutting down OpenTelemetry SDK:', err))
    .finally(() => {
      console.log('📕 Shutdown complete');
      process.exit(0);
    });
}

// Handle various termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

export default sdk;
