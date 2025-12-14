"use server";

import { CommandeFournisseur } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de CommandeFournisseur
export async function createCommandeFournisseur(data: CommandeFournisseur) {
  return await prisma.commandeFournisseur.create({
    data,
  });
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
// Suppression d'un client
export async function deleteCommandeFournisseur(id: string) {
  return await prisma.commandeFournisseur.delete({
    where: { id },
  });
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
