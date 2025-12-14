/**
 * Utilitaires de date pour le projet
 * - weeksBetween : différence en semaines
 * - monthsBetween: différence en mois (calendar-aware, fractionnaire possible)
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type Rounding = "floor" | "ceil" | "round" | "exact";

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/**
 * Différence entre deux dates en semaines.
 * - Si rounding === 'exact' retourne un nombre flottant (ex: 2.5714).
 * - Sinon retourne un entier selon le mode de rounding choisi.
 * - Si end < start renvoie une valeur négative.
 */
export function weeksBetween(
  d1: Date | string,
  d2: Date | string,
  rounding: Rounding = "floor"
): number {
  const start = toDate(d1).getTime();
  const end = toDate(d2).getTime();
  const sign = end >= start ? 1 : -1;
  const diff = Math.abs(end - start);
  const weeksExact = diff / WEEK_MS;

  if (rounding === "exact") return sign * weeksExact;
  if (rounding === "floor") return sign * Math.floor(weeksExact);
  if (rounding === "ceil") return sign * Math.ceil(weeksExact);
  return sign * Math.round(weeksExact);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Différence entre deux dates en mois (calendar-aware).
 * - Si rounding === 'exact' retourne un flottant (ex: 3.45).
 * - Sinon applique le rounding demandé (floor/ceil/round) au résultat.
 * - Le calcul compte les mois entiers puis ajoute une fraction basée sur
 *   le nombre de jours du mois d'ancrage.
 * - Si end < start renvoie une valeur négative.
 */
export function monthsBetween(
  d1: Date | string,
  d2: Date | string,
  rounding: Rounding = "floor"
): number {
  let start = toDate(d1);
  let end = toDate(d2);
  let sign = 1;
  if (end.getTime() < start.getTime()) {
    sign = -1;
    [start, end] = [end, start];
  }

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  let wholeMonths = yearDiff * 12 + monthDiff;

  // Anchor = start + wholeMonths months
  let anchor = new Date(
    start.getFullYear(),
    start.getMonth() + wholeMonths,
    start.getDate()
  );

  if (anchor.getTime() > end.getTime()) {
    wholeMonths -= 1;
    anchor = new Date(
      start.getFullYear(),
      start.getMonth() + wholeMonths,
      start.getDate()
    );
  }

  const anchorDays = daysInMonth(anchor);
  const msSinceAnchor = end.getTime() - anchor.getTime();
  const dayFraction = msSinceAnchor / (anchorDays * DAY_MS);
  const monthsExact = wholeMonths + Math.max(0, dayFraction);

  if (rounding === "exact") return sign * monthsExact;
  if (rounding === "floor") return sign * Math.floor(monthsExact);
  if (rounding === "ceil") return sign * Math.ceil(monthsExact);
  return sign * Math.round(monthsExact);
}

const dateUtils = {
  weeksBetween,
  monthsBetween,
};

export default dateUtils;
