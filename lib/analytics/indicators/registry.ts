import { IndicatorDefinition } from "../types";
import { countRecords, countDistinct, sumField, combineDataPoints, ratioCompute } from "./helpers";

/**
 * Construit un mapping idClient → noms de produits factures (en minuscule).
 * Utilise pour determiner le produit specifique (microgynon/microlut, depo/sayana).
 */
function buildClientProductMap(
  factureProduit: Record<string, unknown>[] | undefined
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!factureProduit) return map;
  for (const f of factureProduit) {
    const clientId = f.idClient as string;
    const nom = f.nomProduit as string;
    if (!clientId || !nom) continue;
    if (!map.has(clientId)) map.set(clientId, []);
    map.get(clientId)!.push(nom.toLowerCase());
  }
  return map;
}

/**
 * Construit un Set des noms d'examen pour un typeExamen donne.
 * Utilise pour filtrer les factureExamen par type de service labo.
 */
function getExamNamesByType(
  examens: Record<string, unknown>[] | undefined,
  type: string
): Set<string> {
  const set = new Set<string>();
  if (!examens) return set;
  for (const e of examens) {
    if (e.typeExamen === type && typeof e.nomExamen === "string") {
      set.add(e.nomExamen);
    }
  }
  return set;
}

/**
 * Compte les clients distincts ayant des factureExamen dont le libelleExamen
 * correspond a un typeExamen donne (via la table de reference examen).
 */
function countLaboClientsByType(
  factureExamen: Record<string, unknown>[] | undefined,
  examNameSet: Set<string>
): Record<string, unknown>[] {
  if (!factureExamen || examNameSet.size === 0) return [];
  const clientIds = new Set<string>();
  const result: Record<string, unknown>[] = [];
  for (const fe of factureExamen) {
    const libelle = fe.libelleExamen as string;
    const clientId = fe.idClient as string;
    if (libelle && clientId && examNameSet.has(libelle) && !clientIds.has(clientId)) {
      clientIds.add(clientId);
      result.push(fe);
    }
  }
  return result;
}

/**
 * Compte les factureExamen (services) dont le libelleExamen
 * correspond a un typeExamen donne.
 */
function countLaboServicesByType(
  factureExamen: Record<string, unknown>[] | undefined,
  examNameSet: Set<string>
): Record<string, unknown>[] {
  if (!factureExamen || examNameSet.size === 0) return [];
  return factureExamen.filter((fe) => {
    const libelle = fe.libelleExamen as string;
    return libelle && examNameSet.has(libelle);
  });
}

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

  // --- Visites par type ---
  { id: "VISITES_ROUTINE", name: "Visites de routine (clinique fixe)", shortName: "Visites routine", description: "Visites sans activite (consultation en clinique fixe)", category: "general", dataSources: ["visite"], aggregation: "count", compute: (data) => countRecords(data.visite, (r) => !r.idActivite), valueType: "integer" },
  { id: "VISITES_STRATEGIE_AVANCEE", name: "Visites en strategie avancee (activites)", shortName: "Visites SA", description: "Visites liees a une activite/strategie avancee", category: "general", dataSources: ["visite"], aggregation: "count", compute: (data) => countRecords(data.visite, (r) => !!r.idActivite), valueType: "integer" },

  // --- Population vulnerable ---
  { id: "CLIENTS_POPULATION_VULNERABLE", name: "Clients population vulnerable", shortName: "Pop vulner.", description: "Clients identifies comme population vulnerable", category: "general", dataSources: ["visite"], aggregation: "countDistinct", compute: (data) => { if (!data.visite) return []; const filtered = data.visite.filter((v) => { const client = v.Client as Record<string, unknown> | undefined; return client?.populationVulnerable && client.populationVulnerable !== "non"; }); return countDistinct(filtered, "idClient"); }, valueType: "integer" },

  // --- References et contre-references ---
  { id: "TOTAL_REFERENCES", name: "Total references emises", shortName: "References", description: "Nombre total de references emises", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference), valueType: "integer" },
  { id: "REF_TB", name: "References - TB", shortName: "Ref TB", description: "References pour tuberculose", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference, (r) => r.motifReference === "TB"), valueType: "integer" },
  { id: "REF_PALU_GRAVE", name: "References - Palu grave", shortName: "Ref Palu", description: "References pour paludisme grave", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference, (r) => r.motifReference === "Palu grave"), valueType: "integer" },
  { id: "REF_ACCOUCHEMENT", name: "References - Accouchement", shortName: "Ref Accouch", description: "References pour accouchement", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference, (r) => r.motifReference === "Accouchement"), valueType: "integer" },
  { id: "REF_CANCER_COL", name: "References - Suspicion cancer col", shortName: "Ref Cancer Col", description: "References pour suspicion cancer du col", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference, (r) => r.motifReference === "Suspicion cancer col"), valueType: "integer" },
  { id: "REF_CANCER_SEIN", name: "References - Suspicion cancer sein", shortName: "Ref Cancer Sein", description: "References pour suspicion cancer du sein", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference, (r) => r.motifReference === "Suspicion cancer sein"), valueType: "integer" },
  { id: "REF_AUTRE", name: "References - Autre motif", shortName: "Ref Autre", description: "References pour autre motif", category: "general", dataSources: ["reference"], aggregation: "count", compute: (data) => countRecords(data.reference, (r) => r.motifReference === "Autre"), valueType: "integer" },
  { id: "TOTAL_CONTRE_REFERENCES", name: "Total contre-references recues", shortName: "Contre-ref", description: "Nombre total de contre-references recues", category: "general", dataSources: ["contreReference"], aggregation: "count", compute: (data) => countRecords(data.contreReference), valueType: "integer" },

  // --- Ordonnances ---
  { id: "TOTAL_ORDONNANCES", name: "Total ordonnances emises", shortName: "Ordonnances", description: "Nombre total d'ordonnances", category: "general", dataSources: ["ordonnance"], aggregation: "count", compute: (data) => countRecords(data.ordonnance), valueType: "integer" },

  // --- Constantes ---
  { id: "TOTAL_CONSTANTES", name: "Total constantes prises", shortName: "Constantes", description: "Nombre total de prises de constantes (signes vitaux)", category: "general", dataSources: ["constante"], aggregation: "count", compute: (data) => countRecords(data.constante), valueType: "integer" },

  // --- Etat nutritionnel (IMC) ---
  { id: "NUTRI_MAIGREUR", name: "Etat nutritionnel - Maigreur", shortName: "Maigreur", description: "Clients avec IMC maigreur (< 18.5)", category: "general", dataSources: ["constante"], aggregation: "count", compute: (data) => countRecords(data.constante, (r) => r.etatImc === "Maigreur"), valueType: "integer" },
  { id: "NUTRI_NORMAL", name: "Etat nutritionnel - Poids normal", shortName: "Poids normal", description: "Clients avec IMC normal (18.5 - 24.9)", category: "general", dataSources: ["constante"], aggregation: "count", compute: (data) => countRecords(data.constante, (r) => r.etatImc === "Poids normal"), valueType: "integer" },
  { id: "NUTRI_SURPOIDS", name: "Etat nutritionnel - Surpoids", shortName: "Surpoids", description: "Clients avec IMC surpoids (25 - 29.9)", category: "general", dataSources: ["constante"], aggregation: "count", compute: (data) => countRecords(data.constante, (r) => r.etatImc === "Surpoids"), valueType: "integer" },
  { id: "NUTRI_OBESITE", name: "Etat nutritionnel - Obesite", shortName: "Obesite", description: "Clients avec IMC obesite (>= 30)", category: "general", dataSources: ["constante"], aggregation: "count", compute: (data) => countRecords(data.constante, (r) => r.etatImc === "Obésité"), valueType: "integer" },

  // --- Couverture ---
  { id: "CLIENTS_ASSURES", name: "Clients assures", shortName: "Assures", description: "Clients ayant une couverture assuree", category: "general", dataSources: ["couverture"], aggregation: "count", compute: (data) => countRecords(data.couverture, (r) => r.couvertType === "ASSURE"), valueType: "integer" },
  { id: "CLIENTS_NON_ASSURES", name: "Clients non assures", shortName: "Non assures", description: "Clients sans couverture", category: "general", dataSources: ["couverture"], aggregation: "count", compute: (data) => countRecords(data.couverture, (r) => r.couvertType === "NON_ASSURE"), valueType: "integer" },
  { id: "CLIENTS_CAS_SOCIAL", name: "Clients cas social", shortName: "Cas social", description: "Clients identifies comme cas social", category: "general", dataSources: ["couverture"], aggregation: "count", compute: (data) => countRecords(data.couverture, (r) => r.couvertType === "CAS_SOCIAL"), valueType: "integer" },

  // =============== PLANIFICATION FAMILIALE - Clients PF par methode (12) ===============
  {
    id: "CLT_PF_PILULES",
    name: "CLT - PF - Pilules",
    shortName: "CLT Pilules",
    description: "Clients PF - Pilules (courte duree)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "pilule"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_INJECTABLE_2MOIS",
    name: "CLT - PF - Injectable 2 mois",
    shortName: "CLT Inj 2m",
    description: "Clients PF - Injectable 2 mois (Noristerat)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "noristera"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_INJECTABLE_3MOIS",
    name: "CLT - PF - Injectable 3 mois",
    shortName: "CLT Inj 3m",
    description: "Clients PF - Injectable 3 mois",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "injectable"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_IMPLANT_3ANS",
    name: "CLT - PF - Implant 3 ans (Insertion, Controle)",
    shortName: "CLT Impl 3a",
    description: "Clients PF - Implant 3 ans Implanon (insertion + controle)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.implanon === "insertion" || r.implanon === "controle"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_IMPLANT_3ANS_RETRAIT",
    name: "CLT - PF - Implant 3 ans - retrait",
    shortName: "CLT Impl 3a ret",
    description: "Clients PF - Implant 3 ans retrait",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.retraitImplanon === true),
    valueType: "integer",
  },
  {
    id: "CLT_PF_IMPLANT_5ANS",
    name: "CLT - PF - Implant 5 ans (insertion, controle)",
    shortName: "CLT Impl 5a",
    description: "Clients PF - Implant 5 ans Jadelle (insertion + controle)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.jadelle === "insertion" || r.jadelle === "controle"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_IMPLANT_5ANS_RETRAIT",
    name: "CLT - PF - Implant 5 ans - retrait",
    shortName: "CLT Impl 5a ret",
    description: "Clients PF - Implant 5 ans retrait",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.retraitJadelle === true),
    valueType: "integer",
  },
  {
    id: "CLT_PF_DIU",
    name: "CLT - PF - DIU 10 ans (insertion, controle)",
    shortName: "CLT DIU",
    description: "Clients PF - DIU Sterilet (insertion + controle)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.sterilet === "insertion" || r.sterilet === "controle"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_DIU_RETRAIT",
    name: "CLT - PF - Diu retrait",
    shortName: "CLT DIU ret",
    description: "Clients PF - DIU retrait",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.retraitSterilet === true),
    valueType: "integer",
  },
  {
    id: "CLT_PF_PRESERVATIF",
    name: "CLT - PF - Preservatif (Feminin, Masculin)",
    shortName: "CLT Preservatif",
    description: "Clients PF - Preservatif",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "preservatif"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_URGENCE",
    name: "CLT - PF - Contraception d'urgence",
    shortName: "CLT Urgence",
    description: "Clients PF - Contraception d'urgence",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "urgence"),
    valueType: "integer",
  },
  {
    id: "CLT_PF_SPERMICIDES",
    name: "CLT - PF - Spermicides",
    shortName: "CLT Spermicides",
    description: "Clients PF - Spermicides",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "spermicide"),
    valueType: "integer",
  },

  // =============== PLANIFICATION FAMILIALE - Services PF (16) ===============
  {
    id: "SRV_PF_COUNSELING",
    name: "SRV - PF - Counseling General",
    shortName: "SRV Counseling",
    description: "Services PF - Counseling general",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.counsellingPf === true),
    valueType: "integer",
  },
  {
    id: "SRV_PF_PRESERVATIF",
    name: "SRV - PF - Consultation - Preservatif",
    shortName: "SRV Preservatif",
    description: "Services PF - Consultation Preservatif",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "preservatif"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_PILULES",
    name: "SRV - PF - Consultation - Pilules",
    shortName: "SRV Pilules",
    description: "Services PF - Consultation Pilules",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "pilule"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_INJECTABLE_2MOIS",
    name: "SRV - PF - Consultation - Injectable 2 mois",
    shortName: "SRV Inj 2m",
    description: "Services PF - Consultation Injectable 2 mois",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "noristera"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_INJECTABLE_3MOIS",
    name: "SRV - PF - Consultation - Injectable 3 mois",
    shortName: "SRV Inj 3m",
    description: "Services PF - Consultation Injectable 3 mois",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "injectable"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_IMPLANT_3ANS_INSERTION",
    name: "SRV - PF - Consultation - Implant 3 ans - Insertion",
    shortName: "SRV Impl 3a ins",
    description: "Services PF - Implant 3 ans insertion",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.implanon === "insertion"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_IMPLANT_3ANS_CONTROLE",
    name: "SRV - PF - Consultation - Implant 3 ans - Controle",
    shortName: "SRV Impl 3a ctrl",
    description: "Services PF - Implant 3 ans controle",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.implanon === "controle"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_IMPLANT_3ANS_RETRAIT",
    name: "SRV - PF - Consultation - Implant 3 ans - Retrait",
    shortName: "SRV Impl 3a ret",
    description: "Services PF - Implant 3 ans retrait",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.retraitImplanon === true),
    valueType: "integer",
  },
  {
    id: "SRV_PF_IMPLANT_5ANS_INSERTION",
    name: "SRV - PF - Consultation - Implant 5 ans - Insertion",
    shortName: "SRV Impl 5a ins",
    description: "Services PF - Implant 5 ans insertion",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.jadelle === "insertion"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_IMPLANT_5ANS_CONTROLE",
    name: "SRV - PF - Consultation - Implant 5 ans - Controle",
    shortName: "SRV Impl 5a ctrl",
    description: "Services PF - Implant 5 ans controle",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.jadelle === "controle"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_IMPLANT_5ANS_RETRAIT",
    name: "SRV - PF - Consultation - Implant 5 ans - Retrait",
    shortName: "SRV Impl 5a ret",
    description: "Services PF - Implant 5 ans retrait",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.retraitJadelle === true),
    valueType: "integer",
  },
  {
    id: "SRV_PF_DIU_INSERTION",
    name: "SRV - PF - Consultation - DIU - Insertion",
    shortName: "SRV DIU ins",
    description: "Services PF - DIU insertion",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.sterilet === "insertion"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_DIU_CONTROLE",
    name: "SRV - PF - Consultation - DIU - Controle",
    shortName: "SRV DIU ctrl",
    description: "Services PF - DIU controle",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.sterilet === "controle"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_DIU_RETRAIT",
    name: "SRV - PF - Consultation - DIU - Retrait",
    shortName: "SRV DIU ret",
    description: "Services PF - DIU retrait",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.retraitSterilet === true),
    valueType: "integer",
  },
  {
    id: "SRV_PF_URGENCE",
    name: "SRV - PF - Contraception d'urgence",
    shortName: "SRV Urgence",
    description: "Services PF - Contraception d'urgence",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "urgence"),
    valueType: "integer",
  },
  {
    id: "SRV_PF_SPERMICIDES",
    name: "SRV - PF - Spermicides",
    shortName: "SRV Spermicides",
    description: "Services PF - Spermicides",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.courtDuree === "spermicide"),
    valueType: "integer",
  },

  // =============== PLANIFICATION FAMILIALE - Total service PF ===============
  {
    id: "SRV_PF_TOTAL",
    name: "SRV - PF - Total service PF",
    shortName: "SRV Total PF",
    description: "Total de tous les services PF (somme de toutes les consultations + counseling)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) =>
      combineDataPoints(
        countRecords(data.planning, (r) => r.counsellingPf === true),
        countRecords(data.planning, (r) => r.courtDuree === "preservatif"),
        countRecords(data.planning, (r) => r.courtDuree === "pilule"),
        countRecords(data.planning, (r) => r.courtDuree === "noristera"),
        countRecords(data.planning, (r) => r.courtDuree === "injectable"),
        countRecords(data.planning, (r) => r.implanon === "insertion"),
        countRecords(data.planning, (r) => r.implanon === "controle"),
        countRecords(data.planning, (r) => r.retraitImplanon === true),
        countRecords(data.planning, (r) => r.jadelle === "insertion"),
        countRecords(data.planning, (r) => r.jadelle === "controle"),
        countRecords(data.planning, (r) => r.retraitJadelle === true),
        countRecords(data.planning, (r) => r.sterilet === "insertion"),
        countRecords(data.planning, (r) => r.sterilet === "controle"),
        countRecords(data.planning, (r) => r.retraitSterilet === true),
        countRecords(data.planning, (r) => r.courtDuree === "urgence"),
        countRecords(data.planning, (r) => r.courtDuree === "spermicide"),
      ),
    valueType: "integer",
  },

  // =============== PLANIFICATION FAMILIALE - Proteges par produit (11) ===============
  {
    id: "PRO_PF_MICROGYNON",
    name: "Protege - Microgynon (COC)",
    shortName: "Pro Microgynon",
    description: "Clients proteges - Microgynon (pilule COC)",
    category: "planification_familiale",
    dataSources: ["planning", "factureProduit"],
    aggregation: "count",
    compute: (data) => {
      if (!data.planning) return [];
      const clientProducts = buildClientProductMap(data.factureProduit);
      return countRecords(data.planning, (r) => {
        if (r.methodePrise !== true || r.courtDuree !== "pilule") return false;
        const prods = clientProducts.get(r.idClient as string) || [];
        const hasMicrogynon = prods.some((p) => p.includes("microgynon"));
        const hasMicrolut = prods.some((p) => p.includes("microlut"));
        return hasMicrogynon || !hasMicrolut;
      });
    },
    valueType: "integer",
  },
  {
    id: "PRO_PF_MICROLUT",
    name: "Protege - Microlut (COP)",
    shortName: "Pro Microlut",
    description: "Clients proteges - Microlut (pilule COP)",
    category: "planification_familiale",
    dataSources: ["planning", "factureProduit"],
    aggregation: "count",
    compute: (data) => {
      if (!data.planning) return [];
      const clientProducts = buildClientProductMap(data.factureProduit);
      return countRecords(data.planning, (r) => {
        if (r.methodePrise !== true || r.courtDuree !== "pilule") return false;
        const prods = clientProducts.get(r.idClient as string) || [];
        const hasMicrogynon = prods.some((p) => p.includes("microgynon"));
        const hasMicrolut = prods.some((p) => p.includes("microlut"));
        return hasMicrolut && !hasMicrogynon;
      });
    },
    valueType: "integer",
  },
  {
    id: "PRO_PF_INJECTABLE_2MOIS",
    name: "Protege - Injectable 2 mois (Noristerat)",
    shortName: "Pro Inj 2m",
    description: "Clients proteges - Injectable 2 mois",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && r.courtDuree === "noristera"),
    valueType: "integer",
  },
  {
    id: "PRO_PF_DEPO_PROVERA",
    name: "Protege - Depo-Provera",
    shortName: "Pro Depo",
    description: "Clients proteges - Depo-Provera (injectable 3 mois)",
    category: "planification_familiale",
    dataSources: ["planning", "factureProduit"],
    aggregation: "count",
    compute: (data) => {
      if (!data.planning) return [];
      const clientProducts = buildClientProductMap(data.factureProduit);
      return countRecords(data.planning, (r) => {
        if (r.methodePrise !== true || r.courtDuree !== "injectable") return false;
        const prods = clientProducts.get(r.idClient as string) || [];
        const hasDepo = prods.some((p) => p.includes("depo"));
        const hasSayana = prods.some((p) => p.includes("sayana"));
        return hasDepo || !hasSayana;
      });
    },
    valueType: "integer",
  },
  {
    id: "PRO_PF_SAYANA_PRESS",
    name: "Protege - Sayana Press",
    shortName: "Pro Sayana",
    description: "Clients proteges - Sayana Press (injectable 3 mois)",
    category: "planification_familiale",
    dataSources: ["planning", "factureProduit"],
    aggregation: "count",
    compute: (data) => {
      if (!data.planning) return [];
      const clientProducts = buildClientProductMap(data.factureProduit);
      return countRecords(data.planning, (r) => {
        if (r.methodePrise !== true || r.courtDuree !== "injectable") return false;
        const prods = clientProducts.get(r.idClient as string) || [];
        const hasDepo = prods.some((p) => p.includes("depo"));
        const hasSayana = prods.some((p) => p.includes("sayana"));
        return hasSayana && !hasDepo;
      });
    },
    valueType: "integer",
  },
  {
    id: "PRO_PF_IMPLANON",
    name: "Protege - Implant 3 ans (Implanon)",
    shortName: "Pro Implanon",
    description: "Clients proteges - Implant 3 ans Implanon",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && (r.implanon === "insertion" || r.implanon === "controle")),
    valueType: "integer",
  },
  {
    id: "PRO_PF_JADELLE",
    name: "Protege - Implant 5 ans (Jadelle)",
    shortName: "Pro Jadelle",
    description: "Clients proteges - Implant 5 ans Jadelle",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && (r.jadelle === "insertion" || r.jadelle === "controle")),
    valueType: "integer",
  },
  {
    id: "PRO_PF_DIU",
    name: "Protege - DIU (Sterilet)",
    shortName: "Pro DIU",
    description: "Clients proteges - DIU Sterilet",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && (r.sterilet === "insertion" || r.sterilet === "controle")),
    valueType: "integer",
  },
  {
    id: "PRO_PF_PRESERVATIF",
    name: "Protege - Preservatif (M/F)",
    shortName: "Pro Preservatif",
    description: "Clients proteges - Preservatif",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && r.courtDuree === "preservatif"),
    valueType: "integer",
  },
  {
    id: "PRO_PF_URGENCE",
    name: "Protege - Contraception d'urgence",
    shortName: "Pro Urgence",
    description: "Clients proteges - Contraception d'urgence",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && r.courtDuree === "urgence"),
    valueType: "integer",
  },
  {
    id: "PRO_PF_SPERMICIDES",
    name: "Protege - Spermicides",
    shortName: "Pro Spermicides",
    description: "Clients proteges - Spermicides",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && r.courtDuree === "spermicide"),
    valueType: "integer",
  },

  // =============== PLANIFICATION FAMILIALE - Total client protege ===============
  {
    id: "PRO_PF_TOTAL",
    name: "Total client protege",
    shortName: "Total Protege",
    description: "Total de tous les clients proteges (somme de tous les produits)",
    category: "planification_familiale",
    dataSources: ["planning"],
    aggregation: "count",
    compute: (data) => countRecords(data.planning, (r) => r.methodePrise === true && (
      !!r.courtDuree ||
      r.implanon === "insertion" || r.implanon === "controle" ||
      r.jadelle === "insertion" || r.jadelle === "controle" ||
      r.sterilet === "insertion" || r.sterilet === "controle"
    )),
    valueType: "integer",
  },

  // =============== PLANIFICATION FAMILIALE - Produits PF distribues (1) ===============
  {
    id: "PRODUITS_PF_DISTRIBUES",
    name: "Produits PF distribues",
    shortName: "Prod PF",
    description: "Quantite totale de produits contraceptifs distribues",
    category: "planification_familiale",
    dataSources: ["factureProduit"],
    aggregation: "sum",
    compute: (data) => {
      if (!data.factureProduit) return [];
      const contraceptifs = data.factureProduit.filter((r) => {
        const tarif = r.tarifProduit as Record<string, unknown> | undefined;
        const produit = tarif?.Produit as Record<string, unknown> | undefined;
        return produit?.typeProduit === "CONTRACEPTIF";
      });
      return sumField(contraceptifs, "quantite");
    },
    valueType: "integer",
  },

  // =============== GYNECOLOGIE - Clients ===============
  { id: "CLT_GYN_CONSULTATION", name: "Nombre de femmes recues", shortName: "Clt Gyneco", description: "Femmes recues en consultation gynecologique", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.consultation === true), valueType: "integer" },
  { id: "CLT_GYN_DEPISTAGE_CANCER_COL", name: "Nombre de femmes recues pour le depistage du cancer du col", shortName: "Dep Cancer Col", description: "Depistage precoce du cancer du col de l'uterus", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counsellingAvantDepitage === true), valueType: "integer" },
  { id: "CLT_GYN_DEPISTAGE_CANCER_SEIN", name: "Nombre de femmes recues pour le depistage du cancer du sein", shortName: "Dep Cancer Sein", description: "Depistage du cancer du sein", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counselingCancerSein === true), valueType: "integer" },
  { id: "CLT_GYN_IVA_POSITIVE", name: "Nombre de femmes depistees positives a l'IVA", shortName: "IVA+", description: "Resultat IVA positif", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.resultatIva === "positif"), valueType: "integer" },
  { id: "CLT_GYN_IVA_ELIGIBLE", name: "Nombre de femmes depistees positives a l'IVA et eligibles au traitement", shortName: "IVA Eligible", description: "IVA positive et eligible au traitement", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.eligibleTraitementIva === true), valueType: "integer" },
  { id: "CLT_GYN_TRAITEMENT_CHRYO", name: "Nombre de femmes traitees a la chryotherapie", shortName: "Chryo", description: "Traitement par chryotherapie", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.typeTraitement === "chryotherapie"), valueType: "integer" },
  { id: "CLT_GYN_TRAITEMENT_THERMO", name: "Nombre de femmes traitees a la thermocoagulation", shortName: "Thermo", description: "Traitement par thermocoagulation", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.typeTraitement === "thermocoagulation"), valueType: "integer" },
  { id: "CLT_GYN_CANCER_SEIN_POSITIF", name: "Nombre de femmes depistees positives pour le cancer du sein", shortName: "Cancer Sein+", description: "Resultat cancer du sein positif", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.resultatCancerSein === "positif"), valueType: "integer" },

  // =============== GYNECOLOGIE - Services ===============
  { id: "SRV_GYN_CONSULTATION", name: "SRV - GYN Consultation", shortName: "SRV Clt Gyn", description: "Service consultation gynecologique", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.consultation === true), valueType: "integer" },
  { id: "SRV_GYN_COUNSELING_AVANT", name: "SRV - GYN Counseling avant depistage du cancer du col", shortName: "SRV Couns Avant", description: "Counseling avant depistage", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counsellingAvantDepitage === true), valueType: "integer" },
  { id: "SRV_GYN_DEPISTAGE_IVA", name: "SRV - GYN Depistage a l'IVA", shortName: "SRV Dep IVA", description: "Depistage IVA", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counsellingAvantDepitage === true), valueType: "integer" },
  { id: "SRV_GYN_COUNSELING_APRES", name: "SRV - GYN Counseling apres depistage du cancer du col", shortName: "SRV Couns Apres", description: "Counseling apres depistage", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counsellingApresDepitage === true), valueType: "integer" },
  { id: "SRV_GYN_CHRYO", name: "SRV - GYN Traite a la Chryotherapie", shortName: "SRV Chryo", description: "Service chryotherapie", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.typeTraitement === "chryotherapie"), valueType: "integer" },
  { id: "SRV_GYN_THERMO", name: "SRV - GYN Traite a la Thermocoagulation", shortName: "SRV Thermo", description: "Service thermocoagulation", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.typeTraitement === "thermocoagulation"), valueType: "integer" },
  { id: "SRV_GYN_CANCER_SEIN", name: "SRV - GYN Counseling Cancer de Sein", shortName: "SRV Cancer Sein", description: "Counseling cancer du sein", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counselingCancerSein === true), valueType: "integer" },
  { id: "SRV_GYN_AUTRES", name: "SRV - GYN Counseling Autres", shortName: "SRV Autres", description: "Counseling autres problemes", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.counselingAutreProbleme === true), valueType: "integer" },
  { id: "SRV_GYN_PALPATION", name: "SRV - GYN Examen Manuelle des seins", shortName: "SRV Palp", description: "Palpation des seins", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.examenPalpation === true), valueType: "integer" },
  { id: "SRV_GYN_PELVIEN", name: "SRV - GYN Examen Pelvien Bimanuel", shortName: "SRV Pelvien", description: "Touchee vaginale", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.toucheeVaginale === true), valueType: "integer" },
  { id: "SRV_GYN_EXAMEN_AUTRES", name: "SRV - GYN Investigation Examen Autres", shortName: "SRV Exam Aut", description: "Autres examens physiques", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.examenPhysique === true), valueType: "integer" },
  { id: "SRV_GYN_REGULATION", name: "SRV - GYN PEC Regulation Menstruelle", shortName: "SRV Reg Menst", description: "Regularisation menstruelle", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.regularisationMenstruelle === true), valueType: "integer" },
  { id: "SRV_GYN_REGLES_IRREG", name: "SRV - GYN PEC Regles Irregulieres", shortName: "SRV Reg Irreg", description: "Regles irregulieres", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.reglesIrreguliere === true), valueType: "integer" },
  { id: "SRV_GYN_AUTRE_GYNECO", name: "SRV - GYN PEC Autres maladies gynecologiques", shortName: "SRV Aut Gyn", description: "Autres problemes gynecologiques", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => countRecords(data.gynecologie, (r) => r.autreProblemeGyneco === true), valueType: "integer" },
  { id: "SRV_GYN_TOTAL", name: "SRV - Total service gynecologique", shortName: "SRV Total Gyn", description: "Total de tous les services gynecologiques", category: "gynecologie", dataSources: ["gynecologie"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.gynecologie, (r) => r.consultation === true), countRecords(data.gynecologie, (r) => r.counsellingAvantDepitage === true), countRecords(data.gynecologie, (r) => r.counsellingApresDepitage === true), countRecords(data.gynecologie, (r) => r.typeTraitement === "chryotherapie"), countRecords(data.gynecologie, (r) => r.typeTraitement === "thermocoagulation"), countRecords(data.gynecologie, (r) => r.counselingCancerSein === true), countRecords(data.gynecologie, (r) => r.counselingAutreProbleme === true), countRecords(data.gynecologie, (r) => r.examenPalpation === true), countRecords(data.gynecologie, (r) => r.toucheeVaginale === true), countRecords(data.gynecologie, (r) => r.examenPhysique === true), countRecords(data.gynecologie, (r) => r.regularisationMenstruelle === true), countRecords(data.gynecologie, (r) => r.reglesIrreguliere === true), countRecords(data.gynecologie, (r) => r.autreProblemeGyneco === true)), valueType: "integer" },

  // =============== OBSTETRIQUE - Clients ===============
  { id: "CLT_OBST_CONSULTATION", name: "Nombre de femmes recues en consultation prenatale", shortName: "Clt CPN", description: "Consultations prenatales", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstConsultation === true), valueType: "integer" },
  { id: "CLT_OBST_CPN1", name: "Nombre de femmes recues en CPN 1", shortName: "CPN1", description: "Premiere consultation prenatale", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstTypeVisite === "cpn1"), valueType: "integer" },
  { id: "CLT_OBST_CPN2", name: "Nombre de femmes recues en CPN 2", shortName: "CPN2", description: "Deuxieme consultation prenatale", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstTypeVisite === "cpn2"), valueType: "integer" },
  { id: "CLT_OBST_CPN3", name: "Nombre de femmes recues en CPN 3", shortName: "CPN3", description: "Troisieme consultation prenatale", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstTypeVisite === "cpn3"), valueType: "integer" },
  { id: "CLT_OBST_CPN4PLUS", name: "Nombre de femmes recues en CPN 4+", shortName: "CPN4+", description: "Quatrieme consultation prenatale et plus", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstTypeVisite === "cpn4" || r.obstTypeVisite === "cpn5"), valueType: "integer" },
  { id: "CLT_OBST_GROSSESSE_RISQUE", name: "Nombre de grossesse a risque depistee en CPN 1", shortName: "Grossesse Risque", description: "Grossesse a risque en CPN1", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstEtatGrossesse === "risque" && r.obstTypeVisite === "cpn1"), valueType: "integer" },
  { id: "CLT_OBST_MALNUTRI", name: "Nombre de femmes enceintes malnutries", shortName: "Malnutri", description: "Femmes enceintes malnutries en CPN", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => !!r.obstEtatNutritionnel && r.obstEtatNutritionnel !== "Poids normal"), valueType: "integer" },
  { id: "CLT_OBST_SYPHILIS", name: "Nombre de femmes depistees a la Syphilis en CPN", shortName: "Syphilis CPN", description: "Depistage syphilis en CPN", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstSyphilis === true), valueType: "integer" },
  { id: "CLT_OBST_VAT", name: "Nombre de femmes Vaccinees pendant la CPN", shortName: "VAT CPN", description: "Vaccination pendant CPN", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstVat !== null && r.obstVat !== undefined), valueType: "integer" },
  { id: "CLT_CPON_CONSULTATION", name: "Nombre de femmes recues en CPON", shortName: "Clt CPON", description: "Consultation post-natale", category: "obstetrique", dataSources: ["cpon"], aggregation: "count", compute: (data) => countRecords(data.cpon, (r) => r.cponConsultation === true), valueType: "integer" },
  { id: "CLT_CPON_IMMEDIAT", name: "Nombre de femmes recues en CPON Post partum Immediat", shortName: "CPON Immediat", description: "CPON post-partum immediat (6-72h)", category: "obstetrique", dataSources: ["cpon"], aggregation: "count", compute: (data) => countRecords(data.cpon, (r) => r.cponConsultation === true && r.cponDuree === "6_72"), valueType: "integer" },
  { id: "CLT_CPON_NON_IMMEDIAT", name: "Nombre de femmes recues en CPON Post partum", shortName: "CPON Post", description: "CPON post-partum non immediat", category: "obstetrique", dataSources: ["cpon"], aggregation: "count", compute: (data) => countRecords(data.cpon, (r) => r.cponConsultation === true && r.cponDuree !== "6_72"), valueType: "integer" },

  // =============== OBSTETRIQUE - Services ===============
  { id: "SRV_OBST_CONSULTATION", name: "SRV - OBST Consultation Prenatale", shortName: "SRV CPN", description: "Service consultation prenatale", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstConsultation === true), valueType: "integer" },
  { id: "SRV_OBST_COUNSELING", name: "SRV - OBST Counseling Prenatale", shortName: "SRV Couns Obst", description: "Service counseling prenatal", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstCounselling === true), valueType: "integer" },
  { id: "SRV_OBST_INVESTIGATION", name: "SRV - OBST Investigation Examen Prenatale", shortName: "SRV Invest Obst", description: "Investigation examen prenatal", category: "obstetrique", dataSources: ["obstetrique"], aggregation: "count", compute: (data) => countRecords(data.obstetrique, (r) => r.obstInvestigations === true), valueType: "integer" },
  { id: "SRV_CPON_CONSULTATION", name: "SRV - OBST Consultation Post Natale", shortName: "SRV CPON", description: "Service consultation post-natale", category: "obstetrique", dataSources: ["cpon"], aggregation: "count", compute: (data) => countRecords(data.cpon, (r) => r.cponConsultation === true), valueType: "integer" },
  { id: "SRV_CPON_COUNSELING", name: "SRV - OBST Counseling Post Natale", shortName: "SRV Couns CPON", description: "Service counseling post-natal", category: "obstetrique", dataSources: ["cpon"], aggregation: "count", compute: (data) => countRecords(data.cpon, (r) => r.cponCounselling === true), valueType: "integer" },
  { id: "SRV_OBST_TEST_GROSSESSE", name: "SRV - OBST Investigation Test de grossesse", shortName: "SRV Test Gross", description: "Test de grossesse", category: "obstetrique", dataSources: ["testGrossesse"], aggregation: "count", compute: (data) => countRecords(data.testGrossesse, (r) => r.testConsultation === true), valueType: "integer" },
  { id: "SRV_OBST_TOTAL", name: "SRV - Total service obstetrique", shortName: "SRV Total Obst", description: "Total de tous les services obstetrique", category: "obstetrique", dataSources: ["obstetrique", "cpon", "testGrossesse"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.obstetrique, (r) => r.obstConsultation === true), countRecords(data.obstetrique, (r) => r.obstCounselling === true), countRecords(data.obstetrique, (r) => r.obstInvestigations === true), countRecords(data.cpon, (r) => r.cponConsultation === true), countRecords(data.cpon, (r) => r.cponCounselling === true), countRecords(data.testGrossesse, (r) => r.testConsultation === true)), valueType: "integer" },

  // =============== ACCOUCHEMENT - Clients ===============
  { id: "CLT_ACC_CONSULTATION", name: "Nombre de femmes recues ayant accouche", shortName: "Clt Accouch", description: "Femmes ayant accouche", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementConsultation === true), valueType: "integer" },
  { id: "CLT_ACC_EVACUATION_AVANT", name: "Nombre de femmes evacuees avant l'accouchement", shortName: "Evac Avant", description: "Evacuation complications avant accouchement", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementTypeEvacuation === "avant"), valueType: "integer" },
  { id: "CLT_ACC_EVACUATION_PENDANT", name: "Nombre de femmes evacuees pendant l'accouchement", shortName: "Evac Pendant", description: "Evacuation complications pendant accouchement", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementTypeEvacuation === "pendant"), valueType: "integer" },
  { id: "CLT_ACC_EVACUATION_APRES", name: "Nombre de femmes evacuees apres l'accouchement", shortName: "Evac Apres", description: "Evacuation complications apres accouchement", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementTypeEvacuation === "apres"), valueType: "integer" },
  { id: "CLT_ACC_ENFANT_VIVANT", name: "Nombre de femmes ayant leurs nouveaux nes vivants", shortName: "Nne Vivant", description: "Femmes avec enfant ne vivant", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementConsultation === true && (r.accouchementEnfantVivant as number) > 0), valueType: "integer" },
  { id: "CLT_ACC_MORT_NE_FRAIS", name: "Nombre de femmes ayant perdu leurs nouveaux nes - Mort ne frais", shortName: "Mort Ne Frais", description: "Mort ne frais", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementConsultation === true && (r.accouchementEnfantMortNeFrais as number) > 0), valueType: "integer" },
  { id: "CLT_ACC_MORT_NE_MACERE", name: "Nombre de femmes ayant perdu leurs nouveaux nes - Mort ne macere", shortName: "Mort Ne Mac", description: "Mort ne macere", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementConsultation === true && (r.accouchementEnfantMortNeMacere as number) > 0), valueType: "integer" },
  { id: "CLT_ACC_TOTAL_ENFANT_VIVANT", name: "Total enfants nes vivants", shortName: "Tot Nne Viv", description: "Nombre total d'enfants nes vivants", category: "accouchement", dataSources: ["accouchement"], aggregation: "sum", compute: (data) => sumField(data.accouchement, "accouchementEnfantVivant"), valueType: "integer" },

  // =============== ACCOUCHEMENT - Services ===============
  { id: "SRV_ACC_ACCOUCHEMENT", name: "SRV - OBST - PEC Medical - Accouchement", shortName: "SRV Accouch", description: "Service PEC accouchement", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementConsultation === true), valueType: "integer" },
  { id: "SRV_ACC_SOU", name: "SRV - OBST - PEC Medical - SOU", shortName: "SRV SOU", description: "Soins obstetricaux d'urgence", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => countRecords(data.accouchement, (r) => r.accouchementEvacuationMere === "non" && (r.accouchementEnfantVivant as number) > 0), valueType: "integer" },
  { id: "SRV_ACC_TOTAL", name: "SRV - Total service maternite", shortName: "SRV Total Mat", description: "Total services maternite", category: "accouchement", dataSources: ["accouchement"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.accouchement, (r) => r.accouchementConsultation === true), countRecords(data.accouchement, (r) => r.accouchementEvacuationMere === "non" && (r.accouchementEnfantVivant as number) > 0)), valueType: "integer" },

  // =============== IST - Clients ===============
  { id: "CLT_IST_CONSULTATION", name: "Nombre de personnes recues IST", shortName: "Clt IST", description: "Personnes recues pour IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istCounsellingAvantDepitage === true), valueType: "integer" },
  { id: "CLT_IST_ECOULEMENT_URETRAL", name: "Nombre de personnes recues pour Ecoulement Uretral", shortName: "Ecoul Uretral", description: "Ecoulement uretral", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istType === "ecoulementUretral"), valueType: "integer" },
  { id: "CLT_IST_DOULEURS_TESTICULAIRES", name: "Nombre de personnes recues pour Douleurs Testiculaires", shortName: "Doul Test", description: "Douleurs testiculaires", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istType === "douleursTesticulaires"), valueType: "integer" },
  { id: "CLT_IST_ECOULEMENT_VAGINAL", name: "Nombre de personnes recues pour Ecoulement Vaginal", shortName: "Ecoul Vaginal", description: "Ecoulement vaginal", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istType === "ecoulementVaginal"), valueType: "integer" },
  { id: "CLT_IST_DOULEURS_ABDOMINALES", name: "Nombre de personnes recues pour Douleurs Abdominales Basses", shortName: "Doul Abdo", description: "Douleurs abdominales basses", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istType === "douleursAbdominales"), valueType: "integer" },
  { id: "CLT_IST_ULCERATION_GENITALE", name: "Nombre de personnes recues pour Ulceration genitale", shortName: "Ulcer Genit", description: "Ulceration genitale", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istType === "ulcerationGenitale"), valueType: "integer" },
  { id: "CLT_IST_BUBON_INGUINAL", name: "Nombre de personnes recues pour Bubon inguinal", shortName: "Bubon Ing", description: "Bubon inguinal", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istType === "bubonInguinal"), valueType: "integer" },
  { id: "CLT_IST_PEC_SYNDROMIQUE", name: "Nombre de personnes - Traitement Syndromique", shortName: "PEC Syndrom", description: "Traitement syndromique", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istTypePec === "syndromique"), valueType: "integer" },
  { id: "CLT_IST_PEC_ETIOLOGIQUE", name: "Nombre de personnes - Traitement Etiologique", shortName: "PEC Etiol", description: "Traitement etiologique", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istTypePec === "etiologique"), valueType: "integer" },

  // =============== IST - Services ===============
  { id: "SRV_IST_CONSULTATION", name: "SRV - IST Consultation", shortName: "SRV Clt IST", description: "Service consultation IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istCounsellingAvantDepitage === true), valueType: "integer" },
  { id: "SRV_IST_COUNSELING_AVANT", name: "SRV - IST Counseling avant depistage", shortName: "SRV Couns Avant IST", description: "Counseling avant depistage IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istCounsellingAvantDepitage === true), valueType: "integer" },
  { id: "SRV_IST_EXAMEN", name: "SRV - IST Investigation Examen", shortName: "SRV Exam IST", description: "Investigation examen IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istExamenPhysique === true), valueType: "integer" },
  { id: "SRV_IST_COUNSELING_APRES", name: "SRV - IST Counseling apres depistage", shortName: "SRV Couns Apres IST", description: "Counseling apres depistage IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istCounsellingApresDepitage === true), valueType: "integer" },
  { id: "SRV_IST_REDUCTION_RISQUE", name: "SRV - IST Counseling Reduction des Risques", shortName: "SRV Red Risque IST", description: "Counseling reduction des risques IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istCounselingReductionRisque === true), valueType: "integer" },
  { id: "SRV_IST_PEC_SYNDROMIQUE", name: "SRV - IST PEC Syndromique", shortName: "SRV PEC Synd", description: "PEC syndromique IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istTypePec === "syndromique"), valueType: "integer" },
  { id: "SRV_IST_CANDIDOSE", name: "SRV - IST PEC Etiologique - Candidose", shortName: "Candidose", description: "PEC etiologique candidose", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istPecEtiologique === "candidose"), valueType: "integer" },
  { id: "SRV_IST_CHANCRE_MOU", name: "SRV - IST PEC Etiologique - Chancre Mou", shortName: "Chancre Mou", description: "PEC etiologique chancre mou", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istPecEtiologique === "chancreMou"), valueType: "integer" },
  { id: "SRV_IST_CHLAMYDIOSE", name: "SRV - IST PEC Etiologique - Chlamydiose", shortName: "Chlamydiose", description: "PEC etiologique chlamydiose", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istPecEtiologique === "chlamydiose"), valueType: "integer" },
  { id: "SRV_IST_HERPES", name: "SRV - IST PEC Etiologique - Herpes Simplex", shortName: "Herpes", description: "PEC etiologique herpes simplex", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istPecEtiologique === "herpesSimplex"), valueType: "integer" },
  { id: "SRV_IST_SYPHILIS", name: "SRV - IST PEC Etiologique - Syphilis", shortName: "Syphilis", description: "PEC etiologique syphilis", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istPecEtiologique === "syphilis"), valueType: "integer" },
  { id: "SRV_IST_AUTRES", name: "SRV - IST PEC Etiologique - Autres", shortName: "PEC Autres", description: "PEC etiologique autres", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => countRecords(data.ist, (r) => r.istPecEtiologique === "autres"), valueType: "integer" },
  { id: "SRV_IST_TOTAL", name: "SRV - Total service IST", shortName: "SRV Total IST", description: "Total de tous les services IST", category: "ist", dataSources: ["ist"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.ist, (r) => r.istCounsellingAvantDepitage === true), countRecords(data.ist, (r) => r.istExamenPhysique === true), countRecords(data.ist, (r) => r.istCounsellingApresDepitage === true), countRecords(data.ist, (r) => r.istCounselingReductionRisque === true), countRecords(data.ist, (r) => r.istTypePec === "syndromique"), countRecords(data.ist, (r) => r.istPecEtiologique === "candidose"), countRecords(data.ist, (r) => r.istPecEtiologique === "chancreMou"), countRecords(data.ist, (r) => r.istPecEtiologique === "chlamydiose"), countRecords(data.ist, (r) => r.istPecEtiologique === "herpesSimplex"), countRecords(data.ist, (r) => r.istPecEtiologique === "syphilis"), countRecords(data.ist, (r) => r.istPecEtiologique === "autres")), valueType: "integer" },

  // =============== DEPISTAGE VIH - Clients ===============
  { id: "CLT_VIH_CONSULTATION", name: "Nombre de personnes recues depistage VIH", shortName: "Clt Dep VIH", description: "Personnes recues pour depistage VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihConsultation === true), valueType: "integer" },
  { id: "CLT_VIH_CDV_CDIP", name: "Nombre de personnes recues pour le CDV/CDIP", shortName: "CDV/CDIP", description: "CDV/CDIP (hors PTME)", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihTypeClient !== "ptme"), valueType: "integer" },
  { id: "CLT_VIH_POSITIF", name: "Nombre de personnes depistees VIH+", shortName: "VIH+", description: "Depistage VIH positif (hors PTME)", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihResultat === "positif" && r.depistageVihTypeClient !== "ptme"), valueType: "integer" },
  { id: "CLT_VIH_PTME", name: "Nombre de femmes enceintes depistees (PTME)", shortName: "PTME", description: "Femmes enceintes depistees PTME", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihTypeClient === "ptme"), valueType: "integer" },
  { id: "CLT_VIH_PTME_POSITIF", name: "Nombre de femmes enceintes depistees VIH+ (PTME)", shortName: "PTME VIH+", description: "PTME positif", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihTypeClient === "ptme" && r.depistageVihResultat === "positif"), valueType: "integer" },
  { id: "CLT_VIH_PTME_ARV", name: "Nombre de femmes enceintes VIH+ mises sous ARV (PTME)", shortName: "PTME ARV", description: "PTME positif mises sous ARV", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihTypeClient === "ptme" && r.depistageVihResultat === "positif" && r.depistageVihResultatPositifMisSousArv === true), valueType: "integer" },
  { id: "CLT_VIH_ENFANT_MERE_POS", name: "Nombre d'enfants de meres VIH+ depistes (PTME)", shortName: "Enfant Mere+", description: "Enfants de meres VIH+ depistes", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihTypeClient === "enfantMerePos"), valueType: "integer" },
  { id: "CLT_VIH_ENFANT_MERE_POS_ARV", name: "Nombre d'enfants de meres VIH+ mises sous ARV (PTME)", shortName: "Enfant Mere+ ARV", description: "Enfants de meres VIH+ sous ARV", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihTypeClient === "enfantMerePos" && r.depistageVihResultatPositifMisSousArv === true), valueType: "integer" },

  // =============== DEPISTAGE VIH - Services ===============
  { id: "SRV_VIH_CONSULTATION", name: "SRV - VIH - Consultation", shortName: "SRV Clt VIH", description: "Service consultation VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihConsultation === true), valueType: "integer" },
  { id: "SRV_VIH_COUNSELING_AVANT", name: "SRV - VIH - Counseling avant depistage", shortName: "SRV Couns Avant VIH", description: "Counseling avant depistage VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihCounsellingPreTest === true), valueType: "integer" },
  { id: "SRV_VIH_TEST_RAPIDE", name: "SRV - VIH - Investigation Test Rapide de diagnostic", shortName: "SRV Test Rapide VIH", description: "Test rapide VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihInvestigationTestRapide === true), valueType: "integer" },
  { id: "SRV_VIH_COUNSELING_APRES", name: "SRV - VIH - Counseling apres depistage", shortName: "SRV Couns Apres VIH", description: "Counseling apres depistage VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihCounsellingPostTest === true), valueType: "integer" },
  { id: "SRV_VIH_REDUCTION_RISQUE", name: "SRV - VIH - Counseling Reduction des Risques", shortName: "SRV Red Risque VIH", description: "Reduction des risques VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihCounsellingReductionRisque === true), valueType: "integer" },
  { id: "SRV_VIH_SOUTIEN_PSY", name: "SRV - VIH - Counseling Soutien Psycho-Social", shortName: "SRV Soutien Psy VIH", description: "Soutien psycho-social VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => countRecords(data.depistageVih, (r) => r.depistageVihCounsellingSoutienPsychoSocial === true), valueType: "integer" },
  { id: "SRV_VIH_TOTAL", name: "SRV - Total service depistage VIH", shortName: "SRV Total VIH", description: "Total services depistage VIH", category: "depistage_vih", dataSources: ["depistageVih"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.depistageVih, (r) => r.depistageVihConsultation === true), countRecords(data.depistageVih, (r) => r.depistageVihCounsellingPreTest === true), countRecords(data.depistageVih, (r) => r.depistageVihInvestigationTestRapide === true), countRecords(data.depistageVih, (r) => r.depistageVihCounsellingPostTest === true), countRecords(data.depistageVih, (r) => r.depistageVihCounsellingReductionRisque === true), countRecords(data.depistageVih, (r) => r.depistageVihCounsellingSoutienPsychoSocial === true)), valueType: "integer" },

  // =============== PEC VIH - Clients ===============
  { id: "CLT_PVVIH_CONSULTATION", name: "Nombre de PVVIH recues", shortName: "Clt PVVIH", description: "PVVIH recues en consultation", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihCounselling === true), valueType: "integer" },
  { id: "CLT_PVVIH_SOUS_ARV", name: "Nombre de PVVIH et mis sous ARV", shortName: "PVVIH ARV", description: "PVVIH mis sous ARV", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihMoleculeArv !== null && r.pecVihMoleculeArv !== undefined && r.pecVihMoleculeArv !== ""), valueType: "integer" },

  // =============== PEC VIH - Services ===============
  { id: "SRV_PVVIH_CONSULTATION", name: "SRV - PVVIH - Consultation", shortName: "SRV Clt PVVIH", description: "Service consultation PVVIH", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihCounselling === true), valueType: "integer" },
  { id: "SRV_PVVIH_COUNSELING", name: "SRV - PVVIH - Counseling", shortName: "SRV Couns PVVIH", description: "Service counseling PVVIH", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihCounselling === true), valueType: "integer" },
  { id: "SRV_PVVIH_ARV", name: "SRV - PVVIH - PEC - ARV", shortName: "SRV ARV", description: "PEC ARV", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihMoleculeArv !== null && r.pecVihMoleculeArv !== undefined && r.pecVihMoleculeArv !== ""), valueType: "integer" },
  { id: "SRV_PVVIH_IO_PALUDISME", name: "SRV - PVVIH - PEC - Medicale IO - Paludisme", shortName: "IO Paludisme", description: "IO Paludisme", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihIoPaludisme === true), valueType: "integer" },
  { id: "SRV_PVVIH_IO_TUBERCULOSE", name: "SRV - PVVIH - PEC - Medicale IO - Tuberculose", shortName: "IO Tuberculose", description: "IO Tuberculose", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihIoTuberculose === true), valueType: "integer" },
  { id: "SRV_PVVIH_IO_AUTRES", name: "SRV - PVVIH - PEC - Medicale IO - Autres", shortName: "IO Autres", description: "IO Autres", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihIoAutre === true), valueType: "integer" },
  { id: "SRV_PVVIH_AES_ARV", name: "SRV - PVVIH - Prevention - Prophylaxie - ARV/AES", shortName: "AES ARV", description: "Prophylaxie ARV/AES", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihAesArv === true), valueType: "integer" },
  { id: "SRV_PVVIH_COTRIMOXAZOLE", name: "SRV - PVVIH - Prevention - Prophylaxie - Cotrimoxazole", shortName: "Cotrimoxazole", description: "Prophylaxie cotrimoxazole", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihCotrimo === true), valueType: "integer" },
  { id: "SRV_PVVIH_SOUTIEN_PSY", name: "SRV - PVVIH - Counseling - Soutien Psychosocial", shortName: "Soutien Psy PVVIH", description: "Soutien psychosocial PVVIH", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihSoutienPsychoSocial === true), valueType: "integer" },
  { id: "SRV_PVVIH_SPDP", name: "SRV - PVVIH - SPDP", shortName: "SPDP", description: "SPDP", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => countRecords(data.pecVih, (r) => r.pecVihSpdp === true), valueType: "integer" },
  { id: "SRV_PVVIH_TOTAL", name: "SRV - Total service PEC VIH", shortName: "SRV Total PVVIH", description: "Total services PEC VIH", category: "pec_vih", dataSources: ["pecVih"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.pecVih, (r) => r.pecVihCounselling === true), countRecords(data.pecVih, (r) => r.pecVihMoleculeArv !== null && r.pecVihMoleculeArv !== undefined && r.pecVihMoleculeArv !== ""), countRecords(data.pecVih, (r) => r.pecVihIoPaludisme === true), countRecords(data.pecVih, (r) => r.pecVihIoTuberculose === true), countRecords(data.pecVih, (r) => r.pecVihIoAutre === true), countRecords(data.pecVih, (r) => r.pecVihAesArv === true), countRecords(data.pecVih, (r) => r.pecVihCotrimo === true), countRecords(data.pecVih, (r) => r.pecVihSoutienPsychoSocial === true), countRecords(data.pecVih, (r) => r.pecVihSpdp === true)), valueType: "integer" },

  // =============== MEDECINE GENERALE - Clients ===============
  { id: "CLT_MDG_CONSULTATION", name: "Nombre de personnes recues medecine generale", shortName: "Clt MdG", description: "Personnes recues en medecine generale", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgConsultation === true), valueType: "integer" },
  { id: "CLT_MDG_TRAITE", name: "Nombre de personnes traitees", shortName: "MdG Traite", description: "Personnes traitees", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgTypeVisite === "traite"), valueType: "integer" },
  { id: "CLT_MDG_TRAITE_PALUDISME", name: "Nombre de personnes traitees - Paludisme", shortName: "MdG Palu", description: "Traitees pour paludisme", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("paludisme"); }), valueType: "integer" },
  { id: "CLT_MDG_TRAITE_HTA", name: "Nombre de personnes traitees - HTA", shortName: "MdG HTA", description: "Traitees pour HTA", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("hta"); }), valueType: "integer" },
  { id: "CLT_MDG_TRAITE_ANEMIE", name: "Nombre de personnes traitees - Anemie", shortName: "MdG Anemie", description: "Traitees pour anemie", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("anemie"); }), valueType: "integer" },
  { id: "CLT_MDG_REFERE", name: "Nombre de personnes referees", shortName: "MdG Refere", description: "Personnes referees", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgTypeVisite === "refere"), valueType: "integer" },

  // =============== MEDECINE GENERALE - Services ===============
  { id: "SRV_MDG_CONSULTATION", name: "SRV - MG - Consultation", shortName: "SRV Clt MdG", description: "Service consultation MG", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgConsultation === true), valueType: "integer" },
  { id: "SRV_MDG_COUNSELING", name: "SRV - MG - Counseling", shortName: "SRV Couns MdG", description: "Service counseling MG", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgCounselling === true), valueType: "integer" },
  { id: "SRV_MDG_EXAMEN", name: "SRV - MG - Investigation Examen", shortName: "SRV Exam MdG", description: "Investigation examen MG", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgExamenPhysique === true), valueType: "integer" },
  { id: "SRV_MDG_PEC_PALUDISME", name: "SRV - MG - PEC - Paludisme", shortName: "PEC Palu", description: "PEC paludisme", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("paludisme"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_DERMATOSE", name: "SRV - MG - PEC - Dermatose", shortName: "PEC Dermatose", description: "PEC dermatose", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("dermatose"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_DIGESTIVES", name: "SRV - MG - PEC - Affections Digestives", shortName: "PEC Digest", description: "PEC affections digestives", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_digestive"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_ORL", name: "SRV - MG - PEC - Affections ORL", shortName: "PEC ORL", description: "PEC affections ORL", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_orl"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_PULMONAIRES", name: "SRV - MG - PEC - Affections Pulmonaires", shortName: "PEC Pulmon", description: "PEC affections pulmonaires", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_pulmonaire"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_BUCCALES", name: "SRV - MG - PEC - Affections Buccales", shortName: "PEC Buccal", description: "PEC affections buccales", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_buccale"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_CARDIAQUES", name: "SRV - MG - PEC - Affections Cardiaques", shortName: "PEC Cardiaq", description: "PEC affections cardiaques", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_cardiaque"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_OCULAIRES", name: "SRV - MG - PEC - Affections Oculaires", shortName: "PEC Oculaire", description: "PEC affections oculaires", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_oculaire"); }), valueType: "integer" },
  { id: "SRV_MDG_PEC_AUTRES", name: "SRV - MG - PEC - Affections Autres", shortName: "PEC Autres MdG", description: "PEC affections autres", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => { const t = r.mdgTypeAffection as string | null; return !!t && t.includes("affection_autre"); }), valueType: "integer" },
  { id: "SRV_MDG_SOINS_INFIRMIERS", name: "SRV - MG - PEC - Soins Infirmiers", shortName: "Soins Infirm", description: "Soins infirmiers", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => countRecords(data.medecine, (r) => r.mdgSoins !== null && r.mdgSoins !== undefined && r.mdgSoins !== ""), valueType: "integer" },
  { id: "SRV_MDG_TOTAL", name: "SRV - Total service medecine generale", shortName: "SRV Total MdG", description: "Total de tous les services medecine generale", category: "medecine", dataSources: ["medecine"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.medecine, (r) => r.mdgConsultation === true), countRecords(data.medecine, (r) => r.mdgCounselling === true), countRecords(data.medecine, (r) => r.mdgExamenPhysique === true), countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("paludisme"); }), countRecords(data.medecine, (r) => { const d = r.mdgDiagnostic; return Array.isArray(d) && d.includes("dermatose"); }), countRecords(data.medecine, (r) => r.mdgSoins !== null && r.mdgSoins !== undefined && r.mdgSoins !== "")), valueType: "integer" },

  // =============== INFERTILITE - Clients ===============
  { id: "CLT_INF_CONSULTATION", name: "Nombre de personnes recues pour Infertilite", shortName: "Clt Infert", description: "Consultation infertilite", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertConsultation === true), valueType: "integer" },
  { id: "CLT_INF_TRAITE", name: "Nombre de personnes traitees pour Infertilites", shortName: "Infert Traite", description: "Traitees pour infertilite", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertTraitement === "medicale" || r.infertTraitement === "hormonale"), valueType: "integer" },

  // =============== INFERTILITE - Services ===============
  { id: "SRV_INF_CONSULTATION", name: "SRV - INF - Consultation", shortName: "SRV Clt Infert", description: "Service consultation infertilite", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertConsultation === true), valueType: "integer" },
  { id: "SRV_INF_COUNSELING", name: "SRV - INF - Counseling", shortName: "SRV Couns Infert", description: "Service counseling infertilite", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertCounselling === true), valueType: "integer" },
  { id: "SRV_INF_EXAMEN", name: "SRV - INF - Investigation Examen", shortName: "SRV Exam Infert", description: "Investigation examen infertilite", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertExamenPhysique === true), valueType: "integer" },
  { id: "SRV_INF_PEC_MEDICAL", name: "SRV - INF - PEC Medicale - Traitement medicalement Assiste", shortName: "PEC Med Infert", description: "Traitement medicalement assiste", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertTraitement === "medicale"), valueType: "integer" },
  { id: "SRV_INF_PEC_HORMONAL", name: "SRV - INF - PEC Medicale - Traitement Hormonal/Ovulation", shortName: "PEC Horm Infert", description: "Traitement hormonal/ovulation", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => countRecords(data.infertilite, (r) => r.infertTraitement === "hormonale"), valueType: "integer" },
  { id: "SRV_INF_TOTAL", name: "SRV - Total service infertilite", shortName: "SRV Total Infert", description: "Total services infertilite", category: "infertilite", dataSources: ["infertilite"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.infertilite, (r) => r.infertConsultation === true), countRecords(data.infertilite, (r) => r.infertCounselling === true), countRecords(data.infertilite, (r) => r.infertExamenPhysique === true), countRecords(data.infertilite, (r) => r.infertTraitement === "medicale"), countRecords(data.infertilite, (r) => r.infertTraitement === "hormonale")), valueType: "integer" },

  // =============== VBG - Clients ===============
  { id: "CLT_VBG_PEC", name: "Nombre de personnes recues pour les VBG - PEC", shortName: "Clt VBG PEC", description: "VBG PEC", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgConsultation === "pec"), valueType: "integer" },
  { id: "CLT_VBG_VIOL", name: "Nombre de personnes recues pour les cas de viols", shortName: "Clt Viol", description: "Cas de viols", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgType === "viol"), valueType: "integer" },
  { id: "CLT_VBG_REFERE", name: "Nombre de personnes referees pour les VBG", shortName: "Clt VBG Ref", description: "VBG referees", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgConsultation === "refere"), valueType: "integer" },

  // =============== VBG - Services ===============
  { id: "SRV_VBG_RELATION", name: "SRV - VBG - Counseling Relation", shortName: "SRV Relation VBG", description: "Counseling relation", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgCounsellingRelation === true), valueType: "integer" },
  { id: "SRV_VBG_SEXUALITE", name: "SRV - VBG - Counseling Sexualite", shortName: "SRV Sex VBG", description: "Counseling sexualite", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgCounsellingSexuelite === true), valueType: "integer" },
  { id: "SRV_VBG_VIOLENCE_PHYSIQUE", name: "SRV - VBG - Counseling Violence Physique", shortName: "SRV Viol Phys", description: "Counseling violence physique", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgCounsellingViolencePhysique === true), valueType: "integer" },
  { id: "SRV_VBG_VIOLENCE_SEXUELLE", name: "SRV - VBG - Counseling Violence Sexuelle", shortName: "SRV Viol Sex", description: "Counseling violence sexuelle", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgCounsellingViolenceSexuel === true), valueType: "integer" },
  { id: "SRV_VBG_PREV_PHYSIQUE", name: "SRV - VBG - Prevention depistage Violence Physique", shortName: "Prev Viol Phys", description: "Prevention violence physique", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgPreventionViolencePhysique === true), valueType: "integer" },
  { id: "SRV_VBG_PREV_SEXUELLE", name: "SRV - VBG - Prevention depistage Violence Sexuelle", shortName: "Prev Viol Sex", description: "Prevention violence sexuelle", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => countRecords(data.vbg, (r) => r.vbgPreventionViolenceSexuelle === true), valueType: "integer" },
  { id: "SRV_VBG_TOTAL", name: "SRV - Total service VBG", shortName: "SRV Total VBG", description: "Total services VBG", category: "vbg", dataSources: ["vbg"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.vbg, (r) => r.vbgCounsellingRelation === true), countRecords(data.vbg, (r) => r.vbgCounsellingSexuelite === true), countRecords(data.vbg, (r) => r.vbgCounsellingViolencePhysique === true), countRecords(data.vbg, (r) => r.vbgCounsellingViolenceSexuel === true), countRecords(data.vbg, (r) => r.vbgPreventionViolencePhysique === true), countRecords(data.vbg, (r) => r.vbgPreventionViolenceSexuelle === true)), valueType: "integer" },

  // =============== SAA - Clients ===============
  { id: "CLT_SAA_CONSULTATION", name: "Nombre de femmes recues SAA", shortName: "Clt SAA", description: "Femmes recues en SAA", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaConsultation === true), valueType: "integer" },
  { id: "CLT_SAA_SUIVI_POST", name: "Nombre de femmes pour le suivi post avortement - RDV", shortName: "Suivi Post RDV", description: "Suivi post avortement RDV", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaSuiviPostAvortement === true), valueType: "integer" },
  { id: "CLT_SAA_AUTO_REFERE", name: "Nombre de femmes pour le suivi post avortement - Auto-referee", shortName: "Auto Referee", description: "Auto-referee", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaSuiviAutoRefere === true), valueType: "integer" },
  { id: "CLT_SAA_PEC_AMIU", name: "Nombre de PEC AMIU", shortName: "PEC AMIU", description: "PEC AMIU", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaTypePec === "amiu"), valueType: "integer" },
  { id: "CLT_SAA_PEC_MISOPROSTOL", name: "Nombre de PEC Misoprostol", shortName: "PEC Misoprostol", description: "PEC Misoprostol", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaTypePec === "misoprostol"), valueType: "integer" },

  // =============== SAA - Services ===============
  { id: "SRV_SAA_COUNSELING_PRE", name: "SRV - SAA Counseling - pre Avortement", shortName: "SRV Couns Pre SAA", description: "Counseling pre avortement", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaCounsellingPre === true), valueType: "integer" },
  { id: "SRV_SAA_COUNSELING_POST", name: "SRV - SAA Counseling - post Avortement", shortName: "SRV Couns Post SAA", description: "Counseling post avortement", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaCounsellingPost === true), valueType: "integer" },
  { id: "SRV_SAA_CONSULTATION_POST", name: "SRV - SAA Consultation - post Avortement", shortName: "SRV Clt Post SAA", description: "Consultation post avortement", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaConsultationPost === true), valueType: "integer" },
  { id: "SRV_SAA_PEC_AMIU", name: "SRV - SAA PEC - AMIU", shortName: "SRV AMIU", description: "PEC AMIU", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaTypePec === "amiu"), valueType: "integer" },
  { id: "SRV_SAA_PEC_MISOPROSTOL", name: "SRV - SAA PEC - Medical - Misoprostol", shortName: "SRV Misoprostol", description: "PEC Misoprostol", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaTypePec === "misoprostol"), valueType: "integer" },
  { id: "SRV_SAA_COMPLICATION_MED", name: "SRV - SAA PEC - complications intervention Medicale", shortName: "SRV Compl Med", description: "Complication intervention medicale", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaTraitementComplication === "intervention_medicamenteuse"), valueType: "integer" },
  { id: "SRV_SAA_COMPLICATION_CHIR", name: "SRV - SAA PEC - complications intervention Chirurgicale", shortName: "SRV Compl Chir", description: "Complication intervention chirurgicale", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaTraitementComplication === "intervention_chirurgicale"), valueType: "integer" },
  { id: "SRV_SAA_SUIVI_POST", name: "SRV - SAA PEC - Suivi Post Avortement", shortName: "SRV Suivi Post", description: "Suivi post avortement", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => countRecords(data.saa, (r) => r.saaSuiviPostAvortement === true), valueType: "integer" },
  { id: "SRV_SAA_TOTAL", name: "SRV - Total service SAA", shortName: "SRV Total SAA", description: "Total services SAA", category: "saa", dataSources: ["saa"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.saa, (r) => r.saaCounsellingPre === true), countRecords(data.saa, (r) => r.saaCounsellingPost === true), countRecords(data.saa, (r) => r.saaConsultationPost === true), countRecords(data.saa, (r) => r.saaTypePec === "amiu"), countRecords(data.saa, (r) => r.saaTypePec === "misoprostol"), countRecords(data.saa, (r) => r.saaTraitementComplication === "intervention_medicamenteuse"), countRecords(data.saa, (r) => r.saaTraitementComplication === "intervention_chirurgicale"), countRecords(data.saa, (r) => r.saaSuiviPostAvortement === true)), valueType: "integer" },

  // =============== LABORATOIRE - Clients par type ===============
  { id: "CLT_LABO_IST", name: "Nombre de personnes recues pour les Analyses Medicales liees au IST", shortName: "Clt Labo IST", description: "Clients labo IST", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "IST"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "CLT_LABO_OBSTETRIQUE", name: "Nombre de personnes recues pour les Analyses Medicales liees a l'obstetrique", shortName: "Clt Labo Obst", description: "Clients labo obstetrique", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "OBSTETRIQUE"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "CLT_LABO_GYNECO", name: "Nombre de personnes recues pour les Analyses Medicales liees a la Gynecologie", shortName: "Clt Labo Gyn", description: "Clients labo gynecologie", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "GYNECOLOGIE"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "CLT_LABO_MEDECINE", name: "Nombre de personnes recues pour les Analyses Medicales liees au Soins Curatifs", shortName: "Clt Labo MDG", description: "Clients labo medecine", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "MEDECIN"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },

  // =============== LABORATOIRE - VIH (ExamenPvVih) ===============
  { id: "SRV_LABO_VIH_ECHANTILLONNAGE", name: "SRV - LABO - VIH - Procedure d'echantillonnage", shortName: "SRV Labo VIH Ech", description: "Procedure echantillonnage VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihConsultation === true), valueType: "integer" },
  { id: "SRV_LABO_VIH_TEST_RAPIDE", name: "SRV - LABO - VIH - Test rapides (MUREX - SUDS) / Determine - Bioline / Genie 3 - Starpack", shortName: "SRV Labo VIH Test", description: "Test rapides VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => !!r.examenPvVihCholesterolHdl), valueType: "integer" },
  { id: "SRV_LABO_VIH_CHARGE_VIRALE", name: "SRV - LABO - VIH - Evaluation de la fonction immunologique charge virale", shortName: "SRV Labo VIH CV", description: "Charge virale VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihChargeVirale != null && Number(r.examenPvVihChargeVirale) >= 0), valueType: "integer" },
  { id: "SRV_LABO_VIH_CD4", name: "SRV - LABO - VIH - Evaluation de la fonction immunologique CD4", shortName: "SRV Labo VIH CD4", description: "CD4 VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihCd4 != null && Number(r.examenPvVihCd4) >= 0), valueType: "integer" },
  { id: "SRV_LABO_VIH_NFS", name: "SRV - LABO - VIH - NFS / Hemoglobine", shortName: "SRV Labo VIH NFS", description: "NFS/Hemoglobine VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihHemoglobineNfs != null && Number(r.examenPvVihHemoglobineNfs) > 0), valueType: "integer" },
  { id: "SRV_LABO_VIH_TRANSAMINASES", name: "SRV - LABO - VIH - Transaminases (ASAT/ALAT)", shortName: "SRV Labo VIH Trans", description: "Transaminases VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihTransaminases != null && Number(r.examenPvVihTransaminases) > 0), valueType: "integer" },
  { id: "SRV_LABO_VIH_UREE", name: "SRV - LABO - VIH - Uree", shortName: "SRV Labo VIH Uree", description: "Uree VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihUree != null && Number(r.examenPvVihUree) > 0), valueType: "integer" },
  { id: "SRV_LABO_VIH_GLYCEMIE", name: "SRV - LABO - VIH - Glycemie", shortName: "SRV Labo VIH Glyc", description: "Glycemie VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihGlycemie != null && Number(r.examenPvVihGlycemie) > 0), valueType: "integer" },
  { id: "SRV_LABO_VIH_CREATININE", name: "SRV - LABO - VIH - Creatinine", shortName: "SRV Labo VIH Creat", description: "Creatinine VIH", category: "laboratoire", dataSources: ["examenPvVih"], aggregation: "count", compute: (data) => countRecords(data.examenPvVih, (r) => r.examenPvVihCreatinemie != null && Number(r.examenPvVihCreatinemie) > 0), valueType: "integer" },

  // =============== LABORATOIRE - Services par type ===============
  { id: "SRV_LABO_IST_PROCEDURES", name: "SRV - LABO - IST - Procedures d'echantillonnage", shortName: "SRV Labo IST Proc", description: "Procedures echantillonnage IST", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "IST"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_IST_SERVICES", name: "SRV - LABO - IST - Total examens realises", shortName: "SRV Labo IST Exam", description: "Total examens IST", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "IST"); return countRecords(countLaboServicesByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_OBST_PROCEDURES", name: "SRV - LABO - OBSTETRIQUE - Procedures d'echantillonnage", shortName: "SRV Labo Obst Proc", description: "Procedures echantillonnage obstetrique", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "OBSTETRIQUE"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_OBST_SERVICES", name: "SRV - LABO - OBSTETRIQUE - Total examens realises", shortName: "SRV Labo Obst Exam", description: "Total examens obstetrique", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "OBSTETRIQUE"); return countRecords(countLaboServicesByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_GYN_PROCEDURES", name: "SRV - LABO - GYNECOLOGIE - Procedures d'echantillonnage", shortName: "SRV Labo Gyn Proc", description: "Procedures echantillonnage gynecologie", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "GYNECOLOGIE"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_GYN_SERVICES", name: "SRV - LABO - GYNECOLOGIE - Total examens realises", shortName: "SRV Labo Gyn Exam", description: "Total examens gynecologie", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "GYNECOLOGIE"); return countRecords(countLaboServicesByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_MDG_PROCEDURES", name: "SRV - LABO - MEDECINE - Procedures d'echantillonnage", shortName: "SRV Labo MDG Proc", description: "Procedures echantillonnage medecine", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "MEDECIN"); return countRecords(countLaboClientsByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },
  { id: "SRV_LABO_MDG_SERVICES", name: "SRV - LABO - MEDECINE - Total examens realises", shortName: "SRV Labo MDG Exam", description: "Total examens medecine", category: "laboratoire", dataSources: ["factureExamen", "examen"], aggregation: "count", compute: (data) => { const names = getExamNamesByType(data.examen, "MEDECIN"); return countRecords(countLaboServicesByType(data.factureExamen, names) as Record<string, unknown>[] | undefined); }, valueType: "integer" },

  // =============== LABORATOIRE - Total ===============
  { id: "SRV_LABO_TOTAL", name: "SRV - Total service laboratoire", shortName: "SRV Total Labo", description: "Total services laboratoire", category: "laboratoire", dataSources: ["examenPvVih", "factureExamen"], aggregation: "count", compute: (data) => combineDataPoints(countRecords(data.examenPvVih, (r) => r.examenPvVihConsultation === true), countRecords(data.examenPvVih, (r) => !!r.examenPvVihCholesterolHdl), countRecords(data.examenPvVih, (r) => r.examenPvVihChargeVirale != null && Number(r.examenPvVihChargeVirale) >= 0), countRecords(data.examenPvVih, (r) => r.examenPvVihCd4 != null && Number(r.examenPvVihCd4) >= 0), countRecords(data.examenPvVih, (r) => r.examenPvVihHemoglobineNfs != null && Number(r.examenPvVihHemoglobineNfs) > 0), countRecords(data.examenPvVih, (r) => r.examenPvVihTransaminases != null && Number(r.examenPvVihTransaminases) > 0), countRecords(data.examenPvVih, (r) => r.examenPvVihUree != null && Number(r.examenPvVihUree) > 0), countRecords(data.examenPvVih, (r) => r.examenPvVihGlycemie != null && Number(r.examenPvVihGlycemie) > 0), countRecords(data.examenPvVih, (r) => r.examenPvVihCreatinemie != null && Number(r.examenPvVihCreatinemie) > 0), countRecords(data.factureExamen)), valueType: "integer" },

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
    numeratorId: "CLT_VIH_POSITIF",
    denominatorId: "CLT_VIH_CONSULTATION",
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
