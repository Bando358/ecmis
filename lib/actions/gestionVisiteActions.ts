"use server";

import { GestionVisite, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { z } from "zod";
import { validateServerData, IdSchema, OptionalStringSchema, OptionalDateSchema } from "@/lib/validations/base";

const GestionVisiteSchema = z.object({
  idVisite: IdSchema,
  typeVisite: z.enum(["CONTRACEPTION", "OBSTETRIQUE", "PEC_VIH"]),
  action: z.enum(["CONFIRMATION", "REPROGRAMMATION", "ACCOUCHEMENT", "ARRET_CONTRACEPTION", "INJOIGNABLE"]),
  commentaire: OptionalStringSchema,
  prochaineDate: OptionalDateSchema,
}).passthrough();

// Création d'une Fiche Gestion de Visite
export async function createGestionVisite(data: GestionVisite) {
  await requirePermission(TableName.GESTION_RDV, "canCreate");
  validateServerData(GestionVisiteSchema, data);
  return await prisma.gestionVisite.create({
    data,
  });
}

// Récupération  Gestion de Visite par ID visite
export const getAllGestionVisiteByIdVisite = async (id: string | null) => {
  if (!id) {
    return [];
  }
  const allGestionVisite = await prisma.gestionVisite.findMany({
    where: { idVisite: id },
  });
  return allGestionVisite;
};
// Récupération  Gestion de Visite par ID visite
export const getAllGestionVisiteByTabIdVisite = async (id: string[]) => {
  if (!id || id.length === 0) {
    return [];
  }
  const allGestionVisite = await prisma.gestionVisite.findMany({
    where: { idVisite: { in: id } },
  });
  return allGestionVisite;
};

// Suppression d'une Fiche Gestion de Visite
export async function deleteGestionVisite({ id }: { id: string }) {
  await requirePermission(TableName.GESTION_RDV, "canDelete");
  return await prisma.gestionVisite.delete({
    where: { id },
  });
}
