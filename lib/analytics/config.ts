import prisma from "@/lib/prisma";
import { AnalyticsSettingsConfig } from "./settings-types";
import { DEFAULT_ANALYTICS_SETTINGS } from "./settings-defaults";

/**
 * Deep merge recursif : les valeurs de `overrides` remplacent celles de `defaults`.
 * Les tableaux sont remplaces entierement (pas de merge element par element).
 */
function deepMerge<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T> | undefined
): T {
  if (!overrides) return defaults;

  const result = { ...defaults };

  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const overrideVal = overrides[key];
    const defaultVal = defaults[key];

    if (overrideVal === undefined) continue;

    if (
      overrideVal !== null &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      defaultVal !== null &&
      typeof defaultVal === "object" &&
      !Array.isArray(defaultVal)
    ) {
      result[key] = deepMerge(
        defaultVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = overrideVal as T[keyof T];
    }
  }

  return result;
}

/**
 * Normalise les serviceTypes pour garantir que chaque entree
 * possede les champs `enabled` et `properties` (retrocompatibilite
 * avec l'ancien format { value, label }).
 */
function normalizeServiceTypes(config: AnalyticsSettingsConfig): AnalyticsSettingsConfig {
  const defaultMap = new Map(
    DEFAULT_ANALYTICS_SETTINGS.data.serviceTypes.map((st) => [st.value, st])
  );

  config.data.serviceTypes = config.data.serviceTypes.map((st) => ({
    value: st.value,
    label: st.label,
    enabled: st.enabled ?? true,
    totalLabel: st.totalLabel ?? defaultMap.get(st.value)?.totalLabel,
    properties: (st.properties ?? defaultMap.get(st.value)?.properties ?? []).map((p) => ({
      key: p.key,
      label: p.label,
      includedInTotal: p.includedInTotal ?? false,
    })),
  }));

  return config;
}

/**
 * Charge la configuration analytique depuis la base de donnees.
 * Deep-merge avec les defaults pour garantir que toutes les cles existent.
 */
export async function getAnalyticsConfig(): Promise<AnalyticsSettingsConfig> {
  try {
    const row = await prisma.analyticsSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!row || !row.configuration) {
      return DEFAULT_ANALYTICS_SETTINGS;
    }

    const merged = deepMerge(
      DEFAULT_ANALYTICS_SETTINGS,
      row.configuration as Partial<AnalyticsSettingsConfig>
    );

    return normalizeServiceTypes(merged);
  } catch {
    return DEFAULT_ANALYTICS_SETTINGS;
  }
}
