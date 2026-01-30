/**
 * Constantes centralisées de l'application eCMIS
 * Évite les "magic strings" et "magic numbers" dispersés dans le code
 */

// ============================================
// AUTHENTIFICATION & SESSION
// ============================================
export const AUTH = {
  /** Durée maximale d'une session en secondes (8 heures - journée de travail) */
  SESSION_MAX_AGE: 8 * 60 * 60,
  /** Intervalle de rafraîchissement de session en secondes (1h) */
  SESSION_UPDATE_AGE: 1 * 60 * 60,
  /** Durée d'inactivité avant déconnexion en millisecondes (15 min) */
  INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000,
  /** Nombre de rounds pour le hashage bcrypt */
  BCRYPT_ROUNDS: 10,
} as const;

// ============================================
// PAGINATION
// ============================================
export const PAGINATION = {
  /** Nombre d'éléments par page par défaut */
  DEFAULT_PAGE_SIZE: 20,
  /** Nombre maximum d'éléments par page */
  MAX_PAGE_SIZE: 100,
  /** Options de taille de page disponibles */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const;

// ============================================
// PÉRIODES DE RAPPORT
// ============================================
export const REPORT_PERIODS = {
  MENSUEL: "mensuel",
  BIMESTRIEL: "bimestriel",
  TRIMESTRIEL: "trimestriel",
  SEMESTRIEL: "semestriel",
  ANNUEL: "annuel",
} as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[keyof typeof REPORT_PERIODS];

// ============================================
// STATUTS
// ============================================
export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  BANNED: "banned",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

// ============================================
// RÔLES UTILISATEUR
// ============================================
export const USER_ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// ============================================
// POSTES
// ============================================
export const POST_STATUS = {
  AMD: "AMD",
  INFIRMIER: "INFIRMIER",
  SAGE_FEMME: "SAGE_FEMME",
  CONSEILLER: "CONSEILLER",
  MEDECIN: "MEDECIN",
  LABORANTIN: "LABORANTIN",
  CAISSIERE: "CAISSIERE",
  COMPTABLE: "COMPTABLE",
  SUIVI_EVALUATION: "SUIVI_EVALUATION",
  ADMIN: "ADMIN",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

// ============================================
// MESSAGES D'ERREUR
// ============================================
export const ERROR_MESSAGES = {
  // Authentification
  INVALID_CREDENTIALS: "Identifiants invalides",
  SESSION_EXPIRED: "Votre session a expiré, veuillez vous reconnecter",
  UNAUTHORIZED: "Vous n'êtes pas autorisé à effectuer cette action",
  ACCOUNT_BANNED: "Votre compte a été suspendu",

  // Base de données
  DB_CONNECTION_ERROR: "Problème de connexion à la base de données",
  RECORD_NOT_FOUND: "Enregistrement non trouvé",
  DUPLICATE_ENTRY: "Cet enregistrement existe déjà",

  // Validation
  REQUIRED_FIELD: "Ce champ est obligatoire",
  INVALID_FORMAT: "Format invalide",
  INVALID_DATE: "Date invalide",

  // Général
  UNKNOWN_ERROR: "Une erreur est survenue",
  NETWORK_ERROR: "Erreur de connexion réseau",
} as const;

// ============================================
// MESSAGES DE SUCCÈS
// ============================================
export const SUCCESS_MESSAGES = {
  SAVED: "Enregistré avec succès",
  UPDATED: "Mis à jour avec succès",
  DELETED: "Supprimé avec succès",
  CREATED: "Créé avec succès",
} as const;

// ============================================
// ROUTES
// ============================================
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  CLIENTS: "/client",
  CLIENTS_VIH: "/client-vih",
  FICHES: "/fiches",
  RAPPORTS: "/rapports",
  ADMINISTRATOR: "/administrator",
} as const;

// ============================================
// API PATHS
// ============================================
export const API_PATHS = {
  AUTH: "/api/auth",
  BACKUP: "/api/backup",
  RESTORE: "/api/restore",
} as const;

// ============================================
// FORMATS DE DATE
// ============================================
export const DATE_FORMATS = {
  /** Format d'affichage standard: 28/01/2026 */
  DISPLAY: "dd/MM/yyyy",
  /** Format avec heure: 28/01/2026 14:30 */
  DISPLAY_WITH_TIME: "dd/MM/yyyy HH:mm",
  /** Format ISO pour les API */
  ISO: "yyyy-MM-dd",
  /** Format pour les noms de fichiers */
  FILE_NAME: "yyyy-MM-dd_HH-mm-ss",
} as const;

// ============================================
// LIMITES
// ============================================
export const LIMITS = {
  /** Taille maximale d'upload en bytes (5MB) */
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024,
  /** Longueur maximale du nom d'utilisateur */
  MAX_USERNAME_LENGTH: 50,
  /** Longueur minimale du mot de passe */
  MIN_PASSWORD_LENGTH: 8,
  /** Nombre maximum de tentatives de connexion */
  MAX_LOGIN_ATTEMPTS: 5,
} as const;

// ============================================
// COULEURS (pour les graphiques/badges)
// ============================================
export const COLORS = {
  PRIMARY: "#3b82f6",
  SUCCESS: "#22c55e",
  WARNING: "#f59e0b",
  DANGER: "#ef4444",
  INFO: "#06b6d4",
  MUTED: "#6b7280",
} as const;
