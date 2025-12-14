"use server";

import { Ist } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche IST
export async function createIst(data: Ist) {
  // Remove idUser, idClient, idVisite, istIdClinique from data before spreading
  const { istIdClient, istIdUser, istIdVisite, istIdClinique, ...rest } = data;
  return await prisma.ist.create({
    data: {
      ...rest,
      User: { connect: { id: istIdUser } },
      Client: { connect: { id: istIdClient } },
      Visite: { connect: { id: istIdVisite } },
      Clinique: { connect: { id: istIdClinique } },
    },
  });
}

// ************* Fiche IST **************
export const getAllIst = async () => {
  const allIst = await prisma.ist.findMany({
    orderBy: { istCreatedAt: "desc" },
  });
  return allIst;
};

// Récupération de Fiche IST par ID
export const getAllIstByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allIst = await prisma.ist.findMany({
    where: { istIdClient: id },
  });
  return allIst;
};

// Récupération de une seul Fiche ist
export const getOneIst = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneIst = await prisma.ist.findUnique({
    where: { id },
  });

  return oneIst;
};

// Suppression d'une Fiche IST
export async function deleteIst(id: string) {
  return await prisma.ist.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche IST
export async function updateIst(id: string, data: Ist) {
  return await prisma.ist.update({
    where: { id },
    data,
  });
}
