"use server";
//lib/actions/activiteActions.ts
import { Activite, TableName } from "@prisma/client";
import prisma from "../prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// ************* Activité by tableau id Clinique **************

export const getAllActivite = async () => {
  const allActivite = await prisma.activite.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allActivite;
};
// ************* Activité by id Clinique **************
export const getAllActiviteByIdClinique = async (idClinique: string) => {
  const allActivite = await prisma.activite.findMany({
    where: { idClinique },
    orderBy: { createdAt: "desc" },
  });
  return allActivite;
};
// ************* Activité by tableau id Clinique **************
export const getAllActiviteByTabIdClinique = async (idClinique: string[]) => {
  const allActivite = await prisma.activite.findMany({
    where: { idClinique: { in: idClinique } },
    orderBy: { createdAt: "desc" },
  });
  return allActivite;
};
// Création d'une activité
export async function createActivite(data: Activite) {
  await requirePermission(TableName.ACTIVITE, "canCreate");
  return await prisma.activite.create({
    data,
  });
}

// Récupération de une seule activité
export const getOneActivite = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneActivite = await prisma.activite.findUnique({
    where: { id },
  });

  return oneActivite;
};

//Mise à jour de l'activité
export async function updateActivite(id: string, data: Activite) {
  await requirePermission(TableName.ACTIVITE, "canUpdate");
  return await prisma.activite.update({
    where: { id },
    data,
  });
}

// Suppression d'une activité
export async function deleteActivite(id: string) {
  await requirePermission(TableName.ACTIVITE, "canDelete");
  // Vérifier s'il y a des lieux liés
  const lieuxCount = await prisma.lieu.count({ where: { idActivite: id } });
  if (lieuxCount > 0) {
    throw new Error(
      `Impossible de supprimer cette activité : ${lieuxCount} lieu(x) y sont rattaché(s). Supprimez d'abord les lieux associés.`
    );
  }
  // Vérifier s'il y a des visites liées
  const visitesCount = await prisma.visite.count({
    where: { idActivite: id },
  });
  if (visitesCount > 0) {
    throw new Error(
      `Impossible de supprimer cette activité : ${visitesCount} visite(s) y sont rattachée(s).`
    );
  }
  return await prisma.activite.delete({ where: { id } });
}

// Activités en cours ou récentes par clinique (dateFin >= aujourd'hui - 30 jours)
export const getActiveActivitesByIdClinique = async (idClinique: string) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allActivite = await prisma.activite.findMany({
    where: {
      idClinique,
      dateFin: { gte: thirtyDaysAgo },
    },
    orderBy: { dateDebut: "desc" },
  });
  return allActivite;
};

// Récupération des activités avec le nombre de lieux
export const getAllActiviteWithLieuxCount = async () => {
  const allActivite = await prisma.activite.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { Lieu: true, Visites: true } } },
  });
  return allActivite;
};
