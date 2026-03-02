"use server";

import { Client, Prisma, TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PAGINATION, ERROR_MESSAGES } from "@/lib/constants";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { ClientCreateSchema } from "@/lib/validations";
import { logAction } from "./journalPharmacyActions";

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
  await requirePermission(TableName.CLIENT, "canCreate");
  validateServerData(ClientCreateSchema, data);

  if (data.code) {
    const codeTaken = await prisma.client.findFirst({ where: { code: data.code }, select: { id: true } });
    if (codeTaken) throw new Error("Ce code client est déjà utilisé par un autre client.");
  }
  if (data.codeVih) {
    const codeVihTaken = await prisma.client.findFirst({ where: { codeVih: data.codeVih }, select: { id: true } });
    if (codeVihTaken) throw new Error("Ce code VIH est déjà utilisé par un autre client.");
  }

  const client = await prisma.client.create({
    data,
  });
  if (data.idUser) {
    await logAction({
      idUser: data.idUser,
      action: "CREATION",
      entite: "Client",
      entiteId: client.id,
      idClinique: data.idClinique,
      description: `Création client: ${data.nom} ${data.prenom} (${data.code})`,
    });
  }
  revalidatePath("/client");
  return client;
}

/**
 * Vérifie si un code client existe déjà (en excluant un id pour les mises à jour)
 */
export async function checkClientCode(code: string, excludeId?: string): Promise<boolean> {
  if (!code || typeof code !== "string") return false;
  const client = await prisma.client.findFirst({
    where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return !!client;
}

/**
 * Vérifie si un codeVih existe déjà dans la table Client
 * @param codeVih - string à vérifier
 * @param excludeId - id du client à exclure (pour les mises à jour)
 * @returns boolean - true si trouvé, false sinon
 */
export async function checkCodeVih(codeVih: string, excludeId?: string): Promise<boolean> {
  if (!codeVih || typeof codeVih !== "string") {
    return false;
  }

  const client = await prisma.client.findFirst({
    where: { codeVih, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });

  return !!client;
}

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
  await requirePermission(TableName.CLIENT, "canDelete");
  const existing = await prisma.client.findUnique({ where: { id } });
  if (existing && existing.idUser) {
    await logAction({
      idUser: existing.idUser,
      action: "SUPPRESSION",
      entite: "Client",
      entiteId: id,
      idClinique: existing.idClinique,
      description: `Suppression client: ${existing.nom} ${existing.prenom} (${existing.code})`,
      anciennesDonnees: existing as unknown as Record<string, unknown>,
    });
  }
  // Supprimer RecapVisite d'abord (FK sans cascade dans les données existantes)
  await prisma.recapVisite.deleteMany({ where: { idClient: id } });
  return await prisma.client.delete({
    where: { id },
  });
}

//Mise à jour de la Client
export async function updateClient(id: string, data: Client) {
  await requirePermission(TableName.CLIENT, "canUpdate");

  if (data.code) {
    const codeTaken = await prisma.client.findFirst({ where: { code: data.code, NOT: { id } }, select: { id: true } });
    if (codeTaken) throw new Error("Ce code client est déjà utilisé par un autre client.");
  }
  if (data.codeVih) {
    const codeVihTaken = await prisma.client.findFirst({ where: { codeVih: data.codeVih, NOT: { id } }, select: { id: true } });
    if (codeVihTaken) throw new Error("Ce code VIH est déjà utilisé par un autre client.");
  }

  const updated = await prisma.client.update({
    where: { id },
    data,
  });
  if (data.idUser) {
    await logAction({
      idUser: data.idUser,
      action: "MODIFICATION",
      entite: "Client",
      entiteId: id,
      idClinique: data.idClinique,
      description: `Modification client: ${data.nom} ${data.prenom} (${data.code})`,
      nouvellesDonnees: data as unknown as Record<string, unknown>,
    });
  }
  return updated;
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
