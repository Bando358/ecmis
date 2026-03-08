"use server";

import { randomUUID } from "crypto";
import { TableName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAction } from "./journalPharmacyActions";
import { requirePermission } from "@/lib/auth/withPermission";
import { validateServerData } from "@/lib/validations";
import { VenteDirecteCreateSchema } from "@/lib/validations/finance";

type VenteDirecteLigne = {
  idTarifProduit: string;
  nomProduit: string;
  quantite: number;
  montantProduit: number;
  methode: boolean;
  idClinique: string;
  idUser: string;
};

// Créer plusieurs ventes directes dans une transaction atomique (panier)
export async function createVentesDirectesBatch(lignes: VenteDirecteLigne[]) {
  await requirePermission(TableName.VENTE_DIRECTE, "canCreate");

  const batchId = randomUUID();

  const results = await prisma.$transaction(
    async (tx) => {
      const created = [];
      for (const ligne of lignes) {
        const validated = validateServerData(VenteDirecteCreateSchema, ligne);
        const vente = await tx.venteDirecte.create({ data: { ...validated, batchId } });

        // Décrémentation atomique du stock
        const updated = await tx.tarifProduit.update({
          where: { id: validated.idTarifProduit },
          data: { quantiteStock: { decrement: validated.quantite } },
        });
        if (updated.quantiteStock < 0) {
          throw new Error(`Stock insuffisant pour: ${validated.nomProduit}`);
        }
        created.push(vente);
      }
      return created;
    },
    { maxWait: 10000, timeout: 30000 }
  );

  // Log chaque vente après la transaction
  for (const vente of results) {
    await logAction({
      idUser: vente.idUser,
      action: "CREATION",
      entite: "VenteDirecte",
      entiteId: vente.id,
      idClinique: vente.idClinique,
      description: `Vente directe: ${vente.nomProduit} (x${vente.quantite}) - ${vente.montantProduit} FCFA`,
      nouvellesDonnees: {
        nomProduit: vente.nomProduit,
        quantite: vente.quantite,
        montantProduit: vente.montantProduit,
      },
    });
  }

  return results;
}

// Supprimer une vente directe + restaurer le stock
export async function deleteVenteDirecte(id: string) {
  await requirePermission(TableName.VENTE_DIRECTE, "canDelete");

  const existing = await prisma.venteDirecte.findUnique({ where: { id } });
  if (!existing) throw new Error("Vente directe introuvable");

  await prisma.$transaction(
    async (tx) => {
      await tx.venteDirecte.delete({ where: { id } });
      await tx.tarifProduit.update({
        where: { id: existing.idTarifProduit },
        data: { quantiteStock: { increment: existing.quantite } },
      });
    },
    { maxWait: 10000, timeout: 30000 }
  );

  await logAction({
    idUser: existing.idUser,
    action: "SUPPRESSION",
    entite: "VenteDirecte",
    entiteId: id,
    idClinique: existing.idClinique,
    description: `Annulation vente directe: ${existing.nomProduit} (x${existing.quantite})`,
    anciennesDonnees: {
      nomProduit: existing.nomProduit,
      quantite: existing.quantite,
      montantProduit: existing.montantProduit,
    },
  });
}

// Récupérer les ventes directes par clinique et période (pour rapport financier)
export async function fetchVentesDirectes(
  clinicIds: string[],
  dateFrom: Date,
  dateTo: Date
) {
  if (!clinicIds.length) return [];

  return await prisma.venteDirecte.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVente: { gte: dateFrom, lte: dateTo },
    },
    include: {
      tarifProduit: { include: { Produit: true } },
      Clinique: true,
      User: true,
    },
    orderBy: { dateVente: "desc" },
  });
}

// Récupérer les ventes directes du jour pour une clinique
export async function getVentesDirectesDuJour(idClinique: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await prisma.venteDirecte.findMany({
    where: {
      idClinique,
      dateVente: { gte: today, lt: tomorrow },
    },
    include: {
      tarifProduit: { include: { Produit: true } },
      User: true,
    },
    orderBy: { dateVente: "desc" },
  });
}
