import { PeriodSelection, PeriodType } from "./types";
import { AgeRangeBound } from "./settings-types";
import { DEFAULT_ANALYTICS_SETTINGS } from "./settings-defaults";
import {
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  format,
  getWeek,
  getMonth,
  getQuarter,
  getYear,
  differenceInYears,
} from "date-fns";
import { fr } from "date-fns/locale";

// ---------- Resolution de periode ----------

export function resolvePeriod(period: PeriodSelection): {
  startDate: Date;
  endDate: Date;
} {
  if (period.type === "fixed") {
    return {
      startDate: startOfDay(new Date(period.startDate)),
      endDate: endOfDay(new Date(period.endDate)),
    };
  }

  // Si des periodes specifiques sont selectionnees, deriver le range de dates
  if (period.selectedKeys && period.selectedKeys.length > 0) {
    return resolveDateRangeFromKeys(period.selectedKeys, period.period);
  }

  const now = new Date();
  const endDate = endOfDay(now);
  let startDate: Date;

  switch (period.period) {
    case "day":
      startDate = startOfDay(subDays(now, period.count));
      break;
    case "week":
      startDate = startOfWeek(subWeeks(now, period.count), { locale: fr });
      break;
    case "month":
      startDate = startOfMonth(subMonths(now, period.count));
      break;
    case "quarter":
      startDate = startOfQuarter(subMonths(now, period.count * 3));
      break;
    case "semester":
      startDate = startOfMonth(subMonths(now, period.count * 6));
      break;
    case "year":
      startDate = startOfYear(subYears(now, period.count));
      break;
    default:
      startDate = startOfMonth(now);
  }

  return { startDate, endDate };
}

/**
 * Resout un range de dates a partir d'une liste de cles de periode.
 * Calcule le debut de la premiere periode et la fin de la derniere.
 */
function resolveDateRangeFromKeys(
  keys: string[],
  periodType: PeriodType
): { startDate: Date; endDate: Date } {
  let minDate = new Date(9999, 0);
  let maxDate = new Date(0);

  for (const key of keys) {
    const { start, end } = periodKeyToDateRange(key, periodType);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  }

  return { startDate: startOfDay(minDate), endDate: endOfDay(maxDate) };
}

/**
 * Convertit une cle de periode en range de dates [debut, fin].
 */
function periodKeyToDateRange(
  key: string,
  periodType: PeriodType
): { start: Date; end: Date } {
  switch (periodType) {
    case "month": {
      const [year, month] = key.split("-").map(Number);
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0), // dernier jour du mois
      };
    }
    case "quarter": {
      const [yearStr, qStr] = key.split("-T");
      const year = parseInt(yearStr);
      const q = parseInt(qStr);
      const startMonth = (q - 1) * 3;
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 3, 0),
      };
    }
    case "semester": {
      const [yearStr, sStr] = key.split("-S");
      const year = parseInt(yearStr);
      const s = parseInt(sStr);
      const startMonth = (s - 1) * 6;
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 6, 0),
      };
    }
    case "year": {
      const year = parseInt(key);
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
      };
    }
    case "week": {
      // key: "2026-S05"
      const [yearStr, weekStr] = key.split("-S");
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const start = new Date(year, 0, 4 - dayOfWeek + 1 + (week - 1) * 7);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      return { start, end };
    }
    case "day": {
      const date = new Date(key);
      return { start: date, end: date };
    }
    default:
      return { start: new Date(), end: new Date() };
  }
}

// ---------- Cle de groupement par periode ----------

export function getPeriodKey(date: Date, periodType: PeriodType): string {
  switch (periodType) {
    case "day":
      return format(date, "yyyy-MM-dd");
    case "week":
      return `${getYear(date)}-S${String(getWeek(date, { locale: fr })).padStart(2, "0")}`;
    case "month":
      return format(date, "yyyy-MM");
    case "quarter":
      return `${getYear(date)}-T${getQuarter(date)}`;
    case "semester":
      return `${getYear(date)}-S${getMonth(date) < 6 ? 1 : 2}`;
    case "year":
      return String(getYear(date));
    default:
      return format(date, "yyyy-MM");
  }
}

// ---------- Label de periode ----------

const MONTH_NAMES = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

export function getPeriodLabel(key: string, periodType: PeriodType): string {
  switch (periodType) {
    case "day":
      return format(new Date(key), "dd MMM yyyy", { locale: fr });
    case "week":
      return key.replace("-S", " Sem. ");
    case "month": {
      const [year, month] = key.split("-");
      return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
    }
    case "quarter":
      return key.replace("-T", " Trim. ");
    case "semester":
      return key.replace("-S", " Sem. ");
    case "year":
      return key;
    default:
      return key;
  }
}

// ---------- Calcul d'age ----------

export function calculateAge(dateNaissance: Date, referenceDate?: Date): number {
  return differenceInYears(referenceDate ?? new Date(), dateNaissance);
}

export function getAgeRange(age: number, ageRanges?: AgeRangeBound[]): string {
  const ranges = ageRanges ?? DEFAULT_ANALYTICS_SETTINGS.data.ageRanges;
  for (const range of ranges) {
    if (range.max === null) {
      if (age >= range.min) return range.label;
    } else {
      if (age >= range.min && age <= range.max) return range.label;
    }
  }
  return "Inconnu";
}

// ---------- Resolution de champs communs ----------

/**
 * Extrait l'ID de clinique d'un enregistrement quel que soit le modele.
 * Chaque modele Prisma utilise un nom de champ different (idClinique, istIdClinique, etc.)
 */
export function resolveCliniqueId(record: Record<string, unknown>): string {
  return (
    (record.idClinique as string) ??
    (record.istIdClinique as string) ??
    (record.infertIdClinique as string) ??
    (record.vbgIdClinique as string) ??
    (record.mdgIdClinique as string) ??
    (record.saaIdClinique as string) ??
    (record.grossesseIdClinique as string) ??
    (record.obstIdClinique as string) ??
    (record.accouchementIdClinique as string) ??
    (record.cponIdClinique as string) ??
    (record.testIdClinique as string) ??
    (record.depistageVihIdClinique as string) ??
    (record.pecVihIdClinique as string) ??
    (record.examenPvVihIdClinique as string) ??
    (record.ordonnanceIdClinique as string) ??
    ""
  );
}

/**
 * Extrait la date pertinente d'un enregistrement.
 */
export function resolveDateField(record: Record<string, unknown>): Date | null {
  const raw =
    record.dateVisite ??
    record.createdAt ??
    record.dateFacture ??
    record.istCreatedAt ??
    record.infertCreatedAt ??
    record.vbgCreatedAt ??
    record.mdgCreatedAt ??
    record.saaCreatedAt ??
    record.grossesseCreatedAt ??
    record.obstCreatedAt ??
    record.accouchementCreatedAt ??
    record.cponCreatedAt ??
    record.testCreatedAt ??
    record.depistageVihCreatedAt ??
    record.pecVihCreatedAt ??
    record.examenPvVihCreatedAt ??
    record.ordonnanceCreatedAt;

  if (!raw) return null;
  return raw instanceof Date ? raw : new Date(raw as string);
}

/**
 * Extrait l'ID client d'un enregistrement.
 */
export function resolveClientId(record: Record<string, unknown>): string {
  return (
    (record.idClient as string) ??
    (record.istIdClient as string) ??
    (record.infertIdClient as string) ??
    (record.vbgIdClient as string) ??
    (record.mdgIdClient as string) ??
    (record.saaIdClient as string) ??
    (record.grossesseIdClient as string) ??
    (record.obstIdClient as string) ??
    (record.accouchementIdClient as string) ??
    (record.cponIdClient as string) ??
    (record.testIdClient as string) ??
    (record.depistageVihIdClient as string) ??
    (record.pecVihIdClient as string) ??
    (record.examenPvVihIdClient as string) ??
    (record.ordonnanceIdClient as string) ??
    ""
  );
}

/**
 * Extrait l'ID user d'un enregistrement.
 */
export function resolveUserId(record: Record<string, unknown>): string {
  return (
    (record.idUser as string) ??
    (record.istIdUser as string) ??
    (record.infertIdUser as string) ??
    (record.vbgIdUser as string) ??
    (record.mdgIdUser as string) ??
    (record.saaIdUser as string) ??
    (record.grossesseIdUser as string) ??
    (record.obstIdUser as string) ??
    (record.accouchementIdUser as string) ??
    (record.cponIdUser as string) ??
    (record.testIdUser as string) ??
    (record.depistageVihIdUser as string) ??
    (record.pecVihIdUser as string) ??
    (record.examenPvVihIdUser as string) ??
    (record.ordonnanceIdUser as string) ??
    ""
  );
}

// ---------- Formatage ----------

export type FormatOpts = {
  locale?: string;
  currencyUnit?: string;
  percentageDecimals?: number;
  decimalMaxFractionDigits?: number;
};

export function formatNumber(
  value: number,
  type: "integer" | "decimal" | "percentage" | "currency",
  unit?: string,
  opts?: FormatOpts
): string {
  const locale = opts?.locale ?? DEFAULT_ANALYTICS_SETTINGS.data.formatting.locale;
  const pctDec = opts?.percentageDecimals ?? DEFAULT_ANALYTICS_SETTINGS.data.formatting.percentageDecimals;
  const decMax = opts?.decimalMaxFractionDigits ?? DEFAULT_ANALYTICS_SETTINGS.data.formatting.decimalMaxFractionDigits;
  const currency = unit ?? opts?.currencyUnit ?? DEFAULT_ANALYTICS_SETTINGS.data.formatting.currencyUnit;

  if (type === "percentage") {
    return `${value.toFixed(pctDec)}%`;
  }
  if (type === "currency") {
    return `${new Intl.NumberFormat(locale).format(value)} ${currency}`;
  }
  if (type === "decimal") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: decMax }).format(value);
  }
  return new Intl.NumberFormat(locale).format(Math.round(value));
}
