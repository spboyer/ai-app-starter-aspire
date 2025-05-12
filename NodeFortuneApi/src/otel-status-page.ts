/**
 * Simple HTML status page for OpenTelemetry and Aspire connectivity
 */

export const getAspireStatusHtml = () => {
  // Check OTLP connection status
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const fallbackActive = process.env.OTLP_FALLBACK_ACTIVE === 'true';
  const fallbackMode = process.env.OTLP_FALLBACK_MODE || 'console';
  
  // Get exporter configuration
  const tracesExporter = process.env.OTEL_TRACES_EXPORTER || 'otlp';
  const metricsExporter = process.env.OTEL_METRICS_EXPORTER || 'otlp';
  const logsExporter = process.env.OTEL_LOGS_EXPORTER || 'otlp';
  
  // Get all environment variables related to Aspire or OpenTelemetry
  const otelVars: Record<string, string> = {};
  const aspireVars: Record<string, string> = {};
  
  for (const key in process.env) {
    if (key.toUpperCase().includes('OTEL') || key.toUpperCase().includes('OPENTELEMETRY')) {
      otelVars[key] = process.env[key] || '';
    } else if (key.toUpperCase().includes('ASPIRE') || key.toUpperCase().includes('DOTNET')) {
      aspireVars[key] = process.env[key] || '';
    }
  }
  
  // Build HTML for environment variables
  const buildEnvVarsHtml = (vars: Record<string, string>) => {
    return Object.entries(vars)
      .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
      .join('');
  };
  
  // Status indicator
  const statusClass = fallbackActive ? 'warning' : 
                     (tracesExporter === 'otlp' ? 'success' : 'info');
  const statusMessage = fallbackActive ? 'Using fallback exporters' : 
                       (tracesExporter === 'otlp' ? 'Connected to OTLP endpoint' : 'Using custom exporters');
  
  // Generate the HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenTelemetry Status</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0078d4;
    }
    .status {
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .success {
      background-color: #dff0d8;
      border: 1px solid #d6e9c6;
      color: #3c763d;
    }
    .warning {
      background-color: #fcf8e3;
      border: 1px solid #faebcc;
      color: #8a6d3b;
    }
    .error {
      background-color: #f2dede;
      border: 1px solid #ebccd1;
      color: #a94442;
    }
    .info {
      background-color: #d9edf7;
      border: 1px solid #bce8f1;
      color: #31708f;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      text-align: left;
      padding: 8px;
      border: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .actions {
      margin: 20px 0;
    }
    button {
      background-color: #0078d4;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    button:hover {
      background-color: #005a9e;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: Consolas, Monaco, 'Andale Mono', monospace;
    }
    .connection-test {
      margin-top: 20px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    #testResults {
      margin-top: 10px;
      min-height: 100px;
      background-color: #2d2d2d;
      color: #f9f9f9;
      padding: 10px;
      border-radius: 3px;
      overflow: auto;
      font-family: Consolas, Monaco, 'Andale Mono', monospace;
    }
  </style>
</head>
<body>
  <h1>OpenTelemetry Status Dashboard</h1>
  
  <div class="status ${statusClass}">
    <h2>Status: ${statusMessage}</h2>
    <p>OTLP Endpoint: ${otlpEndpoint}</p>
  </div>
  
  <h2>Exporter Configuration</h2>
  <table>
    <tr>
      <th>Type</th>
      <th>Exporter</th>
    </tr>
    <tr>
      <td>Traces</td>
      <td>${tracesExporter}</td>
    </tr>
    <tr>
      <td>Metrics</td>
      <td>${metricsExporter}</td>
    </tr>
    <tr>
      <td>Logs</td>
      <td>${logsExporter}</td>
    </tr>
  </table>
  
  <h2>Fallback Settings</h2>
  <table>
    <tr>
      <th>Setting</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Fallback Active</td>
      <td>${fallbackActive ? 'Yes' : 'No'}</td>
    </tr>
    <tr>
      <td>Fallback Mode</td>
      <td>${fallbackMode}</td>
    </tr>
    <tr>
      <td>Auto-Reconnect</td>
      <td>${process.env.OTLP_AUTO_RECONNECT !== 'false' ? 'Enabled' : 'Disabled'}</td>
    </tr>
    <tr>
      <td>Reconnect Interval</td>
      <td>${process.env.OTLP_RECONNECT_INTERVAL || '30000'} ms</td>
    </tr>
  </table>
  
  <div class="actions">
    <button onclick="testConnectivity()">Test Connectivity</button>
    <button onclick="forceReconnect()">Force Reconnect</button>
    <button onclick="switchToConsole()">Switch to Console Exporters</button>
    <button onclick="switchToOTLP()">Switch to OTLP Exporters</button>
  </div>
  
  <div class="connection-test">
    <h3>Connection Test Results</h3>
    <div id="testResults">Click "Test Connectivity" to run a test...</div>
  </div>
  
  <h2>OpenTelemetry Environment Variables</h2>
  <table>
    <tr>
      <th>Variable</th>
      <th>Value</th>
    </tr>
    ${buildEnvVarsHtml(otelVars)}
  </table>
  
  <h2>Aspire Environment Variables</h2>
  <table>
    <tr>
      <th>Variable</th>
      <th>Value</th>
    </tr>
    ${buildEnvVarsHtml(aspireVars)}
  </table>
  
  <script>
    // Function to test OTLP connectivity
    function testConnectivity() {
      const resultDiv = document.getElementById('testResults');
      resultDiv.innerHTML = 'Testing connectivity...';
      
      fetch('/api/otel/status')
        .then(response => response.json())
        .then(data => {
          resultDiv.innerHTML = JSON.stringify(data, null, 2);
        })
        .catch(error => {
          resultDiv.innerHTML = 'Error: ' + error.message;
        });
    }
    
    // Function to force reconnection
    function forceReconnect() {
      const resultDiv = document.getElementById('testResults');
      resultDiv.innerHTML = 'Attempting to reconnect...';
      
      fetch('/api/otel/reconnect', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
          resultDiv.innerHTML = JSON.stringify(data, null, 2);
          // Reload page after 2 seconds to show new status
          setTimeout(() => location.reload(), 2000);
        })
        .catch(error => {
          resultDiv.innerHTML = 'Error: ' + error.message;
        });
    }
    
    // Function to switch to console exporters
    function switchToConsole() {
      const resultDiv = document.getElementById('testResults');
      resultDiv.innerHTML = 'Switching to console exporters...';
      
      fetch('/api/otel/exporters', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'console' })
      })
        .then(response => response.json())
        .then(data => {
          resultDiv.innerHTML = JSON.stringify(data, null, 2);
          // Reload page after 2 seconds to show new status
          setTimeout(() => location.reload(), 2000);
        })
        .catch(error => {
          resultDiv.innerHTML = 'Error: ' + error.message;
        });
    }
    
    // Function to switch to OTLP exporters
    function switchToOTLP() {
      const resultDiv = document.getElementById('testResults');
      resultDiv.innerHTML = 'Switching to OTLP exporters...';
      
      fetch('/api/otel/exporters', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'otlp' })
      })
        .then(response => response.json())
        .then(data => {
          resultDiv.innerHTML = JSON.stringify(data, null, 2);
          // Reload page after 2 seconds to show new status
          setTimeout(() => location.reload(), 2000);
        })
        .catch(error => {
          resultDiv.innerHTML = 'Error: ' + error.message;
        });
    }
  </script>
</body>
</html>
  `;
};
