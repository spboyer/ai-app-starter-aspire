// Web browser OpenTelemetry implementation for Aspire Dashboard integration
import { trace } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import * as resources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Create and export a tracer for use in the application
export const tracer = trace.getTracer('fortune-spa');

/**
 * Initialize OpenTelemetry for the browser environment
 * Implements graceful handling of Aspire placeholders and missing collectors
 */
export function initializeOpenTelemetry() {
  console.log('Initializing OpenTelemetry for browser...');
  
  try {
    // Determine the OTLP endpoint
    let endpoint = getOTLPEndpoint();
    
    // Log what endpoint we're using
    console.log(`OTEL endpoint: ${endpoint}`);
    
    // Create resource attributes for the service
    const resourceAttributes = {
      [SemanticResourceAttributes.SERVICE_NAME]: 'fortune-spa',
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'aspire',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production'
    };
    
    // Create a resource from attributes
    const resource = resources.resourceFromAttributes(resourceAttributes);
    
    // Create the OTLP exporter with shorter timeouts and error handling
    const otlpExporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      timeoutMillis: 1000, // Use a short timeout to fail fast when collector is unavailable
      headers: {} // Empty headers object required by the OTLP exporter
    });
    
    // Create the web tracer provider
    const provider = new WebTracerProvider({
      resource
    });
    
    // Add error handling for exporter setup
    try {
      // WebTracerProvider in newer versions might use a different API for adding processors
      if (typeof (provider as any).addSpanProcessor === 'function') {
        // Use BatchSpanProcessor in production for better performance
        const spanProcessor = new BatchSpanProcessor(otlpExporter, {
          // Configure reasonable batching settings
          maxExportBatchSize: 10,
          scheduledDelayMillis: 1000
        });
        
        (provider as any).addSpanProcessor(spanProcessor);
        console.log('Added OTLP span processor using BatchSpanProcessor');
      } else {
        // Fallback for older versions or different APIs
        try {
          // Try using the SimpleSpanProcessor if BatchSpanProcessor isn't supported
          const simpleProcessor = new SimpleSpanProcessor(otlpExporter);
          (provider as any).addSpanProcessor(simpleProcessor);
          console.log('Added OTLP span processor using SimpleSpanProcessor');
        } catch (e) {
          console.warn('Failed to add span processor:', e);
        }
      }
    } catch (error) {
      console.warn('Failed to create OTLP exporter:', error);
      // Continue without the exporter - traces will be created but not exported
    }
    
    // Register the provider with Zone.js context manager
    provider.register({
      contextManager: new ZoneContextManager()
    });
    
    // Register browser instrumentations
    registerInstrumentations({
      instrumentations: [
        // Document load instrumentation tracks initial page load
        new DocumentLoadInstrumentation({
          enabled: true,
        }),
        // Fetch instrumentation tracks API calls
        new FetchInstrumentation({
          // Exclude OTLP calls from instrumentation to prevent cycles
          ignoreUrls: [
            // Common OTLP endpoints to prevent instrumentation loops
            /localhost:4318/,
            /otlp\/v\d+\/traces/,
            /v\d+\/traces/
          ],
          clearTimingResources: true,
          propagateTraceHeaderCorsUrls: [
            // Include all endpoints to propagate trace headers
            /.*/
          ]
        })
      ]
    });
    
    // Monkey patch global fetch to handle errors more gracefully
    monkeyPatchFetch();
    
    console.log('OpenTelemetry initialized for browser');
    return provider;
  } catch (err) {
    // Don't let telemetry failures break the app
    console.error('Failed to initialize telemetry:', err);
    return {};
  }
}

/**
 * Patches the global fetch to suppress OpenTelemetry-related errors
 */
function monkeyPatchFetch() {
  const originalFetch = window.fetch;
  
  window.fetch = function(input, init) {
    // Safely extract the URL string from various input types
    let urlString = '';
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input instanceof Request) {
      urlString = input.url;
    }
    
    // Check if this is an OTLP request
    const isOtelRequest = urlString.includes('traces') || 
                         urlString.includes('otlp') || 
                         urlString.includes('4318');
    
    if (isOtelRequest) {
      // For OTLP requests, catch errors to prevent them from breaking the app
      return originalFetch.apply(this, [input, init])
        .catch(err => {
          // Suppress the error from console, but still throw it so OTLP knows it failed
          if (err.message && !err.reported) {
            // Mark as reported to avoid duplicate logging
            err.reported = true;
          }
          throw err; // Re-throw to maintain expected behavior
        });
    }
    
    // Non-OTLP request, use original behavior
    return originalFetch.apply(this, [input, init]);
  };
}

/**
 * Gets the OTLP endpoint from environment, handling Aspire placeholders
 */
function getOTLPEndpoint(): string {
  try {
    // For Vite applications, environment variables are exposed via import.meta.env
    // @ts-ignore - TypeScript doesn't know about Vite's import.meta.env
    const envEndpoint = import.meta.env?.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
    
    // Handle Aspire placeholder values
    if (envEndpoint && typeof envEndpoint === 'string') {
      if (envEndpoint.includes('{aspire.')) {
        console.log('Detected Aspire placeholder, using default OTLP endpoint');
        return 'http://localhost:4318';
      }
      return envEndpoint;
    }
  } catch (error) {
    console.warn('Error accessing environment variables:', error);
  }
  
  // Default endpoint if not provided or on error
  return 'http://localhost:4318';
}
