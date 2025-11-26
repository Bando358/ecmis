// hooks/useInactivityGuard.ts
"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

export function useInactivityGuard() {
  const { status } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(() => {
    console.log("🛡️ Déconnexion automatique pour inactivité");
    signOut({ callbackUrl: "/login?timeout=1" });
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (status === "authenticated") {
      timeoutRef.current = setTimeout(logout, INACTIVITY_LIMIT);
      console.log("🔄 Timer d’inactivité réinitialisé");
    }
  }, [status, logout]);

  useEffect(() => {
    if (status !== "authenticated") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    console.log("🎯 Surveillance de l’inactivité activée");

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "focus",
      "input",
      "wheel",
      "resize",
    ];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    document.addEventListener("submit", resetTimer, { passive: true });
    document.addEventListener("change", resetTimer, { passive: true });

    resetTimer();

    return () => {
      console.log("🧹 Arrêt de la surveillance d’inactivité");
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      document.removeEventListener("submit", resetTimer);
      document.removeEventListener("change", resetTimer);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status, resetTimer]);
}
