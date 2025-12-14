// // components/ActivityTracker.tsx
// "use client";
// import { useEffect } from "react";

// export default function ActivityTracker() {
//   useEffect(() => {
//     let lastUpdate = 0;
//     const THROTTLE_DELAY = 3000; // 3s

//     const updateActivity = () => {
//       const now = Date.now();
//       if (now - lastUpdate < THROTTLE_DELAY) return;
//       lastUpdate = now;

//       try {
//         const timestamp = now.toString();
//         const cookieOptions = [
//           `lastActivity=${timestamp}`,
//           "path=/",
//           "max-age=86400", // 24h
//           "SameSite=Lax",
//         ];

//         if (process.env.NODE_ENV === "production") {
//           cookieOptions.push("Secure");
//         }

//         document.cookie = cookieOptions.join("; ");
//         console.log(
//           "📝 Activité mise à jour :",
//           new Date(now).toLocaleTimeString()
//         );
//       } catch (error) {
//         console.error("Erreur mise à jour activité :", error);
//       }
//     };

//     const events = [
//       "mousedown",
//       "mousemove",
//       "keydown",
//       "scroll",
//       "touchstart",
//       "click",
//       "focus",
//       "input",
//       "wheel",
//       "resize",
//     ];

//     const handleVisibilityChange = () => {
//       if (!document.hidden) {
//         console.log("👀 Retour après veille / changement d’onglet");
//         updateActivity();
//       }
//     };

//     const throttledUpdate = () => {
//       if (Date.now() - lastUpdate >= THROTTLE_DELAY) {
//         updateActivity();
//       }
//     };

//     events.forEach((event) =>
//       document.addEventListener(event, throttledUpdate, { passive: true })
//     );

//     document.addEventListener("visibilitychange", handleVisibilityChange);

//     console.log("🎯 ActivityTracker initialisé");
//     updateActivity();

//     return () => {
//       console.log("🧹 Nettoyage ActivityTracker");
//       events.forEach((event) =>
//         document.removeEventListener(event, throttledUpdate)
//       );
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//     };
//   }, []);

//   return null;
// }

// // components/ActivityTracker.tsx
// "use client";
// import { useEffect, useCallback } from "react";

// export default function ActivityTracker() {
//   const updateActivity = useCallback(() => {
//     const now = Date.now();

//     try {
//       // Vérifier si le cookie existe déjà et a été mis à jour récemment
//       const existingCookie = document.cookie
//         .split("; ")
//         .find((row) => row.startsWith("lastActivity="));

//       if (existingCookie) {
//         const lastValue = parseInt(existingCookie.split("=")[1], 10);
//         // Éviter les mises à jour trop fréquentes (seulement si > 1 seconde)
//         if (now - lastValue < 1000) {
//           return;
//         }
//       }

//       const timestamp = now.toString();
//       const cookieOptions = [
//         `lastActivity=${timestamp}`,
//         "path=/",
//         "max-age=86400", // 24h
//         "SameSite=Lax",
//       ];

//       if (process.env.NODE_ENV === "production") {
//         cookieOptions.push("Secure");
//       }

//       document.cookie = cookieOptions.join("; ");
//       console.log(
//         "📝 Activité mise à jour :",
//         new Date(now).toLocaleTimeString()
//       );
//     } catch (error) {
//       console.error("Erreur mise à jour activité :", error);
//     }
//   }, []);

//   useEffect(() => {
//     let lastUpdate = 0;
//     const THROTTLE_DELAY = 5000; // Augmenté à 5 secondes pour réduire la fréquence
//     let activityTimeout: NodeJS.Timeout;

//     const throttledUpdate = () => {
//       const now = Date.now();

//       // Clear existing timeout
//       if (activityTimeout) {
//         clearTimeout(activityTimeout);
//       }

//       // Set new timeout with throttle delay
//       activityTimeout = setTimeout(() => {
//         if (now - lastUpdate >= THROTTLE_DELAY) {
//           lastUpdate = now;
//           updateActivity();
//         }
//       }, 1000); // Délai réduit pour une réponse plus rapide
//     };

//     const handleVisibilityChange = () => {
//       if (!document.hidden) {
//         console.log("👀 Retour après veille / changement d'onglet");
//         // Mise à jour immédiate au retour de veille
//         lastUpdate = Date.now();
//         updateActivity();
//       }
//     };

//     // 📋 Événements utilisateur à surveiller
//     const events = [
//       "mousedown",
//       "mousemove",
//       "keydown",
//       "scroll",
//       "touchstart",
//       "click",
//       "focus",
//       "input",
//       "wheel",
//       "resize",
//       "drag",
//       "drop",
//     ];

//     // 🎯 Ajout des écouteurs d'événements
//     events.forEach((event) =>
//       document.addEventListener(event, throttledUpdate, {
//         passive: true,
//         capture: true,
//       })
//     );

//     document.addEventListener("visibilitychange", handleVisibilityChange);

//     // 🔄 Mise à jour périodique toutes les 30 secondes pour maintenir la session active
//     const intervalId = setInterval(() => {
//       if (!document.hidden) {
//         updateActivity();
//       }
//     }, 30000);

//     console.log("🎯 ActivityTracker initialisé");

//     // Mise à jour initiale
//     updateActivity();

//     return () => {
//       console.log("🧹 Nettoyage ActivityTracker");

//       // Nettoyage des écouteurs d'événements
//       events.forEach((event) =>
//         document.removeEventListener(event, throttledUpdate, { capture: true })
//       );

//       document.removeEventListener("visibilitychange", handleVisibilityChange);

//       // Nettoyage des timers
//       clearInterval(intervalId);
//       if (activityTimeout) {
//         clearTimeout(activityTimeout);
//       }
//     };
//   }, [updateActivity]);

//   return null;
// }

// components/ActivityTracker.tsx
"use client";
import { useEffect, useCallback } from "react";

export default function ActivityTracker() {
  const updateActivity = useCallback(() => {
    const now = Date.now();

    try {
      // 🧠 Mettre à jour le cookie
      const cookieOptions = [
        `lastActivity=${now}`,
        "path=/",
        "max-age=86400", // 24h
        "SameSite=Lax",
      ];
      if (process.env.NODE_ENV === "production") cookieOptions.push("Secure");
      document.cookie = cookieOptions.join("; ");

      // 💾 Synchroniser dans localStorage
      localStorage.setItem("lastActivity", now.toString());

      console.log(
        "📝 Activité mise à jour :",
        new Date(now).toLocaleTimeString()
      );
    } catch (error) {
      console.error("Erreur mise à jour activité :", error);
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

    // 🎧 Synchronisation entre onglets
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "lastActivity" && event.newValue) {
        const newValue = parseInt(event.newValue, 10);
        const now = Date.now();

        // Si l'autre onglet a mis à jour récemment → on s'aligne
        if (now - newValue < 10000) {
          const cookieOptions = [
            `lastActivity=${newValue}`,
            "path=/",
            "max-age=86400",
            "SameSite=Lax",
          ];
          if (process.env.NODE_ENV === "production")
            cookieOptions.push("Secure");
          document.cookie = cookieOptions.join("; ");

          console.log(
            "🔄 Sync multi-onglets :",
            new Date(newValue).toLocaleTimeString()
          );
        }
      }
    };

    // 📋 Événements utilisateur à surveiller
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
      "drag",
      "drop",
    ];

    events.forEach((event) =>
      document.addEventListener(event, throttledUpdate, { passive: true })
    );

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorageEvent);

    // 🔄 Mise à jour automatique toutes les 30 secondes
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        updateActivity();
      }
    }, 30000);

    // Initialisation
    updateActivity();

    console.log("🎯 ActivityTracker multi-onglets initialisé");

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
