"use server";

import { Grossesse } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Grossesse
export async function createGrossesse(data: Grossesse) {
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
  return await prisma.grossesse.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Grossesse
export async function updateGrossesse(id: string, data: Grossesse) {
  return await prisma.grossesse.update({
    where: { id },
    data,
  });
}
