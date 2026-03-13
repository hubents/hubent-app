// Structured logger for HubEnts monitoring system
// Captures errors with rich context (userId, orgId, path, duration, stack)

export type LogLevel = "info" | "warn" | "error" | "critical";

export interface LogContext {
  requestId?: string;
  userId?: string;
  orgId?: string | number;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: Error | unknown;
  meta?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  stack?: string;
}

// In-memory ring buffer for recent logs (last 500 entries)
const LOG_BUFFER_SIZE = 500;
const logBuffer: LogEntry[] = [];

function addToBuffer(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function createEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (context.error) {
    const { message: errMsg, stack } = formatError(context.error);
    entry.message = `${message}: ${errMsg}`;
    entry.stack = stack;
  }

  return entry;
}

function log(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = createEntry(level, message, context);
  addToBuffer(entry);

  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
  const ctxStr = [
    context.method && context.path ? `${context.method} ${context.path}` : null,
    context.requestId ? `req:${context.requestId}` : null,
    context.userId ? `user:${context.userId}` : null,
    context.orgId ? `org:${context.orgId}` : null,
    context.statusCode ? `status:${context.statusCode}` : null,
    context.durationMs !== undefined ? `${context.durationMs}ms` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const logLine = ctxStr ? `${prefix} [${ctxStr}] ${entry.message}` : `${prefix} ${entry.message}`;

  switch (level) {
    case "info":
      console.log(logLine);
      break;
    case "warn":
      console.warn(logLine);
      break;
    case "error":
    case "critical":
      console.error(logLine);
      if (entry.stack) {
        console.error(entry.stack);
      }
      break;
  }

  return entry;
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
  critical: (message: string, context?: LogContext) => log("critical", message, context),

  getRecentLogs: (count = 50, level?: LogLevel): LogEntry[] => {
    const filtered = level ? logBuffer.filter((e) => e.level === level) : logBuffer;
    return filtered.slice(-count);
  },

  getErrorLogs: (count = 50): LogEntry[] => {
    return logBuffer
      .filter((e) => e.level === "error" || e.level === "critical")
      .slice(-count);
  },

  getStats: () => {
    const now = Date.now();
    const last5min = logBuffer.filter(
      (e) => now - new Date(e.timestamp).getTime() < 5 * 60 * 1000
    );
    const lastHour = logBuffer.filter(
      (e) => now - new Date(e.timestamp).getTime() < 60 * 60 * 1000
    );

    return {
      bufferSize: logBuffer.length,
      last5min: {
        total: last5min.length,
        errors: last5min.filter((e) => e.level === "error" || e.level === "critical").length,
        warnings: last5min.filter((e) => e.level === "warn").length,
      },
      lastHour: {
        total: lastHour.length,
        errors: lastHour.filter((e) => e.level === "error" || e.level === "critical").length,
        warnings: lastHour.filter((e) => e.level === "warn").length,
      },
    };
  },

  clear: () => {
    logBuffer.length = 0;
  },
};
