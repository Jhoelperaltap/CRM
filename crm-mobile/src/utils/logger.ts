/**
 * Secure Logger Utility for Mobile App
 *
 * SECURITY: This logger prevents sensitive information from being
 * logged in production builds. Uses __DEV__ to detect environment.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Sanitize error object to remove sensitive data
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An error occurred';
}

/**
 * Sanitize context object to remove potentially sensitive keys
 */
function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'auth', 'credential', 'bearer', 'session', 'cookie', 'refresh'];

  for (const [key, value] of Object.entries(context)) {
    const isKeysSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
    if (isKeysSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class Logger {
  private log(level: LogLevel, message: string, error?: unknown, context?: Record<string, unknown>) {
    if (__DEV__) {
      // In development, log everything for debugging
      const consoleMethod = level === 'debug' ? 'log' : level;
      // eslint-disable-next-line no-console
      console[consoleMethod](`[${level.toUpperCase()}]`, message, error, context);
    } else {
      // In production, sanitize and limit output
      const sanitizedError = error ? sanitizeError(error) : undefined;
      const sanitizedContext = sanitizeContext(context);

      // Only log errors and warnings in production
      if (level === 'error' || level === 'warn') {
        // eslint-disable-next-line no-console
        console[level](`[${level.toUpperCase()}]`, message, sanitizedError ? `(${sanitizedError})` : '');

        // In a real production app, you would send this to a service like Sentry:
        // Sentry.captureException(error, { extra: sanitizedContext });
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

export const logger = new Logger();
export { Logger };
