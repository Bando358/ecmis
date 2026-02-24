"use server";

import { DemandeEchographie, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { DemandeEchographieCreateSchema } from "@/lib/validations/labo";

// Création de DemandeEchographie
export async function createDemandeEchographie(data: DemandeEchographie) {
  await requirePermission(TableName.DEMANDE_ECHOGRAPHIE, "canCreate");
  validateServerData(DemandeEchographieCreateSchema, data);
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
  await requirePermission(TableName.DEMANDE_ECHOGRAPHIE, "canDelete");
  return await prisma.demandeEchographie.delete({
    where: { id },
  });
}

//Mise à jour de DemandeEchographie
export async function updateDemandeEchographie(
  id: string,
  data: DemandeEchographie
) {
  await requirePermission(TableName.DEMANDE_ECHOGRAPHIE, "canUpdate");
  return await prisma.demandeEchographie.update({
    where: { id },
    data,
  });
}
