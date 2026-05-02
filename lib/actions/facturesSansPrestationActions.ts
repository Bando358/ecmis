"use server";

import prisma from "@/lib/prisma";

export type AnomalieType =
  | "aucune_prestation" // visite avec facture(s) mais aucun formulaire médical
  | "cpn_sans_obstetrique" // FacturePrestation CPN mais pas de fiche obstétrique
  | "test_grossesse_sans_fiche"; // FactureProduit Test de grossesse mais pas de fiche TestGrossesse

export type ClientFactureSansPrestationItem = {
  /** clé unique : idVisite + typeAnomalie pour permettre plusieurs lignes par visite */
  key: string;
  typeAnomalie: AnomalieType;
  libelleAnomalie: string;
  idVisite: string;
  idClient: string;
  dateVisite: Date;
  motifVisite: string;
  clientCode: string;
  clientNom: string;
  clientPrenom: string;
  clientAge: number;
  clientSexe: string;
  clinique: string;
  prescripteur: string;
  totalFacture: number;
  // détails facturation
  nbProduits: number;
  nbPrestations: number;
  nbExamens: number;
  nbEchographies: number;
};

const calcAge = (dob: Date): number => {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

const ANOMALIE_LABELS: Record<AnomalieType, string> = {
  aucune_prestation: "Visite facturée sans aucune prestation enregistrée",
  cpn_sans_obstetrique: "Facture CPN sans fiche obstétrique (CPN)",
  test_grossesse_sans_fiche:
    "Vente d'un test de grossesse sans fiche Test grossesse",
};

/**
 * Liste les anomalies de facturation sur la période :
 *  1) Visites facturées sans aucune prestation médicale enregistrée
 *  2) Facture de prestation CPN sans fiche obstétrique pour la même visite
 *  3) Vente d'un test de grossesse sans fiche TestGrossesse pour la même visite
 */
export async function getClientsFacturesSansPrestation(
  clinicIds: string[],
  dateDebut: Date,
  dateFin: Date,
): Promise<ClientFactureSansPrestationItem[]> {
  if (!clinicIds || clinicIds.length === 0) return [];

  // ---------------- Étape 1 : visites avec au moins une facture sur la période
  const visitesAvecFacture = await prisma.visite.findMany({
    where: {
      idClinique: { in: clinicIds },
      dateVisite: { gte: dateDebut, lte: dateFin },
      OR: [
        { FactureProduit: { some: {} } },
        { FacturePrestation: { some: {} } },
        { FactureExamen: { some: {} } },
        { FactureEchographie: { some: {} } },
      ],
    },
    include: {
      Client: true,
      Clinique: { select: { nomClinique: true } },
      User: { select: { name: true } },
      FactureProduit: {
        select: {
          montantProduit: true,
          tarifProduit: {
            select: { Produit: { select: { nomProduit: true } } },
          },
        },
      },
      FacturePrestation: {
        select: {
          prixPrestation: true,
          libellePrestation: true,
          Prestation: { select: { nomPrestation: true } },
        },
      },
      FactureExamen: {
        select: {
          prixExamen: true,
          remiseExamen: true,
          reductionExamen: true,
        },
      },
      FactureEchographie: {
        select: { prixEchographie: true, remiseEchographie: true },
      },
    },
    orderBy: { dateVisite: "desc" },
  });

  if (visitesAvecFacture.length === 0) return [];

  const visiteIds = visitesAvecFacture.map((v) => v.id);

  // ---------------- Étape 2 : visites ayant au moins une prestation médicale
  const [
    planning,
    gyneco,
    ist,
    infert,
    vbg,
    medecine,
    grossesse,
    obst,
    cpon,
    test,
    accouch,
    saa,
    dep,
    pec,
    examPv,
    resultEx,
    resultEcho,
  ] = await Promise.all([
    prisma.planning.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
    prisma.gynecologie.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
    prisma.ist.findMany({
      where: { istIdVisite: { in: visiteIds } },
      select: { istIdVisite: true },
    }),
    prisma.infertilite.findMany({
      where: { infertIdVisite: { in: visiteIds } },
      select: { infertIdVisite: true },
    }),
    prisma.vbg.findMany({
      where: { vbgIdVisite: { in: visiteIds } },
      select: { vbgIdVisite: true },
    }),
    prisma.medecine.findMany({
      where: { mdgIdVisite: { in: visiteIds } },
      select: { mdgIdVisite: true },
    }),
    prisma.grossesse.findMany({
      where: { grossesseIdVisite: { in: visiteIds } },
      select: { grossesseIdVisite: true },
    }),
    prisma.obstetrique.findMany({
      where: { obstIdVisite: { in: visiteIds } },
      select: { obstIdVisite: true },
    }),
    prisma.cpon.findMany({
      where: { cponIdVisite: { in: visiteIds } },
      select: { cponIdVisite: true },
    }),
    prisma.testGrossesse.findMany({
      where: { testIdVisite: { in: visiteIds } },
      select: { testIdVisite: true },
    }),
    prisma.accouchement.findMany({
      where: { accouchementIdVisite: { in: visiteIds } },
      select: { accouchementIdVisite: true },
    }),
    prisma.saa.findMany({
      where: { saaIdVisite: { in: visiteIds } },
      select: { saaIdVisite: true },
    }),
    prisma.depistageVih.findMany({
      where: { depistageVihIdVisite: { in: visiteIds } },
      select: { depistageVihIdVisite: true },
    }),
    prisma.pecVih.findMany({
      where: { pecVihIdVisite: { in: visiteIds } },
      select: { pecVihIdVisite: true },
    }),
    prisma.examenPvVih.findMany({
      where: { examenPvVihIdVisite: { in: visiteIds } },
      select: { examenPvVihIdVisite: true },
    }),
    prisma.resultatExamen.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
    prisma.resultatEchographie.findMany({
      where: { idVisite: { in: visiteIds } },
      select: { idVisite: true },
    }),
  ]);

  const idsAvecAuMoinsUnePrestation = new Set<string>([
    ...planning.map((p) => p.idVisite),
    ...gyneco.map((g) => g.idVisite),
    ...ist.map((i) => i.istIdVisite),
    ...infert.map((i) => i.infertIdVisite),
    ...vbg.map((v) => v.vbgIdVisite),
    ...medecine.map((m) => m.mdgIdVisite),
    ...grossesse.map((g) => g.grossesseIdVisite),
    ...obst.map((o) => o.obstIdVisite),
    ...cpon.map((c) => c.cponIdVisite),
    ...test.map((t) => t.testIdVisite),
    ...accouch.map((a) => a.accouchementIdVisite),
    ...saa.map((s) => s.saaIdVisite),
    ...dep.map((d) => d.depistageVihIdVisite),
    ...pec.map((p) => p.pecVihIdVisite),
    ...examPv.map((e) => e.examenPvVihIdVisite),
    ...resultEx.map((r) => r.idVisite),
    ...resultEcho.map((r) => r.idVisite),
  ]);

  // Sets dédiés pour les vérifications spécifiques
  const idsAvecObstetrique = new Set(obst.map((o) => o.obstIdVisite));
  const idsAvecTestGrossesse = new Set(test.map((t) => t.testIdVisite));

  // ---------------- Préparer un helper pour générer un item à partir d'une visite
  const buildBase = (
    v: (typeof visitesAvecFacture)[number],
  ): Omit<
    ClientFactureSansPrestationItem,
    "key" | "typeAnomalie" | "libelleAnomalie"
  > => {
    const totalProduits = v.FactureProduit.reduce(
      (s, f) => s + (f.montantProduit || 0),
      0,
    );
    const totalPrestations = v.FacturePrestation.reduce(
      (s, f) => s + (f.prixPrestation || 0),
      0,
    );
    const totalExamens = v.FactureExamen.reduce(
      (s, f) =>
        s +
        Math.max(
          0,
          Math.round(
            (f.prixExamen - (f.reductionExamen || 0)) *
              (1 - (f.remiseExamen || 0) / 100),
          ),
        ),
      0,
    );
    const totalEchographies = v.FactureEchographie.reduce(
      (s, f) =>
        s +
        Math.max(
          0,
          Math.round(
            f.prixEchographie * (1 - (f.remiseEchographie || 0) / 100),
          ),
        ),
      0,
    );

    return {
      idVisite: v.id,
      idClient: v.idClient,
      dateVisite: v.dateVisite,
      motifVisite: v.motifVisite,
      clientCode: v.Client?.code ?? "",
      clientNom: v.Client?.nom ?? "",
      clientPrenom: v.Client?.prenom ?? "",
      clientAge: v.Client?.dateNaissance ? calcAge(v.Client.dateNaissance) : 0,
      clientSexe: v.Client?.sexe ?? "",
      clinique: v.Clinique?.nomClinique ?? "",
      prescripteur: v.User?.name ?? "",
      totalFacture:
        totalProduits + totalPrestations + totalExamens + totalEchographies,
      nbProduits: v.FactureProduit.length,
      nbPrestations: v.FacturePrestation.length,
      nbExamens: v.FactureExamen.length,
      nbEchographies: v.FactureEchographie.length,
    };
  };

  const items: ClientFactureSansPrestationItem[] = [];

  for (const v of visitesAvecFacture) {
    const base = buildBase(v);

    // -------- Cas 1 : aucune prestation enregistrée
    if (!idsAvecAuMoinsUnePrestation.has(v.id)) {
      items.push({
        ...base,
        key: `${v.id}-aucune`,
        typeAnomalie: "aucune_prestation",
        libelleAnomalie: ANOMALIE_LABELS.aucune_prestation,
      });
    }

    // -------- Cas 2 : facture CPN sans fiche obstétrique
    // Détection sur le libellé saisi ET sur le nom canonique de la prestation
    // (table Prestation), pour couvrir les variantes "CPN", "CPN1", "CPN 2",
    // "CPN-1", "Consultation prénatale", "1ère CPN", etc.
    const isCpnLibelle = (txt: string | null | undefined): boolean => {
      if (!txt) return false;
      const t = txt
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, ""); // supprime les accents
      return (
        t.includes("cpn") ||
        t.includes("consultation prenatale") ||
        t.includes("consult prenatale") ||
        t.includes("pre natale") ||
        t.includes("prenatal")
      );
    };

    const aFactureCpn = v.FacturePrestation.some(
      (p) =>
        isCpnLibelle(p.libellePrestation) ||
        isCpnLibelle(p.Prestation?.nomPrestation),
    );
    if (aFactureCpn && !idsAvecObstetrique.has(v.id)) {
      items.push({
        ...base,
        key: `${v.id}-cpn`,
        typeAnomalie: "cpn_sans_obstetrique",
        libelleAnomalie: ANOMALIE_LABELS.cpn_sans_obstetrique,
      });
    }

    // -------- Cas 3 : vente test de grossesse sans fiche TestGrossesse
    const aVenteTestGrossesse = v.FactureProduit.some((f) => {
      const nom = f.tarifProduit?.Produit?.nomProduit || "";
      const lower = nom.toLowerCase();
      return (
        (lower.includes("test") && lower.includes("grossesse")) ||
        lower.includes("tbg") ||
        lower.includes("hcg")
      );
    });
    if (aVenteTestGrossesse && !idsAvecTestGrossesse.has(v.id)) {
      items.push({
        ...base,
        key: `${v.id}-test`,
        typeAnomalie: "test_grossesse_sans_fiche",
        libelleAnomalie: ANOMALIE_LABELS.test_grossesse_sans_fiche,
      });
    }
  }

  return items;
}
