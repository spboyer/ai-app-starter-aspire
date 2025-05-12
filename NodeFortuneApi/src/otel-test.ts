// Test script to verify OpenTelemetry initialization
import { trace, metrics, Span, context, SpanKind } from '@opentelemetry/api';

// Wait for all the imports to settle, then create a manual span
setTimeout(() => {
  console.log('=== Testing OpenTelemetry Initialization ===');
  
  try {
    // Check if trace API is available
    const tracer = trace.getTracer('manual-test-tracer');
    console.log('✅ Tracer successfully obtained');
    
    // Create a test span
    const span = tracer.startSpan('manual-test-span', {
      kind: SpanKind.SERVER,
      attributes: { 'test.attribute': 'test-value' }
    });
    console.log('✅ Test span successfully created');
    
    // Add an event to the span
    span.addEvent('test-event', { 'event.detail': 'This is a test event' });
    console.log('✅ Event added to span');
    
    // End the span
    span.end();
    console.log('✅ Span ended and should be exported');
    
    // Create a metric
    try {
      const meter = metrics.getMeter('manual-test-meter');
      const counter = meter.createCounter('test_counter', {
        description: 'A test counter to verify metric export'
      });
      counter.add(1, { 'test.label': 'test-value' });
      console.log('✅ Metric created and recorded');
    } catch (metricError) {
      console.error('❌ Failed to create metric:', metricError);
    }
    
    console.log('Test completed - check Aspire dashboard for telemetry data');
  } catch (error) {
    console.error('❌ Error testing OpenTelemetry:', error);
  }
}, 2000);
