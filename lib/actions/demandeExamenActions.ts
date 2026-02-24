"use server";

import { DemandeExamen, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { DemandeExamenCreateSchema } from "@/lib/validations/labo";

// Création de DemandeExamen
export async function createDemandeExamen(data: DemandeExamen) {
  await requirePermission(TableName.DEMANDE_EXAMEN, "canCreate");
  validateServerData(DemandeExamenCreateSchema, data);
  const {
    id,
    idVisite,
    idClinique,
    idTarifExamen,
    idUser,
    idClient,
    createdAt,
    updatedAt,
  } = data;

  return await prisma.demandeExamen.create({
    data: {
      id,
      idTarifExamen,
      createdAt,
      updatedAt,
      User: { connect: { id: idUser } },
      Client: { connect: { id: idClient } },
      Clinique: { connect: { id: idClinique } },
      Visite: { connect: { id: idVisite } },
    },
  });
}

// Récupérer toutes les DemandeExamen par ID de client
export async function getAllDemandeExamensByIdClient(idClient: string) {
  return await prisma.demandeExamen.findMany({
    where: { idClient },
  });
}

// Récupérer toutes les DemandeExamen
export async function getAllDemandeExamens() {
  return await prisma.demandeExamen.findMany();
}
// Récupérer toutes les DemandeExamen
export async function getAllDemandeExamensByIdVisite(idVisite: string) {
  return await prisma.demandeExamen.findMany({
    where: { idVisite },
  });
}
// Suppression d'un client
export async function deleteDemandeExamen(id: string) {
  await requirePermission(TableName.DEMANDE_EXAMEN, "canDelete");
  return await prisma.demandeExamen.delete({
    where: { id },
  });
}

//Mise à jour de DemandeExamen
export async function updateDemandeExamen(id: string, data: DemandeExamen) {
  await requirePermission(TableName.DEMANDE_EXAMEN, "canUpdate");
  return await prisma.demandeExamen.update({
    where: { id },
    data,
  });
}
