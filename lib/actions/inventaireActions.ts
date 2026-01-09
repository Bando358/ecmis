"use server";

import { Inventaire } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Inventaire
export async function createInventaire(data: Inventaire) {
  // Extraire la date sans l'heure pour comparaison
  const dateInventaire = new Date(data.dateInventaire);
  const startOfDay = new Date(dateInventaire);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateInventaire);
  endOfDay.setHours(23, 59, 59, 999);

  // Vérifier si un inventaire existe déjà pour cette clinique à cette date
  const inventaireExistant = await prisma.inventaire.findFirst({
    where: {
      idClinique: data.idClinique,
      dateInventaire: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (inventaireExistant) {
    throw new Error(
      "Un inventaire existe déjà pour cette clinique à cette date."
    );
  }

  return await prisma.inventaire.create({
    data,
  });
}

// ************* Fiche Inventaire **************
export const getAllInventaire = async () => {
  const allInventaire = await prisma.inventaire.findMany({
    orderBy: { dateInventaire: "desc" },
  });
  return allInventaire;
};
// ************* Récupérer les Inventaires de moins de 2 jours **************
export const getRecentInventaires = async () => {
  const recentInventaires = await prisma.inventaire.findMany({
    where: {
      dateInventaire: {
        gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 jours en millisecondes
      },
    },
    orderBy: { dateInventaire: "desc" },
  });
  return recentInventaires;
};

// Suppression d'une Fiche Inventaire. Toutefois, les détails associés doivent être supprimés au préalable.
export async function deleteInventaire(id: string) {
  await prisma.detailInventaire.deleteMany({
    where: { idInventaire: id },
  });
  await prisma.inventaire.delete({
    where: { id },
  });
}
