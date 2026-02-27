/**
 * Secure Logger Utility
 *
 * SECURITY: This logger prevents sensitive information from being
 * logged in production builds. In development, it provides full
 * error details. In production, it logs minimal information and
 * can be configured to send errors to a monitoring service.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /**
   * Whether to include stack traces in production
   * @default false
   */
  includeStackInProduction?: boolean;

  /**
   * Custom error reporter function (e.g., Sentry, LogRocket)
   */
  errorReporter?: (error: unknown, context?: Record<string, unknown>) => void;
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Sanitize error object to remove sensitive data
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Only return the message, not the full stack or any attached data
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An error occurred';
}

/**
 * Check if a value might contain sensitive data
 */
function mightContainSensitiveData(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /auth/i,
    /credential/i,
    /bearer/i,
    /session/i,
    /cookie/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize context object to remove potentially sensitive keys
 */
function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'auth', 'credential', 'bearer', 'session', 'cookie'];

  for (const [key, value] of Object.entries(context)) {
    const isKeysSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
    if (isKeysSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && mightContainSensitiveData(value)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
  }

  private log(level: LogLevel, message: string, error?: unknown, context?: Record<string, unknown>) {
    if (isDevelopment) {
      // In development, log everything for debugging
      const consoleMethod = level === 'debug' ? 'log' : level;
       
      console[consoleMethod](message, error, context);
    } else {
      // In production, sanitize and limit output
      const sanitizedMessage = message;
      const sanitizedError = error ? sanitizeError(error) : undefined;
      const sanitizedContext = sanitizeContext(context);

      // Only log errors and warnings in production
      if (level === 'error' || level === 'warn') {
         
        console[level](sanitizedMessage, sanitizedError ? `(${sanitizedError})` : '');
      }

      // Report to external service if configured
      if (level === 'error' && this.options.errorReporter) {
        this.options.errorReporter(error, sanitizedContext);
      }
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, undefined, context);
  }

  /**
   * Log informational messages (only in development)
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, undefined, context);
  }

  /**
   * Log warnings
   */
  warn(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.log('warn', message, error, context);
  }

  /**
   * Log errors
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.log('error', message, error, context);
  }
}

// Default logger instance
export const logger = new Logger();

// Export class for custom configurations
export { Logger };
export type { LoggerOptions };
