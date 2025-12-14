"use server";

import { FactureEchographie } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de FactureEchographie
export async function createFactureEchographie(data: FactureEchographie) {
  return await prisma.factureEchographie.create({
    data,
  });
}

// Récupérer toutes les FactureEchographie
export async function getAllFactureEchographieByIdClient(idClient: string) {
  return await prisma.factureEchographie.findMany({
    where: { idClient: idClient },
  });
}

// Récupérer toutes les FactureEchographie
export async function getAllFactureEchographie() {
  return await prisma.factureEchographie.findMany();
}
// Suppression d'une FactureEchographie
export async function deleteFactureEchographie(id: string) {
  return await prisma.factureEchographie.delete({
    where: { id },
  });
}

//Mise à jour de FactureEchographie
export async function updateFactureEchographie(
  id: string,
  data: FactureEchographie
) {
  return await prisma.factureEchographie.update({
    where: { id },
    data,
  });
}

// Récupérer toutes les FactureEchographie par idVisite
export async function getAllFactureEchographieByIdVisite(idVisite: string) {
  return await prisma.factureEchographie.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}
