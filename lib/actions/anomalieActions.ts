"use server";

import { AnomalieInventaire } from "@/lib/generated/prisma";
import prisma from "../prisma";

// ************ Inventaire **********
export async function createAnomalie(data: AnomalieInventaire) {
  return await prisma.anomalieInventaire.create({
    data,
  });
}
