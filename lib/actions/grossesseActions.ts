"use server";

import { Grossesse, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";

// Création d'une Fiche Grossesse
export async function createGrossesse(data: Grossesse) {
  await requirePermission(TableName.GROSSESSE, "canCreate");
  return await prisma.grossesse.create({
    data,
  });
}

// ************* Fiche Grossesse **************
export const getAllGrossesse = async () => {
  const allGrossesse = await prisma.grossesse.findMany({
    orderBy: { grossesseCreatedAt: "desc" },
  });
  return allGrossesse;
};

// Récupération de Fiche Grossesse par ID
export const getAllGrossesseByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allGrossesse = await prisma.grossesse.findMany({
    where: { grossesseIdClient: id },
  });
  return allGrossesse;
};

// Récupération de une seul Fiche Grossesse
export const getOneGrossesse = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneGrossesse = await prisma.grossesse.findUnique({
    where: { id },
  });

  return oneGrossesse;
};

// Suppression d'une Fiche Grossesse
export async function deleteGrossesse(id: string) {
  await requirePermission(TableName.GROSSESSE, "canDelete");
  return await prisma.grossesse.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Grossesse
export async function updateGrossesse(id: string, data: Grossesse) {
  await requirePermission(TableName.GROSSESSE, "canUpdate");
  return await prisma.grossesse.update({
    where: { id },
    data,
  });
}
