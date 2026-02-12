import { IndicatorDefinition } from "../types";
import { countRecords, countDistinct, sumField, combineDataPoints, ratioCompute } from "./helpers";

export const INDICATOR_REGISTRY: IndicatorDefinition[] = [
  // =============== GENERAL (4) ===============
  {
    id: "TOTAL_VISITES",
    name: "Nombre total de visites",
    shortName: "Visites",
    description: "Comptage total des visites dans la periode",
    category: "general",
    dataSources: ["visite"],
    aggregation: "count",
    compute: (data) => countRecords(data.visite),
    valueType: "integer",
  },
  {
    id: "TOTAL_CLIENTS_NOUVEAUX",
    name: "Nouveaux clients enregistres",
    shortName: "Nvx clients",
    description: "Clients enregistres pour la premiere fois",
    category: "general",
    dataSources: ["visite"],
    aggregation: "countDistinct",
    compute: (data) => {
      if (!data.visite) return [];
      const filtered = data.visite.filter((v) => {
        const client = v.Client as Record<string, unknown> | undefined;
        return client?.statusClient === "nouveau";
      });
      return countDistinct(filtered, "idClient");
    },
    valueType: "integer",
  },
  {
    id: "TOTAL_CLIENTS_ANCIENS",
    name: "Anciens clients",
    shortName: "Anc clients",
    description: "Clients deja enregistres",
    category: "general",
    dataSources: ["visite"],
    aggregation: "countDistinct",
    compute: (data) => {
      if (!data.visite) return [];
      const filtered = data.visite.filter((v) => {
        const client = v.Client as Record<string, unknown> | undefined;
        return client?.statusClient === "ancien";
      });
      return countDistinct(filtered, "idClient");
    },
    valueType: "integer",
  },
  {
    id: "TOTAL_CLIENTS_DISTINCTS",
    name: "Total clients distincts",
    shortName: "Total clt",
    description: "Nombre total de clients distincts ayant consulte",
    category: "general",
    dataSources: ["visite"],
    aggregation: "countDistinct",
    compute: (data) => countDistinct(data.visite, "idClient"),
    valueType: "integer",
  },

  // =============== PLANIFICATION FAMILIALE (5) ===============
  {
    id: "PF_CONSULTATIONS",
    name: "Consultations PF",
    shortName: "Clt PF",
    description: "Nombre de consultations en planification familiale",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.consultation === true),
    valueType: "integer",
  },
  {
    id: "PF_METHODES_PRISES",
    name: "Methodes prises",
    shortName: "Meth PF",
    description: "Nombre de methodes PF prises",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true),
    valueType: "integer",
  },
  {
    id: "PF_COUNSELLING",
    name: "Counselling PF",
    shortName: "Couns PF",
    description: "Nombre de counselling PF realises",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.counsellingPf === true),
    valueType: "integer",
  },

  // =============== GYNECOLOGIE (2) ===============
  {
    id: "GYNECO_CONSULTATIONS",
    name: "Consultations gynecologiques",
    shortName: "Clt Gyneco",
    description: "Nombre de consultations gynecologiques",
    category: "gynecologie",
    dataSources: ["gynecologie"],
    aggregation: "count",
    compute: (data) => countRecords(data.gynecologie, (r) => r.consultation === true),
    valueType: "integer",
  },
  {
    id: "GYNECO_IVA_POSITIVE",
    name: "IVA positives",
    shortName: "IVA+",
    description: "Resultat IVA positif",
    category: "gynecologie",
    dataSources: ["gynecologie"],
    aggregation: "count",
    compute: (data) => countRecords(data.gynecologie, (r) => r.resultatIva === "positive" || r.resultatIva === "positif"),
    valueType: "integer",
  },

  // =============== OBSTETRIQUE (3) ===============
  {
    id: "OBST_CPN",
    name: "Consultations prenatales",
    shortName: "CPN",
    description: "Consultations obstricales (CPN)",
    category: "obstetrique",
    dataSources: ["obstetrique"],
    aggregation: "count",
    compute: (data) => countRecords(data.obstetrique, (r) => r.obstConsultation === true),
    valueType: "integer",
  },
  {
    id: "OBST_ACCOUCHEMENTS",
    name: "Accouchements",
    shortName: "Accouch",
    description: "Nombre total d'accouchements",
    category: "obstetrique",
    dataSources: ["accouchement"],
    aggregation: "count",
    compute: (data) => countRecords(data.accouchement),
    valueType: "integer",
  },
  {
    id: "OBST_ENFANTS_VIVANTS",
    name: "Enfants nes vivants",
    shortName: "Nne viv",
    description: "Total enfants nes vivants",
    category: "obstetrique",
    dataSources: ["accouchement"],
    aggregation: "sum",
    compute: (data) => sumField(data.accouchement, "accouchementEnfantVivant"),
    valueType: "integer",
  },

  // =============== IST (1) ===============
  {
    id: "IST_CONSULTATIONS",
    name: "Consultations IST",
    shortName: "Clt IST",
    description: "Nombre de cas IST pris en charge",
    category: "ist",
    dataSources: ["ist"],
    aggregation: "count",
    compute: (data) => countRecords(data.ist),
    valueType: "integer",
  },

  // =============== DEPISTAGE VIH (2) ===============
  {
    id: "DEPISTAGE_VIH_TOTAL",
    name: "Depistages VIH realises",
    shortName: "Dep VIH",
    description: "Total tests de depistage VIH",
    category: "depistage_vih",
    dataSources: ["depistageVih"],
    aggregation: "count",
    compute: (data) => countRecords(data.depistageVih),
    valueType: "integer",
  },
  {
    id: "DEPISTAGE_VIH_POSITIF",
    name: "Depistages VIH positifs",
    shortName: "VIH+",
    description: "Tests VIH avec resultat positif",
    category: "depistage_vih",
    dataSources: ["depistageVih"],
    aggregation: "count",
    compute: (data) =>
      countRecords(data.depistageVih, (r) => r.depistageVihResultat === "positif"),
    valueType: "integer",
  },

  // =============== PEC VIH (1) ===============
  {
    id: "PEC_VIH_SUIVI",
    name: "PEC VIH suivis",
    shortName: "PEC VIH",
    description: "Nombre de patients en PEC VIH",
    category: "pec_vih",
    dataSources: ["pecVih"],
    aggregation: "count",
    compute: (data) => countRecords(data.pecVih),
    valueType: "integer",
  },

  // =============== MEDECINE (2) ===============
  {
    id: "MDG_CONSULTATIONS",
    name: "Consultations medecine generale",
    shortName: "Clt MdG",
    description: "Consultations en medecine generale",
    category: "medecine",
    dataSources: ["medecine"],
    aggregation: "count",
    compute: (data) => countRecords(data.medecine, (r) => r.mdgConsultation === true),
    valueType: "integer",
  },
  {
    id: "MDG_PALUDISME",
    name: "Cas suspicion paludisme",
    shortName: "Palu",
    description: "Suspicion paludisme simple ou grave",
    category: "medecine",
    dataSources: ["medecine"],
    aggregation: "count",
    compute: (data) => countRecords(data.medecine, (r) => !!r.mdgSuspicionPalu),
    valueType: "integer",
  },

  // =============== FINANCIER (3) ===============
  {
    id: "REVENU_PRESTATIONS",
    name: "Revenus prestations",
    shortName: "Rev Prest",
    description: "Total des revenus de prestations",
    category: "financier",
    dataSources: ["facturePrestation"],
    aggregation: "sum",
    compute: (data) => sumField(data.facturePrestation, "prixPrestation"),
    valueType: "currency",
    unit: "CFA",
  },
  {
    id: "REVENU_PRODUITS",
    name: "Revenus produits",
    shortName: "Rev Prod",
    description: "Total des revenus de vente produits",
    category: "financier",
    dataSources: ["factureProduit"],
    aggregation: "sum",
    compute: (data) => sumField(data.factureProduit, "montantProduit"),
    valueType: "currency",
    unit: "CFA",
  },
  {
    id: "REVENU_TOTAL",
    name: "Revenu total",
    shortName: "Rev Total",
    description: "Somme de tous les types de revenus",
    category: "financier",
    dataSources: ["facturePrestation", "factureProduit", "factureExamen", "factureEchographie"],
    aggregation: "sum",
    compute: (data) =>
      combineDataPoints(
        sumField(data.facturePrestation, "prixPrestation"),
        sumField(data.factureProduit, "montantProduit"),
        sumField(data.factureExamen, "prixExamen"),
        sumField(data.factureEchographie, "prixEchographie")
      ),
    valueType: "currency",
    unit: "CFA",
  },

  // =============== PHARMACIE (1) ===============
  {
    id: "PHARMA_PRODUITS_VENDUS",
    name: "Produits vendus",
    shortName: "Prod vendus",
    description: "Quantite totale de produits vendus",
    category: "pharmacie",
    dataSources: ["factureProduit"],
    aggregation: "sum",
    compute: (data) => sumField(data.factureProduit, "quantite"),
    valueType: "integer",
  },

  // =============== RATIO (1) ===============
  {
    id: "TAUX_POSITIVITE_VIH",
    name: "Taux de positivite VIH",
    shortName: "Tx VIH+",
    description: "Pourcentage de tests VIH positifs / total tests",
    category: "depistage_vih",
    dataSources: ["depistageVih"],
    aggregation: "ratio",
    numeratorId: "DEPISTAGE_VIH_POSITIF",
    denominatorId: "DEPISTAGE_VIH_TOTAL",
    compute: (data) =>
      ratioCompute(
        data,
        (d) => countRecords(d.depistageVih, (r) => r.depistageVihResultat === "positif"),
        (d) => countRecords(d.depistageVih)
      ),
    valueType: "percentage",
    unit: "%",
  },
];

// ---------- Helpers de recherche ----------

export function getIndicator(id: string, registry?: IndicatorDefinition[]): IndicatorDefinition | undefined {
  const reg = registry ?? INDICATOR_REGISTRY;
  return reg.find((i) => i.id === id);
}

export function getIndicatorsByCategory(registry?: IndicatorDefinition[]) {
  const reg = registry ?? INDICATOR_REGISTRY;
  const grouped: Record<string, IndicatorDefinition[]> = {};
  for (const ind of reg) {
    if (!grouped[ind.category]) grouped[ind.category] = [];
    grouped[ind.category].push(ind);
  }
  return grouped;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  planification_familiale: "Planification Familiale",
  gynecologie: "Gynecologie",
  obstetrique: "Obstetrique",
  accouchement: "Accouchement",
  ist: "IST",
  depistage_vih: "Depistage VIH",
  pec_vih: "PEC VIH",
  medecine: "Medecine Generale",
  pharmacie: "Pharmacie",
  laboratoire: "Laboratoire",
  financier: "Financier",
  vbg: "VBG",
  infertilite: "Infertilite",
  saa: "SAA",
  cpon: "CPON",
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
