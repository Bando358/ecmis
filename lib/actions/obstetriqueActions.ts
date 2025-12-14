"use server";

import { Obstetrique } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Obstétricale
export async function createObstetrique(data: Obstetrique) {
  return await prisma.obstetrique.create({
    data,
  });
}

// ************* Fiche Obstétricale **************
export const getAllObstetrique = async () => {
  const allObstetrique = await prisma.obstetrique.findMany({
    orderBy: { obstCreatedAt: "desc" },
  });
  return allObstetrique;
};

// Récupération de Fiche Obstétricale par ID
export const getAllObstetriqueByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allObstetrique = await prisma.obstetrique.findMany({
    where: { obstIdClient: id },
  });
  return allObstetrique;
};

// Récupération de une seul Fiche Obstétricale
export const getOneObstetrique = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneObstetrique = await prisma.obstetrique.findUnique({
    where: { id },
  });

  return oneObstetrique;
};

// Suppression d'une Fiche Obstétricale
export async function deleteObstetrique(id: string) {
  return await prisma.obstetrique.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Obstétricale
export async function updateObstetrique(id: string, data: Obstetrique) {
  return await prisma.obstetrique.update({
    where: { id },
    data,
  });
}

// Récupération de l'état IMC par ID de visite
export async function getEtatImcByIdVisite(
  idVisite: string
): Promise<string | null> {
  try {
    const constante = await prisma.constante.findFirst({
      where: { idVisite },
      select: { etatImc: true },
    });

    if (!constante) {
      // Pas de constante pour cette visite -> retourner null pour permettre au caller de gérer
      return null;
    }

    return constante.etatImc ?? null;
  } catch (error) {
    // Log plus détaillé pour faciliter le debug, puis retourner null
    console.error(
      `Erreur lors de la récupération de l'état IMC pour idVisite=${idVisite} :`,
      error
    );
    return null;
  }
}
