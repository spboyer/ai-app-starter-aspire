// Simplified metrics implementation using types that avoid TypeScript errors
import { metrics } from '@opentelemetry/api';

// Create a meter that will gracefully handle errors
let fortuneRequestCounter: any;
let fortuneCharactersCounter: any;
let fortuneResponseTimeHistogram: any;

try {
  // Create a meter to record business metrics
  const meter = metrics.getMeter('fortune-api-metrics');

  // Create counters for tracking API usage
  fortuneRequestCounter = meter.createCounter('fortune.requests', {
    description: 'Number of fortune requests',
  });

  fortuneCharactersCounter = meter.createCounter('fortune.characters', {
    description: 'Total number of characters in returned fortunes',
  });

  // Create a histogram for tracking response time
  fortuneResponseTimeHistogram = meter.createHistogram('fortune.response_time', {
    description: 'Fortune API response time in milliseconds',
    unit: 'ms',
  });
} catch (error) {
  console.error('Failed to initialize metrics:', error);
  // Create dummy implementations that do nothing
  fortuneRequestCounter = { add: () => {} };
  fortuneCharactersCounter = { add: () => {} };
  fortuneResponseTimeHistogram = { record: () => {} };
}

export function recordFortuneRequest(fortuneText: string, responseTimeMs: number) {
  try {
    // Increment request counter
    fortuneRequestCounter.add(1, {
      'service.name': 'fortune-api',
    });
    
    // Count characters and record
    fortuneCharactersCounter.add(fortuneText.length, {
      'service.name': 'fortune-api',
    });
    
    // Record response time
    fortuneResponseTimeHistogram.record(responseTimeMs, {
      'service.name': 'fortune-api',
    });
  } catch (error) {
    console.error('Error recording metrics:', error);
  }
}
