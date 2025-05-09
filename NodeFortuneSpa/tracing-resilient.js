// OpenTelemetry instrumentation with enhanced error handling for socket issues
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import * as resources from '@opentelemetry/resources';
import * as semanticConventions from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Read environment variables that Aspire provides
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const otlpHttpEndpoint = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT || 'http://localhost:18890';
const serviceName = process.env.OTEL_SERVICE_NAME || 'node-fortune-spa';
const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc';
const maxRetries = parseInt(process.env.OTEL_EXPORTER_OTLP_MAX_RETRIES || '5', 10);
const retryDelayMs = parseInt(process.env.OTEL_EXPORTER_OTLP_RETRY_DELAY_MS || '1000', 10);

// Extract the protocol (http or https) from the endpoints
let protocol = 'http:';
try {
  const endpointUrl = new URL(otlpEndpoint);
  protocol = endpointUrl.protocol;
} catch (e) {
  console.error('Failed to parse OTLP endpoint URL:', e);
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

console.log('Initializing OpenTelemetry with enhanced error handling');
console.log('Endpoint:', otlpEndpoint);
console.log('HTTP endpoint:', otlpHttpEndpoint);
console.log('Service:', serviceName);
console.log('Protocol:', otlpProtocol);
console.log('Max retries:', maxRetries);
console.log('Retry delay:', retryDelayMs, 'ms');

// Create simple retry wrapper for exporters
function createExporterWithRetry(exporter, options = { maxRetries, retryDelayMs }) {
  const originalExport = exporter.export.bind(exporter);
  
  exporter.export = function(objects, resultCallback) {
    let currentAttempt = 0;
    
    const attemptExport = () => {
      currentAttempt++;
      originalExport(objects, (result) => {
        if (result.code !== 0 && currentAttempt < options.maxRetries) {
          // Check if error is retryable
          const error = result.error || new Error('Unknown export error');
          const isNetworkError = error.code === 'ECONNRESET' || 
                                 error.code === 'ETIMEDOUT' || 
                                 error.code === 'ECONNREFUSED' ||
                                 error.message.includes('socket hang up');
          
          if (isNetworkError) {
            console.warn(`Export attempt ${currentAttempt} failed: ${error.message}. Retrying in ${options.retryDelayMs}ms...`);
            setTimeout(attemptExport, options.retryDelayMs);
            return;
          }
        }
        
        // Either success, max retries reached, or non-retryable error
        resultCallback(result);
      });
    };
    
    attemptExport();
  };
  
  return exporter;
}

// Configuration based on protocol
let traceExporter;
let metricExporter;

// Create exporters with enhanced error handling
try {
  if (otlpProtocol === 'grpc') {
    // IMPORTANT: For gRPC, use the base URL without /v1/traces
    traceExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
      headers: additionalHeaders,
      concurrencyLimit: 10,
      timeoutMillis: 30000, // Increased timeout for better reliability
    });
    
    metricExporter = new OTLPMetricExporter({
      url: otlpEndpoint,
      headers: additionalHeaders,
      concurrencyLimit: 10,
      timeoutMillis: 30000,
    });
  } else if (otlpProtocol === 'http/protobuf') {
    // For HTTP protocol, append /v1/traces to the endpoint URL
    const exporterHeaders = {
      'Content-Type': 'application/x-protobuf', // Required for HTTP protocol
      ...additionalHeaders
    };
    
    traceExporter = new OTLPTraceExporter({
      url: `${otlpHttpEndpoint}/v1/traces`,
      headers: exporterHeaders,
      concurrencyLimit: 10,
      timeoutMillis: 30000,
    });
    
    metricExporter = new OTLPMetricExporter({
      url: `${otlpHttpEndpoint}/v1/metrics`,
      headers: exporterHeaders,
      concurrencyLimit: 10,
      timeoutMillis: 30000,
    });
  } else {
    console.error(`⚠️ Unsupported OTLP protocol: ${otlpProtocol}. Using gRPC as fallback.`);
    traceExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
      headers: additionalHeaders,
      concurrencyLimit: 10,
      timeoutMillis: 30000,
    });
    
    metricExporter = new OTLPMetricExporter({
      url: otlpEndpoint,
      headers: additionalHeaders,
      concurrencyLimit: 10,
      timeoutMillis: 30000,
    });
  }
  
  // Add retry capabilities to exporters
  traceExporter = createExporterWithRetry(traceExporter);
  metricExporter = createExporterWithRetry(metricExporter);
  
} catch (error) {
  console.error('❌ Failed to create OTLP exporters:', error);
  // Create no-op exporters as fallback
  traceExporter = {
    export: (spans, resultCallback) => resultCallback({ code: 0 }),
    shutdown: () => Promise.resolve()
  };
  metricExporter = {
    export: (metrics, resultCallback) => resultCallback({ code: 0 }),
    shutdown: () => Promise.resolve()
  };
}

// Create resource with detailed attributes
const resource = resources.resourceFromAttributes({
  [semanticConventions.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [semanticConventions.SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'application.type': 'node.js-spa',
  'node.version': process.version,
  'deployment.environment': process.env.NODE_ENV || 'development',
});

// Configure the SDK with detailed options and error handling
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
      '@opentelemetry/instrumentation-grpc': { enabled: true },
    }),
  ],
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    // Adjust batch processing settings for better reliability
    scheduledDelayMillis: 5000,     // Send a batch every 5 seconds
    maxExportBatchSize: 512,        // Maximum batch size
    maxQueueSize: 2048,             // Prevent memory issues
  }),
});

// Initialize the SDK with proper error handling
try {
  const startPromise = sdk.start();
  if (startPromise instanceof Promise) {
    startPromise
      .then(() => console.log('✅ OpenTelemetry SDK started successfully with enhanced error handling'))
      .catch(error => {
        console.error('❌ Error starting OpenTelemetry SDK:', error);
        console.log('💡 Will continue without telemetry. Application functionality is not affected.');
      });
  } else {
    console.log('✅ OpenTelemetry SDK initialized successfully (synchronous)');
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenTelemetry:', error);
  console.log('💡 Will continue without telemetry. Application functionality is not affected.');
}

// Set up connection health check
const healthCheckInterval = setInterval(() => {
  // Simple connectivity check
  const http = require('http');
  const url = new URL(otlpHttpEndpoint || otlpEndpoint);
  
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: '/health', // Most collectors expose a health endpoint
    method: 'GET',
    timeout: 5000,
  };
  
  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('🟢 OTLP collector is reachable');
    } else {
      console.warn(`🟠 OTLP collector returned status ${res.statusCode}`);
    }
  });
  
  req.on('error', (error) => {
    console.warn(`🔴 OTLP collector connection check failed: ${error.message}`);
  });
  
  req.end();
}, 60000); // Check every minute

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down OpenTelemetry...');
  clearInterval(healthCheckInterval);
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated successfully'))
    .catch((error) => console.error('Error terminating OpenTelemetry:', error))
    .finally(() => process.exit(0));
});

// Also handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down OpenTelemetry...');
  clearInterval(healthCheckInterval);
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
