// This file sets up the environment variables needed for OpenTelemetry zero-code instrumentation
import { loadOtelEnv } from './env-loader';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { testOtlpEndpoint } from './otel-connectivity';

// Process OTEL environment variables before any other imports
loadOtelEnv();

// Set default service name if not already set
if (!process.env.OTEL_SERVICE_NAME) {
  process.env.OTEL_SERVICE_NAME = 'node-fortune-api';
}

// Function to ensure we have a valid OTLP endpoint
function ensureValidOtlpEndpoint() {
  // Process environment variable for OTLP endpoint
  let endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  
  // Handle placeholder values from Aspire that weren't replaced
  if (!endpoint || endpoint.includes('{aspire.')) {
    // Try checking for the Aspire endpoint using platform-specific approaches
    const aspireEndpoint = findAspireEndpoint();
    if (aspireEndpoint) {
      endpoint = aspireEndpoint;
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = endpoint;
      console.log(`Found Aspire endpoint: ${endpoint}`);
    } else {
      // Fall back to localhost if no aspire endpoint is found
      endpoint = 'http://localhost:4318';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = endpoint;
      console.log(`Using default endpoint: ${endpoint}`);
    }
  }
  
  // Test connectivity to the endpoint
  testOtlpEndpoint(endpoint)
    .then(isConnected => {
      if (isConnected) {
        console.log(`✅ Successfully validated connectivity to OTLP endpoint: ${endpoint}`);
      } else {
        console.log(`❌ Failed to connect to OTLP endpoint: ${endpoint}`);
        console.log('Telemetry data will be collected but export may fail');
      }
    })
    .catch(err => {
      console.error(`Error testing OTLP endpoint: ${err.message}`);
    });
  
  return endpoint;
}

// Try to find the Aspire OTLP endpoint using various strategies
function findAspireEndpoint() {
  // Strategy 1: Check if Aspire sets it with a .NET syntax
  if (process.env.ASPNETCORE_URLS) {
    console.log(`Found ASPNETCORE_URLS: ${process.env.ASPNETCORE_URLS}`);
  }
  
  // Strategy 2: Look for other Aspire-related environment variables
  for (const key in process.env) {
    if (key.toLowerCase().includes('aspire') && key.toLowerCase().includes('otlp')) {
      console.log(`Found potential Aspire endpoint in ${key}: ${process.env[key]}`);
      return process.env[key];
    }
  }
  
  // Strategy 3: Try the Aspire dashboard address with OTLP port
  if (process.env.ASPIRE_DASHBOARD_URL) {
    try {
      const url = new URL(process.env.ASPIRE_DASHBOARD_URL);
      const otlpEndpoint = `${url.protocol}//${url.hostname}:4318`;
      console.log(`Derived OTLP endpoint from dashboard: ${otlpEndpoint}`);
      return otlpEndpoint;
    } catch (e) {
      console.log('Failed to parse ASPIRE_DASHBOARD_URL');
    }
  }
  
  // Strategy 4: Try to detect the Aspire dashboard port and use that host
  try {
    // Common Aspire dashboard ports
    const aspirePorts = [18888, 15888, 4318, 4317];
    for (const port of aspirePorts) {
      console.log(`Checking for Aspire dashboard on port ${port}...`);
      const testUrl = `http://localhost:${port}`;
      // We'll use this in combination with the connectivity test later
      if (port === 4318 || port === 4317) {
        console.log(`Adding candidate OTLP endpoint: ${testUrl}`);
        return testUrl;
      }
    }
  } catch (e) {
    console.log('Failed to detect Aspire dashboard port');
  }
  
  // Strategy 5: Look for Aspire container name patterns
  const containerEndpoints = [
    'http://aspire-dashboard:4318',
    'http://aspire.dashboard:4318',
    'http://host.docker.internal:4318'
  ];
  
  for (const endpoint of containerEndpoints) {
    console.log(`Adding candidate container endpoint: ${endpoint}`);
  }
  
  // No endpoint found with any strategy
  return null;
}

// Ensure we have a valid OTLP endpoint
const otlpEndpoint = ensureValidOtlpEndpoint();

// Call functions to start background processes
startOtlpReconnectChecker();

// Enable diagnostic logging for the OpenTelemetry SDK
// This will help us diagnose issues with registration and export
// Force debug mode for troubleshooting
const debugMode = true; // Always enable debug during troubleshooting
if (debugMode) {
  process.env.OTEL_LOG_LEVEL = 'debug';
  process.env.OTEL_DEBUG = 'true';
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  console.log('🔍 OpenTelemetry debug logging enabled');
} else {
  process.env.OTEL_LOG_LEVEL = 'error';
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
}

// Suppress ECONNREFUSED errors from console output for a better development experience
const originalErrorWrite = process.stderr.write;
process.stderr.write = function(buffer: any, encoding?: any, callback?: any) {
  // Check if this is an OTLP-related error we want to suppress
  if (buffer && typeof buffer === 'string') {
    if (buffer.includes('ECONNREFUSED') && 
       (buffer.includes('OTLP') || buffer.includes('4318'))) {
      // Only suppress after logging the first occurrence
      if (!process.env.OTLP_ERROR_LOGGED) {
        process.env.OTLP_ERROR_LOGGED = 'true';
        console.warn('⚠️ Failed to connect to OTLP endpoint. This warning will be shown only once.');
        console.warn('ℹ️ To see the connection errors, set SHOW_OTLP_ERRORS=true in your environment.');
        switchToFallbackExporters();
      }
      
      // Check if we should show all OTLP errors
      if (process.env.SHOW_OTLP_ERRORS === 'true') {
        return originalErrorWrite.call(process.stderr, buffer, encoding, callback);
      }
      
      // Still call the callback if provided
      if (typeof callback === 'function') {
        callback();
      }
      return true; // Suppress the error output
    }
  }
  return originalErrorWrite.call(process.stderr, buffer, encoding, callback);
};

/**
 * Switch from OTLP exporters to fallback exporters when the OTLP endpoint is unavailable
 */
function switchToFallbackExporters() {
  if (process.env.OTLP_FALLBACK_ACTIVE === 'true') {
    return; // Already switched
  }
  
  console.log('⚠️ Switching to fallback exporters due to OTLP connection issues');
  
  // Store the original configuration in case we want to switch back later
  if (!process.env.ORIGINAL_TRACES_EXPORTER) {
    process.env.ORIGINAL_TRACES_EXPORTER = process.env.OTEL_TRACES_EXPORTER || 'otlp';
  }
  if (!process.env.ORIGINAL_METRICS_EXPORTER) {
    process.env.ORIGINAL_METRICS_EXPORTER = process.env.OTEL_METRICS_EXPORTER || 'otlp';
  }
  if (!process.env.ORIGINAL_LOGS_EXPORTER) {
    process.env.ORIGINAL_LOGS_EXPORTER = process.env.OTEL_LOGS_EXPORTER || 'otlp';
  }
  
  // Determine which fallback to use based on environment
  const fallbackMode = process.env.OTLP_FALLBACK_MODE || 'console';
  
  switch (fallbackMode) {
    case 'none':
      // Don't change anything, just keep trying with OTLP
      console.log('Continuing to use OTLP exporters despite connection issues');
      break;
      
    case 'console':
      // Switch to console exporters for development/debugging
      process.env.OTEL_TRACES_EXPORTER = 'console';
      process.env.OTEL_METRICS_EXPORTER = 'console';
      process.env.OTEL_LOGS_EXPORTER = 'console';
      console.log('✅ Switched to console exporters for local development');
      break;
      
    case 'mixed':
      // Use a mix of exporters - try to send some data to OTLP but also log locally
      // This requires setting up batch processors appropriately in the SDK
      process.env.OTEL_TRACES_EXPORTER = 'otlp,console';
      process.env.OTEL_METRICS_EXPORTER = 'otlp,console';
      process.env.OTEL_LOGS_EXPORTER = 'otlp,console';
      console.log('✅ Using mixed exporters (OTLP + console) for redundancy');
      break;
      
    default:
      // Default fallback is console
      process.env.OTEL_TRACES_EXPORTER = 'console';
      process.env.OTEL_METRICS_EXPORTER = 'console';
      process.env.OTEL_LOGS_EXPORTER = 'console';
      console.log('✅ Switched to console exporters for local development');
  }
  
  process.env.OTLP_FALLBACK_ACTIVE = 'true';
  
  // Start a background process to periodically check if OTLP endpoint becomes available
  if (process.env.OTLP_CHECK_RECONNECT !== 'false') {
    startOtlpReconnectChecker();
  }
}

/**
 * Periodically check if the OTLP endpoint becomes available
 * and switch back to OTLP exporters if it does
 */
function startOtlpReconnectChecker() {
  // Only start once
  if (process.env.OTLP_RECONNECT_CHECKER_STARTED === 'true') {
    return;
  }
  
  process.env.OTLP_RECONNECT_CHECKER_STARTED = 'true';
  console.log('ℹ️ Starting background checker for OTLP endpoint availability');
  
  // Check every 30 seconds (adjust as needed)
  const interval = parseInt(process.env.OTLP_RECONNECT_INTERVAL || '30000', 10);
  
  // Store the interval ID in case we want to stop checking later
  const reconnectInterval = setInterval(async () => {
    // Get the current endpoint
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
    
    try {
      // Check if the endpoint is now available
      const isConnected = await testOtlpEndpoint(endpoint);
      
      if (isConnected && process.env.OTLP_FALLBACK_ACTIVE === 'true') {
        console.log(`✅ OTLP endpoint ${endpoint} is now available!`);
        
        // Switch back to original exporters
        if (process.env.OTLP_AUTO_RECONNECT !== 'false') {
          process.env.OTEL_TRACES_EXPORTER = process.env.ORIGINAL_TRACES_EXPORTER || 'otlp';
          process.env.OTEL_METRICS_EXPORTER = process.env.ORIGINAL_METRICS_EXPORTER || 'otlp';
          process.env.OTEL_LOGS_EXPORTER = process.env.ORIGINAL_LOGS_EXPORTER || 'otlp';
          
          console.log('✅ Switched back to original OTLP exporters');
          process.env.OTLP_FALLBACK_ACTIVE = 'false';
          process.env.OTLP_ERROR_LOGGED = 'false';
        } else {
          console.log('ℹ️ OTLP endpoint is available, but auto-reconnect is disabled');
        }
      }
    } catch (error) {
      // Silent failure - don't clutter logs with reconnect attempts
    }
  }, interval);
  
  // Cleanup on process exit
  process.on('exit', () => {
    clearInterval(reconnectInterval);
  });
}

// Print out the critical OTEL configuration values
console.log('=== OpenTelemetry Configuration ===');
console.log(`OTEL_SERVICE_NAME: ${process.env.OTEL_SERVICE_NAME}`);
console.log(`OTEL_EXPORTER_OTLP_ENDPOINT: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
console.log(`OTEL_EXPORTER_OTLP_PROTOCOL: ${process.env.OTEL_EXPORTER_OTLP_PROTOCOL}`);
console.log(`OTEL_TRACES_EXPORTER: ${process.env.OTEL_TRACES_EXPORTER}`);
console.log(`OTEL_METRICS_EXPORTER: ${process.env.OTEL_METRICS_EXPORTER}`);
console.log(`OTEL_DEBUG: ${process.env.OTEL_DEBUG}`);
console.log(`OTEL_LOG_LEVEL: ${process.env.OTEL_LOG_LEVEL}`);
console.log(`OTEL_NODE_RESOURCE_DETECTORS: ${process.env.OTEL_NODE_RESOURCE_DETECTORS}`);
console.log('================================');

console.log('✅ OpenTelemetry environment setup complete');
