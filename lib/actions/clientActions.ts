"use server";

import { Client } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Création d'une client
export async function createClient(data: Client) {
  const client = await prisma.client.create({
    data,
  });
  revalidatePath("/clients");
  return client;
}

/**
 * Vérifie si un codeVih existe déjà dans la table Client
 * @param codeVih - string à vérifier
 * @returns boolean - true si trouvé, false sinon
 */
export async function checkCodeVih(codeVih: string): Promise<boolean> {
  if (!codeVih || typeof codeVih !== "string") {
    return false;
  }

  const client = await prisma.client.findFirst({
    where: { codeVih },
    select: { id: true },
  });

  return client ? true : false;
}
// fin checkCodeVih

// ************* Client **************
export const getAllClientIncludedInDate = async ({
  dateDebut,
  dateFin,
}: {
  dateDebut?: Date | null;
  dateFin?: Date | null;
}) => {
  const where: any = {};

  if (dateDebut || dateFin) {
    where.dateEnregistrement = {};

    if (dateDebut) {
      where.dateEnregistrement.gte = dateDebut;
    }

    if (dateFin) {
      where.dateEnregistrement.lte = dateFin;
    }
  }

  const allClient = await prisma.client.findMany({
    where,
  });

  return allClient;
};

export const getAllClient = async () => {
  try {
    const allClient = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    return allClient;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "PrismaClientInitializationError"
    ) {
      // Cas problème de connexion à la base
      console.error("Erreur Prisma :", (error as { message?: string }).message);
      throw new Error("Ooops problème de connexion !");
    }

    // Pour toute autre erreur
    console.error("Erreur inattendue :", error);
    throw new Error("Une erreur est survenue.");
  }
};

// Récupération de tous Clients dont leurs codeVih existe dans un tableau
export const getAllClientByTabCodeVih = async (codeVihs: string[]) => {
  if (codeVihs.length === 0) {
    return [];
  }
  const clients = await prisma.client.findMany({
    where: {
      codeVih: {
        in: codeVihs,
      },
    },
  });
  return clients;
};
// Fin Récupération de tous Clients dont leurs codeVih existe dans un tableau
// Récupération de une seul Client
export const getOneClient = async (id: string | null) => {
  if (!id) {
    return null; // ou lancez une erreur si nécessaire
  }
  const oneClient = await prisma.client.findUnique({
    where: { id },
  });

  return oneClient;
};

// Suppression d'un client
export async function deleteClient(id: string) {
  return await prisma.client.delete({
    where: { id },
  });
}

//Mise à jour de la Client
export async function updateClient(id: string, data: Client) {
  return await prisma.client.update({
    where: { id },
    data,
  });
}

//***************incrementCounter*******/
export async function fetchIncrementCounter(cliniqueId: string, year: number) {
  const counter = await prisma.incrementCounter.upsert({
    where: { cliniqueId_year: { cliniqueId, year } },
    update: { counter: { increment: 1 } },
    create: { cliniqueId, year, counter: 1 },
  });
  return counter;
}
