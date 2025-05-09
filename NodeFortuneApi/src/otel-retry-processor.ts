// OpenTelemetry custom retry processor for handling network errors
import { BatchSpanProcessor, SpanExporter } from '@opentelemetry/sdk-trace-base';

/**
 * Interface for the CustomRetryProcessor options
 */
interface CustomRetryProcessorOptions {
  exporter: SpanExporter; // Exporter should be passed in options
  maxRetries: number;
  retryDelayMs: number;
  retryableErrors: string[];
}

/**
 * A custom span processor that adds retry capability for network-related errors
 * such as socket hang-ups and connection resets.
 */
export class CustomRetryProcessor extends BatchSpanProcessor {
  private maxRetries: number;
  private retryDelayMs: number;
  private retryableErrors: string[];
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Creates a new CustomRetryProcessor
   * @param options Options for configuring the retry behavior
   */
  constructor(options: CustomRetryProcessorOptions) {
    // Wrap the exporter before passing it to the super constructor
    const wrappedExporter = CustomRetryProcessor.wrapExporter(options.exporter, options.maxRetries, options.retryDelayMs, options.retryableErrors);
    super(wrappedExporter); // Pass the wrapped exporter to BatchSpanProcessor
    this.maxRetries = options.maxRetries;
    this.retryDelayMs = options.retryDelayMs;
    this.retryableErrors = options.retryableErrors;
  }

  /**
   * Static method to wrap an exporter with retry logic.
   * This is made static so it can be called in the constructor before super().
   */
  private static wrapExporter(
    exporter: SpanExporter,
    maxRetries: number,
    retryDelayMs: number,
    retryableErrors: string[]
  ): SpanExporter {
    const originalExport = exporter.export.bind(exporter);
    const retryAttempts: Map<string, number> = new Map();

    const newExporter: SpanExporter = {
      export: async (spans, resultCallback) => {
        let currentAttempt = 0;
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        retryAttempts.set(batchId, 0);

        const exportWithRetry = async (): Promise<void> => {
          try {
            await new Promise<void>((resolve, reject) => {
              originalExport(spans, (result) => { // Use originalExport here
                if (result.code === 0) { // ExportResultCode.SUCCESS
                  resolve();
                } else {
                  reject(new Error(`Export failed with code ${result.code}: ${result.error?.message || 'Unknown error'}`));
                }
              });
            });
            // Export succeeded, return success to the original callback
            resultCallback({ code: 0 }); // ExportResultCode.SUCCESS
          } catch (error: any) { // Explicitly type error as any or unknown then check
            currentAttempt++;
            retryAttempts.set(batchId, currentAttempt);
            
            // Check if the error is retryable
            const isRetryable = CustomRetryProcessor.isRetryableError(error, retryableErrors);
            const shouldRetry = isRetryable && currentAttempt <= maxRetries;
            
            console.warn(`Export attempt ${currentAttempt} failed: ${error.message}`);
            console.warn(`Error type: ${error.code || 'unknown'}, Retryable: ${isRetryable}, Will retry: ${shouldRetry}`);
            
            if (shouldRetry) {
              // Wait before retrying
              console.log(`Retrying in ${retryDelayMs}ms (attempt ${currentAttempt} of ${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, retryDelayMs));
              return exportWithRetry();
            } else {
              // Max retries reached or non-retryable error
              console.error(`Export failed after ${currentAttempt} attempts: ${error.message}`);
              resultCallback({ code: 1, error: error as Error }); // ExportResultCode.FAILED, cast error
            }
          }
        };

        // Start the retry process
        await exportWithRetry();
      },
      shutdown: exporter.shutdown.bind(exporter), // Ensure shutdown is also bound
    };
    return newExporter;
  }

  /**
   * Determines if an error is retryable based on its message or code
   */
  private static isRetryableError(error: any, retryableErrorMessages: string[]): boolean {
    if (!error) return false;
    
    // Check error message
    if (error.message) {
      for (const retryableError of retryableErrorMessages) {
        if (error.message.includes(retryableError)) {
          return true;
        }
      }
    }
    
    // Check error code
    if (error.code) {
      for (const retryableError of retryableErrorMessages) {
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

  /**
   * Generates a unique ID for a batch of spans
   */
  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
