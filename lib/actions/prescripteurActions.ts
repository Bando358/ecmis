"use server";

import { Prescripteur, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { PrescripteurCreateSchema } from "@/lib/validations/finance";

// Création d'un Prescripteur (accessible à tous les utilisateurs authentifiés)
export async function createPrescripteur(data: Omit<Prescripteur, "createdAt" | "updatedAt">) {
  const validated = validateServerData(PrescripteurCreateSchema, data);
  return await prisma.prescripteur.create({
    data: validated,
  });
}

// Récupérer tous les Prescripteurs
export async function getAllPrescripteurs() {
  return await prisma.prescripteur.findMany({
    orderBy: { nom: "asc" },
  });
}

// Récupérer tous les Prescripteurs par clinique
export async function getAllPrescripteursByClinique(idClinique: string) {
  return await prisma.prescripteur.findMany({
    where: { idClinique },
    orderBy: { nom: "asc" },
  });
}

// Récupérer un Prescripteur par id
export async function getPrescripteurById(id: string) {
  return await prisma.prescripteur.findUnique({
    where: { id },
  });
}

// Mise à jour d'un Prescripteur
export async function updatePrescripteur(id: string, data: Partial<Prescripteur>) {
  await requirePermission(TableName.PRESCRIPTEUR, "canUpdate");
  const validated = validateServerData(PrescripteurCreateSchema.partial(), data);
  return await prisma.prescripteur.update({
    where: { id },
    data: validated,
  });
}

// Suppression d'un Prescripteur
export async function deletePrescripteur(id: string) {
  await requirePermission(TableName.PRESCRIPTEUR, "canDelete");
  return await prisma.prescripteur.delete({
    where: { id },
  });
}
