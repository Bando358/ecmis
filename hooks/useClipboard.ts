"use client";

import { useState, useCallback, useEffect } from "react";

interface UseClipboardOptions {
  /** Durée avant reset du statut "copié" en ms (default: 2000) */
  timeout?: number;
  /** Callback appelé après copie réussie */
  onSuccess?: (text: string) => void;
  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
}

interface UseClipboardReturn {
  /** Copier du texte dans le presse-papiers */
  copy: (text: string) => Promise<boolean>;
  /** Lire le contenu du presse-papiers */
  paste: () => Promise<string | null>;
  /** Texte actuellement copié */
  copiedText: string | null;
  /** Indique si une copie a été faite récemment */
  hasCopied: boolean;
  /** Erreur éventuelle */
  error: Error | null;
  /** Reset le statut */
  reset: () => void;
}

/**
 * Hook pour gérer le presse-papiers
 *
 * @example
 * ```tsx
 * const { copy, hasCopied } = useClipboard();
 *
 * <Button onClick={() => copy(code)}>
 *   {hasCopied ? "Copié !" : "Copier"}
 * </Button>
 * ```
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { timeout = 2000, onSuccess, onError } = options;

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset automatique après le timeout
  useEffect(() => {
    if (hasCopied && timeout > 0) {
      const timer = setTimeout(() => {
        setHasCopied(false);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [hasCopied, timeout]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        const err = new Error("Clipboard API non disponible");
        setError(err);
        onError?.(err);
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        setHasCopied(true);
        setError(null);
        onSuccess?.(text);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Échec de la copie");
        setError(error);
        setHasCopied(false);
        onError?.(error);
        return false;
      }
    },
    [onSuccess, onError]
  );

  const paste = useCallback(async (): Promise<string | null> => {
    if (!navigator?.clipboard) {
      const err = new Error("Clipboard API non disponible");
      setError(err);
      onError?.(err);
      return null;
    }

    try {
      const text = await navigator.clipboard.readText();
      setError(null);
      return text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Échec de la lecture");
      setError(error);
      onError?.(error);
      return null;
    }
  }, [onError]);

  const reset = useCallback(() => {
    setCopiedText(null);
    setHasCopied(false);
    setError(null);
  }, []);

  return {
    copy,
    paste,
    copiedText,
    hasCopied,
    error,
    reset,
  };
}

/**
 * Hook simplifié qui retourne juste la fonction copy et le statut
 */
export function useCopyToClipboard(timeout = 2000) {
  const { copy, hasCopied } = useClipboard({ timeout });
  return [copy, hasCopied] as const;
}
