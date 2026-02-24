"use server";

import { TestGrossesse, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { TestGrossesseCreateSchema } from "@/lib/validations/clinical";
import { logAction } from "./journalPharmacyActions";

// Création d'une Fiche Test de Grossesse
export async function createTestGrossesse(data: TestGrossesse) {
  await requirePermission(TableName.TEST_GROSSESSE, "canCreate");
  const validated = validateServerData(TestGrossesseCreateSchema, data);
  const result = await prisma.testGrossesse.create({
    data: validated,
  });
  await logAction({
    idUser: data.testIdUser,
    action: "CREATION",
    entite: "TestGrossesse",
    entiteId: result.id,
    idClinique: data.testIdClinique,
    description: `Création fiche Test de Grossesse pour client ${data.testIdClient}`,
  });
  return result;
}

// ************* Fiche TestGrossesse **************
export const getAllTestGrossesse = async () => {
  const allTestGrossesse = await prisma.testGrossesse.findMany({
    orderBy: { testCreatedAt: "desc" },
  });
  return allTestGrossesse;
};

// Récupération de Fiche TestGrossesse par ID
export const getAllTestGrossesseByIdClient = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allTestGrossesse = await prisma.testGrossesse.findMany({
    where: { testIdClient: id },
  });
  return allTestGrossesse;
};

// Récupération de une seul Fiche TestGrossesse
export const getOneTestGrossesse = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneTestGrossesse = await prisma.testGrossesse.findUnique({
    where: { id },
  });

  return oneTestGrossesse;
};

// Suppression d'une Fiche TestGrossesse
export async function deleteTestGrossesse(id: string) {
  await requirePermission(TableName.TEST_GROSSESSE, "canDelete");
  const existing = await prisma.testGrossesse.findUnique({ where: { id }, select: { testIdUser: true, testIdClinique: true, testIdClient: true } });
  const result = await prisma.testGrossesse.delete({
    where: { id },
  });
  if (existing) {
    await logAction({
      idUser: existing.testIdUser,
      action: "SUPPRESSION",
      entite: "TestGrossesse",
      entiteId: id,
      idClinique: existing.testIdClinique,
      description: `Suppression fiche Test de Grossesse ${id} du client ${existing.testIdClient}`,
    });
  }
  return result;
}

//Mise à jour de la Fiche TestGrossesse
export async function updateTestGrossesse(id: string, data: TestGrossesse) {
  await requirePermission(TableName.TEST_GROSSESSE, "canUpdate");
  const validated = validateServerData(TestGrossesseCreateSchema.partial(), data);
  const result = await prisma.testGrossesse.update({
    where: { id },
    data: validated,
  });
  await logAction({
    idUser: data.testIdUser,
    action: "MODIFICATION",
    entite: "TestGrossesse",
    entiteId: id,
    idClinique: data.testIdClinique,
    description: `Modification fiche Test de Grossesse ${id}`,
  });
  return result;
}
