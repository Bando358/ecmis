/**
 * Logger centralisé pour l'application eCMIS
 * Permet un logging cohérent avec différents niveaux et contextes
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  /** Nom du module/fichier source */
  module?: string;
  /** ID de l'utilisateur concerné */
  userId?: string;
  /** ID de la requête/transaction */
  requestId?: string;
  /** Données additionnelles */
  data?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Niveau minimum de log (peut être configuré via env)
const MIN_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Couleurs pour la console (développement)
const COLORS = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Vert
  warn: "\x1b[33m", // Jaune
  error: "\x1b[31m", // Rouge
  reset: "\x1b[0m",
};

/**
 * Formate un log entry pour l'affichage
 */
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry;
  const parts = [
    `[${timestamp}]`,
    `[${level.toUpperCase()}]`,
    context?.module ? `[${context.module}]` : "",
    message,
  ].filter(Boolean);

  let output = parts.join(" ");

  if (context?.userId) {
    output += ` (userId: ${context.userId})`;
  }

  if (context?.requestId) {
    output += ` (requestId: ${context.requestId})`;
  }

  if (context?.data) {
    output += ` | data: ${JSON.stringify(context.data)}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack && process.env.NODE_ENV !== "production") {
      output += `\n  Stack: ${error.stack}`;
    }
  }

  return output;
}

/**
 * Écrit le log dans la console avec couleurs (dev) ou format JSON (prod)
 */
function writeLog(entry: LogEntry): void {
  const { level } = entry;

  // Vérifier le niveau minimum
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LOG_LEVEL]) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    // En production: format JSON pour parsing par services de monitoring
    console.log(JSON.stringify(entry));
  } else {
    // En développement: format lisible avec couleurs
    const color = COLORS[level];
    const formattedMessage = formatLogEntry(entry);
    console.log(`${color}${formattedMessage}${COLORS.reset}`);
  }
}

/**
 * Crée une entrée de log
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  };
}

/**
 * Logger principal
 */
export const logger = {
  /**
   * Log de debug (développement uniquement)
   */
  debug(message: string, context?: LogContext): void {
    writeLog(createLogEntry("debug", message, context));
  },

  /**
   * Log d'information
   */
  info(message: string, context?: LogContext): void {
    writeLog(createLogEntry("info", message, context));
  },

  /**
   * Log d'avertissement
   */
  warn(message: string, context?: LogContext): void {
    writeLog(createLogEntry("warn", message, context));
  },

  /**
   * Log d'erreur
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : undefined;
    writeLog(createLogEntry("error", message, context, err));
  },

  /**
   * Crée un logger avec un contexte de module pré-défini
   */
  withModule(moduleName: string) {
    return {
      debug: (message: string, context?: Omit<LogContext, "module">) =>
        logger.debug(message, { ...context, module: moduleName }),
      info: (message: string, context?: Omit<LogContext, "module">) =>
        logger.info(message, { ...context, module: moduleName }),
      warn: (message: string, context?: Omit<LogContext, "module">) =>
        logger.warn(message, { ...context, module: moduleName }),
      error: (
        message: string,
        error?: Error | unknown,
        context?: Omit<LogContext, "module">
      ) => logger.error(message, error, { ...context, module: moduleName }),
    };
  },

  /**
   * Log le début d'une opération (utile pour le timing)
   */
  startOperation(operationName: string, context?: LogContext): () => void {
    const startTime = Date.now();
    logger.debug(`Starting: ${operationName}`, context);

    return () => {
      const duration = Date.now() - startTime;
      logger.debug(`Completed: ${operationName} (${duration}ms)`, context);
    };
  },
};

// Loggers pré-configurés pour les modules courants
export const authLogger = logger.withModule("auth");
export const dbLogger = logger.withModule("database");
export const apiLogger = logger.withModule("api");
export const clientLogger = logger.withModule("client-actions");
export const permissionLogger = logger.withModule("permissions");

export default logger;
