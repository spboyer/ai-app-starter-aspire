#!/usr/bin/env pwsh
# Fix OTLP Connectivity in Aspire Node.js Applications

# Function to write timestamps for log messages
function Write-TimeLog($message, $color = "White") {
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $message" -ForegroundColor $color
}

# Step 1: Check if Aspire Dashboard is running
Write-TimeLog "Checking for Aspire Dashboard process..." "Cyan"
$aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue

if (-not $aspireProcess) {
    Write-TimeLog "No Aspire Dashboard process found. Starting AppHost project..." "Yellow"
    
    # Start AppHost project in a separate window
    Start-Process -FilePath "dotnet" -ArgumentList "run --project C:\github\ai-app-starter-aspire\ai-app-starter-aspire.AppHost"
    
    # Wait for the process to start
    Write-TimeLog "Waiting for Aspire Dashboard to start (30 seconds)..." "Yellow"
    Start-Sleep -Seconds 10
    
    # Check again for the process
    $attempts = 0
    while (($attempts -lt 5) -and (-not $aspireProcess)) {
        $aspireProcess = Get-Process -Name "Aspire.Dashboard" -ErrorAction SilentlyContinue
        if (-not $aspireProcess) {
            Write-TimeLog "Still waiting for Aspire Dashboard to start..." "Yellow"
            Start-Sleep -Seconds 5
            $attempts++
        }
    }
}

# Step 2: Check OTLP endpoint
if ($aspireProcess) {
    Write-TimeLog "Aspire Dashboard is running (PID: $($aspireProcess.Id))" "Green"
    
    # Look for OTLP endpoint in environment variable
    $otlpEndpoint = $env:DOTNET_DASHBOARD_OTLP_ENDPOINT_URL
    
    if (-not $otlpEndpoint) {
        # Try to detect ports used by Aspire
        Write-TimeLog "Looking for OTLP endpoint port..." "Yellow"
        
        $netstat = netstat -ano | findstr $aspireProcess.Id
        Write-TimeLog "Found these network connections for Aspire:" "Gray"
        Write-Host $netstat -ForegroundColor Gray
        
        # Extract ports from netstat
        $ports = $netstat | ForEach-Object {
            if ($_ -match ".*TCP\s+.*?:(\d+)\s+.*") {
                $matches[1]
            }
        } | Sort-Object -Unique
        
        # Based on our analysis, the most likely OTLP port is 21035
        if ($ports -contains "21035") {
            $otlpEndpoint = "http://localhost:21035"
            Write-TimeLog "Using OTLP endpoint: $otlpEndpoint" "Green"
        } elseif ($ports) {
            # Get the first port and use it as a basis
            $basePort = $ports[0]
            
            # Try the base port
            $otlpEndpoint = "http://localhost:$basePort"
            Write-TimeLog "Using detected port as OTLP endpoint: $otlpEndpoint" "Yellow"
            
            # Also suggest dashboard port + 1000 which is a common pattern
            $otlpPortAlt = [int]$basePort + 1000
            Write-TimeLog "Alternative endpoint to try: http://localhost:$otlpPortAlt" "Yellow"
        } else {
            $otlpEndpoint = "http://localhost:4317"
            Write-TimeLog "Using default OTLP endpoint: $otlpEndpoint" "Yellow"
        }
    } else {
        Write-TimeLog "Found OTLP endpoint in environment: $otlpEndpoint" "Green"
    }
    
    # Step 3: Update .otelenv file with the correct endpoint
    $otelenvPath = "C:\github\ai-app-starter-aspire\NodeFortuneApi\.otelenv"
    if (Test-Path $otelenvPath) {
        Write-TimeLog "Updating .otelenv file with OTLP endpoint..." "Cyan"
        
        $content = Get-Content -Path $otelenvPath -Raw
          # Check if the OTEL_EXPORTER_OTLP_ENDPOINT variable is commented out or exists
        if ($content -match '#\s*OTEL_EXPORTER_OTLP_ENDPOINT=') {
            $content = $content -replace '#\s*OTEL_EXPORTER_OTLP_ENDPOINT=.*', "OTEL_EXPORTER_OTLP_ENDPOINT=$otlpEndpoint"
        } elseif ($content -match 'OTEL_EXPORTER_OTLP_ENDPOINT=') {
            $content = $content -replace 'OTEL_EXPORTER_OTLP_ENDPOINT=.*', "OTEL_EXPORTER_OTLP_ENDPOINT=$otlpEndpoint"
        } else {
            # Add it if it doesn't exist
            $content += "`nOTEL_EXPORTER_OTLP_ENDPOINT=$otlpEndpoint`n"
        }
        
        # Add certificate validation settings for HTTPS
        if ($otlpEndpoint -match "^https://") {
            Write-TimeLog "HTTPS endpoint detected, adding certificate validation settings..." "Yellow"
            
            if ($content -match 'NODE_TLS_REJECT_UNAUTHORIZED=') {
                $content = $content -replace 'NODE_TLS_REJECT_UNAUTHORIZED=.*', "NODE_TLS_REJECT_UNAUTHORIZED=0"
            } else {
                $content += "`n# SSL/TLS configuration - disable certificate validation for self-signed certs`nNODE_TLS_REJECT_UNAUTHORIZED=0`n"
            }
        }
        
        # Write the updated content back to the file
        Set-Content -Path $otelenvPath -Value $content
        
        Write-TimeLog "✅ Successfully updated .otelenv with OTLP endpoint: $otlpEndpoint" "Green"
    } else {
        Write-TimeLog "❌ Could not find .otelenv file at $otelenvPath" "Red"
    }
    
    # Step 4: Test connectivity to the OTLP endpoint
    Write-TimeLog "Testing connectivity to OTLP endpoint..." "Cyan"
    
    $uri = [System.Uri]$otlpEndpoint
    $hostname = $uri.Host
    $port = $uri.Port
    
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $connection = $client.BeginConnect($hostname, $port, $null, $null)
        $wait = $connection.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($wait -and $client.Connected) {
            Write-TimeLog "✅ Successfully connected to OTLP endpoint: $otlpEndpoint" "Green"
            $client.Close()
        } else {
            Write-TimeLog "❌ Failed to connect to OTLP endpoint: $otlpEndpoint" "Red"
            if ($client.Connected) { $client.Close() }
        }
    } catch {
        $errorMessage = $_.Exception.Message
        Write-TimeLog "❌ Error connecting to OTLP endpoint" "Red"
        Write-TimeLog "   Error details: $errorMessage" "Red"
    }
    
    # Step 5: Start the Node.js application
    Write-TimeLog "Do you want to start the Node.js application now? (y/n)" "Cyan"
    $startNode = Read-Host
    
    if ($startNode -eq "y") {
        Write-TimeLog "Starting Node.js application..." "Green"
        Set-Location -Path "C:\github\ai-app-starter-aspire\NodeFortuneApi"
        npm run dev
    } else {
        Write-TimeLog "Configuration complete! You can now start your Node.js application manually." "Green"
    }
} else {
    Write-TimeLog "❌ Failed to start or locate the Aspire Dashboard process." "Red"
}
