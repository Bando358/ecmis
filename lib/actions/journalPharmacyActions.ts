"use server";

import prisma from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";

// ===== Types =====
interface LogActionParams {
  idUser: string;
  userName?: string;
  action: AuditAction;
  entite: string;
  entiteId: string;
  idClinique?: string | null;
  description: string;
  anciennesDonnees?: Record<string, unknown> | null;
  nouvellesDonnees?: Record<string, unknown> | null;
}

interface FetchJournalParams {
  page?: number;
  pageSize?: number;
  idClinique?: string;
  entite?: string;
  action?: AuditAction;
  idUser?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// ===== Cache pour résoudre les noms d'utilisateurs =====
const userNameCache = new Map<string, string>();

async function resolveUserName(idUser: string): Promise<string> {
  if (userNameCache.has(idUser)) return userNameCache.get(idUser)!;
  try {
    const user = await prisma.user.findUnique({
      where: { id: idUser },
      select: { name: true, username: true },
    });
    const name = user?.name || user?.username || "Inconnu";
    userNameCache.set(idUser, name);
    return name;
  } catch {
    return "Inconnu";
  }
}

// ===== Création d'une entrée de journal =====
export async function logAction(params: LogActionParams) {
  try {
    const userName = params.userName || (await resolveUserName(params.idUser));
    await prisma.journalPharmacy.create({
      data: {
        idUser: params.idUser,
        userName,
        action: params.action,
        entite: params.entite,
        entiteId: params.entiteId,
        idClinique: params.idClinique ?? null,
        description: params.description,
        anciennesDonnees: params.anciennesDonnees
          ? (params.anciennesDonnees as Prisma.InputJsonValue)
          : undefined,
        nouvellesDonnees: params.nouvellesDonnees
          ? (params.nouvellesDonnees as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (error) {
    // Ne fait JAMAIS échouer l'opération principale
    console.error("Erreur journal pharmacy:", error);
  }
}

// ===== Récupérer les entrées de journal (paginé + filtré) =====
export async function fetchJournalEntries(params: FetchJournalParams) {
  const {
    page = 1,
    pageSize = 50,
    idClinique,
    entite,
    action,
    idUser,
    dateFrom,
    dateTo,
    search,
  } = params;

  const where: Prisma.JournalPharmacyWhereInput = {};

  if (idClinique) where.idClinique = idClinique;
  if (entite) where.entite = entite;
  if (action) where.action = action;
  if (idUser) where.idUser = idUser;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }
  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }

  const [logs, total] = await Promise.all([
    prisma.journalPharmacy.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.journalPharmacy.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ===== Export : données de facturation directes + suppressions du journal =====
export async function fetchFacturesForExport(params: {
  dateFrom?: Date;
  dateTo?: Date;
  idClinique?: string;
}) {
  const cliniqueFilter = params.idClinique
    ? { idClinique: params.idClinique }
    : {};

  // Filtre date pour FactureProduit / FacturePrestation (ont dateFacture)
  const dateFactureFilter: Record<string, unknown> = {};
  if (params.dateFrom || params.dateTo) {
    const df: Record<string, Date> = {};
    if (params.dateFrom) df.gte = params.dateFrom;
    if (params.dateTo) df.lte = params.dateTo;
    dateFactureFilter.dateFacture = df;
  }

  // Filtre date pour FactureExamen / FactureEchographie (via Visite.dateVisite)
  const dateVisiteFilter: Record<string, unknown> = {};
  if (params.dateFrom || params.dateTo) {
    const dv: Record<string, Date> = {};
    if (params.dateFrom) dv.gte = params.dateFrom;
    if (params.dateTo) dv.lte = params.dateTo;
    dateVisiteFilter.Visite = { dateVisite: dv };
  }

  const userSelect = { select: { name: true, username: true } } as const;
  const clientSelect = { select: { nom: true, prenom: true } } as const;

  // 1. Factures existantes (séquentiel pour éviter de saturer le pool Neon)
  const produits = await prisma.factureProduit.findMany({
    where: { ...cliniqueFilter, ...dateFactureFilter },
    include: { Client: clientSelect, User: userSelect },
    orderBy: { dateFacture: "desc" },
  });
  const prestations = await prisma.facturePrestation.findMany({
    where: { ...cliniqueFilter, ...dateFactureFilter },
    include: { Client: clientSelect, User: userSelect },
    orderBy: { dateFacture: "desc" },
  });
  const examens = await prisma.factureExamen.findMany({
    where: { ...cliniqueFilter, ...dateVisiteFilter },
    include: {
      Client: clientSelect,
      User: userSelect,
      Visite: { select: { dateVisite: true } },
    },
  });
  const echographies = await prisma.factureEchographie.findMany({
    where: { ...cliniqueFilter, ...dateVisiteFilter },
    include: {
      Client: clientSelect,
      User: userSelect,
      Visite: { select: { dateVisite: true } },
    },
  });

  // 2. Factures supprimées (depuis le journal d'audit)
  const whereJournal: Prisma.JournalPharmacyWhereInput = {
    action: "SUPPRESSION",
    entite: {
      in: [
        "FactureProduit",
        "FacturePrestation",
        "FactureExamen",
        "FactureEchographie",
      ],
    },
  };
  if (params.idClinique) whereJournal.idClinique = params.idClinique;
  if (params.dateFrom || params.dateTo) {
    whereJournal.createdAt = {};
    if (params.dateFrom)
      (whereJournal.createdAt as Record<string, Date>).gte = params.dateFrom;
    if (params.dateTo)
      (whereJournal.createdAt as Record<string, Date>).lte = params.dateTo;
  }

  const suppressions = await prisma.journalPharmacy.findMany({
    where: whereJournal,
    orderBy: { createdAt: "desc" },
  });

  const userName = (u: { name: string | null; username: string }) =>
    u.name || u.username || "Inconnu";
  const clientName = (c: { nom: string | null; prenom: string | null }) =>
    `${c.nom ?? ""} ${c.prenom ?? ""}`.trim();

  return {
    produits: produits.map((p) => ({
      date: p.dateFacture,
      user: userName(p.User),
      client: clientName(p.Client),
      nomProduit: p.nomProduit,
      quantite: p.quantite,
      montant: p.montantProduit,
    })),
    prestations: prestations.map((p) => ({
      date: p.dateFacture,
      user: userName(p.User),
      client: clientName(p.Client),
      libellePrestation: p.libellePrestation,
      prix: p.prixPrestation,
    })),
    examens: examens.map((e) => ({
      date: e.Visite.dateVisite,
      user: userName(e.User),
      client: clientName(e.Client),
      libelleExamen: e.libelleExamen,
      prix: e.prixExamen,
      remise: e.remiseExamen,
    })),
    echographies: echographies.map((e) => ({
      date: e.Visite.dateVisite,
      user: userName(e.User),
      client: clientName(e.Client),
      libelleEchographie: e.libelleEchographie,
      prix: e.prixEchographie,
      remise: e.remiseEchographie,
    })),
    suppressions: suppressions.map((s) => ({
      date: s.createdAt,
      user: s.userName,
      entite: s.entite,
      description: s.description,
      data: (s.anciennesDonnees || s.nouvellesDonnees) as Record<
        string,
        unknown
      > | null,
    })),
  };
}

// ===== Statistiques du journal =====
export async function fetchJournalStats(cliniqueIds?: string[]) {
  const where: Prisma.JournalPharmacyWhereInput = cliniqueIds?.length
    ? { idClinique: { in: cliniqueIds } }
    : {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalLogs, todayLogs, actionCounts] = await Promise.all([
    prisma.journalPharmacy.count({ where }),
    prisma.journalPharmacy.count({
      where: { ...where, createdAt: { gte: todayStart } },
    }),
    prisma.journalPharmacy.groupBy({
      by: ["action"],
      where,
      _count: true,
    }),
  ]);

  return { totalLogs, todayLogs, actionCounts };
}
