"use server";

import { FacturePrestation } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de FacturePrestation
export async function createFacturePrestation(data: FacturePrestation) {
  return await prisma.facturePrestation.create({
    data,
  });
}
// Récupérer toutes les FacturePrestation par idVisite par un tableau d'objets
export async function getAllFacturePrestationByIdVisiteByData(
  tabId: { idVisite: string }[]
) {
  const ids = tabId.map((item) => item.idVisite);
  return await prisma.facturePrestation.findMany({
    where: {
      idVisite: {
        in: ids,
      },
    },
  });
}

// Récupérer toutes les FacturePrestation par idClient
export async function getAllFacturePrestationByIdClient(idClient: string) {
  return await prisma.facturePrestation.findMany({
    where: { idClient: idClient },
  });
}
// Récupérer toutes les FacturePrestation
export async function getAllFacturePrestation() {
  return await prisma.facturePrestation.findMany();
}
// Suppression d'une FacturePrestation
export async function deleteFacturePrestation(id: string) {
  return await prisma.facturePrestation.delete({
    where: { id },
  });
}

//Mise à jour de FacturePrestation
export async function updateFacturePrestation(
  id: string,
  data: FacturePrestation
) {
  return await prisma.facturePrestation.update({
    where: { id },
    data,
  });
}

// Récupérer toutes les FacturePrestation par idVisite
export async function getAllFacturePrestationByIdVisite(
  idVisite: string | null
) {
  if (!idVisite) {
    return null; // ou lancez une erreur si nécessaire
  }
  const prestations = await prisma.facturePrestation.findMany({
    where: { idVisite: idVisite },
  });

  return prestations;
}
