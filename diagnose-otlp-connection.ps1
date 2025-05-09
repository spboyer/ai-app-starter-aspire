# PowerShell script to diagnose OpenTelemetry connection issues

# Function to test connection to a port
function Test-OtlpConnection {
    param (
        [string]$Hostname = "localhost",
        [int]$Port,
        [string]$Description
    )    
    Write-Host "Testing connection to $Description ($($Hostname):$Port)..." -NoNewline
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectionResult = $tcpClient.BeginConnect($Hostname, $Port, $null, $null)
        $waitResult = $connectionResult.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($waitResult -and $tcpClient.Connected) {
            Write-Host " SUCCESS" -ForegroundColor Green
            $tcpClient.Close()
            return $true
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $tcpClient.Close()
            return $false
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        return $false
    }
}

# Function to check environment variables
function Test-OtlpEnvironmentVariables {
    $requiredVars = @(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "OTEL_EXPORTER_OTLP_PROTOCOL",
        "OTEL_SERVICE_NAME"
    )
    
    $optionalVars = @(
        "OTEL_EXPORTER_OTLP_HTTP_ENDPOINT",
        "DOTNET_DASHBOARD_OTLP_ENDPOINT_URL",
        "NODE_TLS_REJECT_UNAUTHORIZED",
        "OTEL_LOG_LEVEL"
    )
    
    Write-Host "`nChecking OpenTelemetry environment variables:"
    
    $missingRequired = $false
    foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            Write-Host "❌ Missing required variable: $var" -ForegroundColor Red
            $missingRequired = $true
        } else {
            Write-Host "✅ $var = $value" -ForegroundColor Green
        }
    }
    
    foreach ($var in $optionalVars) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            Write-Host "⚠️ Optional variable not set: $var" -ForegroundColor Yellow
        } else {
            Write-Host "✅ $var = $value" -ForegroundColor Green
        }
    }
    
    if ($missingRequired) {
        Write-Host "`n⚠️ Some required environment variables are missing. OpenTelemetry may not work correctly." -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ All required environment variables are set." -ForegroundColor Green
    }
}

# Function to check for TLS issues
function Test-TlsConfiguration {
    $tls = [Environment]::GetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED")
    
    Write-Host "`nChecking TLS configuration:"
    
    if ($tls -eq "0") {
        Write-Host "⚠️ TLS certificate validation is disabled (NODE_TLS_REJECT_UNAUTHORIZED=0)." -ForegroundColor Yellow
        Write-Host "   This is acceptable for development but should not be used in production." -ForegroundColor Yellow
    } else {
        Write-Host "ℹ️ TLS certificate validation is enabled." -ForegroundColor Cyan
        
        # Check if using HTTPS without validation
        $otlpEndpoint = [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")
        if ($otlpEndpoint -like "https://*" -and $tls -ne "0") {
            Write-Host "⚠️ Using HTTPS endpoint without disabling certificate validation." -ForegroundColor Yellow
            Write-Host "   This may cause issues with self-signed certificates." -ForegroundColor Yellow
            Write-Host "   Consider setting NODE_TLS_REJECT_UNAUTHORIZED=0 for development." -ForegroundColor Yellow
        }
    }
}

# Function to check Aspire dashboard
function Test-AspireDashboard {
    $dashboardUrl = "http://localhost:18888"
    
    Write-Host "`nChecking Aspire dashboard:"
    
    try {
        $request = [System.Net.WebRequest]::Create($dashboardUrl)
        $request.Timeout = 5000 # 5 seconds timeout
        $response = $request.GetResponse()
        
        if ($response.StatusCode -eq "OK") {
            Write-Host "✅ Aspire dashboard is accessible at $dashboardUrl" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Aspire dashboard returned status code: $($response.StatusCode)" -ForegroundColor Yellow
        }
        
        $response.Close()
    } catch {
        Write-Host "❌ Could not connect to Aspire dashboard at $dashboardUrl" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}

# Function to test HTTP & gRPC endpoints
function Test-OtlpEndpoints {
    Write-Host "`nTesting OpenTelemetry collector endpoints:"
    
    # Get endpoints from environment or use defaults
    $otlpEndpoint = [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") 
    $otlpHttpEndpoint = [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_HTTP_ENDPOINT")
    
    if ([string]::IsNullOrEmpty($otlpEndpoint)) {
        $otlpEndpoint = "http://localhost:4317"
    }
    
    if ([string]::IsNullOrEmpty($otlpHttpEndpoint)) {
        $otlpHttpEndpoint = "http://localhost:18890"
    }
    
    # Extract ports from URLs
    $otlpUrl = New-Object System.Uri($otlpEndpoint)
    $otlpHttpUrl = New-Object System.Uri($otlpHttpEndpoint)
    
    $grpcPort = $otlpUrl.Port
    $httpPort = $otlpHttpUrl.Port
    
    # Test connections
    $grpcSuccess = Test-OtlpConnection -Hostname $otlpUrl.Host -Port $grpcPort -Description "gRPC OTLP endpoint"
    $httpSuccess = Test-OtlpConnection -Hostname $otlpHttpUrl.Host -Port $httpPort -Description "HTTP OTLP endpoint"
    
    if (-not $grpcSuccess -and -not $httpSuccess) {
        Write-Host "`n❌ Could not connect to any OTLP endpoint. Make sure the Aspire AppHost is running." -ForegroundColor Red
    } elseif ($grpcSuccess -and $httpSuccess) {
        Write-Host "`n✅ Successfully connected to both gRPC and HTTP OTLP endpoints." -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ Could only connect to some OTLP endpoints. Check your configuration." -ForegroundColor Yellow
    }
}

# Function to provide recommendations
function Get-OtlpRecommendations {
    $protocol = [Environment]::GetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL")
    
    Write-Host "`nRecommendations:"
    
    # Protocol recommendations
    if ([string]::IsNullOrEmpty($protocol)) {
        Write-Host "1. Set OTEL_EXPORTER_OTLP_PROTOCOL explicitly (grpc or http/protobuf):" -ForegroundColor Cyan
        Write-Host "   $env:OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc' # or 'http/protobuf'" -ForegroundColor Cyan
    } elseif ($protocol -eq "grpc" -or $protocol -eq "http/protobuf") {
        Write-Host "1. Current protocol is $protocol. If you experience issues, try switching:" -ForegroundColor Cyan
        Write-Host "   $env:OTEL_EXPORTER_OTLP_PROTOCOL = '$(if ($protocol -eq "grpc") { "http/protobuf" } else { "grpc" })'" -ForegroundColor Cyan
    }
    
    # TLS recommendations
    $tls = [Environment]::GetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED")
    if ([string]::IsNullOrEmpty($tls) -or $tls -ne "0") {
        Write-Host "2. For development, consider disabling TLS certificate validation:" -ForegroundColor Cyan
        Write-Host "   $env:NODE_TLS_REJECT_UNAUTHORIZED = '0'" -ForegroundColor Cyan
    }
    
    # Logging recommendations
    $logLevel = [Environment]::GetEnvironmentVariable("OTEL_LOG_LEVEL")
    if ([string]::IsNullOrEmpty($logLevel) -or $logLevel -ne "debug") {
        Write-Host "3. Enable debug logging for more detailed error information:" -ForegroundColor Cyan
        Write-Host "   $env:OTEL_LOG_LEVEL = 'debug'" -ForegroundColor Cyan
    }
    
    # General recommendations
    Write-Host "4. Try using the resilient tracing implementation:" -ForegroundColor Cyan
    Write-Host "   .\update-otlp-implementation.ps1 -Implementation resilient" -ForegroundColor Cyan
    
    Write-Host "5. Check the OTLP troubleshooting guide for more detailed steps:" -ForegroundColor Cyan
    Write-Host "   OTLP_TROUBLESHOOTING.md" -ForegroundColor Cyan
}

# Main diagnostic function
function Start-OtlpDiagnostic {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    Write-Host "`n=============== OpenTelemetry Connection Diagnostic ===============`n" -ForegroundColor Cyan
    
    Test-OtlpEnvironmentVariables
    Test-TlsConfiguration
    Test-AspireDashboard
    Test-OtlpEndpoints
    Get-OtlpRecommendations
    
    $stopwatch.Stop()
    
    Write-Host "`n=============== Diagnostic Completed in $($stopwatch.ElapsedMilliseconds) ms ===============`n" -ForegroundColor Cyan
}

# Run the diagnostic
Start-OtlpDiagnostic
