"use server";

import { DetailCommande } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de DetailCommande
export async function createDetailCommande(data: DetailCommande) {
  return await prisma.detailCommande.create({
    data,
  });
}

// Récupérer toutes les DetailCommande
export async function getAllDetailCommande() {
  return await prisma.detailCommande.findMany();
}
// Suppression d'un client
export async function deleteDetailCommande(id: string) {
  return await prisma.detailCommande.delete({
    where: { id },
  });
}

//Mise à jour de DetailCommande
export async function updateDetailCommande(id: string, data: DetailCommande) {
  return await prisma.detailCommande.update({
    where: { id },
    data,
  });
}
