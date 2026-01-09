"use server";

import { DetailInventaire } from "@prisma/client";
import prisma from "../prisma";

// ************ Inventaire **********
export async function createDetailInventaire(data: DetailInventaire) {
  return await prisma.detailInventaire.create({
    data,
  });
}

// Récupération de tous les Inventaire
export const getAllDetailInventaireByInventaireId = async (
  inventaireId: string
) => {
  const allDetailInventaires = await prisma.detailInventaire.findMany({
    where: { idInventaire: inventaireId },
    orderBy: { createdAt: "desc" },
  });
  return allDetailInventaires;
};
// Récupération de tous les détails d'Inventaire par tableau d'id detailInventaire
export const getAllDetailInventaireByTabIdDetailInventaire = async (
  inventaireIds: string[]
) => {
  const allDetailInventaires = await prisma.detailInventaire.findMany({
    where: { idInventaire: { in: inventaireIds } },
    orderBy: { createdAt: "desc" },
  });
  return allDetailInventaires;
};

export const getOneDetailInventaire = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneDetailInventaire = await prisma.detailInventaire.findUnique({
    where: { id },
  });

  return oneDetailInventaire;
};

// Mise à jour d'une Visite
export async function updateDetailInventaire(
  id: string,
  data: Partial<DetailInventaire>
) {
  return await prisma.detailInventaire.update({
    where: { id },
    data,
  });
}

// Suppression d'un Inventaire
export async function deleteDetailInventaire(id: string) {
  return await prisma.detailInventaire.delete({
    where: { id },
  });
}
// Suppression d'un Inventaire
export async function deleteDetailInventairesByIds(ids: string[]) {
  return await prisma.detailInventaire.deleteMany({
    where: { id: { in: ids } },
  });
}
