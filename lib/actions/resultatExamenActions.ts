"use server";

import { ResultatExamen } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création de ResultatExamen

export async function createResultatExamen(data: ResultatExamen) {
  const { id, idVisite, idClinique, idUser, idClient, createdAt, updatedAt } =
    data;

  return await prisma.resultatExamen.create({
    data: {
      id,
      createdAt,
      updatedAt,
      resultatExamen: data.resultatExamen,
      valeurResultat: data.valeurResultat,
      FactureExamen: { connect: { id: data.idFactureExamen } },
      User: { connect: { id: idUser } },
      Client: { connect: { id: idClient } },
      Clinique: { connect: { id: idClinique } },
      Visite: { connect: { id: idVisite } },
    },
  });
}

// Récupérer un seul ResultatExamen
export async function getOneResultatExamen(id: string) {
  return await prisma.resultatExamen.findUnique({
    where: { id },
  });
}

// Récupérer toutes les ResultatExamen
export async function getAllResultatExamens() {
  return await prisma.resultatExamen.findMany();
}

// Récupérer toutes les ResultatExamen
export async function getAllResultatExamensByIdVisite(idVisite: string) {
  return await prisma.resultatExamen.findMany({
    where: { idVisite },
  });
}
// Suppression d'un ResultatExamen
export async function deleteResultatExamen(id: string) {
  return await prisma.resultatExamen.delete({
    where: { id },
  });
}

//Mise à jour de ResultatExamen
export async function updateResultatExamen(id: string, data: ResultatExamen) {
  return await prisma.resultatExamen.update({
    where: { id },
    data,
  });
}
