"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type AsyncStatus = "idle" | "pending" | "success" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * Hook pour gérer les opérations asynchrones avec état
 *
 * @param asyncFunction - Fonction asynchrone à exécuter
 * @param immediate - Exécuter immédiatement au montage (default: false)
 * @returns État et contrôles de l'opération
 *
 * @example
 * ```tsx
 * // Usage basique
 * const { data, isPending, isError, error, execute } = useAsync(fetchClients);
 *
 * useEffect(() => {
 *   execute();
 * }, [execute]);
 *
 * // Avec arguments
 * const { data, execute } = useAsync(
 *   (id: string) => fetchClientById(id)
 * );
 * execute("client-123");
 *
 * // Exécution immédiate
 * const { data, isPending } = useAsync(fetchClients, true);
 * ```
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate: boolean = false
): UseAsyncReturn<T, Args> {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Ref pour éviter les mises à jour sur composant démonté
  const mountedRef = useRef(true);
  const asyncFunctionRef = useRef(asyncFunction);

  // Mettre à jour la ref quand la fonction change
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    setStatus("pending");
    setError(null);

    try {
      const result = await asyncFunctionRef.current(...args);

      if (mountedRef.current) {
        setData(result);
        setStatus("success");
      }

      return result;
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setStatus("error");
      }
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  // Exécution immédiate si demandé
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, [immediate, execute]);

  return {
    status,
    data,
    error,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    execute,
    reset,
    setData,
  };
}

/**
 * Hook pour gérer plusieurs opérations asynchrones
 * Utile pour les formulaires avec plusieurs actions
 */
export function useAsyncActions<T extends Record<string, (...args: unknown[]) => Promise<unknown>>>() {
  const [loadingStates, setLoadingStates] = useState<Record<keyof T, boolean>>(
    {} as Record<keyof T, boolean>
  );
  const [errors, setErrors] = useState<Record<keyof T, Error | null>>(
    {} as Record<keyof T, Error | null>
  );

  const execute = useCallback(
    async <K extends keyof T>(
      key: K,
      action: T[K],
      ...args: Parameters<T[K]>
    ): Promise<Awaited<ReturnType<T[K]>> | null> => {
      setLoadingStates((prev) => ({ ...prev, [key]: true }));
      setErrors((prev) => ({ ...prev, [key]: null }));

      try {
        const result = await (action as (...args: unknown[]) => Promise<unknown>)(...args);
        setLoadingStates((prev) => ({ ...prev, [key]: false }));
        return result as Awaited<ReturnType<T[K]>>;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setErrors((prev) => ({ ...prev, [key]: error }));
        setLoadingStates((prev) => ({ ...prev, [key]: false }));
        return null;
      }
    },
    []
  );

  const isLoading = useCallback(
    (key: keyof T) => loadingStates[key] ?? false,
    [loadingStates]
  );

  const getError = useCallback(
    (key: keyof T) => errors[key] ?? null,
    [errors]
  );

  const clearError = useCallback((key: keyof T) => {
    setErrors((prev) => ({ ...prev, [key]: null }));
  }, []);

  return {
    execute,
    isLoading,
    getError,
    clearError,
    loadingStates,
    errors,
  };
}

/**
 * Hook pour polling (requêtes répétées à intervalle)
 */
export function usePolling<T>(
  asyncFunction: () => Promise<T>,
  intervalMs: number,
  enabled: boolean = true
): AsyncState<T> & { start: () => void; stop: () => void } {
  const { data, error, status, execute, ...rest } = useAsync(asyncFunction);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    execute();
    intervalRef.current = setInterval(() => {
      execute();
    }, intervalMs);
  }, [execute, intervalMs, stop]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return stop;
  }, [enabled, start, stop]);

  return {
    data,
    error,
    status,
    ...rest,
    start,
    stop,
  };
}
