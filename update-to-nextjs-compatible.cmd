@echo off
REM Script to update the OpenTelemetry configuration for Node.js applications to be NextJS-compatible

echo Updating OpenTelemetry implementation to NextJS-compatible version...

REM Update the main API file to use the NextJS-compatible tracing
powershell -Command "(Get-Content NodeFortuneApi\src\index.ts) -replace 'import \.\/tracing-[a-zA-Z0-9-]*;', 'import \.\/tracing-nextjs-compatible;' | Set-Content NodeFortuneApi\src\index.ts"
echo ✅ Updated NodeFortuneApi\src\index.ts to use NextJS-compatible tracing

REM Create Vite configuration for the SPA
echo // OpenTelemetry initialization for Vite with NextJS compatibility > NodeFortuneSpa\vite-otel-nextjs.js
echo // This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite >> NodeFortuneSpa\vite-otel-nextjs.js
echo. >> NodeFortuneSpa\vite-otel-nextjs.js
echo // Import NextJS-compatible tracing module >> NodeFortuneSpa\vite-otel-nextjs.js
echo import './tracing-nextjs-compatible.js'; >> NodeFortuneSpa\vite-otel-nextjs.js
echo. >> NodeFortuneSpa\vite-otel-nextjs.js
echo console.log('Vite OTLP setup complete with NextJS-compatible implementation'); >> NodeFortuneSpa\vite-otel-nextjs.js
echo ✅ Created NodeFortuneSpa\vite-otel-nextjs.js

REM Update Vite configuration
powershell -Command "(Get-Content NodeFortuneSpa\vite.config.ts) -replace 'import \.\/[a-zA-Z0-9-]*;', 'import \.\/vite-otel-nextjs;' | Set-Content NodeFortuneSpa\vite.config.ts"
echo ✅ Updated NodeFortuneSpa\vite.config.ts to use NextJS-compatible setup

REM Check if appsettings.json exists
if not exist ai-app-starter-aspire.AppHost\appsettings.json (
    echo {"Dashboard": {"Otlp": {"Cors": {"AllowedOrigins": "*", "AllowedHeaders": "*"}}}} > ai-app-starter-aspire.AppHost\appsettings.json
    echo ✅ Created appsettings.json with OTLP CORS settings
    goto :end_appsettings
)

REM Check if Dashboard section exists in appsettings.json
powershell -Command "if ((Get-Content ai-app-starter-aspire.AppHost\appsettings.json | Select-String '\"Dashboard\":') -ne $null) { exit 0 } else { exit 1 }"
if %ERRORLEVEL% EQU 0 (
    REM Dashboard section exists, check if Otlp section exists
    powershell -Command "if ((Get-Content ai-app-starter-aspire.AppHost\appsettings.json | Select-String '\"Otlp\":') -ne $null) { exit 0 } else { exit 1 }"
    if %ERRORLEVEL% EQU 0 (
        echo ⚠️ Dashboard/Otlp section already exists in appsettings.json. Please manually verify CORS settings.
    ) else (
        REM Add Otlp section to existing Dashboard section
        powershell -Command "(Get-Content ai-app-starter-aspire.AppHost\appsettings.json) -replace '\"Dashboard\": {', '\"Dashboard\": {\r\n    \"Otlp\": {\r\n      \"Cors\": {\r\n        \"AllowedOrigins\": \"*\",\r\n        \"AllowedHeaders\": \"*\"\r\n      }\r\n    },' | Set-Content ai-app-starter-aspire.AppHost\appsettings.json"
        echo ✅ Added OTLP CORS settings to existing Dashboard section in appsettings.json
    )
) else (
    REM Dashboard section doesn't exist, add it to the file
    powershell -Command "(Get-Content ai-app-starter-aspire.AppHost\appsettings.json) -replace '{', '{\r\n  \"Dashboard\": {\r\n    \"Otlp\": {\r\n      \"Cors\": {\r\n        \"AllowedOrigins\": \"*\",\r\n        \"AllowedHeaders\": \"*\"\r\n      }\r\n    }\r\n  },' | Set-Content ai-app-starter-aspire.AppHost\appsettings.json"
    echo ✅ Added Dashboard section with OTLP CORS settings to appsettings.json
)

:end_appsettings
echo ✅ OpenTelemetry configuration updated to be NextJS-compatible
echo ℹ️ Please see ASPIRE_NEXTJS_OTLP.md for details on the implementation
