"use server";

import { FactureExamen } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de FactureExamen
export async function createFactureExamen(data: FactureExamen) {
  return await prisma.factureExamen.create({
    data,
  });
}

// Récupérer toutes les FactureExamen
export async function getAllFactureExamenByIdClient(idClient: string) {
  return await prisma.factureExamen.findMany({
    where: { idClient: idClient },
  });
}

// Récupérer toutes les FactureExamen
export async function getAllFactureExamen() {
  return await prisma.factureExamen.findMany();
}
// Suppression d'une FactureExamen
export async function deleteFactureExamen(id: string) {
  return await prisma.factureExamen.delete({
    where: { id },
  });
}

//Mise à jour de FactureExamen
export async function updateFactureExamen(id: string, data: FactureExamen) {
  return await prisma.factureExamen.update({
    where: { id },
    data,
  });
}

// Récupérer toutes les FactureExamen par idVisite
export async function getAllFactureExamenByIdVisite(idVisite: string) {
  return await prisma.factureExamen.findMany({
    where: { idVisite: idVisite },
    orderBy: { idVisite: "desc" },
  });
}
