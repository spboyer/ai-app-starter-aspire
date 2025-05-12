// Import OTEL setup before any other imports
import './otel-setup';

// Import the OpenTelemetry test
import './otel-test';

import express from 'express';
import cors from 'cors';
import db from './db';
import * as logger from './logger';
import { otelRouter } from './otel-api';

const app = express();
// Use environment variable for port, which will be set by Aspire
const PORT = parseInt(process.env.PORT || '4000', 10);

// Enable CORS for all origins in development
app.use(cors({
  // In production, you might want to restrict this to specific origins
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API endpoint for random fortunes - both with /api prefix and without
// This allows direct access and access through the proxy
app.get('/api/fortunes/random', getRandomFortune);
app.get('/fortunes/random', getRandomFortune);

// Add OpenTelemetry API endpoints
app.use('/api/otel', otelRouter);
app.get('/api/telemetry-status', async (req, res) => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  res.json({
    status: 'active',
    endpoint: endpoint,
    exporters: {
      traces: process.env.OTEL_TRACES_EXPORTER,
      metrics: process.env.OTEL_METRICS_EXPORTER,
      logs: process.env.OTEL_LOGS_EXPORTER,
    },
    fallbackActive: process.env.OTLP_FALLBACK_ACTIVE === 'true'
  });
});

// Add dedicated status page route
app.get('/status', (req, res) => {
  res.redirect('/api/otel');
});

// Add dedicated telemetry dashboard
app.get('/telemetry', (req, res) => {
  res.redirect('/api/otel');
});

// Function to get a random fortune
async function getRandomFortune(_req: express.Request, res: express.Response) {
  const startTime = Date.now();
  try {
    // Get a random fortune from the database
    const fortune = await db<{ id: number; text: string }>('fortunes')
      .orderByRaw('RANDOM()')
      .first();
    if (!fortune) return res.status(404).json({ error: 'No fortunes found.' });
    
    // Record metrics
    const responseTime = Date.now() - startTime;
    import('./metrics').then(metrics => {
      metrics.recordFortuneRequest(fortune.text, responseTime);
    });
    
    res.json(fortune);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// Handle requests to /api root path - needed for Aspire service discovery testing
app.get('/api', (_req, res) => {
  res.status(200).json({ message: 'Fortune API is running' });
});

// Health check endpoint for Aspire
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Test endpoint for OpenTelemetry
app.get('/test-telemetry', (_req, res) => {
  // Import trace API from OpenTelemetry
  const { trace, context } = require('@opentelemetry/api');
  
  try {
    // Get a tracer
    const tracer = trace.getTracer('test-endpoint');
    
    // Create a span
    const span = tracer.startSpan('test-telemetry-endpoint');
    
    // Add some attributes to the span
    span.setAttribute('test.attribute', 'test-value');
    span.setAttribute('test.timestamp', Date.now());
    
    // Add an event
    span.addEvent('test-event-from-endpoint');
    
    // End the span
    span.end();
    
    res.status(200).json({ 
      message: 'OpenTelemetry test span created',
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating test span:', error);
    res.status(500).json({ 
      message: 'Failed to create OpenTelemetry test span',
      error: error.message,
      success: false
    });
  }
});

// Root path for checking if the API is running
app.get('/', (_req, res) => {
  res.status(200).json({ 
    message: 'Fortune API is running',
    endpoints: {
      random: '/api/fortunes/random',
      health: '/health'
    }
  });
});

// Log all environment variables for debugging
logger.info('Environment variables:', { 
  variables: Object.keys(process.env)
    .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
    .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {})
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🪄 Fortune API listening at http://0.0.0.0:${PORT}`);
  logger.info(`Health check available at http://0.0.0.0:${PORT}/health`);
  logger.info('All endpoints:', {
    endpoints: [
      '/api/fortunes/random - Get a random fortune (proxy friendly)',
      '/fortunes/random - Get a random fortune (direct access)',
      '/api - API information',
      '/health - Health check endpoint',
      '/ - Root path information'
    ]
  });
  
  // Check for Aspire environment variables
  logger.info('Aspire service bindings:', {
    bindings: Object.keys(process.env)
      .filter(key => key.startsWith('services__'))
      .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {})
  });
});
