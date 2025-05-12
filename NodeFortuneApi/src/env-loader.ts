/**
 * Utility to load OTEL environment variables from .otelenv file
 * This ensures configuration is consistent between runs
 */
import fs from 'fs';
import path from 'path';

/**
 * Process Aspire placeholder values in environment variables
 * This is needed because Aspire sets placeholder values like {aspire.tracing.otlp.endpoint}
 * that need to be replaced with appropriate defaults when running outside Aspire
 */
function processAspirePlaceholders(): void {
  // Create a map of placeholders to default values
  const placeholderDefaults: Record<string, Record<string, string>> = {
    'OTEL_EXPORTER_OTLP_ENDPOINT': {
      '{aspire.tracing.otlp.endpoint}': 'http://localhost:4318'
    }
  };
    // Process all environment variables
  Object.keys(process.env).forEach(key => {
    const value = process.env[key];
    if (!value) return;
    
    // Check if this is a variable we should process
    if (placeholderDefaults[key]) {
      const placeholders = placeholderDefaults[key];
      
      // Check for each possible placeholder
      for (const placeholder of Object.keys(placeholders)) {
        if (value.includes(placeholder)) {
          // Replace with default value
          const defaultValue = placeholders[placeholder];
          process.env[key] = defaultValue;
          console.log(`Replaced Aspire placeholder in ${key} with default: ${defaultValue}`);
          break;
        }
      }
    }
  });
}

// Load .otelenv file if it exists
export function loadOtelEnv(): void {
  try {
    // Process any existing environment variables with Aspire placeholders
    processAspirePlaceholders();
    
    // Try to locate the .otelenv file (using CommonJS module resolution)
    const envFilePath = path.resolve(__dirname, '../.otelenv');
    
    if (fs.existsSync(envFilePath)) {
      console.log(`Loading OTEL configuration from ${envFilePath}`);
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      
      // Parse each line and set environment variables
      envContent.split('\n').forEach(line => {
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;
        
        // Parse key=value pairs
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          // Remove quotes if present
          let value = match[2] || '';
          value = value.replace(/(^['"]|['"]$)/g, '');
            // Only set if not already set in environment
          if (!process.env[key]) {
            // Handle Aspire placeholders in configuration values
            if (value.includes('{aspire.') && value.includes('}')) {              // Only replace placeholder if needed
              if (key === 'OTEL_EXPORTER_OTLP_ENDPOINT') {
                // Check if environment variable is already provided by Aspire
                if (process.env[key] && !process.env[key].includes('{aspire.')) {
                  console.log(`Using Aspire-provided OTLP endpoint: ${process.env[key]}`);
                  // Keep using the environment value, don't override
                  return;
                } else {
                  // Use default only if Aspire didn't provide a valid endpoint
                  value = 'http://localhost:4318';
                  console.log(`Replaced Aspire placeholder in ${key} with default: ${value}`);
                }
              }
            }
            process.env[key] = value;
            console.log(`Set ${key}=${value}`);
          }
        }
      });
      
      console.log('OTEL environment variables loaded successfully');
    } else {
      console.log('.otelenv file not found, using defaults');
    }
  } catch (error) {
    console.error('Error loading .otelenv file:', error);
  }
}
