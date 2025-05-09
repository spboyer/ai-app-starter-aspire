# Comprehensive fix script for OpenTelemetry in Node.js services with Aspire integration
# This script fixes the ECONNREFUSED issues by configuring services to use only gRPC

Write-Host "🛠️ Applying comprehensive OpenTelemetry fixes to Node.js services..." -ForegroundColor Cyan

function Update-TraceConfig {
    param (
        [string]$filePath,
        [string]$fileType
    )

    if (Test-Path $filePath) {
        Write-Host "📝 Updating $filePath..." -ForegroundColor Yellow
        
        # Read the file content
        $content = Get-Content -Path $filePath -Raw
        
        # Fix 1: Remove HTTP session creation
        if ($fileType -eq "js") {
            $httpSessionPattern = '// Create HTTP/2 sessions[\s\S]*?let http2HttpSession = null;[\s\S]*?// Establish HTTP/2 session for HTTP protocol[\s\S]*?try \{[\s\S]*?http2HttpSession = http2\.connect[\s\S]*?HTTP/2 session for HTTP protocol closed[\s\S]*?\}\)'
            $httpSessionReplacement = '// Create HTTP/2 sessions for more efficient connections
let http2GrpcSession = null;

// Skip creating HTTP session since we''re only using gRPC
console.log(''ℹ️ Skipping HTTP/2 session for HTTP protocol since only gRPC is used'');'
            
            $content = $content -replace $httpSessionPattern, $httpSessionReplacement
        }
        elseif ($fileType -eq "ts") {
            $httpSessionPattern = '// Create HTTP/2 sessions[\s\S]*?let http2HttpSession: http2\.ClientHttp2Session \| null = null;[\s\S]*?// Establish HTTP/2 session for HTTP protocol[\s\S]*?try \{[\s\S]*?http2HttpSession = http2\.connect[\s\S]*?HTTP/2 session for HTTP protocol closed[\s\S]*?\}\)'
            $httpSessionReplacement = '// Create HTTP/2 sessions for more efficient connections
let http2GrpcSession: http2.ClientHttp2Session | null = null;

// Skip creating HTTP session since we''re only using gRPC
console.log(''ℹ️ Skipping HTTP/2 session for HTTP protocol since only gRPC is used'');'
            
            $content = $content -replace $httpSessionPattern, $httpSessionReplacement
        }
        
        # Fix 2: Update exporter configuration
        if ($fileType -eq "js") {
            $exporterPattern = '// Configure exporters[\s\S]*?// Use gRPC protocol[\s\S]*?traceExporter = new OTLPTraceExporter\(\{[\s\S]*?url: `\$\{otlpGrpcEndpoint\}`[\s\S]*?concurrencyLimit: 10[\s\S]*?\}\);[\s\S]*?metricExporter = new OTLPMetricExporter\(\{[\s\S]*?url: `\$\{otlpGrpcEndpoint\}`[\s\S]*?concurrencyLimit: 10[\s\S]*?\}\);'
            $exporterReplacement = '// Configure exporters based on protocol settings
let traceExporter, metricExporter;

// Use gRPC protocol for both trace and metrics
console.log(''🔵 Using gRPC protocol for telemetry via port 4317'');

traceExporter = new OTLPTraceExporter({
  url: `${otlpGrpcEndpoint}/v1/traces`,  // Add the path component 
  headers: {
    ''Content-Type'': ''application/x-protobuf'' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});

metricExporter = new OTLPMetricExporter({
  url: `${otlpGrpcEndpoint}/v1/metrics`,  // Add the path component
  headers: {
    ''Content-Type'': ''application/x-protobuf'' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});'
            
            $content = $content -replace $exporterPattern, $exporterReplacement
        }
        elseif ($fileType -eq "ts") {
            $exporterPattern = '// Configure exporters[\s\S]*?// Use gRPC protocol[\s\S]*?// Configure trace exporter[\s\S]*?traceExporter = new OTLPTraceExporter\(\{[\s\S]*?url: `\$\{otlpGrpcEndpoint\}`[\s\S]*?concurrencyLimit: 10,[\s\S]*?protocol: .gRPC.[\s\S]*?\}\);[\s\S]*?// Configure metric exporter[\s\S]*?metricExporter = new OTLPMetricExporter\(\{[\s\S]*?url: `\$\{otlpGrpcEndpoint\}`[\s\S]*?concurrencyLimit: 10,[\s\S]*?protocol: .gRPC.[\s\S]*?\}\);'
            $exporterReplacement = '// Configure exporters based on protocol settings
let traceExporter, metricExporter;

// Use gRPC protocol for both trace and metrics
console.log(''🔵 Using gRPC protocol for telemetry via port 4317'');

traceExporter = new OTLPTraceExporter({
  url: `${otlpGrpcEndpoint}/v1/traces`,  // Add the path component
  headers: {
    ''Content-Type'': ''application/x-protobuf'' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});

metricExporter = new OTLPMetricExporter({
  url: `${otlpGrpcEndpoint}/v1/metrics`,  // Add the path component
  headers: {
    ''Content-Type'': ''application/x-protobuf'' // Specify the correct content type for gRPC
  },
  timeoutMillis: 30000,
  concurrencyLimit: 10
});'
            
            $content = $content -replace $exporterPattern, $exporterReplacement
        }
        
        # Fix 3: Update the HTTP connection test
        if ($fileType -eq "js") {
            $httpTestPattern = '// Verify OTLP connections[\s\S]*?setTimeout\(async \(\) => \{[\s\S]*?// Test the HTTP protocol connection[\s\S]*?try \{[\s\S]*?if \(http2HttpSession[\s\S]*?`\);[\s\S]*?\} catch \(err\) \{[\s\S]*?\}'
            $httpTestReplacement = '  // Verify OTLP connections - Azure recommends validating connections
  setTimeout(async () => {
    // Skip HTTP protocol connection test since we''re only using gRPC
    console.log(''ℹ️ Skipping HTTP OTLP collector connection test since only gRPC is used'');'
            
            $content = $content -replace $httpTestPattern, $httpTestReplacement
        }
        elseif ($fileType -eq "ts") {
            $httpTestPattern = '// Verify OTLP connections[\s\S]*?setTimeout\(async \(\) => \{[\s\S]*?// Test the HTTP protocol connection[\s\S]*?try \{[\s\S]*?if \(http2HttpSession[\s\S]*?`\);[\s\S]*?\} catch \(err: any\) \{[\s\S]*?\}'
            $httpTestReplacement = '  // Verify OTLP connections - Azure recommends validating connections
  setTimeout(async () => {
    // Skip HTTP protocol connection test since we''re only using gRPC
    console.log(''ℹ️ Skipping HTTP OTLP collector connection test since only gRPC is used'');'
            
            $content = $content -replace $httpTestPattern, $httpTestReplacement
        }
        
        # Fix 4: Update the shutdown function
        if ($fileType -eq "js") {
            $shutdownPattern = 'function shutdown\(\) \{[\s\S]*?// Close HTTP/2 sessions[\s\S]*?if \(http2HttpSession[\s\S]*?HTTP/2 session for HTTP protocol closed[\s\S]*?\}'
            $shutdownReplacement = 'function shutdown() {
  console.log(''📕 Shutting down OpenTelemetry connections...'');

  // Close HTTP/2 session for gRPC
  if (http2GrpcSession && !http2GrpcSession.destroyed) {
    try {
      http2GrpcSession.close();
      console.log(''✅ HTTP/2 session for gRPC protocol closed'');
    } catch (err) {
      console.error(''❌ Error closing HTTP/2 session for gRPC protocol:'', err);
    }
  }'
            
            $content = $content -replace $shutdownPattern, $shutdownReplacement
        }
        elseif ($fileType -eq "ts") {
            $shutdownPattern = 'function shutdown\(\): void \{[\s\S]*?// Close HTTP/2 sessions[\s\S]*?if \(http2HttpSession[\s\S]*?HTTP/2 session for HTTP protocol closed[\s\S]*?\}'
            $shutdownReplacement = 'function shutdown(): void {
  console.log(''📕 Shutting down OpenTelemetry connections...'');

  // Close HTTP/2 session for gRPC
  if (http2GrpcSession && !http2GrpcSession.destroyed) {
    try {
      http2GrpcSession.close();
      console.log(''✅ HTTP/2 session for gRPC protocol closed'');
    } catch (err: any) {
      console.error(''❌ Error closing HTTP/2 session for gRPC protocol:'', err);
    }
  }'
            
            $content = $content -replace $shutdownPattern, $shutdownReplacement
        }
        
        # Save the updated content back to the file
        Set-Content -Path $filePath -Value $content
        
        Write-Host "✅ Successfully updated $filePath" -ForegroundColor Green
    }
    else {
        Write-Host "❌ File not found: $filePath" -ForegroundColor Red
    }
}

# Update NodeFortuneApi tracing
$apiTracingPath = "c:\github\ai-app-starter-aspire\NodeFortuneApi\src\tracing-http2-enhanced.ts"
Update-TraceConfig -filePath $apiTracingPath -fileType "ts"

# Update NodeFortuneSpa tracing
$spaTracingPath = "c:\github\ai-app-starter-aspire\NodeFortuneSpa\tracing-http2-enhanced.js"
Update-TraceConfig -filePath $spaTracingPath -fileType "js"

# Verify configuration in Program.cs
$programCsPath = "c:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost\Program.cs"
if (Test-Path $programCsPath) {
    Write-Host "📝 Checking Aspire AppHost Program.cs configuration..." -ForegroundColor Yellow
    
    $programCs = Get-Content -Path $programCsPath -Raw
    if ($programCs -match "OTEL_EXPORTER_OTLP_PROTOCOL.*grpc" -and 
        $programCs -match "OTEL_EXPORTER_OTLP_ENDPOINT.*http://127.0.0.1:4317" -and
        $programCs -match "OTEL_EXPORTER_OTLP_INSECURE.*true") {
        Write-Host "✅ Environment variables in Program.cs are correctly configured" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ Some environment variables in Program.cs may need updating" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 Comprehensive OpenTelemetry fixes have been applied!" -ForegroundColor Green
Write-Host "Please restart your Aspire application to apply these changes." -ForegroundColor Cyan
Write-Host "You can use the 'verify-enhanced-otlp.ps1' script to validate the connection." -ForegroundColor Cyan
