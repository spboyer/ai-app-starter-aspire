// OpenTelemetry initialization for Vite
// This file is a safe wrapper for Vite that avoids Node.js specific imports

// Check if we're in a Node.js environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    // Only dynamically import the tracing module in a Node.js environment
    // Use the ESM-compatible version that handles http2 import safely
    import('./tracing-http2-enhanced-esm.js')
      .then(() => {
        console.log('✅ OpenTelemetry setup complete using ESM-compatible implementation');
      })
      .catch(err => {
        console.error('❌ Error initializing OpenTelemetry:', err);
        
        // Fallback to the resilient implementation if ESM version fails
        import('./tracing-resilient.js')
          .then(() => {
            console.log('✅ OpenTelemetry setup complete using fallback resilient implementation');
          })
          .catch(err => {
            console.error('❌ Error initializing fallback OpenTelemetry:', err);
            // Continue without OpenTelemetry
          });
      });
  } catch (err) {
    console.error('❌ Failed to import OpenTelemetry:', err);
    // Continue without OpenTelemetry
  }
} else {
  console.log('Skipping OpenTelemetry setup in non-Node.js environment');
}
