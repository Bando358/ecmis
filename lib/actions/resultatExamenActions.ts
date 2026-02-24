"use server";

import { ResultatExamen, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ResultatExamenCreateSchema } from "@/lib/validations/labo";

// Création de ResultatExamen

export async function createResultatExamen(data: ResultatExamen) {
  await requirePermission(TableName.RESULTAT_EXAMEN, "canCreate");
  validateServerData(ResultatExamenCreateSchema, data);
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
  await requirePermission(TableName.RESULTAT_EXAMEN, "canDelete");
  return await prisma.resultatExamen.delete({
    where: { id },
  });
}

//Mise à jour de ResultatExamen
export async function updateResultatExamen(id: string, data: ResultatExamen) {
  await requirePermission(TableName.RESULTAT_EXAMEN, "canUpdate");
  return await prisma.resultatExamen.update({
    where: { id },
    data,
  });
}
