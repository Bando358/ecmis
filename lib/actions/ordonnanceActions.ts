"use server";

// Type d'entrée sans la relation Visite
import { Ordonnance, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { OrdonnanceCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Ordonnance
export const createOrdonnance = async (data: Ordonnance) => {
  await requirePermission(TableName.ORDONNANCE, "canCreate");
  const validated = validateServerData(OrdonnanceCreateSchema, data);
  const ordonnance = await prisma.ordonnance.create({
    data: validated,
  });
  await logAction({
    idUser: validated.ordonnanceIdUser,
    action: "CREATION",
    entite: "Ordonnance",
    entiteId: ordonnance.id,
    idClinique: validated.ordonnanceIdClinique,
    description: `Création ordonnance pour client ${validated.ordonnanceIdClient} - ${validated.ordonnanceMedicaments?.length || 0} médicament(s)`,
  });
  return ordonnance;
};

// ************* Fiche Ordonnance **************
export const getAllOrdonnance = async () => {
  const allOrdonnance = await prisma.ordonnance.findMany({
    orderBy: { ordonnanceCreatedAt: "desc" },
  });
  return allOrdonnance;
};

// Récupération de Fiche Ordonnance par ID
export const getAllOrdonnanceByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allOrdonnance = await prisma.ordonnance.findMany({
    where: { ordonnanceIdClient: id },
  });
  return allOrdonnance;
};

// Récupération de une seul Fiche Ordonnance
export const getOneOrdonnance = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneOrdonnance = await prisma.ordonnance.findUnique({
    where: { id },
  });

  return oneOrdonnance;
};

// Suppression d'une Fiche Ordonnance
export async function deleteOrdonnance(id: string) {
  await requirePermission(TableName.ORDONNANCE, "canDelete");
  const existing = await prisma.ordonnance.findUnique({ where: { id } });
  if (existing) {
    await logAction({
      idUser: existing.ordonnanceIdUser,
      action: "SUPPRESSION",
      entite: "Ordonnance",
      entiteId: id,
      idClinique: existing.ordonnanceIdClinique,
      description: `Suppression ordonnance pour client ${existing.ordonnanceIdClient}`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  return await prisma.ordonnance.delete({
    where: { id },
  });
}

//Mise à jour de la Fiche Ordonnance
export async function updateOrdonnance(id: string, data: Ordonnance) {
  await requirePermission(TableName.ORDONNANCE, "canUpdate");
  const validated = validateServerData(OrdonnanceCreateSchema.partial(), data);
  const updated = await prisma.ordonnance.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.ordonnanceIdUser,
    action: "MODIFICATION",
    entite: "Ordonnance",
    entiteId: id,
    idClinique: data.ordonnanceIdClinique,
    description: `Modification ordonnance pour client ${data.ordonnanceIdClient}`,
    nouvellesDonnees: validated as unknown as Record<string, unknown>,
  });
  return updated;
}
