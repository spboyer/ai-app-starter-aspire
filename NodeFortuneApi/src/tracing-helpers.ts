// Custom tracer helper for the Fortune API
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

// Create a tracer for this service
const tracer = trace.getTracer('fortune-api-tracer');

// Helper function to trace API requests
export function traceApiRequest(endpoint: string, handler: (req: any, res: any) => Promise<any>) {
  return async (req: any, res: any) => {
    const span = tracer.startSpan(
      `API ${req.method} ${endpoint}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.originalUrl,
          'http.route': endpoint,
          'http.request.headers': JSON.stringify(req.headers),
          'fortune.endpoint': endpoint
        }
      }
    );

    // Use the current span as the active span for this context
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        // Call the original handler
        await handler(req, res);
        
        // Add response attributes
        span.setAttributes({
          'http.status_code': res.statusCode,
        });
        
        // End the span with success status
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        // Capture the error in the span
        if (error instanceof Error) {
          span.setAttributes({
            'error.type': error.name,
            'error.message': error.message,
            'error.stack': error.stack || ''
          });
          span.setStatus({ 
            code: SpanStatusCode.ERROR,
            message: error.message
          });
        } else {
          span.setStatus({ 
            code: SpanStatusCode.ERROR,
            message: 'Unknown error occurred'
          });
        }
        
        // Re-throw the error
        throw error;
      } finally {
        // Always end the span
        span.end();
      }
    });
  };
}

// Helper to trace database operations
export function traceDatabaseOperation(operation: string, callback: () => Promise<any>) {
  const span = tracer.startSpan(
    `DB ${operation}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.type': 'sqlite',
        'db.operation': operation
      }
    }
  );
  
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await callback();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        span.setAttributes({
          'error.type': error.name,
          'error.message': error.message,
          'error.stack': error.stack || ''
        });
        span.setStatus({ 
          code: SpanStatusCode.ERROR,
          message: error.message
        });
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR,
          message: 'Unknown error occurred'
        });
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

export default {
  tracer,
  traceApiRequest,
  traceDatabaseOperation
};
