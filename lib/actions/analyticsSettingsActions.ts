"use server";

import prisma from "@/lib/prisma";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { AnalyticsSettingsConfig } from "@/lib/analytics/settings-types";
import { DEFAULT_ANALYTICS_SETTINGS } from "@/lib/analytics/settings-defaults";

/**
 * Charge les parametres analytiques (deep-merged avec defaults).
 */
export async function getAnalyticsSettings(): Promise<AnalyticsSettingsConfig> {
  return getAnalyticsConfig();
}

/**
 * Met a jour les parametres analytiques (upsert singleton).
 */
export async function updateAnalyticsSettings(
  settings: AnalyticsSettingsConfig,
  userId: string
): Promise<void> {
  await prisma.analyticsSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      configuration: settings as unknown as Record<string, unknown>,
      updatedBy: userId,
    },
    update: {
      configuration: settings as unknown as Record<string, unknown>,
      updatedBy: userId,
    },
  });
}

/**
 * Reinitialise les parametres aux valeurs par defaut.
 */
export async function resetAnalyticsSettings(userId: string): Promise<void> {
  await prisma.analyticsSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      configuration: DEFAULT_ANALYTICS_SETTINGS as unknown as Record<string, unknown>,
      updatedBy: userId,
    },
    update: {
      configuration: DEFAULT_ANALYTICS_SETTINGS as unknown as Record<string, unknown>,
      updatedBy: userId,
    },
  });
}
