"use server";

import prisma from "@/lib/prisma";

/**
 * Liste les ventes directes (VenteDirecte) sur une période donnée pour un
 * ensemble de cliniques. Une ligne = une vente d'un produit (un même
 * batchId regroupe les lignes d'une même transaction au comptoir).
 *
 * Utilisé par la page /listings → "Produits vendus en vente directe".
 */
export type VenteDirecteListingItem = {
  /** id de la ligne (clé unique) */
  id: string;
  /** id de la transaction (regroupe plusieurs produits achetés ensemble) */
  batchId: string;
  dateVente: Date;
  nomProduit: string;
  /** type Produit : CONTRACEPTIF / MEDICAMENTS / CONSOMMABLES (vide si introuvable) */
  typeProduit: string;
  quantite: number;
  prixUnitaire: number;
  montantProduit: number;
  /** méthode de paiement (true = CASH, false = autre) — selon la convention métier */
  methodePaiement: string;
  clinique: string;
  vendeur: string;
};

const METHODE_LABEL = (m: boolean) => (m ? "Espèces" : "Autre");

/**
 * Implémentation optimisée :
 *   1) une requête principale ventes directes (index `idClinique, dateVente`)
 *   2) charges connexes en parallèle par `IN` + `select` (pas d'`include`)
 */
export async function getVentesDirectesListing(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<VenteDirecteListingItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const ventes = await prisma.venteDirecte.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVente: { gte: dateDebut, lte: dateFin },
    },
    select: {
      id: true,
      batchId: true,
      dateVente: true,
      nomProduit: true,
      quantite: true,
      montantProduit: true,
      methode: true,
      idTarifProduit: true,
      idClinique: true,
      idUser: true,
    },
    orderBy: { dateVente: "desc" },
  });
  if (ventes.length === 0) return [];

  // Charger en parallèle TarifProduit (pour prix unitaire + lien Produit pour le type),
  // Cliniques (pour nom) et Users (pour vendeur).
  const tarifIds = Array.from(new Set(ventes.map((v) => v.idTarifProduit)));
  const cliniqueIds = Array.from(new Set(ventes.map((v) => v.idClinique)));
  const userIds = Array.from(new Set(ventes.map((v) => v.idUser)));

  const [tarifs, cliniques, users] = await Promise.all([
    prisma.tarifProduit.findMany({
      where: { id: { in: tarifIds } },
      select: {
        id: true,
        prixUnitaire: true,
        Produit: { select: { typeProduit: true, nomProduit: true } },
      },
    }),
    prisma.clinique.findMany({
      where: { id: { in: cliniqueIds } },
      select: { id: true, nomClinique: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    }),
  ]);

  const tarifMap = new Map(tarifs.map((t) => [t.id, t]));
  const cliniqueMap = new Map(cliniques.map((c) => [c.id, c.nomClinique]));
  const userMap = new Map(users.map((u) => [u.id, u.name ?? ""]));

  return ventes.map((v) => {
    const tarif = tarifMap.get(v.idTarifProduit);
    const prixUnitaire =
      tarif?.prixUnitaire ??
      (v.quantite > 0 ? Math.round(v.montantProduit / v.quantite) : 0);
    return {
      id: v.id,
      batchId: v.batchId,
      dateVente: v.dateVente,
      nomProduit: v.nomProduit,
      typeProduit: tarif?.Produit?.typeProduit ?? "",
      quantite: v.quantite,
      prixUnitaire,
      montantProduit: v.montantProduit,
      methodePaiement: METHODE_LABEL(v.methode),
      clinique: cliniqueMap.get(v.idClinique) ?? "",
      vendeur: userMap.get(v.idUser) ?? "",
    } satisfies VenteDirecteListingItem;
  });
}
