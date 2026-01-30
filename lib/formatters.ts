/**
 * Utilitaires de formatage pour l'application eCMIS
 * Dates, nombres, texte, etc.
 */

import { format, formatDistance, formatRelative, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================
// FORMATAGE DES DATES
// ============================================

/**
 * Formate une date selon le format spécifié
 * @param date - Date à formater
 * @param formatStr - Format de sortie (default: "dd/MM/yyyy")
 * @returns Date formatée ou chaîne vide si invalide
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = "dd/MM/yyyy"
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(dateObj)) return "";

  return format(dateObj, formatStr, { locale: fr });
}

/**
 * Formate une date avec l'heure
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

/**
 * Formate une date en format long (ex: "28 janvier 2026")
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  return formatDate(date, "d MMMM yyyy");
}

/**
 * Retourne la distance relative (ex: "il y a 2 jours")
 */
export function formatDateRelative(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(dateObj)) return "";

  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: fr });
}

/**
 * Retourne une date relative intelligente (ex: "hier à 14:30")
 */
export function formatDateSmart(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(dateObj)) return "";

  return formatRelative(dateObj, new Date(), { locale: fr });
}

/**
 * Calcule l'âge à partir d'une date de naissance
 */
export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;

  const dateObj = typeof birthDate === "string" ? parseISO(birthDate) : birthDate;

  if (!isValid(dateObj)) return null;

  const today = new Date();
  let age = today.getFullYear() - dateObj.getFullYear();
  const monthDiff = today.getMonth() - dateObj.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
    age--;
  }

  return age;
}

/**
 * Formate l'âge avec unité (ex: "25 ans", "6 mois", "2 semaines")
 */
export function formatAge(birthDate: Date | string | null | undefined): string {
  const age = calculateAge(birthDate);

  if (age === null) return "";
  if (age === 0) {
    // Pour les bébés, calculer en mois
    const dateObj = typeof birthDate === "string" ? parseISO(birthDate as string) : birthDate as Date;
    const months = Math.floor(
      (new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (months === 0) return "< 1 mois";
    return `${months} mois`;
  }
  if (age === 1) return "1 an";
  return `${age} ans`;
}

// ============================================
// FORMATAGE DES NOMBRES
// ============================================

/**
 * Formate un nombre avec séparateurs de milliers
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || value === "") return "";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "";

  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formate un montant en devise (FCFA par défaut)
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "XOF"
): string {
  if (value === null || value === undefined || value === "") return "";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "";

  // FCFA n'a pas de centimes
  const decimals = currency === "XOF" ? 0 : 2;

  const formatted = num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (currency === "XOF") {
    return `${formatted} FCFA`;
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(num);
}

/**
 * Formate un pourcentage
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || value === "") return "";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "";

  return `${formatNumber(num, decimals)}%`;
}

/**
 * Formate une taille de fichier (bytes -> KB, MB, GB)
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

// ============================================
// FORMATAGE DU TEXTE
// ============================================

/**
 * Met en majuscule la première lettre
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Met en majuscule chaque mot
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Tronque un texte avec ellipsis
 */
export function truncate(
  text: string | null | undefined,
  maxLength: number,
  suffix: string = "..."
): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Formate un nom complet (NOM Prénom)
 */
export function formatFullName(
  nom: string | null | undefined,
  prenom: string | null | undefined
): string {
  const parts = [];
  if (nom) parts.push(nom.toUpperCase());
  if (prenom) parts.push(capitalize(prenom));
  return parts.join(" ");
}

/**
 * Formate les initiales (JD pour Jean Dupont)
 */
export function formatInitials(
  nom: string | null | undefined,
  prenom: string | null | undefined
): string {
  const parts = [];
  if (prenom) parts.push(prenom.charAt(0).toUpperCase());
  if (nom) parts.push(nom.charAt(0).toUpperCase());
  return parts.join("");
}

/**
 * Formate un numéro de téléphone
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";

  // Supprimer tous les caractères non numériques sauf +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Format: +225 XX XX XX XX XX ou XX XX XX XX XX
  if (cleaned.startsWith("+225")) {
    const local = cleaned.slice(4);
    return `+225 ${local.match(/.{1,2}/g)?.join(" ") || local}`;
  }

  // Format local
  return cleaned.match(/.{1,2}/g)?.join(" ") || cleaned;
}

// ============================================
// FORMATAGE MÉDICAL
// ============================================

/**
 * Formate la tension artérielle
 */
export function formatBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined
): string {
  if (systolic === null || systolic === undefined) return "";
  if (diastolic === null || diastolic === undefined) return `${systolic}/-`;
  return `${systolic}/${diastolic} mmHg`;
}

/**
 * Formate la température
 */
export function formatTemperature(temp: number | null | undefined): string {
  if (temp === null || temp === undefined) return "";
  return `${formatNumber(temp, 1)}°C`;
}

/**
 * Formate le poids
 */
export function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined) return "";
  return `${formatNumber(weight, 1)} kg`;
}

/**
 * Formate la taille
 */
export function formatHeight(height: number | null | undefined): string {
  if (height === null || height === undefined) return "";
  return `${formatNumber(height, 0)} cm`;
}

/**
 * Calcule et formate l'IMC
 */
export function formatBMI(
  weight: number | null | undefined,
  heightCm: number | null | undefined
): string {
  if (!weight || !heightCm) return "";

  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);

  let category = "";
  if (bmi < 18.5) category = " (Insuffisance)";
  else if (bmi < 25) category = " (Normal)";
  else if (bmi < 30) category = " (Surpoids)";
  else category = " (Obésité)";

  return `${formatNumber(bmi, 1)}${category}`;
}

// ============================================
// CODES ET IDENTIFIANTS
// ============================================

/**
 * Formate un code client (ex: ABJ-2026-00123)
 */
export function formatClientCode(
  clinique: string,
  year: number,
  counter: number
): string {
  const prefix = clinique.slice(0, 3).toUpperCase();
  const paddedCounter = String(counter).padStart(5, "0");
  return `${prefix}-${year}-${paddedCounter}`;
}

/**
 * Masque partiellement une donnée sensible
 */
export function maskSensitive(
  value: string | null | undefined,
  visibleStart: number = 2,
  visibleEnd: number = 2
): string {
  if (!value) return "";
  if (value.length <= visibleStart + visibleEnd) return value;

  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const masked = "*".repeat(Math.min(value.length - visibleStart - visibleEnd, 6));

  return `${start}${masked}${end}`;
}
