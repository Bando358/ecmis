"use server";

import prisma from "@/lib/prisma";

/**
 * Cible : repérer les clients ayant rempli un Planning planning familial
 * impliquant un produit (pilule, injectable, préservatif, etc.) mais
 * pour lesquels le produit n'a pas été facturé sur la même visite.
 *
 * On considère qu'un Planning attend une facture produit si `courtDuree`
 * vaut l'une des valeurs ci-dessous. Le mot-clé attendu sert à vérifier
 * que la facture correspond bien à la méthode déclarée.
 */
const METHODE_PRODUIT: Record<
  string,
  { label: string; keywords: string[] }
> = {
  pilule: {
    label: "Pilule",
    keywords: ["microgynon", "microlut", "pilule"],
  },
  noristerat: {
    label: "Injectable 2 mois (Noristerat)",
    keywords: ["noristerat"],
  },
  injectable: {
    label: "Injectable 3 mois (Depo / Sayana)",
    keywords: ["depo", "sayana"],
  },
  preservatif: {
    label: "Préservatif",
    keywords: ["preservatif", "préservatif", "condom"],
  },
  urgence: {
    label: "Contraception d'urgence",
    keywords: ["norlevo", "urgence", "postinor", "ec"],
  },
  spermicide: {
    label: "Spermicide",
    keywords: ["spermicide"],
  },
};

const stripAccents = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export type PlanningSansFactureItem = {
  /** clé unique : id du planning */
  key: string;
  idPlanning: string;
  idVisite: string;
  idClient: string;
  dateVisite: Date;
  motifVisite: string;
  /** valeur saisie pour `courtDuree` */
  courtDuree: string;
  /** label métier (« Injectable 3 mois (Depo / Sayana) ») */
  methodeAttendue: string;
  /** liste des produits trouvés sur la visite (peut être vide) */
  produitsFactures: string[];
  /** raison de l'anomalie pour information */
  raison:
    | "aucune_facture_produit"
    | "produit_non_correspondant";
  libelleRaison: string;
  // Infos client
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  clinique: string;
  prescripteur: string;
};

const calcAge = (dob: Date): number => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

const RAISON_LABELS: Record<PlanningSansFactureItem["raison"], string> = {
  aucune_facture_produit:
    "Aucun produit facturé sur cette visite (méthode déclarée mais pas de facture)",
  produit_non_correspondant:
    "Le ou les produits facturés ne correspondent pas à la méthode déclarée",
};

/**
 * Liste les Plannings PF sur la période dont la méthode déclarée
 * (`courtDuree`) attend un produit, mais pour lesquels la facturation
 * produit est absente ou ne correspond pas à la méthode.
 *
 * Implémentation optimisée :
 *   1) on récupère d'abord les ids de visites dans la fenêtre de dates
 *      (index sur Visite.dateVisite) ;
 *   2) on filtre les Plannings sur ces ids + idClinique + courtDuree ;
 *   3) on charge en parallèle, par id IN, les FactureProduit, Clients,
 *      Cliniques et Users — uniquement les colonnes nécessaires (select).
 * Cette approche évite une requête imbriquée massive et utilise les
 * index existants à chaque étape.
 */
export async function getPlanningsSansFactureProduit(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<PlanningSansFactureItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  const courtDureeAttendus = Object.keys(METHODE_PRODUIT);

  // ---------------- Étape 1 : visites de la période (index sur dateVisite)
  const visites = await prisma.visite.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVisite: { gte: dateDebut, lte: dateFin },
    },
    select: { id: true, dateVisite: true, motifVisite: true, idClient: true },
  });
  if (visites.length === 0) return [];
  const visiteIds = visites.map((v) => v.id);

  // ---------------- Étape 2 : plannings ciblés (idClinique + courtDuree + visiteIds)
  const plannings = await prisma.planning.findMany({
    where: {
      idClinique: { in: clinicIds },
      courtDuree: { in: courtDureeAttendus },
      idVisite: { in: visiteIds },
    },
    select: {
      id: true,
      idVisite: true,
      idClient: true,
      idClinique: true,
      idUser: true,
      courtDuree: true,
    },
  });
  if (plannings.length === 0) return [];

  // ---------------- Étape 3 : charges connexes en parallèle (uniquement IN)
  const planningVisiteIds = Array.from(new Set(plannings.map((p) => p.idVisite)));
  const clientIds = Array.from(new Set(plannings.map((p) => p.idClient)));
  const cliniqueIds = Array.from(new Set(plannings.map((p) => p.idClinique)));
  const userIds = Array.from(new Set(plannings.map((p) => p.idUser)));

  const [factureProduits, clients, cliniques, users] = await Promise.all([
    prisma.factureProduit.findMany({
      where: { idVisite: { in: planningVisiteIds } },
      select: { idVisite: true, nomProduit: true },
    }),
    prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        nom: true,
        prenom: true,
        code: true,
        sexe: true,
        dateNaissance: true,
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

  // ---------------- Indexation en mémoire (Map = O(1))
  const visiteMap = new Map(visites.map((v) => [v.id, v]));
  const factureMapByVisite = new Map<string, string[]>();
  for (const f of factureProduits) {
    if (!factureMapByVisite.has(f.idVisite)) factureMapByVisite.set(f.idVisite, []);
    factureMapByVisite.get(f.idVisite)!.push(f.nomProduit ?? "");
  }
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const cliniqueMap = new Map(cliniques.map((c) => [c.id, c.nomClinique]));
  const userMap = new Map(users.map((u) => [u.id, u.name ?? ""]));

  // ---------------- Étape 4 : composition des items
  const items: PlanningSansFactureItem[] = [];
  for (const p of plannings) {
    if (!p.courtDuree) continue;
    const methode = METHODE_PRODUIT[p.courtDuree];
    if (!methode) continue;

    const produits = factureMapByVisite.get(p.idVisite) || [];
    const produitsNorm = produits.map(stripAccents);

    let raison: PlanningSansFactureItem["raison"] | null = null;
    if (produits.length === 0) {
      raison = "aucune_facture_produit";
    } else {
      const match = methode.keywords.some((kw) => {
        const k = stripAccents(kw);
        return produitsNorm.some((pr) => pr.includes(k));
      });
      if (!match) raison = "produit_non_correspondant";
    }
    if (!raison) continue;

    const visite = visiteMap.get(p.idVisite);
    const client = clientMap.get(p.idClient);
    items.push({
      key: p.id,
      idPlanning: p.id,
      idVisite: p.idVisite,
      idClient: p.idClient,
      dateVisite: visite?.dateVisite ?? new Date(),
      motifVisite: visite?.motifVisite ?? "",
      courtDuree: p.courtDuree,
      methodeAttendue: methode.label,
      produitsFactures: produits,
      raison,
      libelleRaison: RAISON_LABELS[raison],
      clientCode: client?.code ?? "",
      clientNom: client?.nom ?? "",
      clientPrenom: client?.prenom ?? "",
      clientAge: client?.dateNaissance ? calcAge(client.dateNaissance) : 0,
      clientSexe: client?.sexe ?? "",
      clinique: cliniqueMap.get(p.idClinique) ?? "",
      prescripteur: userMap.get(p.idUser) ?? "",
    });
  }

  // Tri décroissant par dateVisite (le plus récent en premier)
  items.sort((a, b) => b.dateVisite.getTime() - a.dateVisite.getTime());

  return items;
}
