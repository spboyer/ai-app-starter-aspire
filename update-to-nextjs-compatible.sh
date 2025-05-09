#!/bin/bash
# Script to update the OpenTelemetry configuration for Node.js applications to be NextJS-compatible

echo "Updating OpenTelemetry implementation to NextJS-compatible version..."

# Update the main API file to use the NextJS-compatible tracing
sed -i 's/import .\/tracing-[a-zA-Z0-9-]*;/import .\/tracing-nextjs-compatible;/' NodeFortuneApi/src/index.ts
echo "✅ Updated NodeFortuneApi/src/index.ts to use NextJS-compatible tracing"

# Update Vite configuration for the SPA
cat > NodeFortuneSpa/vite-otel-nextjs.js << EOL
// OpenTelemetry initialization for Vite with NextJS compatibility
// This file is imported by vite.config.ts to enable OpenTelemetry for the Node process that runs Vite

// Import NextJS-compatible tracing module
import './tracing-nextjs-compatible.js';

console.log('Vite OTLP setup complete with NextJS-compatible implementation');
EOL
echo "✅ Created NodeFortuneSpa/vite-otel-nextjs.js"

# Update Vite configuration
sed -i "s/import .\/[a-zA-Z0-9-]*;/import .\/vite-otel-nextjs;/" NodeFortuneSpa/vite.config.ts
echo "✅ Updated NodeFortuneSpa/vite.config.ts to use NextJS-compatible setup"

# Update the appsettings.json to include CORS for browser telemetry
grep -q "\"Dashboard\":" ai-app-starter-aspire.AppHost/appsettings.json
if [ $? -eq 0 ]; then
    # Dashboard section already exists, check if Otlp section exists
    grep -q "\"Otlp\":" ai-app-starter-aspire.AppHost/appsettings.json
    if [ $? -eq 0 ]; then
        echo "⚠️ Dashboard/Otlp section already exists in appsettings.json. Please manually verify CORS settings."
    else
        # Try to add Otlp section to existing Dashboard section
        sed -i 's/"Dashboard": {/"Dashboard": {\n    "Otlp": {\n      "Cors": {\n        "AllowedOrigins": "*",\n        "AllowedHeaders": "*"\n      }\n    },/' ai-app-starter-aspire.AppHost/appsettings.json
        echo "✅ Added OTLP CORS settings to existing Dashboard section in appsettings.json"
    fi
else
    # Dashboard section doesn't exist, add it at the end of the file
    sed -i '/{/a\  "Dashboard": {\n    "Otlp": {\n      "Cors": {\n        "AllowedOrigins": "*",\n        "AllowedHeaders": "*"\n      }\n    }\n  },' ai-app-starter-aspire.AppHost/appsettings.json
    echo "✅ Added Dashboard section with OTLP CORS settings to appsettings.json"
fi

echo "✅ OpenTelemetry configuration updated to be NextJS-compatible"
echo "ℹ️ Please see ASPIRE_NEXTJS_OTLP.md for details on the implementation"
