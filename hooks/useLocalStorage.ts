"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook pour persister des valeurs dans localStorage
 * Gère automatiquement la sérialisation/désérialisation JSON
 *
 * @param key - Clé de stockage
 * @param initialValue - Valeur initiale si rien n'est stocké
 * @returns [valeur, setter, remove]
 *
 * @example
 * ```tsx
 * const [theme, setTheme, removeTheme] = useLocalStorage("theme", "light");
 *
 * // Utiliser comme useState normal
 * setTheme("dark");
 *
 * // Supprimer la valeur
 * removeTheme();
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // État pour stocker la valeur
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Côté serveur, retourner la valeur initiale
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Erreur lecture localStorage pour "${key}":`, error);
      return initialValue;
    }
  });

  // Synchroniser avec localStorage quand la valeur change
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Erreur écriture localStorage pour "${key}":`, error);
    }
  }, [key, storedValue]);

  // Setter avec support pour les fonctions (comme useState)
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        return newValue;
      });
    },
    []
  );

  // Supprimer la valeur
  const removeValue = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Erreur suppression localStorage pour "${key}":`, error);
    }
  }, [key, initialValue]);

  // Écouter les changements d'autres onglets
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          // Ignorer les erreurs de parsing
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook pour persister des préférences utilisateur
 * Préconfiguré avec des clés communes
 */
export function useUserPreferences() {
  const [pageSize, setPageSize] = useLocalStorage("ecmis_page_size", 20);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    "ecmis_sidebar_collapsed",
    false
  );
  const [selectedClinic, setSelectedClinic] = useLocalStorage<string | null>(
    "ecmis_selected_clinic",
    null
  );

  return {
    pageSize,
    setPageSize,
    sidebarCollapsed,
    setSidebarCollapsed,
    selectedClinic,
    setSelectedClinic,
  };
}
