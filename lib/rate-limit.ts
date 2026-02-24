/**
 * Rate limiter en mémoire pour protéger les routes sensibles.
 * Utilise une Map avec nettoyage automatique des entrées expirées.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Nettoyage périodique des entrées expirées (toutes les 5 minutes)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Permettre au process de quitter sans attendre le cleanup
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Vérifie si une requête est autorisée par le rate limiter.
 * @param key - Clé unique (ex: `login:username` ou `api:backup:ip`)
 * @param limit - Nombre max de requêtes autorisées dans la fenêtre
 * @param windowMs - Durée de la fenêtre en millisecondes
 * @returns true si autorisé, false si limite dépassée
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenêtre
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count < limit) {
    entry.count++;
    return true;
  }

  // Limite atteinte
  return false;
}
