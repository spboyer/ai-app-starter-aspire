// Simple client-side tracing component for React
// Uses console logging but structured to resemble OpenTelemetry spans

import { useEffect } from 'react';

export function useTracing() {
  useEffect(() => {
    // Log component mounting as a span
    console.log('[OTEL] Component mounted', {
      timestamp: Date.now(),
      span: 'ComponentLifecycle',
      event: 'mount'
    });
    
    const startTime = performance.now();
    
    return () => {
      // Log component unmounting as a span
      const duration = performance.now() - startTime;
      console.log('[OTEL] Component unmounted', {
        timestamp: Date.now(),
        span: 'ComponentLifecycle',
        event: 'unmount',
        durationMs: duration.toFixed(2)
      });
    };
  }, []);
    // Helper to trace API calls
  const traceApiCall = async (url, method = 'GET', options = {}) => {
    const startTime = performance.now();
    const spanId = generateSpanId();
    
    console.log('[OTEL] API call started', {
      timestamp: Date.now(),
      span: 'APICall',
      spanId,
      event: 'start',
      attributes: {
        'http.method': method,
        'http.url': url
      }
    });
    
    try {
      const response = await fetch(url, { method, ...options });
      const duration = performance.now() - startTime;
      
      console.log('[OTEL] API call completed', {
        timestamp: Date.now(),
        span: 'APICall',
        spanId,
        event: 'end',
        durationMs: duration.toFixed(2),
        attributes: {
          'http.method': method,
          'http.url': url,
          'http.status_code': response.status
        }
      });
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.error('[OTEL] API call failed', {
        timestamp: Date.now(),
        span: 'APICall',
        spanId,
        event: 'error',
        durationMs: duration.toFixed(2),
        attributes: {
          'http.method': method,
          'http.url': url,
          'error.type': error.name,
          'error.message': error.message
        }
      });
      
      throw error;
    }
  };
    // Helper to trace user interactions
  const traceUserInteraction = (actionName) => {
    const spanId = generateSpanId();
    
    console.log('[OTEL] User interaction started', {
      timestamp: Date.now(),
      span: 'UserInteraction',
      spanId,
      event: 'start',
      attributes: {
        'ui.action': actionName
      }
    });
    
    return {
      startTime: performance.now(),
      spanId
    };
  };
  
  // Helper to trace completion of user interactions
  const traceUserInteractionEnd = (actionName, startInfo) => {
    const duration = performance.now() - startInfo.startTime;
    
    console.log('[OTEL] User interaction completed', {
      timestamp: Date.now(),
      span: 'UserInteraction',
      spanId: startInfo.spanId,
      event: 'end',
      durationMs: duration.toFixed(2),
      attributes: {
        'ui.action': actionName
      }
    });
  };
    // Generate a random span ID to link start/end events
  const generateSpanId = () => {
    return Math.random().toString(36).substring(2, 15);
  };
  
  // Helper to trace component rendering
  const traceComponentRender = (componentName) => {
    console.log('[OTEL] Component render', {
      timestamp: Date.now(),
      span: 'ComponentRender',
      event: 'render',
      attributes: {
        'component.name': componentName
      }
    });
  };
  
  return {
    traceApiCall,
    traceUserInteraction,
    traceUserInteractionEnd,
    traceComponentRender
  };
}

export default useTracing;
