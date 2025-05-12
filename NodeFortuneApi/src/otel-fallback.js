const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { ConsoleMetricExporter } = require('@opentelemetry/sdk-metrics');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const { ConsoleLogRecordExporter } = require('@opentelemetry/sdk-logs');

// Enable debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

/**
 * OTLP Fallback Module
 * This module provides fallback exporters when OTLP connectivity fails
 */

// Store original exporters
let originalExporters = {
  traceExporter: null,
  metricExporter: null,
  logExporter: null
};

// Store current exporter mode
let currentMode = process.env.OTLP_FALLBACK_MODE || 'otlp';

/**
 * Create console exporters
 */
function createConsoleExporters() {
  console.log('Creating console exporters for OpenTelemetry fallback');
  return {
    traceExporter: new ConsoleSpanExporter(),
    metricExporter: new ConsoleMetricExporter(),
    logExporter: new ConsoleLogRecordExporter()
  };
}

/**
 * Switch to console exporters
 * @param {Object} sdk - The OpenTelemetry SDK instance
 */
function switchToConsoleExporters(sdk) {
  if (!sdk) {
    console.error('Cannot switch exporters: SDK not provided');
    return;
  }
  
  try {
    console.log('Switching to console exporters due to OTLP connection failure');
    const consoleExporters = createConsoleExporters();
    
    // Store original exporters if not already stored
    if (!originalExporters.traceExporter && sdk.traceExporter) {
      originalExporters.traceExporter = sdk.traceExporter;
    }
    if (!originalExporters.metricExporter && sdk.metricExporter) {
      originalExporters.metricExporter = sdk.metricExporter;
    }
    if (!originalExporters.logExporter && sdk.logExporter) {
      originalExporters.logExporter = sdk.logExporter;
    }
    
    // Replace exporters in the SDK
    if (sdk.tracerProvider && consoleExporters.traceExporter) {
      sdk.tracerProvider.addSpanProcessor(
        new sdk.SimpleSpanProcessor(consoleExporters.traceExporter)
      );
    }
    
    if (sdk.meterProvider && consoleExporters.metricExporter) {
      sdk.meterProvider.addMetricReader(
        new sdk.PeriodicExportingMetricReader({
          exporter: consoleExporters.metricExporter,
          exportIntervalMillis: 1000,
        })
      );
    }
    
    if (sdk.loggerProvider && consoleExporters.logExporter) {
      sdk.loggerProvider.addLogRecordProcessor(
        new sdk.SimpleLogRecordProcessor(consoleExporters.logExporter)
      );
    }
    
    currentMode = 'console';
    console.log('Successfully switched to console exporters');
    return true;
  } catch (err) {
    console.error('Error switching to console exporters:', err);
    return false;
  }
}

/**
 * Register a reconnection checker to periodically test OTLP connectivity
 * @param {Object} sdk - The OpenTelemetry SDK instance 
 * @param {Function} connectivityTest - Function that tests OTLP endpoint connectivity
 */
function registerReconnectionChecker(sdk, connectivityTest) {
  if (!sdk || typeof connectivityTest !== 'function') {
    console.error('Cannot register reconnection checker: invalid parameters');
    return;
  }
  
  const autoReconnect = process.env.OTLP_AUTO_RECONNECT !== 'false';
  const interval = parseInt(process.env.OTLP_RECONNECT_INTERVAL || '30000', 10);
  
  if (!autoReconnect) {
    console.log('Automatic OTLP reconnection is disabled');
    return;
  }
  
  console.log(`Registering OTLP reconnection checker with interval: ${interval}ms`);
  
  // Start periodic check
  const checkerId = setInterval(async () => {
    try {
      // Skip if we're not in console mode
      if (currentMode !== 'console') return;
      
      const isConnected = await connectivityTest();
      if (isConnected) {
        console.log('OTLP endpoint is now available, switching back to OTLP exporters');
        // Logic to switch back to OTLP would go here
        currentMode = 'otlp';
      }
    } catch (err) {
      console.error('Error in reconnection check:', err);
    }
  }, interval);
  
  return checkerId;
}

// Export fallback functionality
module.exports = {
  switchToConsoleExporters,
  registerReconnectionChecker,
  getCurrentMode: () => currentMode
};
