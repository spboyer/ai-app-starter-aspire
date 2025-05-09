# Check logs for specific ECONNREFUSED errors

Write-Host "Checking for ECONNREFUSED errors in logs..."

# Define the error pattern to search for
$errorPattern = "ECONNREFUSED.*18890"

# Define the paths to search - Aspire puts logs in different locations depending on configuration
$possibleLogPaths = @(
    # Standard Aspire logs location
    (Join-Path $env:TEMP "aspire-logs"),
    # Container logs location 
    (Join-Path $env:TEMP "container-logs"),
    # Project directory logs
    (Join-Path (Get-Location) "logs"),
    # User's temp directory
    $env:TEMP
)

# Find log files for both services
$apiLogFiles = @()
$spaLogFiles = @()

foreach ($path in $possibleLogPaths) {
    if (Test-Path $path) {
        # Look for API logs
        $apiLogFiles += Get-ChildItem -Path $path -Recurse -File | Where-Object { $_.Name -like "*fortuneapi*" -or $_.Name -like "*nodefortuneapi*" }
        
        # Look for SPA logs
        $spaLogFiles += Get-ChildItem -Path $path -Recurse -File | Where-Object { $_.Name -like "*fortunespa*" -or $_.Name -like "*nodefortunespa*" }
    }
}

Write-Host "Found $($apiLogFiles.Count) log files for NodeFortuneApi"
Write-Host "Found $($spaLogFiles.Count) log files for NodeFortuneSpa"

# Function to check a log file for errors
function Check-LogFile {
    param(
        [string]$LogFilePath,
        [string]$ServiceName,
        [string]$Pattern
    )
    
    Write-Host "Checking $ServiceName logs at $LogFilePath..."
    
    if (Test-Path $LogFilePath) {
        $errors = Select-String -Path $LogFilePath -Pattern $Pattern
        
        if ($errors.Count -gt 0) {
            Write-Host "❌ Found $($errors.Count) ECONNREFUSED errors in $ServiceName logs!" -ForegroundColor Red
            foreach ($error in $errors) {
                Write-Host "  Line $($error.LineNumber): $($error.Line.Trim())" -ForegroundColor Red
            }
        } else {
            Write-Host "✅ No ECONNREFUSED errors found in $ServiceName logs!" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ Log file for $ServiceName not found at $LogFilePath" -ForegroundColor Yellow
    }
}

# Check API logs
if ($apiLogFiles.Count -gt 0) {
    foreach ($logFile in $apiLogFiles) {
        Check-LogFile -LogFilePath $logFile.FullName -ServiceName "NodeFortuneApi" -Pattern $errorPattern
    }
} else {
    Write-Host "⚠️ No log files found for NodeFortuneApi" -ForegroundColor Yellow
}

# Check SPA logs
if ($spaLogFiles.Count -gt 0) {
    foreach ($logFile in $spaLogFiles) {
        Check-LogFile -LogFilePath $logFile.FullName -ServiceName "NodeFortuneSpa" -Pattern $errorPattern
    }
} else {
    Write-Host "⚠️ No log files found for NodeFortuneSpa" -ForegroundColor Yellow
}

Write-Host "Log check complete."
