"use server";

import { Couverture, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/withPermission";
import { z } from "zod";
import { validateServerData, IdSchema } from "@/lib/validations/base";

const CouvertureSchema = z.object({
  couvertType: z.enum(["NON_ASSURE", "CAS_SOCIAL", "ASSURE"]),
  couvertIdClient: IdSchema,
  couvertIdVisite: IdSchema,
}).passthrough();

// Création d'une Fiche Couverture
// avant de créer une couverture, vérifier si une couverture existante ne contient pas couvertIdVisite
export async function createCouverture(data: Couverture) {
  await requirePermission(TableName.VISITE, "canCreate");
  validateServerData(CouvertureSchema, data);
  const existing = await prisma.couverture.findFirst({
    where: { couvertIdVisite: data.couvertIdVisite },
  });
  if (existing) {
    return;
  } else {
    return await prisma.couverture.create({
      data: {
        ...data,
      },
    });
  }
}

// ************* Fiche Couverture **************
export const getAllCouverture = async () => {
  const allCouverture = await prisma.couverture.findMany({
    // orderBy: { couvertureCreatedAt: "desc" },
  });
  return allCouverture;
};
