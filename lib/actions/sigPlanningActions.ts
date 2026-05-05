"use server";

import prisma from "@/lib/prisma";

/**
 * Une ligne du Tableau 30c (gestion de stock contraceptif).
 *
 * Mapping des indicateurs ↔ règle d'identification du produit :
 *   - on regroupe les `Produit` de type CONTRACEPTIF par mots-clés présents
 *     dans `nomProduit` (insensible aux accents et à la casse).
 *
 * Quantité distribuée = somme(`FactureProduit.prodQuantite`) sur la période
 *   pour les cliniques concernées.
 * Autres quantités sorties = somme des `AnomalieInventaire` négatives
 *   (perte / ajustement) sur la période.
 * Stock final disponible = `tarifProduit.quantiteStock` (snapshot actuel).
 * Stock initial = stock final + quantités distribuées + autres sorties
 *                 - quantités reçues (calcul rétroactif).
 * Quantité reçue = somme(`DetailCommande.quantiteRecue`) sur la période.
 * Nombre de jours de rupture = (non disponible — laissé à 0 par défaut).
 */
export type StockMethodeRow = {
  methode: string;
  stockInitial: number;
  quantiteRecue: number;
  quantiteDistribuee: number;
  autresSorties: number;
  stockDisponible: number;
  joursRupture: number;
};

const stripAccents = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Méthodes contraceptives demandées dans le Tableau 30c, avec les mots-clés
 * de matching sur `nomProduit`. Ordre = ordre d'affichage.
 */
const METHODES: { key: string; label: string; keywords: string[] }[] = [
  { key: "piluleCoc", label: "Pilule (COC)", keywords: ["microgynon"] },
  { key: "piluleCop", label: "Pilule (COP)", keywords: ["microlut"] },
  {
    key: "injectableIm3Mois",
    label: "Injectable IM 3 mois (Depo-Provera)",
    keywords: ["depo"],
  },
  {
    key: "injectableIm2Mois",
    label: "Injectable IM 2 mois (Noristerat)",
    keywords: ["noristerat"],
  },
  {
    key: "injectableSc3Mois",
    label: "Injectable sous Cutané 3 mois (Sayana Press)",
    keywords: ["sayana"],
  },
  { key: "diu", label: "DIU (Copper TCu)", keywords: ["diu", "tcu"] },
  { key: "diuPp", label: "DIU-PP (Post-partum)", keywords: ["diu-pp", "diupp"] },
  {
    key: "implant5ans",
    label: "Implant 5 ans (Jadelle)",
    keywords: ["jadelle"],
  },
  {
    key: "implant3ans",
    label: "Implant 3 ans (Implanon)",
    keywords: ["implanon"],
  },
  {
    key: "condomMasculin",
    label: "Condom masculin",
    keywords: ["condom masculin", "preservatif masculin", "preservatif m"],
  },
  {
    key: "condomFeminin",
    label: "Condom féminin",
    keywords: ["condom feminin", "preservatif feminin", "preservatif f", "femidom"],
  },
  { key: "spermicide", label: "Spermicide", keywords: ["spermicide"] },
  {
    key: "contraceptionUrgence",
    label: "Contraception d'urgence",
    keywords: ["norlevo", "postinor", "urgence"],
  },
];

export async function getStockContraceptifs(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<StockMethodeRow[]> {
  if (!clinicIds || clinicIds.length === 0)
    return METHODES.map((m) => emptyRow(m.label));

  // Étape 1 — produits CONTRACEPTIFS et leurs tarifs (avec stock actuel).
  const produits = await prisma.produit.findMany({
    where: { typeProduit: "CONTRACEPTIF" },
    select: {
      id: true,
      nomProduit: true,
      tarifProduit: {
        where: { idClinique: { in: clinicIds } },
        select: { id: true, idClinique: true, quantiteStock: true },
      },
    },
  });

  const tarifIds = produits.flatMap((p) => p.tarifProduit.map((t) => t.id));
  if (tarifIds.length === 0) return METHODES.map((m) => emptyRow(m.label));

  // Étape 2 — quantités distribuées (FactureProduit) et reçues (DetailCommande)
  // sur la période, ainsi que les sorties hors vente (AnomalieInventaire).
  const [factures, commandes, anomalies] = await Promise.all([
    prisma.factureProduit.findMany({
      where: {
        idClinique: { in: clinicIds },
        dateFacture: { gte: dateDebut, lte: dateFin },
        idTarifProduit: { in: tarifIds },
      },
      select: { idTarifProduit: true, quantite: true },
    }),
    prisma.detailCommande.findMany({
      where: {
        idTarifProduit: { in: tarifIds },
        idClinique: { in: clinicIds },
        // Filtre sur la date de la commande fournisseur (relation `commande`).
        commande: {
          dateCommande: { gte: dateDebut, lte: dateFin },
        },
      },
      select: {
        idTarifProduit: true,
        quantiteCommandee: true,
      },
    }),
    prisma.anomalieInventaire.findMany({
      where: {
        idTarifProduit: { in: tarifIds },
        dateAnomalie: { gte: dateDebut, lte: dateFin },
      },
      select: { idTarifProduit: true, quantiteManquante: true },
    }),
  ]);

  // Indexer les agrégats par tarif.
  const distribueParTarif = new Map<string, number>();
  factures.forEach((f) => {
    distribueParTarif.set(
      f.idTarifProduit,
      (distribueParTarif.get(f.idTarifProduit) || 0) + (f.quantite || 0),
    );
  });
  const recuParTarif = new Map<string, number>();
  commandes.forEach((c) => {
    recuParTarif.set(
      c.idTarifProduit,
      (recuParTarif.get(c.idTarifProduit) || 0) + (c.quantiteCommandee || 0),
    );
  });
  const sortiesParTarif = new Map<string, number>();
  anomalies.forEach((a) => {
    // Quantité manquante d'une anomalie d'inventaire = perte / ajustement
    // (toujours positive selon le schéma Prisma actuel).
    const q = a.quantiteManquante || 0;
    sortiesParTarif.set(
      a.idTarifProduit,
      (sortiesParTarif.get(a.idTarifProduit) || 0) + q,
    );
  });

  // Étape 3 — agréger par méthode contraceptive (matching sur nomProduit).
  const rows: StockMethodeRow[] = [];
  for (const methode of METHODES) {
    let stockDisponible = 0;
    let quantiteRecue = 0;
    let quantiteDistribuee = 0;
    let autresSorties = 0;

    for (const produit of produits) {
      const nameNorm = stripAccents(produit.nomProduit);
      const matches = methode.keywords.some((kw) =>
        nameNorm.includes(stripAccents(kw)),
      );
      if (!matches) continue;

      for (const tarif of produit.tarifProduit) {
        stockDisponible += tarif.quantiteStock || 0;
        quantiteRecue += recuParTarif.get(tarif.id) || 0;
        quantiteDistribuee += distribueParTarif.get(tarif.id) || 0;
        autresSorties += sortiesParTarif.get(tarif.id) || 0;
      }
    }

    // Stock initial = Stock final + sorties - entrées (calcul rétroactif).
    const stockInitial =
      stockDisponible + quantiteDistribuee + autresSorties - quantiteRecue;

    rows.push({
      methode: methode.label,
      stockInitial: Math.max(0, stockInitial),
      quantiteRecue,
      quantiteDistribuee,
      autresSorties,
      stockDisponible,
      // Nombre de jours de rupture : pas de donnée fiable pour l'instant.
      joursRupture: 0,
    });
  }

  return rows;
}

function emptyRow(label: string): StockMethodeRow {
  return {
    methode: label,
    stockInitial: 0,
    quantiteRecue: 0,
    quantiteDistribuee: 0,
    autresSorties: 0,
    stockDisponible: 0,
    joursRupture: 0,
  };
}
