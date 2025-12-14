"use server";
//lib/actions/activiteActions.ts
import { Activite } from "@prisma/client";
import prisma from "../prisma";

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
  return await prisma.activite.update({
    where: { id },
    data,
  });
}
