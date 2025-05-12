import { useEffect, useState } from 'react';
import { Fortune } from './models/Fortune';
import { trace, context } from '@opentelemetry/api';
import { tracer } from './telemetry';

export default function App() {
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFortune = async () => {
    setLoading(true);
    setError(null);
    
    // Create a span for the fetch operation
    const span = tracer.startSpan('fetchFortune');
    console.log('Created span for fetchFortune operation:', span);
    
    // Use the context with the current span
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        console.log("Fetching fortune from API...");
        // In Aspire, the API endpoint is proxied through Vite configuration
        // The service connection is automatically handled by .NET Aspire
        const res = await fetch('/api/fortunes/random');
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`API returned ${res.status}: ${errorText}`);
          span.setStatus({ code: 2 }); // Error status
          span.setAttribute('error.type', 'http_error');
          span.setAttribute('error.status', res.status);
          span.setAttribute('error.message', errorText);
          throw new Error(`Failed to load fortune: ${res.status} ${errorText}`);
        }
        const data = await res.json();
        console.log("Fortune received:", data);
        
        // Add attributes to the span
        span.setAttribute('fortune.id', data.id);
        span.setAttribute('fortune.length', data.text.length);
        
        setFortune(data);
      } catch (e: any) {
        setError(e.message || 'Unknown error occurred');
        console.error('Error fetching fortune:', e);
        
        // Record error to span
        span.recordException(e);
        span.setStatus({ code: 2 }); // Error status
      } finally {
        setLoading(false);
        span.end(); // End the span when the operation is complete
        console.log('Ended span for fetchFortune operation');
      }
    });
  };

  useEffect(() => {
    fetchFortune();
  }, []);

  return (
    <div className="app-container">
      <div className="card">
        {loading && <p>Loading…</p>}
        {error && <p className="error">Error: {error}</p>}
        {fortune && <p>{fortune.text}</p>}
      </div>
      <button className="btn" onClick={fetchFortune} disabled={loading}>
        moar fortunes
      </button>
    </div>
  );
}
