"use server";

import { Prestation } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de Prestation
export async function createPrestation(data: Prestation) {
  return await prisma.prestation.create({
    data,
  });
}

// Récupérer toutes les Prestation
export async function getAllPrestation() {
  return await prisma.prestation.findMany();
}
// Suppression d'un client
export async function deletePrestation(id: string) {
  return await prisma.prestation.delete({
    where: { id },
  });
}

//Mise à jour de prestation
export async function updatePrestation(id: string, data: Prestation) {
  return await prisma.prestation.update({
    where: { id },
    data,
  });
}
