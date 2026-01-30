"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook pour débouncer une valeur
 * Utile pour les champs de recherche afin d'éviter trop de requêtes
 *
 * @param value - Valeur à débouncer
 * @param delay - Délai en millisecondes (default: 300ms)
 * @returns Valeur debouncée
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 500);
 *
 * useEffect(() => {
 *   // Cette fonction ne s'exécute que 500ms après
 *   // que l'utilisateur ait arrêté de taper
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour créer une fonction debouncée
 * Utile quand vous voulez débouncer un callback plutôt qu'une valeur
 *
 * @param callback - Fonction à débouncer
 * @param delay - Délai en millisecondes (default: 300ms)
 * @returns Fonction debouncée
 *
 * @example
 * ```tsx
 * const debouncedSave = useDebouncedCallback(
 *   (value: string) => saveToServer(value),
 *   1000
 * );
 *
 * <input onChange={(e) => debouncedSave(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Mettre à jour la ref du callback si elle change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Hook pour une recherche avec debounce intégré
 * Combine state, debounce et loading state
 *
 * @example
 * ```tsx
 * const {
 *   searchTerm,
 *   debouncedSearchTerm,
 *   setSearchTerm,
 *   isSearching,
 *   clearSearch
 * } = useDebouncedSearch(500);
 *
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     fetchResults(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebouncedSearch(delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  // Indiquer qu'une recherche est en cours quand searchTerm change
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    isSearching,
    clearSearch,
  };
}
