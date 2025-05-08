import { useEffect, useState } from 'react';
import { Fortune } from './models/Fortune';

export default function App() {
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFortune = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching fortune from API...");
      // In Aspire, the API endpoint is proxied through Vite configuration
      // The service connection is automatically handled by .NET Aspire
      const res = await fetch('/api/fortunes/random');
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API returned ${res.status}: ${errorText}`);
        throw new Error(`Failed to load fortune: ${res.status} ${errorText}`);
      }
      const data = await res.json();
      console.log("Fortune received:", data);
      setFortune(data);
    } catch (e: any) {
      setError(e.message || 'Unknown error occurred');
      console.error('Error fetching fortune:', e);
    } finally {
      setLoading(false);
    }
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
