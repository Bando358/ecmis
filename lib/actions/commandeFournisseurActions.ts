"use server";

import { CommandeFournisseur } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";

// Création de CommandeFournisseur
export async function createCommandeFournisseur(data: CommandeFournisseur) {
  const result = await prisma.commandeFournisseur.create({ data });
  await logAction({
    idUser: "system",
    action: "CREATION",
    entite: "CommandeFournisseur",
    entiteId: result.id,
    idClinique: data.idClinique,
    description: `Commande fournisseur du ${new Date(data.dateCommande).toLocaleDateString("fr-FR")}`,
  });
  return result;
}

// Récupérer toutes les CommandeFournisseur de moins 48 heures de dateCommande

export async function getAllCommandesFournisseur() {
  const dateLimite = new Date();
  dateLimite.setHours(dateLimite.getHours() - 48);
  return await prisma.commandeFournisseur.findMany({
    where: {
      dateCommande: {
        gte: dateLimite,
      },
    },
  });
}
// Suppression d'une commande
export async function deleteCommandeFournisseur(id: string) {
  const existing = await prisma.commandeFournisseur.findUnique({ where: { id } });
  const result = await prisma.commandeFournisseur.delete({ where: { id } });
  if (existing) {
    await logAction({
      idUser: "system",
      action: "SUPPRESSION",
      entite: "CommandeFournisseur",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression commande fournisseur du ${existing.dateCommande.toLocaleDateString("fr-FR")}`,
    });
  }
  return result;
}

//Mise à jour de CommandeFournisseur
export async function updateCommandeFournisseur(
  id: string,
  data: CommandeFournisseur
) {
  return await prisma.commandeFournisseur.update({
    where: { id },
    data,
  });
}
