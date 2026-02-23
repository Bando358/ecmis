"use server";

import prisma from "@/lib/prisma";

// ===== Types =====
export interface FinancialSummary {
  totalVentesProduits: number;
  totalPrestations: number;
  totalExamens: number;
  totalEchographies: number;
  totalGeneral: number;
  totalCommissionsExamen: number;
  totalCommissionsEchographie: number;
  stockAlerts: {
    nomProduit: string;
    quantiteStock: number;
    prixUnitaire: number;
  }[];
}

export interface RevenueByPeriod {
  period: string;
  produits: number;
  prestations: number;
  examens: number;
  echographies: number;
  total: number;
}

export interface TopProduct {
  nomProduit: string;
  quantiteVendue: number;
  montantTotal: number;
}

export interface RecentLog {
  id: string;
  createdAt: Date;
  userName: string;
  action: string;
  entite: string;
  description: string;
}

export interface PreviousPeriodSummary {
  totalVentesProduits: number;
  totalPrestations: number;
  totalExamens: number;
  totalEchographies: number;
  totalGeneral: number;
}

export interface FinancialDashboardData {
  summary: FinancialSummary;
  previousPeriod: PreviousPeriodSummary | null;
  revenueByPeriod: RevenueByPeriod[];
  topProducts: TopProduct[];
  recentLogs: RecentLog[];
}

export async function fetchFinancialDashboardData(
  cliniqueIds: string[],
  dateFrom: Date,
  dateTo: Date,
  previousDateFrom: Date | null,
  previousDateTo: Date | null
): Promise<FinancialDashboardData> {
  if (!cliniqueIds.length) {
    return {
      summary: {
        totalVentesProduits: 0,
        totalPrestations: 0,
        totalExamens: 0,
        totalEchographies: 0,
        totalGeneral: 0,
        totalCommissionsExamen: 0,
        totalCommissionsEchographie: 0,
        stockAlerts: [],
      },
      previousPeriod: null,
      revenueByPeriod: [],
      topProducts: [],
      recentLogs: [],
    };
  }

  const hasPreviousPeriod = previousDateFrom !== null && previousDateTo !== null;

  const clinicFilter = { in: cliniqueIds };

  // Batch 1 : les 4 factures (requetes les plus lourdes)
  const [
    facturesProduits,
    facturesPrestations,
    facturesExamens,
    facturesEchographies,
  ] = await Promise.all([
    prisma.factureProduit.findMany({
      where: {
        idClinique: clinicFilter,
        dateFacture: { gte: dateFrom, lte: dateTo },
      },
      select: {
        nomProduit: true,
        quantite: true,
        montantProduit: true,
        dateFacture: true,
      },
    }),
    prisma.facturePrestation.findMany({
      where: {
        idClinique: clinicFilter,
        dateFacture: { gte: dateFrom, lte: dateTo },
      },
      select: {
        libellePrestation: true,
        prixPrestation: true,
        dateFacture: true,
      },
    }),
    prisma.factureExamen.findMany({
      where: {
        idClinique: clinicFilter,
        Visite: { dateVisite: { gte: dateFrom, lte: dateTo } },
      },
      select: {
        libelleExamen: true,
        prixExamen: true,
        remiseExamen: true,
        Visite: { select: { dateVisite: true } },
      },
    }),
    prisma.factureEchographie.findMany({
      where: {
        idClinique: clinicFilter,
        Visite: { dateVisite: { gte: dateFrom, lte: dateTo } },
      },
      select: {
        libelleEchographie: true,
        prixEchographie: true,
        remiseEchographie: true,
        Visite: { select: { dateVisite: true } },
      },
    }),
  ]);

  // Batch 2 : aggregations + stock + journal (4 requêtes)
  const [commissionsExamen, commissionsEchographie, stockAlerts, recentLogs] = await Promise.all([
    prisma.commissionExamen.aggregate({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { montantCommission: true },
    }),
    prisma.commissionEchographie.aggregate({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { montantCommission: true },
    }),
    prisma.tarifProduit.findMany({
      where: {
        idClinique: clinicFilter,
        quantiteStock: { lt: 10 },
      },
      include: { Produit: { select: { nomProduit: true } } },
      orderBy: { quantiteStock: "asc" },
      take: 20,
    }) as Promise<{ Produit: { nomProduit: string }; quantiteStock: number; prixUnitaire: number }[]>,
    prisma.journalPharmacy.findMany({
      where: {
        OR: [
          { idClinique: clinicFilter },
          { idClinique: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        userName: true,
        action: true,
        entite: true,
        description: true,
      },
    }),
  ]);

  // Batch 3 : période précédente (4 requêtes, uniquement si nécessaire)
  type AggResult = { _sum: { montantProduit?: number | null; prixPrestation?: number | null; prixExamen?: number | null; prixEchographie?: number | null } };
  let prevResults: [AggResult, AggResult, AggResult, AggResult] | null = null;

  if (hasPreviousPeriod) {
    const [prevProduit, prevPrestation, prevExamen, prevEchographie] = await Promise.all([
      prisma.factureProduit.aggregate({
        where: {
          idClinique: clinicFilter,
          dateFacture: { gte: previousDateFrom!, lte: previousDateTo! },
        },
        _sum: { montantProduit: true },
      }),
      prisma.facturePrestation.aggregate({
        where: {
          idClinique: clinicFilter,
          dateFacture: { gte: previousDateFrom!, lte: previousDateTo! },
        },
        _sum: { prixPrestation: true },
      }),
      prisma.factureExamen.aggregate({
        where: {
          idClinique: clinicFilter,
          Visite: { dateVisite: { gte: previousDateFrom!, lte: previousDateTo! } },
        },
        _sum: { prixExamen: true },
      }),
      prisma.factureEchographie.aggregate({
        where: {
          idClinique: clinicFilter,
          Visite: { dateVisite: { gte: previousDateFrom!, lte: previousDateTo! } },
        },
        _sum: { prixEchographie: true },
      }),
    ]);
    prevResults = [prevProduit as AggResult, prevPrestation as AggResult, prevExamen as AggResult, prevEchographie as AggResult];
  }

  // Calcul des totaux
  const totalVentesProduits = facturesProduits.reduce((s, f) => s + f.montantProduit, 0);
  const totalPrestations = facturesPrestations.reduce((s, f) => s + f.prixPrestation, 0);
  const totalExamens = facturesExamens.reduce((s, f) => s + f.prixExamen, 0);
  const totalEchographies = facturesEchographies.reduce((s, f) => s + f.prixEchographie, 0);

  // Revenus par jour
  const revenueMap = new Map<string, RevenueByPeriod>();

  const addToRevenue = (
    dateStr: string,
    field: "produits" | "prestations" | "examens" | "echographies",
    amount: number
  ) => {
    if (!revenueMap.has(dateStr)) {
      revenueMap.set(dateStr, {
        period: dateStr,
        produits: 0,
        prestations: 0,
        examens: 0,
        echographies: 0,
        total: 0,
      });
    }
    const entry = revenueMap.get(dateStr)!;
    entry[field] += amount;
    entry.total += amount;
  };

  facturesProduits.forEach((f) => {
    const d = f.dateFacture.toISOString().split("T")[0];
    addToRevenue(d, "produits", f.montantProduit);
  });
  facturesPrestations.forEach((f) => {
    const d = f.dateFacture.toISOString().split("T")[0];
    addToRevenue(d, "prestations", f.prixPrestation);
  });
  facturesExamens.forEach((f) => {
    const d = f.Visite?.dateVisite?.toISOString().split("T")[0];
    if (d) addToRevenue(d, "examens", f.prixExamen);
  });
  facturesEchographies.forEach((f) => {
    const d = f.Visite?.dateVisite?.toISOString().split("T")[0];
    if (d) addToRevenue(d, "echographies", f.prixEchographie);
  });

  // Top produits
  const productMap = new Map<string, { quantiteVendue: number; montantTotal: number }>();
  facturesProduits.forEach((f) => {
    const entry = productMap.get(f.nomProduit) || { quantiteVendue: 0, montantTotal: 0 };
    entry.quantiteVendue += f.quantite;
    entry.montantTotal += f.montantProduit;
    productMap.set(f.nomProduit, entry);
  });

  const topProducts = Array.from(productMap.entries())
    .map(([nom, data]) => ({ nomProduit: nom, ...data }))
    .sort((a, b) => b.montantTotal - a.montantTotal)
    .slice(0, 10);

  // Totaux periode precedente (null si periode < 14 jours)
  let previousPeriod: PreviousPeriodSummary | null = null;
  if (prevResults) {
    const prevTotalProduits = prevResults[0]._sum.montantProduit ?? 0;
    const prevTotalPrestations = prevResults[1]._sum.prixPrestation ?? 0;
    const prevTotalExamens = prevResults[2]._sum.prixExamen ?? 0;
    const prevTotalEchographies = prevResults[3]._sum.prixEchographie ?? 0;
    previousPeriod = {
      totalVentesProduits: prevTotalProduits,
      totalPrestations: prevTotalPrestations,
      totalExamens: prevTotalExamens,
      totalEchographies: prevTotalEchographies,
      totalGeneral: prevTotalProduits + prevTotalPrestations + prevTotalExamens + prevTotalEchographies,
    };
  }

  return {
    summary: {
      totalVentesProduits,
      totalPrestations,
      totalExamens,
      totalEchographies,
      totalGeneral: totalVentesProduits + totalPrestations + totalExamens + totalEchographies,
      totalCommissionsExamen: commissionsExamen._sum.montantCommission || 0,
      totalCommissionsEchographie: commissionsEchographie._sum.montantCommission || 0,
      stockAlerts: stockAlerts.map((s) => ({
        nomProduit: s.Produit.nomProduit,
        quantiteStock: s.quantiteStock,
        prixUnitaire: s.prixUnitaire,
      })),
    },
    previousPeriod,
    revenueByPeriod: Array.from(revenueMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    ),
    topProducts,
    recentLogs: recentLogs,
  };
}
