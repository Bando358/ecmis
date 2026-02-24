"use server";

// Type d'entrée sans la relation Visite
import { ContreReference, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ContreReferenceCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche ContreRéférence
export const createContreReference = async (data: ContreReference) => {
  await requirePermission(TableName.CONTRE_REFERENCE, "canCreate");
  const validated = validateServerData(ContreReferenceCreateSchema, data);
  const contreRef = await prisma.contreReference.create({
    data: validated,
  });
  await logAction({
    idUser: validated.idUser,
    action: "CREATION",
    entite: "ContreReference",
    entiteId: contreRef.id,
    idClinique: validated.idClinique,
    description: `Création contre-référence pour client ${validated.idClient}`,
  });
  return contreRef;
};

// ************* Fiche ContreRéférence **************
export const getAllContreReference = async () => {
  const allReference = await prisma.contreReference.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allReference;
};

// Récupération de Fiche ContreRéférence par ID
export const getAllContreReferenceByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allContreReference = await prisma.contreReference.findMany({
    where: { idClient: id },
  });
  return allContreReference;
};

// Récupération de une seul Fiche ContreRéférence
export const getOneContreReference = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneContreReference = await prisma.contreReference.findUnique({
    where: { id },
  });

  return oneContreReference;
};

// Suppression d'une Fiche ContreRéférence
export async function deleteContreReference(id: string) {
  await requirePermission(TableName.CONTRE_REFERENCE, "canDelete");
  const existing = await prisma.contreReference.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "ContreReference",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression contre-référence pour client ${existing.idClient}`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.contreReference.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche ContreRéférence
export async function updateContreReference(id: string, data: ContreReference) {
  await requirePermission(TableName.CONTRE_REFERENCE, "canUpdate");
  const validated = validateServerData(ContreReferenceCreateSchema.partial(), data);
  const updated = await prisma.contreReference.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "ContreReference",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification contre-référence pour client ${data.idClient}`,
    nouvellesDonnees: validated as unknown as Record<string, unknown>,
  });
  return updated;
}
