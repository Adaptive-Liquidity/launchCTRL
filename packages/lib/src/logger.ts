import pino from 'pino';

export type Logger = pino.Logger;

let _logger: pino.Logger | null = null;

export function createLogger(options?: pino.LoggerOptions): pino.Logger {
  return pino({
    level: process.env['LOG_LEVEL'] ?? 'info',
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    ...options,
  });
}

export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = createLogger();
  }
  return _logger;
}

export function setLogger(logger: pino.Logger): void {
  _logger = logger;
}

// Structured log helpers
export function logAudit(
  logger: pino.Logger,
  action: string,
  userId: string,
  resourceId: string | null,
  metadata: Record<string, unknown> = {},
): void {
  logger.info({ audit: true, action, userId, resourceId, ...metadata }, `audit: ${action}`);
}

export function logSecurity(
  logger: pino.Logger,
  event: string,
  severity: 'low' | 'medium' | 'high',
  metadata: Record<string, unknown> = {},
): void {
  const fn = severity === 'high' ? 'warn' : 'info';
  logger[fn]({ security: true, event, severity, ...metadata }, `security: ${event}`);
}
