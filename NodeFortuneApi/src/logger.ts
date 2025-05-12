// Error-safe logger implementation that gracefully handles missing OpenTelemetry packages
// This way we can avoid build errors while still having good logging capabilities

// Log levels mapping for convenience
export const LogLevel = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

// Define Logger type for consistent usage
interface Logger {
  debug: (message: string, attributes?: Record<string, any>) => void;
  info: (message: string, attributes?: Record<string, any>) => void;
  warn: (message: string, attributes?: Record<string, any>) => void;
  error: (message: string, attributes?: Record<string, any>) => void;
}

// Initialize a simple logger that works even without OpenTelemetry
const createSimpleLogger = (): Logger => {
  return {
    debug: (message: string, attributes?: Record<string, any>) => {
      console.debug(message, attributes || {});
    },
    info: (message: string, attributes?: Record<string, any>) => {
      console.info(message, attributes || {});
    },
    warn: (message: string, attributes?: Record<string, any>) => {
      console.warn(message, attributes || {});
    },
    error: (message: string, attributes?: Record<string, any>) => {
      console.error(message, attributes || {});
    }
  };
};

// Create logger instance
const logger = createSimpleLogger();

// Export individual methods
export const debug = logger.debug;
export const info = logger.info;
export const warn = logger.warn;
export const error = logger.error;

// Export the entire logger
export default logger;
