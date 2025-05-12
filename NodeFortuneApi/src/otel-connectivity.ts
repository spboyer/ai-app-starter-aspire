/**
 * Utility to test OpenTelemetry OTLP endpoint connectivity
 */
import http from 'http';
import https from 'https';
import { URL } from 'url';
import * as net from 'net';

/**
 * Tests if a given URL is accessible
 * @param urlString The OTLP endpoint URL to test
 * @returns A promise that resolves to true if the endpoint is accessible, false otherwise
 */
export async function testOtlpEndpoint(urlString: string): Promise<boolean> {
  console.log(`Testing OTLP endpoint connectivity to: ${urlString}`);
  
  try {
    const url = new URL(urlString);
    const protocol = url.protocol;
    const hostname = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : (protocol === 'https:' ? 443 : 80);
    
    // First test basic TCP connectivity to make sure the host:port is reachable
    const tcpResult = await testTcpConnection(hostname, port);
    if (!tcpResult) {
      console.log(`TCP connection to ${hostname}:${port} failed`);
      // Try some common alternatives
      return await tryAlternativeEndpoints(urlString);
    }
    
    // Then try HTTP request to check if endpoint responds properly
    const httpResult = await testHttpEndpoint(urlString);
    if (!httpResult) {
      console.log(`HTTP request to ${urlString} failed, but TCP connection succeeded`);
      console.log('This might indicate the server is running but not accepting OTLP requests');
      return false;
    }
    
    console.log(`Successfully connected to OTLP endpoint: ${urlString}`);
    return true;
  } catch (error) {
    console.error(`Error testing OTLP endpoint: ${error.message}`);
    return false;
  }
}

/**
 * Tests TCP connection to a hostname and port
 */
async function testTcpConnection(hostname: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Testing TCP connection to ${hostname}:${port}`);
    const socket = net.createConnection({ host: hostname, port, timeout: 3000 });
    
    socket.on('connect', () => {
      console.log(`TCP connection to ${hostname}:${port} successful`);
      socket.end();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`TCP connection to ${hostname}:${port} timed out`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`TCP connection to ${hostname}:${port} failed: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Tests if an HTTP endpoint responds
 */
async function testHttpEndpoint(urlString: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      console.log(`Testing HTTP connectivity to ${urlString}`);
      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, { method: 'OPTIONS', timeout: 3000 }, (res) => {
        console.log(`HTTP response from ${urlString}: ${res.statusCode}`);
        // Any response is considered a success for connectivity testing
        // OTLP endpoints might return 404 or other codes for OPTIONS requests
        resolve(true);
      });
      
      req.on('timeout', () => {
        console.log(`HTTP request to ${urlString} timed out`);
        req.destroy();
        resolve(false);
      });
      
      req.on('error', (err) => {
        console.log(`HTTP request to ${urlString} failed: ${err.message}`);
        resolve(false);
      });
      
      req.end();
    } catch (error) {
      console.error(`Error in HTTP request: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Try alternative endpoints when the main one fails
 */
async function tryAlternativeEndpoints(originalUrl: string): Promise<boolean> {
  console.log('Trying alternative OTLP endpoints...');
  
  try {
    const url = new URL(originalUrl);
    const alternatives = [
      // Try host.docker.internal for Docker environments
      `${url.protocol}//host.docker.internal:${url.port || '4318'}`,
      // Try aspire-dashboard.aspire-dashboard if running in Kubernetes with Aspire
      `${url.protocol}//aspire-dashboard.aspire-dashboard:${url.port || '4318'}`,
      // Try localhost fallback
      `${url.protocol}//localhost:${url.port || '4318'}`,
      // Try different ports on localhost
      'http://localhost:4317', // gRPC port
      'http://localhost:4318', // HTTP port
      // Try IP addresses directly
      'http://127.0.0.1:4318'
    ];
    
    for (const alt of alternatives) {
      if (alt === originalUrl) continue; // Skip the original URL
      
      console.log(`Trying alternative endpoint: ${alt}`);
      try {
        const altUrl = new URL(alt);
        const tcpResult = await testTcpConnection(altUrl.hostname, 
          altUrl.port ? parseInt(altUrl.port, 10) : (altUrl.protocol === 'https:' ? 443 : 80));
        
        if (tcpResult) {
          console.log(`Found working alternative endpoint: ${alt}`);
          // Update environment variable with working endpoint
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT = alt;
          return true;
        }
      } catch (error) {
        console.log(`Error trying alternative endpoint ${alt}: ${error.message}`);
      }
    }
    
    console.log('No alternative endpoints found');
    return false;
  } catch (error) {
    console.error(`Error in tryAlternativeEndpoints: ${error.message}`);
    return false;
  }
}
