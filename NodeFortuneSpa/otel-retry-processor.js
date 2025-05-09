// OpenTelemetry custom retry processor for handling network errors in Node.js SPA
// This is a JavaScript implementation that works without TypeScript

class SimpleRetryProcessor {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',    // Connection reset by peer
      'ETIMEDOUT',     // Operation timed out
      'ECONNREFUSED',  // Connection refused
      'EHOSTUNREACH',  // No route to host
      'ENETUNREACH',   // Network is unreachable
      'socket hang up' // Socket hang up error
    ];
    this.retryAttempts = new Map();
  }
  
  /**
   * Wraps an exporter with retry logic
   * @param {Object} exporter - The OpenTelemetry exporter to wrap
   * @returns {Object} - The wrapped exporter with retry capability
   */
  wrapExporter(exporter) {
    // Store the original export function
    const originalExport = exporter.export.bind(exporter);
    const self = this;
    
    // Replace with our retry-capable version
    exporter.export = function(objects, resultCallback) {
      // Generate a unique batch ID
      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      let currentAttempt = 0;
      
      const attemptExport = () => {
        currentAttempt++;
        console.log(`Export attempt ${currentAttempt} for batch ${batchId}`);
        
        originalExport(objects, (result) => {
          // If export failed with a retryable error, attempt again
          if (result.code !== 0 && currentAttempt <= self.maxRetries) {
            const error = result.error || new Error('Unknown export error');
            const isRetryable = self.isRetryableError(error);
            
            if (isRetryable) {
              console.warn(`Export attempt ${currentAttempt} failed with retryable error: ${error.message}`);
              console.warn(`Retrying in ${self.retryDelayMs}ms (attempt ${currentAttempt} of ${self.maxRetries})...`);
              
              setTimeout(() => attemptExport(), self.retryDelayMs);
              return;
            }
          }
          
          // Either success, max retries reached, or non-retryable error
          if (result.code !== 0) {
            console.error(`Export failed after ${currentAttempt} attempts: ${result.error?.message || 'Unknown error'}`);
          } else if (currentAttempt > 1) {
            console.log(`Export succeeded after ${currentAttempt} attempts`);
          }
          
          resultCallback(result);
        });
      };
      
      // Start the export process
      attemptExport();
    };
    
    return exporter;
  }
  
  /**
   * Determines if an error is retryable based on its message or code
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;
    
    // Check error message
    if (error.message) {
      for (const retryableError of this.retryableErrors) {
        if (error.message.includes(retryableError)) {
          return true;
        }
      }
    }
    
    // Check error code
    if (error.code) {
      for (const retryableError of this.retryableErrors) {
        if (error.code === retryableError) {
          return true;
        }
      }
    }
    
    // Additional checks for common connection issues
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'EHOSTUNREACH' ||
        error.code === 'ENETUNREACH') {
      return true;
    }
    
    return false;
  }
}

module.exports = { SimpleRetryProcessor };
