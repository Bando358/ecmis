import { DimensionDefinition, DimensionContext } from "../types";
import { resolveCliniqueId, resolveDateField, getPeriodKey, calculateAge, getAgeRange, resolveUserId } from "../utils";
import { DataSettings } from "../settings-types";
import { DEFAULT_ANALYTICS_SETTINGS } from "../settings-defaults";
import prisma from "@/lib/prisma";

// ---------- Helpers internes ----------

function extractClientField(record: Record<string, unknown>, field: string): string {
  const client = record.Client as Record<string, unknown> | undefined;
  return (client?.[field] as string) ?? (record[field] as string) ?? "Non specifie";
}

function extractClientDob(record: Record<string, unknown>): Date | null {
  const client = record.Client as Record<string, unknown> | undefined;
  const raw = client?.dateNaissance ?? record.dateNaissance;
  if (!raw) return null;
  return raw instanceof Date ? raw : new Date(raw as string);
}

// ---------- Factory ----------

/**
 * Cree le registre de dimensions avec les parametres configurables.
 * Si `dataSettings` n'est pas fourni, utilise les valeurs par defaut.
 */
export function createDimensionRegistry(dataSettings?: DataSettings): DimensionDefinition[] {
  const ds = dataSettings ?? DEFAULT_ANALYTICS_SETTINGS.data;
  const periodCount = DEFAULT_ANALYTICS_SETTINGS.charts.period.periodDimensionValuesCount;

  return [
    // ===== FIXED =====
    {
      id: "orgUnit",
      name: "Clinique",
      type: "fixed",
      extractor: (record, ctx) => {
        const cliniqueId = resolveCliniqueId(record);
        return ctx?.cliniqueMap?.get(cliniqueId)?.nomClinique ?? cliniqueId;
      },
      getValues: async () => {
        const cliniques = await prisma.clinique.findMany({
          select: { id: true, nomClinique: true },
          orderBy: { nomClinique: "asc" },
        });
        return cliniques.map((c) => ({ value: c.id, label: c.nomClinique }));
      },
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "region",
      name: "Region",
      type: "fixed",
      extractor: (record, ctx) => {
        const cliniqueId = resolveCliniqueId(record);
        const clinique = ctx?.cliniqueMap?.get(cliniqueId);
        return ctx?.regionMap?.get(clinique?.idRegion ?? "")?.nomRegion ?? "Inconnue";
      },
      getValues: async () => {
        const regions = await prisma.region.findMany({
          select: { id: true, nomRegion: true },
          orderBy: { nomRegion: "asc" },
        });
        return regions.map((r) => ({ value: r.id, label: r.nomRegion }));
      },
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "district",
      name: "District",
      type: "fixed",
      extractor: (record, ctx) => {
        const cliniqueId = resolveCliniqueId(record);
        const clinique = ctx?.cliniqueMap?.get(cliniqueId);
        const districtId = clinique?.idDistrict;
        if (!districtId) return "Non assigne";
        return ctx?.districtMap?.get(districtId)?.nomDistrict ?? "Inconnu";
      },
      getValues: async () => {
        const districts = await prisma.district.findMany({
          select: { id: true, nomDistrict: true },
          orderBy: { nomDistrict: "asc" },
        });
        return districts.map((d) => ({ value: d.id, label: d.nomDistrict }));
      },
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "period",
      name: "Periode",
      type: "fixed",
      extractor: (record) => {
        const date = resolveDateField(record);
        return date ? getPeriodKey(date, "month") : "N/A";
      },
      getValues: () => {
        const values = [];
        const now = new Date();
        for (let i = 0; i < periodCount; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          values.push({ value: key, label: label.charAt(0).toUpperCase() + label.slice(1) });
        }
        return values;
      },
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },

    // ===== DYNAMIC =====
    {
      id: "sexe",
      name: "Sexe",
      type: "dynamic",
      extractor: (record) => extractClientField(record, "sexe"),
      getValues: () => ds.genderValues,
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "ageRange",
      name: "Tranche d'age",
      type: "dynamic",
      extractor: (record) => {
        const dob = extractClientDob(record);
        if (!dob) return "Inconnu";
        return getAgeRange(calculateAge(dob), ds.ageRanges);
      },
      getValues: () => ds.ageRanges.map((r) => ({ value: r.label, label: r.label })),
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "serviceType",
      name: "Type de service",
      type: "dynamic",
      extractor: (record) => (record.__dataSource as string) ?? "Autre",
      getValues: () =>
        ds.serviceTypes
          .filter((st) => st.enabled !== false)
          .map((st) => ({ value: st.value, label: st.label })),
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "statusClient",
      name: "Statut du client",
      type: "dynamic",
      extractor: (record) => extractClientField(record, "statusClient"),
      getValues: () => ds.clientStatuses,
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "typeContraception",
      name: "Type de contraception",
      type: "dynamic",
      extractor: (record) => (record.typeContraception as string) ?? "Non specifie",
      getValues: () => ds.contraceptionTypes,
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "statutPf",
      name: "Statut PF (NU/AU)",
      type: "dynamic",
      extractor: (record) => {
        const statut = record.statut as string | undefined;
        if (statut === "nu") return "Nouveau utilisateur";
        if (statut === "au") return "Ancien utilisateur";
        return "Non specifie";
      },
      getValues: () => [
        { value: "Nouveau utilisateur", label: "Nouveau utilisateur" },
        { value: "Ancien utilisateur", label: "Ancien utilisateur" },
      ],
      canBeRow: true,
      canBeColumn: true,
      canBeFilter: true,
    },
    {
      id: "prescripteur",
      name: "Prescripteur",
      type: "dynamic",
      extractor: (record) => {
        const user = record.User as Record<string, unknown> | undefined;
        return (user?.name as string) ?? resolveUserId(record);
      },
      getValues: async () => {
        const users = await prisma.user.findMany({
          where: { prescripteur: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        return users.map((u) => ({ value: u.id, label: u.name }));
      },
      canBeRow: true,
      canBeColumn: false,
      canBeFilter: true,
    },
  ];
}

// Export par defaut pour retrocompatibilite
export const DIMENSION_REGISTRY = createDimensionRegistry();

// ---------- Helpers ----------

export function getDimension(id: string, registry?: DimensionDefinition[]): DimensionDefinition {
  const reg = registry ?? DIMENSION_REGISTRY;
  const dim = reg.find((d) => d.id === id);
  if (!dim) throw new Error(`Dimension inconnue: ${id}`);
  return dim;
}
