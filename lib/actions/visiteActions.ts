"use server";

import { Visite } from "@prisma/client";
import prisma from "../prisma";

// Création d'une Visite
export async function createVisite(data: Visite) {
  return await prisma.visite.create({
    data,
  });
}

// on va vérifier si un client à dejà une visite à une date donnée
export async function checkClientVisiteOnDate(
  idClient: string,
  dateVisite: Date,
  idUser: string,
  idClinique: string // Ajouter ce paramètre obligatoire
) {
  const startOfDay = new Date(dateVisite);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateVisite);
  endOfDay.setHours(23, 59, 59, 999);

  // Vérifie si la visite existe déjà
  let visite = await prisma.visite.findFirst({
    where: {
      idClient,
      idUser,
      idClinique, // Ajouter dans la recherche aussi
      motifVisite: "Pec VIH",
      dateVisite: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Si aucune visite trouvée → la créer
  if (!visite) {
    visite = await prisma.visite.create({
      data: {
        idClient,
        idUser,
        idClinique, // Ajouter ici
        motifVisite: "Pec VIH",
        dateVisite: new Date(dateVisite),
      },
    });
  }

  return visite;
}

// ************* Visite **************
export const getAllVisite = async () => {
  // const allClient = await prisma.client.findMany({
  //   orderBy: { createdAt: "desc" },
  // });
  const allVisite = await prisma.visite.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allVisite;
};

// Récupération de une seul Visite
export const getOneVisite = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneVisite = await prisma.visite.findUnique({
    where: { id },
  });

  return oneVisite;
};

// Suppression d'un Visite
export async function deleteVisite(id: string) {
  return await prisma.visite.delete({
    where: { id },
  });
}

//Mise à jour de la Visite
export async function updateVisite(id: string, data: Partial<Visite>) {
  return await prisma.visite.update({
    where: { id },
    data: {
      dateVisite: data.dateVisite,
      motifVisite: data.motifVisite,
      idActivite: data.idActivite ?? null,
      idLieu: data.idLieu ?? null,
      idClient: data.idClient!,
      idUser: data.idUser!,
      updatedAt: new Date(),
    },
  });
}

export async function getAllVisiteByIdClient(idClient: string) {
  return await prisma.visite.findMany({
    where: { idClient: idClient },
    orderBy: { dateVisite: "desc" },
  });
}

export const getAllLieuInVisite = async (idActivite: string | "") => {
  if (!idActivite) {
    return [];
  }
  return await prisma.lieu.findMany({
    where: { id: idActivite },
  });
};

export const getAllActiviteInVisite = async (date: string) => {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error("La date fournie est invalide.");
  }

  const allActivite = await prisma.activite.findMany({
    where: {
      dateFin: {
        lte: parsedDate,
      },
    },
    orderBy: { dateFin: "asc" },
  });

  return allActivite;
};
