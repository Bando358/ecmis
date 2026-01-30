"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook pour détecter si une media query correspond
 *
 * @param query - Media query CSS (ex: "(min-width: 768px)")
 * @returns boolean indiquant si la query correspond
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Vérifier côté client uniquement
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);

    // Mettre à jour l'état initial
    setMatches(mediaQuery.matches);

    // Callback pour les changements
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Écouter les changements
    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

// ============================================
// BREAKPOINTS PRÉDÉFINIS (Tailwind)
// ============================================

const breakpoints = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Hook pour détecter les breakpoints Tailwind
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useBreakpoint();
 *
 * // Ou pour un breakpoint spécifique
 * const isLg = useBreakpointValue("lg"); // >= 1024px
 * ```
 */
export function useBreakpoint() {
  const isSm = useMediaQuery(breakpoints.sm);
  const isMd = useMediaQuery(breakpoints.md);
  const isLg = useMediaQuery(breakpoints.lg);
  const isXl = useMediaQuery(breakpoints.xl);
  const is2Xl = useMediaQuery(breakpoints["2xl"]);

  return {
    // Breakpoints individuels (>=)
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,

    // Catégories pratiques
    isMobile: !isMd, // < 768px
    isTablet: isMd && !isLg, // 768px - 1023px
    isDesktop: isLg, // >= 1024px

    // Breakpoint actuel (le plus grand qui correspond)
    current: is2Xl
      ? "2xl"
      : isXl
      ? "xl"
      : isLg
      ? "lg"
      : isMd
      ? "md"
      : isSm
      ? "sm"
      : "xs",
  };
}

/**
 * Hook pour un breakpoint spécifique
 */
export function useBreakpointValue(breakpoint: Breakpoint): boolean {
  return useMediaQuery(breakpoints[breakpoint]);
}

// ============================================
// PRÉFÉRENCES SYSTÈME
// ============================================

/**
 * Hook pour détecter les préférences de thème système
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * Hook pour détecter si l'utilisateur préfère les animations réduites
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Hook pour détecter le mode portrait/paysage
 */
export function useOrientation(): "portrait" | "landscape" {
  const isPortrait = useMediaQuery("(orientation: portrait)");
  return isPortrait ? "portrait" : "landscape";
}

// ============================================
// HOOK COMBINÉ POUR LE RESPONSIVE
// ============================================

/**
 * Hook tout-en-un pour le responsive design
 *
 * @example
 * ```tsx
 * const {
 *   breakpoint,
 *   isMobile,
 *   isDesktop,
 *   orientation,
 *   prefersDarkMode,
 *   prefersReducedMotion
 * } = useResponsive();
 * ```
 */
export function useResponsive() {
  const breakpointInfo = useBreakpoint();
  const prefersDarkMode = usePrefersDarkMode();
  const prefersReducedMotion = usePrefersReducedMotion();
  const orientation = useOrientation();

  return {
    ...breakpointInfo,
    prefersDarkMode,
    prefersReducedMotion,
    orientation,
  };
}

// ============================================
// HOOK POUR DIMENSION DE FENÊTRE
// ============================================

interface WindowSize {
  width: number;
  height: number;
}

/**
 * Hook pour obtenir les dimensions de la fenêtre
 * Note: Utiliser avec précaution car force des re-renders à chaque resize
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Mettre à jour au montage
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

/**
 * Version debounced de useWindowSize pour éviter trop de re-renders
 */
export function useWindowSizeDebounced(delay: number = 250): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, delay);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [delay]);

  return size;
}
