"use server";

import { Visite, Prisma, TableName } from "@prisma/client";
import prisma from "../prisma";
import { normalizePagination, buildPaginatedResult, type PaginatedResult, type PaginationParams } from "./paginationHelper";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { VisiteCreateSchema } from "@/lib/validations";
import { logAction } from "./journalPharmacyActions";

// Création d'une Visite
export async function createVisite(data: Visite) {
  await requirePermission(TableName.VISITE, "canCreate");
  validateServerData(VisiteCreateSchema, data);
  const visite = await prisma.visite.create({
    data,
  });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "Visite",
    entiteId: visite.id,
    idClinique: data.idClinique,
    description: `Création visite pour client ${data.idClient} - motif: ${data.motifVisite}`,
  });
  return visite;
}

// on va vérifier si un client à dejà une visite à une date donnée
export async function checkClientVisiteOnDate(
  idClient: string,
  dateVisite: Date,
  idUser: string,
  idClinique: string // Ajouter ce paramètre obligatoire
) {
  await requirePermission(TableName.VISITE, "canCreate");
  const startOfDay = new Date(dateVisite);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateVisite);
  endOfDay.setHours(23, 59, 59, 999);

  // Vérifie si la visite existe déjà
  let visite = await prisma.visite.findFirst({
    where: {
      idClient,
      idUser,
      idClinique, // Ajouter dans la recherche aussi
      motifVisite: "Pec VIH",
      dateVisite: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Si aucune visite trouvée → la créer
  if (!visite) {
    visite = await prisma.visite.create({
      data: {
        idClient,
        idUser,
        idClinique, // Ajouter ici
        motifVisite: "Pec VIH",
        dateVisite: new Date(dateVisite),
      },
    });
  }

  return visite;
}

// ************* Visite **************
export const getAllVisite = async () => {
  // const allClient = await prisma.client.findMany({
  //   orderBy: { createdAt: "desc" },
  // });
  const allVisite = await prisma.visite.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allVisite;
};

// Récupération de une seul Visite
export const getOneVisite = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneVisite = await prisma.visite.findUnique({
    where: { id },
  });

  return oneVisite;
};

// Suppression d'un Visite
export async function deleteVisite(id: string) {
  await requirePermission(TableName.VISITE, "canDelete");
  const existing = await prisma.visite.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Visite",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression visite pour client ${existing.idClient} - motif: ${existing.motifVisite}`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.visite.delete({
    where: { id },
  });
}

//Mise à jour de la Visite
export async function updateVisite(id: string, data: Partial<Visite>) {
  await requirePermission(TableName.VISITE, "canUpdate");
  const updated = await prisma.visite.update({
    where: { id },
    data: {
      dateVisite: data.dateVisite,
      motifVisite: data.motifVisite,
      idActivite: data.idActivite ?? null,
      idLieu: data.idLieu ?? null,
      idClient: data.idClient!,
      idUser: data.idUser!,
      updatedAt: new Date(),
    },
  });
  if (data.idUser) {
    await logAction({
      idUser: data.idUser,
      action: "MODIFICATION",
      entite: "Visite",
      entiteId: id,
      idClinique: data.idClinique,
      description: `Modification visite pour client ${data.idClient} - motif: ${data.motifVisite}`,
      nouvellesDonnees: data as unknown as Record<string, unknown>,
    });
  }
  return updated;
}

export async function getAllVisiteByIdClient(idClient: string) {
  return await prisma.visite.findMany({
    where: { idClient: idClient },
    orderBy: { dateVisite: "desc" },
  });
}

export const getAllLieuInVisite = async (idActivite: string | "") => {
  if (!idActivite) {
    return [];
  }
  return await prisma.lieu.findMany({
    where: { idActivite },
  });
};

export const getAllActiviteInVisite = async (date: string) => {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error("La date fournie est invalide.");
  }

  // Retourner les activités en cours à la date donnée
  const allActivite = await prisma.activite.findMany({
    where: {
      dateDebut: { lte: parsedDate },
      dateFin: { gte: parsedDate },
    },
    orderBy: { dateFin: "desc" },
  });

  return allActivite;
};

// Chargement initial optimisé pour la page visite (1 seul appel réseau)
export async function getVisitePageData(idClient: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [client, visites, constantesByVisite] = await Promise.all([
    prisma.client.findUnique({
      where: { id: idClient },
      select: { id: true, idClinique: true },
    }),
    prisma.visite.findMany({
      where: { idClient },
      orderBy: { dateVisite: "desc" },
      select: { id: true, dateVisite: true, motifVisite: true },
    }),
    prisma.constante.findMany({
      where: { idClient },
      select: { idVisite: true },
    }),
  ]);

  // Requête dépendante : activités de la clinique
  const activites = client?.idClinique
    ? await prisma.activite.findMany({
        where: {
          idClinique: client.idClinique,
          dateFin: { gte: thirtyDaysAgo },
        },
        orderBy: { dateDebut: "desc" },
      })
    : [];

  const visiteIdsWithConstante = new Set(
    constantesByVisite.map((c) => c.idVisite),
  );

  return {
    idClinique: client?.idClinique || "",
    visites: visites.map((v) => ({
      ...v,
      hasConstante: visiteIdsWithConstante.has(v.id),
    })),
    activites,
  };
}

// Chargement initial optimisé pour la page constante (1 seul appel réseau)
export async function getConstantePageData(idClient: string) {
  const [client, visites, visiteIdsWithConstante] = await Promise.all([
    prisma.client.findUnique({
      where: { id: idClient },
      select: { id: true, nom: true, prenom: true },
    }),
    prisma.visite.findMany({
      where: { idClient },
      orderBy: { dateVisite: "desc" },
      select: { id: true, dateVisite: true, motifVisite: true },
    }),
    prisma.constante.findMany({
      where: { idClient },
      select: { idVisite: true },
    }),
  ]);

  const usedVisiteIds = new Set(visiteIdsWithConstante.map((c) => c.idVisite));

  return {
    client: client ? { id: client.id, nom: client.nom, prenom: client.prenom } : null,
    visites: visites.map((v) => ({
      ...v,
      hasConstante: usedVisiteIds.has(v.id),
    })),
  };
}

// ************* Visite paginée **************
export async function getVisitesPaginated(
  params?: PaginationParams & { idClinique?: string }
): Promise<PaginatedResult<Visite>> {
  const { skip, take, validPage, validPageSize } = normalizePagination(params);
  const where: Prisma.VisiteWhereInput = {};
  if (params?.idClinique) where.idClinique = params.idClinique;

  const [data, total] = await Promise.all([
    prisma.visite.findMany({ where, skip, take, orderBy: { dateVisite: "desc" } }),
    prisma.visite.count({ where }),
  ]);

  return buildPaginatedResult(data, total, validPage, validPageSize);
}