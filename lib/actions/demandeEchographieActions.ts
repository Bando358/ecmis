"use server";

import { DemandeEchographie } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de DemandeEchographie
export async function createDemandeEchographie(data: DemandeEchographie) {
  const {
    id,
    idVisite,
    idClinique,
    idTarifEchographie,
    idUser,
    idClient,
    createdAt,
    updatedAt,
  } = data;

  return await prisma.demandeEchographie.create({
    data: {
      id,
      idTarifEchographie,
      createdAt,
      updatedAt,
      serviceEchographie: data.serviceEchographie, // Ajout du champ obligatoire
      User: { connect: { id: idUser } },
      Client: { connect: { id: idClient } },
      Clinique: { connect: { id: idClinique } },
      Visite: { connect: { id: idVisite } },
    },
  });
}

// Récupérer toutes les DemandeEchographie par ID de client
export async function getAllDemandeEchographiesByIdClient(idClient: string) {
  return await prisma.demandeEchographie.findMany({
    where: { idClient },
  });
}

// Récupérer toutes les DemandeEchographie
export async function getAllDemandeEchographies() {
  return await prisma.demandeEchographie.findMany();
}

// Récupérer toutes les DemandeEchographie par ID de visite
export async function getAllDemandeEchographiesByIdVisite(idVisite: string) {
  return await prisma.demandeEchographie.findMany({
    where: { idVisite },
  });
}

// Suppression d'une DemandeEchographie
export async function deleteDemandeEchographie(id: string) {
  return await prisma.demandeEchographie.delete({
    where: { id },
  });
}

//Mise à jour de DemandeEchographie
export async function updateDemandeEchographie(
  id: string,
  data: DemandeEchographie
) {
  return await prisma.demandeEchographie.update({
    where: { id },
    data,
  });
}
