"use server";

import prisma from "@/lib/prisma";
import { AnalysisConfig, AnalysisResult, OrgUnitTreeNode } from "@/lib/analytics/types";
import { executeAnalysis } from "@/lib/analytics/engine";
import { INDICATOR_REGISTRY, getCategoryLabel } from "@/lib/analytics/indicators/registry";
import { generateDynamicIndicators } from "@/lib/analytics/indicators/dynamic";
import { createDimensionRegistry } from "@/lib/analytics/dimensions/registry";
import { generateExcelExport } from "@/lib/analytics/visualization/export-excel";
import { generatePdfExport } from "@/lib/analytics/visualization/export-pdf";
import { getAnalyticsConfig } from "@/lib/analytics/config";

// ============================================================
// Execution d'analyse
// ============================================================

export async function runAnalysis(
  config: AnalysisConfig
): Promise<AnalysisResult> {
  const settings = await getAnalyticsConfig();
  const dimensionRegistry = createDimensionRegistry(settings.data);
  const dynamicIndicators = generateDynamicIndicators(settings.data);
  const allIndicators = [...INDICATOR_REGISTRY, ...dynamicIndicators];
  return executeAnalysis(config, dimensionRegistry, allIndicators);
}

// ============================================================
// Metadata : indicateurs, dimensions, org units
// ============================================================

export async function getAvailableIndicators() {
  const settings = await getAnalyticsConfig();
  const dynamicIndicators = generateDynamicIndicators(settings.data);
  const allIndicators = [...INDICATOR_REGISTRY, ...dynamicIndicators];

  const grouped: Record<
    string,
    {
      category: string;
      categoryLabel: string;
      indicators: { id: string; name: string; shortName: string; description: string }[];
    }
  > = {};

  for (const ind of allIndicators) {
    if (!grouped[ind.category]) {
      grouped[ind.category] = {
        category: ind.category,
        categoryLabel: getCategoryLabel(ind.category),
        indicators: [],
      };
    }
    grouped[ind.category].indicators.push({
      id: ind.id,
      name: ind.name,
      shortName: ind.shortName,
      description: ind.description,
    });
  }

  // Ordre d'affichage des categories (financier en dernier)
  const CATEGORY_ORDER: string[] = [
    "general",
    "planification_familiale",
    "gynecologie",
    "obstetrique",
    "accouchement",
    "ist",
    "depistage_vih",
    "pec_vih",
    "medecine",
    "vbg",
    "infertilite",
    "saa",
    "cpon",
    "pharmacie",
    "laboratoire",
    "financier",
  ];

  return Object.values(grouped).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a.category);
    const idxB = CATEGORY_ORDER.indexOf(b.category);
    // Categories non listees vont avant financier mais apres les listees
    return (idxA === -1 ? CATEGORY_ORDER.length - 1 : idxA) - (idxB === -1 ? CATEGORY_ORDER.length - 1 : idxB);
  });
}

export async function getAvailableDimensions() {
  const settings = await getAnalyticsConfig();
  const registry = createDimensionRegistry(settings.data);

  const results = await Promise.all(
    registry.map(async (dim) => {
      const values = await Promise.resolve(dim.getValues());
      return {
        id: dim.id,
        name: dim.name,
        type: dim.type,
        values,
        canBeRow: dim.canBeRow,
        canBeColumn: dim.canBeColumn,
        canBeFilter: dim.canBeFilter,
      };
    })
  );

  // Ajouter la dimension virtuelle "indicator"
  const dynamicIndicators = generateDynamicIndicators(settings.data);
  const allIndicators = [...INDICATOR_REGISTRY, ...dynamicIndicators];
  results.unshift({
    id: "indicator",
    name: "Indicateur",
    type: "fixed",
    values: allIndicators.map((ind) => ({ value: ind.shortName, label: ind.shortName })),
    canBeRow: true,
    canBeColumn: true,
    canBeFilter: false,
  });

  return results;
}

export async function getOrgUnitTree(userId: string, isAdmin = false): Promise<OrgUnitTreeNode[]> {
  // Pour les admins : pas de filtre, afficher toutes les cliniques
  // Pour les autres : filtrer par idCliniques de l'utilisateur
  let cliniqueFilter: { id: { in: string[] } } | undefined;

  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { idCliniques: true },
    });
    const allowedIds = user?.idCliniques ?? [];
    cliniqueFilter = { id: { in: allowedIds } };
  }

  const regions = await prisma.region.findMany({
    include: {
      Districts: {
        include: {
          Cliniques: {
            ...(cliniqueFilter ? { where: cliniqueFilter } : {}),
            select: { id: true, nomClinique: true, codeClinique: true },
          },
        },
      },
      Cliniques: {
        ...(cliniqueFilter ? { where: cliniqueFilter } : {}),
        select: { id: true, nomClinique: true, codeClinique: true, idDistrict: true },
      },
    },
    orderBy: { nomRegion: "asc" },
  });

  return regions
    .map((region) => {
      const unassignedCliniques = region.Cliniques.filter((c) => !c.idDistrict);

      const districtNodes: OrgUnitTreeNode[] = region.Districts
        .filter((d) => d.Cliniques.length > 0)
        .map((district) => ({
          id: district.id,
          name: district.nomDistrict,
          code: district.codeDistrict,
          level: "district" as const,
          children: district.Cliniques.map((clinique) => ({
            id: clinique.id,
            name: clinique.nomClinique,
            code: clinique.codeClinique,
            level: "clinique" as const,
            children: [],
          })),
        }));

      const unassignedNodes: OrgUnitTreeNode[] = unassignedCliniques.map((clinique) => ({
        id: clinique.id,
        name: clinique.nomClinique,
        code: clinique.codeClinique,
        level: "clinique" as const,
        children: [],
      }));

      return {
        id: region.id,
        name: region.nomRegion,
        code: region.codeRegion,
        level: "region" as const,
        children: [...districtNodes, ...unassignedNodes],
      };
    })
    .filter((region) => region.children.length > 0);
}

// ============================================================
// Analyses sauvegardees
// ============================================================

export async function saveAnalysis(params: {
  name: string;
  description?: string;
  configuration: AnalysisConfig;
  userId: string;
  isShared?: boolean;
}) {
  const saved = await prisma.savedAnalysis.create({
    data: {
      name: params.name,
      description: params.description,
      configuration: params.configuration as unknown as Record<string, unknown>,
      createdByUserId: params.userId,
      isShared: params.isShared ?? false,
    },
  });
  return { id: saved.id };
}

export async function updateAnalysis(params: {
  id: string;
  name?: string;
  description?: string;
  configuration?: AnalysisConfig;
  isShared?: boolean;
}) {
  await prisma.savedAnalysis.update({
    where: { id: params.id },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.configuration && {
        configuration: params.configuration as unknown as Record<string, unknown>,
      }),
      ...(params.isShared !== undefined && { isShared: params.isShared }),
      version: { increment: 1 },
    },
  });
}

export async function listSavedAnalyses(userId: string) {
  return prisma.savedAnalysis.findMany({
    where: {
      OR: [{ createdByUserId: userId }, { isShared: true }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      version: true,
      isShared: true,
      createdByUserId: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function loadSavedAnalysis(id: string) {
  const saved = await prisma.savedAnalysis.findUnique({ where: { id } });
  if (!saved) return null;
  return {
    id: saved.id,
    name: saved.name,
    description: saved.description,
    configuration: saved.configuration as unknown as AnalysisConfig,
    version: saved.version,
  };
}

export async function deleteSavedAnalysis(id: string, userId: string) {
  await prisma.savedAnalysis.delete({
    where: { id, createdByUserId: userId },
  });
}

// ============================================================
// Export Excel
// ============================================================

export async function exportAnalysisToExcel(
  result: AnalysisResult,
  config: AnalysisConfig
): Promise<string> {
  const settings = await getAnalyticsConfig();
  const dynamicIndicators = generateDynamicIndicators(settings.data);
  const allIndicators = [...INDICATOR_REGISTRY, ...dynamicIndicators];
  const buffer = await generateExcelExport(result, config, settings.export.excel, allIndicators);
  return buffer.toString("base64");
}

// ============================================================
// Export PDF
// ============================================================

export async function exportAnalysisToPdf(
  result: AnalysisResult,
  config: AnalysisConfig
): Promise<string> {
  const settings = await getAnalyticsConfig();
  const dynamicIndicators = generateDynamicIndicators(settings.data);
  const allIndicators = [...INDICATOR_REGISTRY, ...dynamicIndicators];
  const data = generatePdfExport(result, config, settings.export.pdf, allIndicators);
  return Buffer.from(data).toString("base64");
}
