"use server";

import { Medecine, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création d'une Fiche Medecine
export async function createMedecine(data: Medecine) {
  await requirePermission(TableName.MEDECINE, "canCreate");
  return await prisma.medecine.create({
    data,
  });
}

// ************* Fiche Medecine **************
export const getAllMedecine = async () => {
  const allMedecine = await prisma.medecine.findMany({
    orderBy: { mdgCreatedAt: "desc" },
  });
  return allMedecine;
};

// Récupération de Fiche Medecine par ID
export const getAllMedecineByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allMedecine = await prisma.medecine.findMany({
    where: { mdgIdClient: id },
  });
  return allMedecine;
};

// Récupération de une seul Fiche Medecine
export const getOneMedecine = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneMedecine = await prisma.medecine.findUnique({
    where: { id },
  });

  return oneMedecine;
};

// Suppression d'une Fiche Medecine
export async function deleteMedecine(id: string) {
  await requirePermission(TableName.MEDECINE, "canDelete");
  return await prisma.medecine.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Medecine
export async function updateMedecine(id: string, data: Medecine) {
  await requirePermission(TableName.MEDECINE, "canUpdate");
  return await prisma.medecine.update({
    where: { id },
    data,
  });
}
