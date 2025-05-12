import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Log all environment variables for debugging (excluding secrets)
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('SECRET') && !key.includes('KEY') && !key.includes('PASSWORD'))
  .forEach(key => console.log(`  ${key}=${process.env[key]}`));

// Get API URL from Aspire environment variables, fallback to localhost
const apiUrl = process.env.services__fortuneapi__http || 'http://localhost:4000';
console.log(`\nAPI URL from environment: ${apiUrl}`);

// Get OTEL endpoint from Aspire environment variables or default
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
console.log(`\nOTEL endpoint from environment: ${otelEndpoint}`);

export default defineConfig({
  plugins: [react()],  
  server: {
    host: '0.0.0.0',
    port: 3000, // Use fixed port 3000
    strictPort: true, // Fail if port is already in use
    // In development, proxy API requests to the backend
    proxy: { 
      '/api': {
        target: apiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying:', req.method, req.url, 'to', apiUrl);
          });
        }
      }
    }
  },
  // Define environment variables to pass to the client
  define: {
    // Use JSON.stringify to properly encode string values
    'import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT': JSON.stringify(otelEndpoint)
  }
});
