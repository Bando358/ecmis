"use server";

// Type d'entrée sans la relation Visite
import { Reference, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ReferenceCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";
type ReferenceCreateInput = Omit<Reference, "Visite">;

// Création d'une Fiche Référence
export const createReference = async (data: ReferenceCreateInput) => {
  await requirePermission(TableName.REFERENCE, "canCreate");
  const validated = validateServerData(ReferenceCreateSchema, data);
  try {
    // Valider que les relations obligatoires existent
    const visiteExists = await prisma.visite.findUnique({
      where: { id: validated.refIdVisite },
    });

    const clientExists = await prisma.client.findUnique({
      where: { id: validated.idClient },
    });

    if (!visiteExists) {
      throw new Error(`La visite avec l'ID ${validated.refIdVisite} n'existe pas`);
    }

    if (!clientExists) {
      throw new Error(`Le client avec l'ID ${validated.idClient} n'existe pas`);
    }

    // Créer la référence avec les IDs directs
    const newReference = await prisma.reference.create({
      data: validated,
    });

    await logAction({
      idUser: validated.idUser,
      action: "CREATION",
      entite: "Reference",
      entiteId: newReference.id,
      idClinique: validated.idClinique,
      description: `Création référence pour client ${validated.idClient} - motif: ${validated.motifReference}`,
    });

    return newReference;
  } catch (error) {
    console.error("Erreur lors de la création de la référence:", error);
    throw error;
  }
};

// ************* Fiche Référence **************
export const getAllReference = async () => {
  const allReference = await prisma.reference.findMany({
    orderBy: { createdAt: "desc" },
  });
  return allReference;
};

// Récupération de Fiche Référence par ID
export const getAllReferenceByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allReference = await prisma.reference.findMany({
    where: { idClient: id },
  });
  return allReference;
};

// Récupération de une seul Fiche Référence
export const getOneReference = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneReference = await prisma.reference.findUnique({
    where: { id },
  });

  return oneReference;
};

// Suppression d'une Fiche Référence
export async function deleteReference(id: string) {
  await requirePermission(TableName.REFERENCE, "canDelete");
  const existing = await prisma.reference.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Reference",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression référence - motif: ${existing.motifReference}`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.reference.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Référence
export async function updateReference(id: string, data: Reference) {
  await requirePermission(TableName.REFERENCE, "canUpdate");
  const validated = validateServerData(ReferenceCreateSchema.partial(), data);
  const updated = await prisma.reference.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.idUser,
    action: "MODIFICATION",
    entite: "Reference",
    entiteId: id,
    idClinique: data.idClinique,
    description: `Modification référence - motif: ${data.motifReference}`,
    nouvellesDonnees: validated as unknown as Record<string, unknown>,
  });
  return updated;
}
