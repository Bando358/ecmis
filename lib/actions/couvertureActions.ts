"use server";

import { Couverture } from "@prisma/client";
import prisma from "@/lib/prisma";

// Création d'une Fiche Couverture
// avant de créer une couverture, vérifier si une couverture existante ne contient pas couvertIdVisite
export async function createCouverture(data: Couverture) {
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
