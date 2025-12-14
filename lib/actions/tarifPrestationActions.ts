"use server";

import { TarifPrestation } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de TarifPrestation
export async function createTarifPrestation(data: TarifPrestation) {
  return await prisma.tarifPrestation.create({
    data,
  });
}

// Récupérer toutes les TarifPrestation
export async function getAllTarifPrestation() {
  return await prisma.tarifPrestation.findMany();
}
// Suppression d'un client
export async function deleteTarifPrestation(id: string) {
  return await prisma.tarifPrestation.delete({
    where: { id },
  });
}

//Mise à jour de TarifPrestation
export async function updateTarifPrestation(id: string, data: TarifPrestation) {
  return await prisma.tarifPrestation.update({
    where: { id },
    data,
  });
}
