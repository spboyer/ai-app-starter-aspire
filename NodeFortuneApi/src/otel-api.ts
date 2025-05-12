/**
 * OpenTelemetry REST API endpoints for monitoring and diagnostics
 */
import express from 'express';
import { testOtlpEndpoint } from './otel-connectivity';
import { getAspireStatusHtml } from './otel-status-page';

// Create a router for the OpenTelemetry API
export const otelRouter = express.Router();

// GET /api/otel - HTML status page for OpenTelemetry
otelRouter.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getAspireStatusHtml());
});

// GET /api/otel/status - Returns the current OpenTelemetry configuration status
otelRouter.get('/status', async (req, res) => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const isConnected = await testOtlpEndpoint(endpoint);
  
  res.json({
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoint: endpoint,
    connected: isConnected,
    configuration: {
      service_name: process.env.OTEL_SERVICE_NAME,
      exporters: {
        traces: process.env.OTEL_TRACES_EXPORTER,
        metrics: process.env.OTEL_METRICS_EXPORTER,
        logs: process.env.OTEL_LOGS_EXPORTER,
      },
      fallback: {
        active: process.env.OTLP_FALLBACK_ACTIVE === 'true',
        mode: process.env.OTLP_FALLBACK_MODE || 'console',
        reconnect_enabled: process.env.OTLP_CHECK_RECONNECT !== 'false',
      },
      debug: {
        enabled: process.env.OTEL_DEBUG === 'true',
        log_level: process.env.OTEL_LOG_LEVEL,
      }
    }
  });
});

// POST /api/otel/reconnect - Force reconnection to OTLP endpoint
otelRouter.post('/reconnect', async (req, res) => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  
  try {
    // Check the current connection status
    const isConnectedBefore = await testOtlpEndpoint(endpoint);
    
    if (!isConnectedBefore) {
      // Try to switch back to original exporters
      process.env.OTEL_TRACES_EXPORTER = process.env.ORIGINAL_TRACES_EXPORTER || 'otlp';
      process.env.OTEL_METRICS_EXPORTER = process.env.ORIGINAL_METRICS_EXPORTER || 'otlp';
      process.env.OTEL_LOGS_EXPORTER = process.env.ORIGINAL_LOGS_EXPORTER || 'otlp';
      process.env.OTLP_FALLBACK_ACTIVE = 'false';
      process.env.OTLP_ERROR_LOGGED = 'false';
      
      // Check if the connection works now
      const isConnectedAfter = await testOtlpEndpoint(endpoint);
      
      if (isConnectedAfter) {
        res.json({
          status: 'success',
          message: 'Successfully reconnected to OTLP endpoint',
          endpoint: endpoint
        });
      } else {
        // Switch back to fallback exporters
        switchToFallbackExporters();
        
        res.status(500).json({
          status: 'error',
          message: 'Failed to reconnect to OTLP endpoint',
          endpoint: endpoint
        });
      }
    } else {
      res.json({
        status: 'success',
        message: 'Already connected to OTLP endpoint',
        endpoint: endpoint
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Error reconnecting to OTLP endpoint: ${error.message}`,
      endpoint: endpoint
    });
  }
});

// POST /api/otel/exporters - Change the exporter type
otelRouter.post('/exporters', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || (type !== 'otlp' && type !== 'console' && type !== 'mixed')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid exporter type. Must be "otlp", "console", or "mixed"'
      });
    }
    
    // Store original values if not already stored
    if (!process.env.ORIGINAL_TRACES_EXPORTER) {
      process.env.ORIGINAL_TRACES_EXPORTER = process.env.OTEL_TRACES_EXPORTER || 'otlp';
    }
    if (!process.env.ORIGINAL_METRICS_EXPORTER) {
      process.env.ORIGINAL_METRICS_EXPORTER = process.env.OTEL_METRICS_EXPORTER || 'otlp';
    }
    if (!process.env.ORIGINAL_LOGS_EXPORTER) {
      process.env.ORIGINAL_LOGS_EXPORTER = process.env.OTEL_LOGS_EXPORTER || 'otlp';
    }
    
    // Switch exporters based on the requested type
    switch (type) {
      case 'otlp':
        process.env.OTEL_TRACES_EXPORTER = 'otlp';
        process.env.OTEL_METRICS_EXPORTER = 'otlp';
        process.env.OTEL_LOGS_EXPORTER = 'otlp';
        process.env.OTLP_FALLBACK_ACTIVE = 'false';
        process.env.OTLP_ERROR_LOGGED = 'false';
        break;
      
      case 'console':
        process.env.OTEL_TRACES_EXPORTER = 'console';
        process.env.OTEL_METRICS_EXPORTER = 'console';
        process.env.OTEL_LOGS_EXPORTER = 'console';
        process.env.OTLP_FALLBACK_ACTIVE = 'true';
        break;
      
      case 'mixed':
        process.env.OTEL_TRACES_EXPORTER = 'otlp,console';
        process.env.OTEL_METRICS_EXPORTER = 'otlp,console';
        process.env.OTEL_LOGS_EXPORTER = 'otlp,console';
        process.env.OTLP_FALLBACK_ACTIVE = 'true';
        break;
    }
    
    res.json({
      status: 'success',
      message: `Switched to ${type} exporters`,
      exporters: {
        traces: process.env.OTEL_TRACES_EXPORTER,
        metrics: process.env.OTEL_METRICS_EXPORTER,
        logs: process.env.OTEL_LOGS_EXPORTER
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Error changing exporters: ${error.message}`
    });
  }
});

// Function to manually switch to fallback exporters
// This is imported from otel-setup.ts
function switchToFallbackExporters() {
  if (process.env.OTLP_FALLBACK_ACTIVE === 'true') {
    return; // Already switched
  }
  
  if (!process.env.ORIGINAL_TRACES_EXPORTER) {
    process.env.ORIGINAL_TRACES_EXPORTER = process.env.OTEL_TRACES_EXPORTER || 'otlp';
  }
  if (!process.env.ORIGINAL_METRICS_EXPORTER) {
    process.env.ORIGINAL_METRICS_EXPORTER = process.env.OTEL_METRICS_EXPORTER || 'otlp';
  }
  if (!process.env.ORIGINAL_LOGS_EXPORTER) {
    process.env.ORIGINAL_LOGS_EXPORTER = process.env.OTEL_LOGS_EXPORTER || 'otlp';
  }
  
  const fallbackMode = process.env.OTLP_FALLBACK_MODE || 'console';
  
  switch (fallbackMode) {
    case 'none':
      break;
    case 'mixed':
      process.env.OTEL_TRACES_EXPORTER = 'otlp,console';
      process.env.OTEL_METRICS_EXPORTER = 'otlp,console';
      process.env.OTEL_LOGS_EXPORTER = 'otlp,console';
      break;
    default:
      process.env.OTEL_TRACES_EXPORTER = 'console';
      process.env.OTEL_METRICS_EXPORTER = 'console';
      process.env.OTEL_LOGS_EXPORTER = 'console';
  }
  
  process.env.OTLP_FALLBACK_ACTIVE = 'true';
  console.log('✅ Switched to fallback exporters due to OTLP connection issues');
}
