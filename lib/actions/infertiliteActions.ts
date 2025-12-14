"use server";

import { Infertilite } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Infertilité
export async function createInfertilite(data: Infertilite) {
  return await prisma.infertilite.create({
    data,
  });
}

// ************* Fiche Infertilité **************
export const getAllInfertilite = async () => {
  const allInfertilite = await prisma.infertilite.findMany({
    orderBy: { infertCreatedAt: "desc" },
  });
  return allInfertilite;
};

// Récupération de Fiche Infertilité par ID
export const getAllInfertiliteByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allInfertilite = await prisma.infertilite.findMany({
    where: { infertIdClient: id },
  });
  return allInfertilite;
};

// Récupération de une seul Fiche Infertilité
export const getOneInfertilite = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneInfertilite = await prisma.infertilite.findUnique({
    where: { id },
  });

  return oneInfertilite;
};

// Suppression d'une Fiche Infertilité
export async function deleteInfertilite(id: string) {
  return await prisma.infertilite.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Infertilité
export async function updateInfertilite(id: string, data: Infertilite) {
  return await prisma.infertilite.update({
    where: { id },
    data,
  });
}
