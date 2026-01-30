"use server";

import { Client, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PAGINATION, ERROR_MESSAGES } from "@/lib/constants";

// Types pour la pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ClientFilterParams {
  dateDebut?: Date | null;
  dateFin?: Date | null;
  search?: string;
  cliniqueId?: string;
}

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
  const where: Prisma.ClientWhereInput = {};

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
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Erreur Prisma :", error.message);
      throw new Error(ERROR_MESSAGES.DB_CONNECTION_ERROR);
    }

    console.error("Erreur inattendue :", error);
    throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
  }
};

/**
 * Récupère les clients avec pagination
 * @param page - Numéro de page (commence à 1)
 * @param pageSize - Nombre d'éléments par page
 * @param filters - Filtres optionnels
 * @returns Résultat paginé avec métadonnées
 */
export const getClientsPaginated = async (
  page: number = 1,
  pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE,
  filters?: ClientFilterParams
): Promise<PaginatedResult<Client>> => {
  try {
    // Validation des paramètres
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(
      Math.max(1, pageSize),
      PAGINATION.MAX_PAGE_SIZE
    );
    const skip = (validPage - 1) * validPageSize;

    // Construction du filtre
    const where: Prisma.ClientWhereInput = {};

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateEnregistrement = {};
      if (filters.dateDebut) {
        where.dateEnregistrement.gte = filters.dateDebut;
      }
      if (filters.dateFin) {
        where.dateEnregistrement.lte = filters.dateFin;
      }
    }

    if (filters?.cliniqueId) {
      where.cliniqueId = filters.cliniqueId;
    }

    if (filters?.search) {
      where.OR = [
        { nom: { contains: filters.search, mode: "insensitive" } },
        { prenom: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { codeVih: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Exécution des requêtes en parallèle
    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: validPageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.client.count({ where }),
    ]);

    const totalPages = Math.ceil(total / validPageSize);

    return {
      data,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Erreur Prisma :", error.message);
      throw new Error(ERROR_MESSAGES.DB_CONNECTION_ERROR);
    }

    console.error("Erreur inattendue :", error);
    throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
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
