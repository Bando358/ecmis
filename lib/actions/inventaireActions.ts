"use server";

import { Inventaire } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

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

  const result = await prisma.inventaire.create({ data });
  await logAction({
    idUser: data.idUser,
    action: "CREATION",
    entite: "Inventaire",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Creation inventaire du ${dateInventaire.toLocaleDateString("fr-FR")}`,
  });
  return result;
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
  const existing = await prisma.inventaire.findUnique({ where: { id } });
  await prisma.detailInventaire.deleteMany({
    where: { idInventaire: id },
  });
  await prisma.inventaire.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Inventaire",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression inventaire du ${existing.dateInventaire.toLocaleDateString("fr-FR")}`,
    });
  }
}
