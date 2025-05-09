# Test script for checking OTLP ports

Write-Host "Testing OTLP ports..."

# Test HTTP OTLP port (18890)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 18890 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ HTTP OTLP port 18890 is OPEN"
    } else {
        Write-Host "❌ HTTP OTLP port 18890 is CLOSED"
    }
} catch {
    Write-Host "❌ HTTP OTLP port 18890 is CLOSED or error occurred: $_"
}

# Test gRPC OTLP port (4317)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 4317 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ gRPC OTLP port 4317 is OPEN"
    } else {
        Write-Host "❌ gRPC OTLP port 4317 is CLOSED"
    }
} catch {
    Write-Host "❌ gRPC OTLP port 4317 is CLOSED or error occurred: $_"
}

# Test dashboard port (15089)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 15089 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ Aspire Dashboard port 15089 is OPEN"
    } else {
        Write-Host "❌ Aspire Dashboard port 15089 is CLOSED"
    }
} catch {
    Write-Host "❌ Aspire Dashboard port 15089 is CLOSED or error occurred: $_"
}

# Test NodeFortuneApi port (4000)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 4000 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ NodeFortuneApi port 4000 is OPEN"
    } else {
        Write-Host "❌ NodeFortuneApi port 4000 is CLOSED"
    }
} catch {
    Write-Host "❌ NodeFortuneApi port 4000 is CLOSED or error occurred: $_"
}

# Test NodeFortuneSpa port (3000)
try {
    $result = Test-NetConnection -ComputerName localhost -Port 3000 -ErrorAction Stop -InformationLevel Quiet
    if ($result) {
        Write-Host "✅ NodeFortuneSpa port 3000 is OPEN"
    } else {
        Write-Host "❌ NodeFortuneSpa port 3000 is CLOSED"
    }
} catch {
    Write-Host "❌ NodeFortuneSpa port 3000 is CLOSED or error occurred: $_"
}

Write-Host "Port testing complete."
