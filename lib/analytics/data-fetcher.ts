import prisma from "@/lib/prisma";
import { DataSource, DimensionFilter, FetchedData, IndicatorDefinition } from "./types";
import { getIndicator } from "./indicators/registry";

/**
 * Determine les DataSources requises a partir des indicateurs selectionnes,
 * puis execute les requetes Prisma en parallele.
 *
 * Pattern identique a dashboardActions.ts : Promise.all avec include Client
 * pour permettre l'extraction des dimensions (sexe, age, statusClient).
 */
export async function fetchAnalyticsData(params: {
  indicators: string[];
  cliniqueIds: string[];
  startDate: Date;
  endDate: Date;
  filters: DimensionFilter[];
  indicatorRegistry?: IndicatorDefinition[];
}): Promise<FetchedData> {
  const { cliniqueIds, startDate, endDate } = params;

  // 1. Determiner les sources de donnees requises
  const requiredSources = new Set<DataSource>();
  for (const indicatorId of params.indicators) {
    const indicator = getIndicator(indicatorId, params.indicatorRegistry);
    if (!indicator) continue; // Indicateur supprime ou renomme, on l'ignore
    for (const ds of indicator.dataSources) {
      requiredSources.add(ds);
    }
  }

  // Include commun pour joindre les infos Client
  const clientSelect = {
    select: { sexe: true, dateNaissance: true, statusClient: true, nom: true, prenom: true },
  };
  const userSelect = { select: { name: true, id: true } };

  // 2. Construire les requetes
  const queries: Partial<Record<DataSource, Promise<Record<string, unknown>[]>>> = {};

  if (requiredSources.has("visite")) {
    queries.visite = prisma.visite.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        dateVisite: { gte: startDate, lte: endDate },
      },
      include: { Client: clientSelect, User: userSelect },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("planning")) {
    queries.planning = prisma.planning.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true, idClinique: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("gynecologie")) {
    queries.gynecologie = prisma.gynecologie.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("obstetrique")) {
    queries.obstetrique = prisma.obstetrique.findMany({
      where: {
        obstIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("accouchement")) {
    queries.accouchement = prisma.accouchement.findMany({
      where: {
        accouchementIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("cpon")) {
    queries.cpon = prisma.cpon.findMany({
      where: {
        cponIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("ist")) {
    queries.ist = prisma.ist.findMany({
      where: {
        istIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("infertilite")) {
    queries.infertilite = prisma.infertilite.findMany({
      where: {
        infertIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("vbg")) {
    queries.vbg = prisma.vbg.findMany({
      where: {
        vbgIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("medecine")) {
    queries.medecine = prisma.medecine.findMany({
      where: {
        mdgIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("saa")) {
    queries.saa = prisma.saa.findMany({
      where: {
        saaIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("depistageVih")) {
    queries.depistageVih = prisma.depistageVih.findMany({
      where: {
        depistageVihIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("pecVih")) {
    queries.pecVih = prisma.pecVih.findMany({
      where: {
        pecVihIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("grossesse")) {
    queries.grossesse = prisma.grossesse.findMany({
      where: {
        grossesseIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("testGrossesse")) {
    queries.testGrossesse = prisma.testGrossesse.findMany({
      where: {
        testIdClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("facturePrestation")) {
    queries.facturePrestation = prisma.facturePrestation.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        dateFacture: { gte: startDate, lte: endDate },
      },
      include: { Client: clientSelect, User: userSelect },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("factureProduit")) {
    queries.factureProduit = prisma.factureProduit.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        dateFacture: { gte: startDate, lte: endDate },
      },
      include: { Client: clientSelect, User: userSelect },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("factureExamen")) {
    queries.factureExamen = prisma.factureExamen.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  if (requiredSources.has("factureEchographie")) {
    queries.factureEchographie = prisma.factureEchographie.findMany({
      where: {
        idClinique: { in: cliniqueIds },
        Visite: { dateVisite: { gte: startDate, lte: endDate } },
      },
      include: {
        Visite: { select: { dateVisite: true } },
        Client: clientSelect,
        User: userSelect,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  // 3. Executer en parallele
  const keys = Object.keys(queries) as DataSource[];
  const promises = keys.map((k) => queries[k]!);
  const results = await Promise.all(promises);

  // 4. Annoter chaque enregistrement avec __dataSource pour la dimension serviceType
  const fetchedData: FetchedData = {};
  keys.forEach((key, i) => {
    fetchedData[key] = (results[i] as Record<string, unknown>[]).map((r) => ({
      ...r,
      __dataSource: key,
    }));
  });

  return fetchedData;
}
