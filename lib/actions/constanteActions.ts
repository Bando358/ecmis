"use server";

import { Constante, TableName } from "@prisma/client";
import prisma from "../prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ConstanteCreateSchema } from "@/lib/validations";
import { logAction } from "./journalPharmacyActions";

// ************ Constante **********
export async function createContante(data: Constante) {
  await requirePermission(TableName.CONSTANTE, "canCreate");
  validateServerData(ConstanteCreateSchema, data);
  const constante = await prisma.constante.create({
    data,
  });
  if (data.idUser) {
    await logAction({
      idUser: data.idUser,
      action: "CREATION",
      entite: "Constante",
      entiteId: constante.id,
      description: `Création constante pour client ${data.idClient} - poids: ${data.poids}kg${data.taille ? `, taille: ${data.taille}cm` : ""}`,
    });
  }
  return constante;
}

export async function getConstantesByClientId(idClient: string) {
  try {
    const constantes = await prisma.constante.findMany({
      where: { idClient },
      select: {
        id: true,
        poids: true,
        taille: true,
        idClient: true,
        // idClient: true,
        Visite: {
          select: { dateVisite: true },
        },
      },
    });

    // Formatage du résultat
    return constantes.map((constante) => ({
      id: constante.id,
      poids: constante.poids,
      taille: constante.taille,
      idClient: constante.idClient,
      dateVisite: constante.Visite?.dateVisite || null,
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des constantes :", error);
    throw new Error("Impossible de récupérer les constantes du client.");
  }
}

export async function getAllContanteByIdClient(id: string) {
  return await prisma.constante.findMany({
    where: { idClient: id },
    orderBy: { createdAt: "desc" },
  });
}

export const getOneConstante = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneConstante = await prisma.constante.findUnique({
    where: { id },
  });

  return oneConstante;
};

// Mise à jour d'une Visite
export async function updateConstante(id: string, data: Partial<Constante>) {
  await requirePermission(TableName.CONSTANTE, "canUpdate");
  return await prisma.constante.update({
    where: { id },
    data,
  });
}

export const getConstantByIdVisiteClient = async (idVisite: string) => {
  try {
    const constante = await prisma.constante.findFirst({
      where: {
        idVisite: idVisite,
      },
    });
    return constante;
  } catch (error) {
    console.error("Erreur lors de la récupération de la constante :", error);
    throw error;
  }
};

// Suppression d'une Constante
export async function deleteConstante(id: string) {
  await requirePermission(TableName.CONSTANTE, "canDelete");
  return await prisma.constante.delete({
    where: { id },
  });
}
