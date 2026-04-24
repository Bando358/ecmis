"use server";

import prisma from "@/lib/prisma";
import { TableName } from "@prisma/client";
import { requirePermission } from "@/lib/auth/withPermission";

export type CreateTraitementIvaInput = {
  typeTraitement: string;
  observations?: string | null;
  idGynecologie?: string | null;
  idVisite: string;
  idClient: string;
  idClinique: string;
  idUser: string;
};

// Crée l'enregistrement TraitementIva rattaché à une visite existante.
// La date du traitement = la date de la visite sélectionnée.
export async function createTraitementIva(data: CreateTraitementIvaInput) {
  await requirePermission(TableName.TRAITEMENT_IVA, "canCreate");

  const result = await prisma.$transaction(async (tx) => {
    const visite = await tx.visite.findUnique({
      where: { id: data.idVisite },
      select: { dateVisite: true },
    });
    if (!visite) {
      throw new Error("Visite introuvable");
    }

    const traitement = await tx.traitementIva.create({
      data: {
        dateTraitement: visite.dateVisite,
        typeTraitement: data.typeTraitement,
        observations: data.observations ?? null,
        idGynecologie: data.idGynecologie ?? null,
        idVisite: data.idVisite,
        idClient: data.idClient,
        idClinique: data.idClinique,
        idUser: data.idUser,
      },
    });

    // Mettre à jour (ou créer) le RecapVisite pour tracer le formulaire
    const existing = await tx.recapVisite.findUnique({
      where: { idVisite: data.idVisite },
    });
    if (!existing) {
      await tx.recapVisite.create({
        data: {
          idVisite: data.idVisite,
          idClient: data.idClient,
          prescripteurs: [data.idUser],
          formulaires: ["22 Fiche Traitement IVA"],
        },
      });
    } else {
      const prescripteurs = existing.prescripteurs.includes(data.idUser)
        ? existing.prescripteurs
        : [...existing.prescripteurs, data.idUser];
      const formulaires = existing.formulaires.includes(
        "22 Fiche Traitement IVA",
      )
        ? existing.formulaires
        : [...existing.formulaires, "22 Fiche Traitement IVA"];
      await tx.recapVisite.update({
        where: { idVisite: data.idVisite },
        data: { prescripteurs, formulaires },
      });
    }

    return { traitement };
  });

  return result;
}

// Mise à jour d'un traitement existant
export async function updateTraitementIva(
  id: string,
  data: Partial<{
    dateTraitement: Date;
    typeTraitement: string;
    observations: string | null;
  }>,
) {
  await requirePermission(TableName.TRAITEMENT_IVA, "canUpdate");
  return prisma.traitementIva.update({ where: { id }, data });
}

export async function deleteTraitementIva(id: string) {
  await requirePermission(TableName.TRAITEMENT_IVA, "canDelete");
  const record = await prisma.traitementIva.findUnique({ where: { id } });
  if (!record) return null;
  // On supprime uniquement le traitement : la visite est conservée car elle
  // peut porter d'autres formulaires.
  await prisma.traitementIva.delete({ where: { id } });
  // Nettoyer le formulaire dans le recap de cette visite si plus aucun
  // traitement IVA n'est rattaché à cette visite
  const autres = await prisma.traitementIva.count({
    where: { idVisite: record.idVisite },
  });
  if (autres === 0) {
    const recap = await prisma.recapVisite.findUnique({
      where: { idVisite: record.idVisite },
    });
    if (recap) {
      await prisma.recapVisite.update({
        where: { idVisite: record.idVisite },
        data: {
          formulaires: recap.formulaires.filter(
            (f) => f !== "22 Fiche Traitement IVA",
          ),
        },
      });
    }
  }
  return record;
}

// Tous les traitements IVA d'un client
export async function getAllTraitementIvaByIdClient(clientId: string) {
  return prisma.traitementIva.findMany({
    where: { idClient: clientId },
    orderBy: { dateTraitement: "desc" },
    include: {
      User: { select: { name: true } },
      Clinique: { select: { nomClinique: true } },
    },
  });
}

// Gynécologies positives à l'IVA du client pour lesquelles aucun traitement n'est enregistré
export async function getGynecoPositifSansTraitement(clientId: string) {
  const gynecos = await prisma.gynecologie.findMany({
    where: { idClient: clientId, resultatIva: "positif" },
    orderBy: { createdAt: "desc" },
    include: {
      Visite: { select: { dateVisite: true } },
      TraitementIva: { select: { id: true } },
    },
  });
  return gynecos.filter((g) => g.TraitementIva.length === 0);
}

// Toutes les gynécologies positives d'un client (pour choisir à quel diagnostic rattacher)
export async function getAllGynecoPositifByIdClient(clientId: string) {
  return prisma.gynecologie.findMany({
    where: { idClient: clientId, resultatIva: "positif" },
    orderBy: { createdAt: "desc" },
    include: {
      Visite: { select: { dateVisite: true } },
      TraitementIva: { select: { id: true, dateTraitement: true } },
    },
  });
}

// Listing transversal : clients avec IVA positif sans traitement enregistré
export type IvaPositifPendingItem = {
  idGynecologie: string;
  idClient: string;
  idVisite: string;
  idClinique: string;
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  dateDepistage: Date;
  clinique: string;
  prescripteur: string;
};

const calcAge = (dob: Date): number => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

export async function getIvaPositifEnAttente(
  clinicIds: string[],
): Promise<IvaPositifPendingItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const gynecos = await prisma.gynecologie.findMany({
    where: {
      resultatIva: "positif",
      idClinique: { in: clinicIds },
      TraitementIva: { none: {} },
    },
    include: {
      Client: true,
      Clinique: { select: { nomClinique: true } },
      User: { select: { name: true } },
      Visite: { select: { dateVisite: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return gynecos.map((g) => ({
    idGynecologie: g.id,
    idClient: g.idClient,
    idVisite: g.idVisite,
    idClinique: g.idClinique,
    clientCode: g.Client?.code ?? "",
    clientNom: g.Client?.nom ?? "",
    clientPrenom: g.Client?.prenom ?? "",
    clientAge: g.Client?.dateNaissance ? calcAge(g.Client.dateNaissance) : 0,
    clientSexe: g.Client?.sexe ?? "",
    dateDepistage: g.Visite?.dateVisite ?? g.createdAt,
    clinique: g.Clinique?.nomClinique ?? "",
    prescripteur: g.User?.name ?? "",
  }));
}
