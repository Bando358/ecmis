/**
 * Client API avec gestion d'erreurs centralisée
 */

import { logger } from "./logger";

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface RequestConfig {
  /** Headers additionnels */
  headers?: Record<string, string>;
  /** Timeout en millisecondes */
  timeout?: number;
  /** Inclure les credentials */
  credentials?: RequestCredentials;
  /** Signal pour annulation */
  signal?: AbortSignal;
  /** Réessayer en cas d'échec */
  retry?: number;
  /** Délai entre les réessais en ms */
  retryDelay?: number;
}

// ============================================
// CODES D'ERREUR
// ============================================

export const API_ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  ABORTED: "ABORTED",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// ============================================
// ERREUR PERSONNALISÉE
// ============================================

export class ApiException extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiException";
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// ============================================
// HELPERS
// ============================================

function getErrorCodeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return API_ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return API_ERROR_CODES.FORBIDDEN;
  if (status === 404) return API_ERROR_CODES.NOT_FOUND;
  if (status === 422) return API_ERROR_CODES.VALIDATION_ERROR;
  if (status >= 500) return API_ERROR_CODES.SERVER_ERROR;
  return API_ERROR_CODES.UNKNOWN_ERROR;
}

function getErrorMessageFromStatus(status: number): string {
  if (status === 401) return "Session expirée. Veuillez vous reconnecter.";
  if (status === 403) return "Vous n'avez pas les permissions nécessaires.";
  if (status === 404) return "Ressource non trouvée.";
  if (status === 422) return "Les données envoyées sont invalides.";
  if (status >= 500) return "Erreur serveur. Veuillez réessayer plus tard.";
  return "Une erreur est survenue.";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// CLIENT API
// ============================================

const DEFAULT_CONFIG: RequestConfig = {
  timeout: 30000,
  credentials: "include",
  retry: 0,
  retryDelay: 1000,
};

/**
 * Effectue une requête API avec gestion d'erreurs
 */
async function request<T>(
  url: string,
  options: RequestInit & RequestConfig = {}
): Promise<ApiResponse<T>> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const { timeout, retry = 0, retryDelay = 1000, ...fetchOptions } = config;

  let lastError: ApiException | null = null;
  let attempts = 0;

  while (attempts <= retry) {
    try {
      // Créer un controller pour le timeout si pas de signal fourni
      const controller = new AbortController();
      const timeoutId = timeout
        ? setTimeout(() => controller.abort(), timeout)
        : null;

      const response = await fetch(url, {
        ...fetchOptions,
        signal: options.signal || controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Gérer les erreurs HTTP
      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Response n'est pas du JSON
        }

        throw new ApiException(
          getErrorCodeFromStatus(response.status),
          (errorData.message as string) || getErrorMessageFromStatus(response.status),
          response.status,
          errorData
        );
      }

      // Parser la réponse
      const data = await response.json();

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      if (error instanceof ApiException) {
        lastError = error;
      } else if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiException(
          options.signal?.aborted ? API_ERROR_CODES.ABORTED : API_ERROR_CODES.TIMEOUT,
          options.signal?.aborted ? "Requête annulée." : "Délai d'attente dépassé."
        );
      } else if (error instanceof TypeError) {
        lastError = new ApiException(
          API_ERROR_CODES.NETWORK_ERROR,
          "Erreur réseau. Vérifiez votre connexion."
        );
      } else {
        lastError = new ApiException(
          API_ERROR_CODES.UNKNOWN_ERROR,
          error instanceof Error ? error.message : "Une erreur inconnue est survenue."
        );
      }

      attempts++;

      // Logger l'erreur
      logger.warn(`API request failed (attempt ${attempts}/${retry + 1})`, {
        data: {
          url,
          error: lastError.message,
          code: lastError.code,
        },
      });

      // Réessayer si possible (sauf pour certains codes d'erreur)
      if (
        attempts <= retry &&
        lastError.code !== API_ERROR_CODES.UNAUTHORIZED &&
        lastError.code !== API_ERROR_CODES.FORBIDDEN &&
        lastError.code !== API_ERROR_CODES.VALIDATION_ERROR &&
        lastError.code !== API_ERROR_CODES.ABORTED
      ) {
        await sleep(retryDelay * attempts); // Backoff exponentiel
        continue;
      }

      break;
    }
  }

  logger.error("API request failed", lastError, {
    data: {
      url,
      code: lastError?.code,
    },
  });

  return {
    success: false,
    error: lastError?.toApiError() || {
      code: API_ERROR_CODES.UNKNOWN_ERROR,
      message: "Une erreur inconnue est survenue.",
    },
  };
}

// ============================================
// MÉTHODES HTTP
// ============================================

export const api = {
  /**
   * GET request
   */
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "GET", ...config });
  },

  /**
   * POST request
   */
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  },

  /**
   * PUT request
   */
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  },

  /**
   * PATCH request
   */
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  },

  /**
   * DELETE request
   */
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "DELETE", ...config });
  },

  /**
   * Upload de fichier
   */
  async upload<T>(
    url: string,
    file: File | FormData,
    config?: Omit<RequestConfig, "headers">
  ): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append("file", file);
    }

    return request<T>(url, {
      method: "POST",
      body: formData,
      ...config,
      headers: {}, // Laisser le navigateur définir le Content-Type pour FormData
    });
  },
};

// ============================================
// HOOK POUR L'UTILISATION DANS LES COMPOSANTS
// ============================================

export function isApiError(response: ApiResponse): response is ApiResponse & { error: ApiError } {
  return !response.success && response.error !== undefined;
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

// ============================================
// UTILITAIRES POUR LES SERVER ACTIONS
// ============================================

/**
 * Wrapper pour les Server Actions avec gestion d'erreurs
 *
 * @example
 * ```ts
 * export const createClient = safeAction(async (data: ClientInput) => {
 *   const client = await prisma.client.create({ data });
 *   return client;
 * });
 * ```
 */
export async function safeAction<T, Args extends unknown[]>(
  action: (...args: Args) => Promise<T>,
  ...args: Args
): Promise<ApiResponse<T>> {
  try {
    const result = await action(...args);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error("Server action failed", error instanceof Error ? error : undefined);

    if (error instanceof ApiException) {
      return {
        success: false,
        error: error.toApiError(),
      };
    }

    return {
      success: false,
      error: {
        code: API_ERROR_CODES.SERVER_ERROR,
        message: error instanceof Error ? error.message : "Une erreur est survenue.",
      },
    };
  }
}

/**
 * Créer une Server Action sécurisée
 *
 * @example
 * ```ts
 * export const deleteClient = createSafeAction(
 *   async (id: string) => {
 *     await prisma.client.delete({ where: { id } });
 *     return { id };
 *   }
 * );
 *
 * // Usage
 * const result = await deleteClient("123");
 * if (result.success) {
 *   console.log("Deleted:", result.data.id);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function createSafeAction<T, Args extends unknown[]>(
  action: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ApiResponse<T>> {
  return async (...args: Args) => safeAction(action, ...args);
}
