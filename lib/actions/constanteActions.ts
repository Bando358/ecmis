"use server";

import { Constante } from "@prisma/client";
import prisma from "../prisma";

// ************ Constante **********
export async function createContante(data: Constante) {
  return await prisma.constante.create({
    data,
  });
}

export async function getConstantesByClientId(idClient: string) {
  try {
    const constantes = await prisma.constante.findMany({
      where: { idClient },
      select: {
        id: true,
        poids: true,
        taille: true,
        idClient: true,
        // idClient: true,
        Visite: {
          select: { dateVisite: true },
        },
      },
    });

    // Formatage du résultat
    return constantes.map((constante) => ({
      id: constante.id,
      poids: constante.poids,
      taille: constante.taille,
      idClient: constante.idClient,
      dateVisite: constante.Visite?.dateVisite || null,
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des constantes :", error);
    throw new Error("Impossible de récupérer les constantes du client.");
  }
}

export async function getAllContanteByIdClient(id: string) {
  return await prisma.constante.findMany({
    where: { idClient: id },
    orderBy: {},
  });
}

export const getOneConstante = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneConstante = await prisma.constante.findUnique({
    where: { id },
  });

  return oneConstante;
};

// Mise à jour d'une Visite
export async function updateConstante(id: string, data: Partial<Constante>) {
  return await prisma.constante.update({
    where: { id },
    data,
  });
}

export const getConstantByIdVisiteClient = async (idVisite: string) => {
  try {
    const constante = await prisma.constante.findFirst({
      where: {
        idVisite: idVisite,
      },
    });
    return constante;
  } catch (error) {
    console.error("Erreur lors de la récupération de la constante :", error);
    throw error;
  }
};

// Suppression d'une Constante
export async function deleteConstante(id: string) {
  return await prisma.constante.delete({
    where: { id },
  });
}
