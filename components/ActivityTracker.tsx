// components/ActivityTracker.tsx
"use client";
import { useEffect, useCallback } from "react";

const IS_DEV = process.env.NODE_ENV === "development";

export default function ActivityTracker() {
  const updateActivity = useCallback(() => {
    const now = Date.now();

    try {
      const cookieOptions = [
        `lastActivity=${now}`,
        "path=/",
        "max-age=86400",
        "SameSite=Lax",
      ];
      if (!IS_DEV) cookieOptions.push("Secure");
      document.cookie = cookieOptions.join("; ");

      localStorage.setItem("lastActivity", now.toString());
    } catch (error) {
      if (IS_DEV) console.error("Erreur mise à jour activité :", error);
    }
  }, []);

  useEffect(() => {
    let lastUpdate = 0;
    const THROTTLE_DELAY = 5000;
    let activityTimeout: NodeJS.Timeout;

    const throttledUpdate = () => {
      const now = Date.now();
      if (activityTimeout) clearTimeout(activityTimeout);

      activityTimeout = setTimeout(() => {
        if (now - lastUpdate >= THROTTLE_DELAY) {
          lastUpdate = now;
          updateActivity();
        }
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "lastActivity" && event.newValue) {
        const newValue = parseInt(event.newValue, 10);
        const now = Date.now();

        if (now - newValue < 10000) {
          const cookieOptions = [
            `lastActivity=${newValue}`,
            "path=/",
            "max-age=86400",
            "SameSite=Lax",
          ];
          if (!IS_DEV) cookieOptions.push("Secure");
          document.cookie = cookieOptions.join("; ");
        }
      }
    };

    const events = [
      "mousedown", "mousemove", "keydown", "scroll",
      "touchstart", "click", "focus", "input",
      "wheel", "resize", "drag", "drop",
    ];

    events.forEach((event) =>
      document.addEventListener(event, throttledUpdate, { passive: true })
    );

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageEvent);

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        updateActivity();
      }
    }, 30000);

    updateActivity();

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, throttledUpdate)
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageEvent);
      clearInterval(intervalId);
      if (activityTimeout) clearTimeout(activityTimeout);
    };
  }, [updateActivity]);

  return null;
}
