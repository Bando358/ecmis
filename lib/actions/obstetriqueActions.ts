"use server";

import { Obstetrique, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ObstetriqueCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Obstétricale
export async function createObstetrique(data: Obstetrique) {
  await requirePermission(TableName.OBSTETRIQUE, "canCreate");
  const validated = validateServerData(ObstetriqueCreateSchema, data);
  const result = await prisma.obstetrique.create({
    data: validated,
  });
  await logAction({
    idUser: data.obstIdUser,
    action: "CREATION",
    entite: "Obstetrique",
    entiteId: result.id,
    idClinique: data.obstIdClinique,
    description: `Création fiche Obstétrique pour client ${data.obstIdClient}`,
  });
  return result;
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
  await requirePermission(TableName.OBSTETRIQUE, "canDelete");
  const existing = await prisma.obstetrique.findUnique({ where: { id }, select: { obstIdUser: true, obstIdClinique: true, obstIdClient: true } });
  const result = await prisma.obstetrique.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.obstIdUser,
      action: "SUPPRESSION",
      entite: "Obstetrique",
      entiteId: id,
      idClinique: existing.obstIdClinique,
      description: `Suppression fiche Obstétrique ${id} du client ${existing.obstIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche Obstétricale
export async function updateObstetrique(id: string, data: Obstetrique) {
  await requirePermission(TableName.OBSTETRIQUE, "canUpdate");
  const validated = validateServerData(ObstetriqueCreateSchema.partial(), data);
  const result = await prisma.obstetrique.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.obstIdUser,
    action: "MODIFICATION",
    entite: "Obstetrique",
    entiteId: id,
    idClinique: data.obstIdClinique,
    description: `Modification fiche Obstétrique ${id}`,
  });
  return result;
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
