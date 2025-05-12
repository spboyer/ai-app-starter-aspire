#!/usr/bin/env node
/**
 * Script to test OTLP connectivity
 * Can be run directly with: npx ts-node ./src/check-otlp.ts
 */
import { loadOtelEnv } from './env-loader';
import { testOtlpEndpoint } from './otel-connectivity';

// Load environment variables
loadOtelEnv();

// Get the endpoint from environment variables
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

console.log(`Testing connectivity to primary OTLP endpoint: ${endpoint}`);

// Define alternative endpoints to try
const alternativeEndpoints = [
  'http://localhost:19888',     // Aspire dashboard + 1000
  'http://localhost:18888',     // Aspire dashboard port
  'http://localhost:4318',      // Standard OTLP port
  'http://host.docker.internal:4318',  // Docker host
  'http://host.docker.internal:19888', // Docker host, Aspire port
  'http://127.0.0.1:4318',      // Localhost IP
  'http://127.0.0.1:19888'      // Localhost IP, Aspire port
];

// Test connectivity to the main endpoint
async function testConnectivity() {
  // First try the configured endpoint
  try {
    const isConnected = await testOtlpEndpoint(endpoint);
    if (isConnected) {
      console.log('✅ Successfully connected to OTLP endpoint');
      return true;
    }
  } catch (err) {
    console.error(`Error testing configured endpoint: ${err.message}`);
  }

  // Try all alternative endpoints
  console.log('Testing alternative endpoints...');
  for (const altEndpoint of alternativeEndpoints) {
    if (altEndpoint === endpoint) continue; // Skip if same as main endpoint
    
    try {
      console.log(`Testing alternative endpoint: ${altEndpoint}`);
      const isConnected = await testOtlpEndpoint(altEndpoint);
      if (isConnected) {
        console.log(`✅ Successfully connected to alternative endpoint: ${altEndpoint}`);
        console.log(`\nSuggestion: Update your environment to use: ${altEndpoint}`);
        console.log(`Add this to your .otelenv file or set environment variable:`);
        console.log(`OTEL_EXPORTER_OTLP_ENDPOINT=${altEndpoint}`);
        return true;
      }
    } catch (err) {
      console.error(`Error testing alternative endpoint ${altEndpoint}: ${err.message}`);
    }
  }
  
  console.error('❌ Failed to connect to any OTLP endpoint');
  return false;
}

// Run the test
testConnectivity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(`Error in connectivity test: ${err.message}`);
    process.exit(1);
  });
