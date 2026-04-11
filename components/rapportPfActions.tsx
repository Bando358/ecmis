"use server";

import prisma from "@/lib/prisma";
import { getOneVisite } from "@/lib/actions/visiteActions";
import { getOneGrossesse } from "@/lib/actions/grossesseActions";
import { Clinique, Examen, Planning, TypeExamen } from "@prisma/client";

const calculerAge = (dateNaissance: Date): number => {
  const diffTemps = Date.now() - new Date(dateNaissance).getTime();
  const ageDate = new Date(diffTemps);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const getDateVisite = async (val: string) => {
  const newVal = await getOneVisite(val);
  return newVal?.dateVisite ?? "";
};

interface ClientWithVisitsAndPlanning {
  Visite: {
    id: string;
    createdAt: Date;
    idUser: string;
    motifVisite: string;
    idClient: string;
    updatedAt: Date;
    dateVisite: Date;
    idActivite: string | null;
    idLieu: string | null;
  }[];
  Planning: {
    id: string;
    createdAt: Date;
    idUser: string;
    idVisite: string;
    statut: string;
    typeContraception: string;
    motifVisite: string;
    consultation: boolean;
    counsellingPf: boolean;
    courtDuree: string | null;
    methodePrise: boolean;
    implanon: string | null;
    jadelle: string | null;
    sterilet: string | null;
    retraitImplanon: boolean;
    retraitJadelle: boolean;
    retraitSterilet: boolean;
    rdvPf: Date | null;
    autreMethode?: string | null;
    updatedAt: Date;
  }[];
  // Ajoutez ici les autres propriétés du client si nécessaire
  code: string;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  sexe: string;
}

// Fonction pour convertir une date au format "JJ/MM/AAAA" en objet Date
const parseDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split("/").map(Number);
  // Le mois est 0-indexé en JavaScript (0 pour Janvier, 11 pour Décembre)
  return new Date(year, month - 1, day);
};

const checkClientStatus = (
  status: ClientStatusInfo,
  clientsAvecMethodePrise: ClientWithVisitsAndPlanning[],
  dateVisite2: Date
): ClientStatusInfo => {
  const client = clientsAvecMethodePrise.find((c) => c.code === status.code);

  if (client) {
    // Trouver toutes les visites entre dateVisiste et dateVisite2
    const dateDebut = status.dateVisiste
      ? typeof status.dateVisiste === "string"
        ? parseDate(status.dateVisiste)
        : status.dateVisiste
      : null;

    const visitesEntreDates = client.Visite.filter(
      (visite: ClientWithVisitsAndPlanning["Visite"][number]) => {
        const dateVisite = new Date(visite.dateVisite);
        return dateDebut && dateVisite > dateDebut && dateVisite <= dateVisite2;
      }
    );

    // Vérifier si parmi ces visites, il y a un planning avec retrait
    const hasRetrait = visitesEntreDates.some(
      (visite: ClientWithVisitsAndPlanning["Visite"][number]) => {
        const planningAssocie = client.Planning.find(
          (p: ClientWithVisitsAndPlanning["Planning"][number]) =>
            p.idVisite === visite.id
        );
        return (
          planningAssocie &&
          (planningAssocie.retraitImplanon ||
            planningAssocie.retraitJadelle ||
            planningAssocie.retraitSterilet)
        );
      }
    );

    if (hasRetrait) {
      status.protege = false;
      status.arret = true;
    }
  }

  return status;
};

export type ClientStatusInfo = {
  nom: string;
  prenom: string;
  age: number;
  sexe: string;
  code: string;
  statut: string;
  courtDuree: string | null;
  implanon: string | null;
  jadelle: string | null;
  sterilet: string | null;
  dateVisiste: string | Date;
  rdvPf: Date | null;
  protege: boolean;
  perdueDeVue: boolean;
  methodePrise: boolean;
  abandon: boolean;
  arret: boolean;
};

export type ClientData = {
  id: string;
  idVisite: string;
  dateVisite: string;
  idActiviteVisite: string;
  idLieu: string;
  activite: string;
  lieuActivite: string;
  typeContraception: string;
  motifVisite: string;
  nom: string;
  prenom: string;
  age: number; // Calculer l'âge à partir de la date de naissance
  code: string;
  sexe: string;
  clinique: string;

  ethnie: string;
  serologie: string;
  sourceInformation: string;
  quartier: string;

  // Planning Familial
  statut: string;
  methodePrise: boolean;
  consultationPf: boolean;
  counsellingPf: boolean;
  motifVisitePf: string;
  courtDuree: string | null;
  implanon: string | null;
  retraitImplanon: boolean;
  jadelle: string | null;
  retraitJadelle: boolean;
  sterilet: string | null;
  retraitSterilet: boolean;
  raisonRetrait: string | null;
  raisonEffetSecondaire: string | null;
  rdvPf: Date | null;
  pfUserId: string;
  // Gynecologie
  consultationGyneco: boolean;
  motifVisiteGyneco: string;
  counsellingAvantDepistage: boolean;
  counsellingApresDepistage: boolean;
  resultatIva: string;
  eligibleTraitementIva: boolean;
  typeTraitementIva: string;
  counsellingCancerSein: boolean;
  resultatCancerSein: string;
  counsellingAutreProbleme: boolean;
  examenPhysique: boolean;
  examenPalpationSein: boolean;
  toucheeVaginale: boolean;
  regleIrreguliere: boolean;
  regularisationMenstruelle: boolean;
  autreProblemeGyneco: boolean;
  // IST
  istCounsellingAvantDepitage: boolean;
  istCounselingReductionRisque: boolean;
  istType: string;
  istTypePec: string;
  istTypeClient: string;
  istPecEtiologique: string;
  istExamenPhysique: boolean;
  istCounsellingApresDepitage: boolean;
  // Infertilité
  infertConsultation: boolean;
  infertCounselling: boolean;
  infertExamenPhysique: boolean;
  infertTraitement: string;
  infertIdUser: string;
  // VBG
  vbgType: string;
  vbgDuree: number;
  vbgConsultation: string;
  vbgCounsellingRelation: boolean;
  vbgCounsellingViolenceSexuel: boolean;
  vbgCounsellingViolencePhysique: boolean;
  vbgCounsellingSexuelite: boolean;
  vbgPreventionViolenceSexuelle: boolean;
  vbgPreventionViolencePhysique: boolean;
  vbgIdUser: string;
  // Medecine
  mdgConsultation: boolean;
  mdgCounselling: boolean;
  mdgEtatFemme: string; //il s'agit de savoir si elle est enceinte ou pas
  mdgMotifConsultation: string;
  mdgTypeVisite: string; // consultant controle soins
  mdgExamenPhysique: boolean;
  mdgSuspicionPalu: string; // palu simple ou palu grave
  mdgDiagnostic: string[]; //tabAffection=[{value:"diarrhee",label:"Diarrhée"},{value:"pneumonie",label:"Pneumonie"},{value:"coqueluche",label:"Coqueluche"},{value:"tetanos",label:"Tétanos"}]
  mdgAutreDiagnostic: string;
  mdgSoins: string;
  mdgPecAffection: string;
  mdgTypeAffection: string; // tabAffection=[{value:"hta",label:"HTA"},{value:"anemie",label:"Anémie"},{value:"dermatose",label:"Dermatose"},{value:"affection_digestive",label:"Affections Digestives"}]
  mdgTraitement: string[];
  mdgMiseEnObservation: boolean;
  mdgTestRapidePalu: boolean;
  mdgDureeObservation: number;
  mdgIdUser: string;
  mdgIdClient: string;
  // Grossesse
  obstIdGrossesse: string;
  grossesseHta: string;
  grossesseDiabete: string;
  grossesseGestite: number;
  grossesseParite: number;
  grossesseAge: number;
  grossesseDdr: Date;
  termePrevu: Date;
  grossesseInterruption: boolean;
  grossesseMotifInterruption: string;
  // grossesseFeChargViralIndetectable: boolean;
  // Obstétrique
  obstConsultation: boolean;
  obstCounselling: boolean;
  obstTypeVisite: string;
  obstVat: string | null;
  obstSp: string | null;
  //prescription
  obstFer: boolean;
  obstFolate: boolean;
  obstDeparasitant: boolean;
  obstMilda: boolean;

  obstInvestigations: boolean;
  obstEtatNutritionnel: string;
  obstEtatGrossesse: string;
  obstPfppi: boolean;

  // dépistage
  obstAlbuminieSucre: boolean;
  obstAnemie: string;
  obstSyphilis: string;
  obstAghbs: string;
  obstRdv: Date | null;
  // Cpon
  cponConsultation: boolean;
  cponCounselling: boolean;
  cponInvestigationPhysique: boolean;
  cponDuree: string | null;
  cponIdUser: string | null;
  // Test de grossesse
  testConsultation: boolean;
  testResultat: string;
  // Accouchement
  accouchementConsultation: boolean;
  accouchementLieu: string; // à domicile ou dans l'etablissement
  accouchementStatutVat: string; // non vaccinée, incompletement vaccinée, Correctement vaccinée
  accouchementComplications: string;
  accouchementEvacuationMere: string;
  accouchementTypeEvacuation: string;
  accouchementEvacuationEnfant: string;
  accouchementMultiple: string; // Oui ou non
  accouchementEtatNaissance: string; // A terme, Prématuré , post Terme
  accouchementEnfantVivant: number;
  accouchementEnfantMortNeFrais: number;
  accouchementEnfantMortNeMacere: number;
  accouchementNbPoidsEfantVivant: number; // nb enfant vivant ayant un poids < 2500g
  accouchementIdUser: string;
  // SAA
  saaTypeAvortement: string;
  saaMethodeAvortement: string; // Médicamenteux ou chirurgical
  saaConsultation: boolean;
  saaSuiviPostAvortement: boolean;
  saaSuiviAutoRefere: boolean;
  saaCounsellingPre: boolean;
  saaMotifDemande: string; //Viol,Inceste,Elève/Ecolière,Père Inconnu,Autre
  saaConsultationPost: boolean;
  saaCounsellingPost: boolean;
  saaTypePec: string; // AMIU,Misoprostol,
  saaTraitementComplication: string; // Intervention médicamenteuse , Intervention chirurgicale , Complication liée à la TAI ,
  saaIdUser: string;
  // Dépistage VIH
  depistageVihTypeClient: string; //(CDIP,IST,PTME, EnfantMerePos, conjointPos, autre)
  depistageVihConsultation: boolean; //hidden
  depistageVihCounsellingPreTest: boolean; //hidden
  depistageVihInvestigationTestRapide: boolean;
  depistageVihResultat: string; // positif ou negatif
  depistageVihCounsellingPostTest: boolean; //hidden par defaut et visible si test positif et depistageVihCounsellingPostTest est true
  depistageVihCounsellingReductionRisque: boolean; //hidden par defaut et visible si test positif et depistageVihCounsellingPostTest est true
  depistageVihCounsellingSoutienPsychoSocial: boolean; //hidden par defaut et visible si test positif et depistageVihCounsellingPostTest est true
  depistageVihIdUser: string;
  depistageVihResultatPositifMisSousArv: boolean; // Champ supplémentaire pour indiquer si le patient a été mis sous ARV après un test positif

  // Pec VIH
  pecVihCounselling: boolean;
  pecVihTypeclient: string; //consultation Initiale, Suivi, Autre
  pecVihMoleculeArv: string;
  pecVihAesArv: boolean;
  pecVihCotrimo: boolean;
  pecVihSpdp: boolean;
  pecVihIoPaludisme: boolean;
  pecVihIoTuberculose: boolean;
  pecVihIoAutre: boolean;
  pecVihSoutienPsychoSocial: boolean;

  // Nom prescripteur
  recapPrescripteur: string[];
  nomPrescripteur?: string;
  idPrescripteur?: string;

  // Examen Pec VIH
  examenPvVihConsultation: boolean;
  examenPvVihDatePrelevement: Date | null;
  examenPvVihDateTraitement: Date | null;
  examenPvVihFemmeEnceinte: boolean;
  examenPvVihAllaitement: boolean;
  examenPvVihTypage: string;
  examenPvVihChargeVirale: number | string;
  examenPvVihCd4: number | null;
  examenPvVihGlycemie: number | null;
  examenPvVihCreatinemie: number | null;
  examenPvVihTransaminases: number | null;
  examenPvVihUree: number | null;
  examenPvVihCholesterolHdl: number | null;
  examenPvVihCholesterolTotal: number | null;
  examenPvVihHemoglobineNfs: number | null;
  grossesseFeChargViralIndetectable: boolean;

  echographie: string[];
  laboMedecine: string[];
  laboIst: string[];
  laboObstetrique: string[];
  laboGyneco: string[];

  // Facturation
  couverture: string;
  montantTotalPaiement: number;
};
// } & ClientData; // Étendre ClientData pour inclure les champs supplémentaires
export type clientDataProps = ClientData;

export const fetchClientsData = async (
  clinicIds: string[],
  dateVisite1: Date,
  dateVisite2: Date
): Promise<ClientData[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  const allClinique = await prisma.clinique.findMany({
    where: {
      id: {
        in: clinicIds,
      },
    },
  });

  const clients = await prisma.client.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
      Visite: {
        some: {
          dateVisite: {
            gte: dateVisite1,
            lte: dateVisite2,
          },
        },
      },
    },
    include: {
      Visite: true,
      Planning: true,
      Gynecologie: true,
      Ist: true,
      Infertilite: true,
      Vbg: true,
      Medecine: true,
      Grossesse: true,
      Obstetrique: true,
      Cpon: true,
      TestGrossesse: true,
      Accouchement: true,
      Saa: true,
      DepistageVih: true,
      PecVih: true,
      RecapVisite: true,
      ExamenPvVih: true,
      // Factures
      FactureEchographie: true,
      FactureExamen: true,
      FacturePrestation: true,
      FactureProduit: true,
      Couverture: true,
    },
  });

  // Récupération de tous les idLieux des visites des clients
  const allLieuIds = Array.from(
    new Set(
      clients.flatMap((client) => client.Visite.map((visite) => visite.idLieu))
    )
  ).filter((id): id is string => id !== null);
  const allLieux = await prisma.lieu.findMany({
    where: {
      id: { in: allLieuIds },
    },
  });

  // Récupération de tous les idActivites de allLieux
  const allActiviteIds = Array.from(
    new Set(
      clients.flatMap((client) =>
        client.Visite.map((visite) => visite.idActivite)
      )
    )
  ).filter((id): id is string => id !== null);

  const allActivites = await prisma.activite.findMany({
    where: {
      id: { in: allActiviteIds },
    },
  });

  //    {
  //     MEDECIN: "MEDECIN";
  //     GYNECOLOGIE: "GYNECOLOGIE";
  //     OBSTETRIQUE: "OBSTETRIQUE";
  //     VIH: "VIH";
  //     IST: "IST";
  // }
  const typeExamen = TypeExamen;
  const allExamens = await prisma.examen.findMany({});
  const examensMedecine = allExamens.filter(
    (examen: Examen) => examen.typeExamen === typeExamen.MEDECIN
  );
  const examensGynecologie = allExamens.filter(
    (examen: Examen) => examen.typeExamen === typeExamen.GYNECOLOGIE
  );
  const examensObstetrique = allExamens.filter(
    (examen: Examen) => examen.typeExamen === typeExamen.OBSTETRIQUE
  );
  const examensIst = allExamens.filter(
    (examen: Examen) => examen.typeExamen === typeExamen.IST
  );

  const visitsData: ClientData[] = [];

  interface VisiteWithRelations {
    id: string;
    dateVisite: Date;
    idActivite: string | null;
    idLieu: string | null;
    activite: string;
    lieuActivite: string;
    motifVisite: string;
  }

  interface PlanningRecord {
    idVisite: string;
    methodePrise: boolean;
    statut: string;
    consultation: boolean;
    counsellingPf: boolean;
    courtDuree: string | null;
    typeContraception: string | null;
    motifVisite: string | null;
    implanon: string | null;
    retraitImplanon: boolean;
    jadelle: string | null;
    retraitJadelle: boolean;
    sterilet: string | null;
    retraitSterilet: boolean;
    raisonRetrait: string | null;
    raisonEffetSecondaire: string | null;
    rdvPf: Date | null;
    idUser: string;
  }

  interface GynecologieRecord {
    idVisite: string;
    consultation: boolean | null;
    motifConsultation: string | null;
    counsellingAvantDepitage: boolean | null;
    counsellingApresDepitage: boolean | null;
    resultatIva: string | null;
    eligibleTraitementIva: boolean | null;
    typeTraitement: string | null;
    counselingCancerSein: boolean | null;
    resultatCancerSein: string | null;
    counselingAutreProbleme: boolean | null;
    examenPhysique: boolean | null;
    examenPalpation: boolean | null;
    toucheeVaginale: boolean | null;
    reglesIrreguliere: boolean | null;
    regularisationMenstruelle: boolean | null;
    autreProblemeGyneco: boolean | null;
  }

  interface IstRecord {
    istIdVisite: string;
    istCounsellingAvantDepitage: boolean;
    istType: string;
    istCounsellingApresDepitage: boolean;
    istCounselingReductionRisque: boolean;
    istExamenPhysique: boolean;
    istPecEtiologique: string;
    istTypeClient: string;
    istTypePec: string;
  }

  interface InfertiliteRecord {
    infertIdVisite: string;
    infertConsultation: boolean;
    infertCounselling: boolean;
    infertExamenPhysique: boolean;
    infertTraitement: string;
    infertIdUser: string;
  }

  interface VbgRecord {
    vbgIdVisite: string;
    vbgType: string;
    vbgDuree: number;
    vbgConsultation: string;
    vbgCounsellingRelation: boolean;
    vbgCounsellingViolenceSexuel: boolean;
    vbgCounsellingViolencePhysique: boolean;
    vbgCounsellingSexuelite: boolean;
    vbgPreventionViolenceSexuelle: boolean;
    vbgPreventionViolencePhysique: boolean;
    vbgIdUser: string;
  }

  interface MedecineRecord {
    mdgIdVisite: string;
    mdgConsultation: boolean;
    mdgCounselling: boolean;
    mdgEtatFemme: string;
    mdgMotifConsultation: string;
    mdgTypeVisite: string;
    mdgExamenPhysique: boolean;
    mdgSuspicionPalu: string;
    mdgDiagnostic: string[];
    mdgAutreDiagnostic: string;
    mdgSoins: string;
    mdgPecAffection: string;
    mdgTypeAffection: string;
    mdgTraitement: string[];
    mdgMiseEnObservation: boolean;
    mdgTestRapidePalu: boolean;
    mdgDureeObservation: number;
    mdgIdUser: string;
    mdgIdClient: string;
  }

  interface GrossesseRecord {
    id: string;
    grossesseIdVisite: string;
    grossesseHta: string;
    grossesseDiabete: string;
    grossesseGestite: number;
    grossesseParite: number;
    grossesseAge: number;
    grossesseDdr: Date;
    termePrevu: Date;
    grossesseInterruption: boolean;
    grossesseMotifInterruption: string;
  }

  interface ObstetriqueRecord {
    obstIdVisite: string;
    obstConsultation: boolean;
    obstCounselling: boolean;
    obstTypeVisite: string;
    obstVat: string | null;
    obstSp: string | null;
    obstFer: boolean;
    obstFolate: boolean;
    obstDeparasitant: boolean;
    obstMilda: boolean;
    obstInvestigations: boolean;
    obstEtatNutritionnel: string;
    obstEtatGrossesse: string;
    obstPfppi: boolean;
    obstAlbuminieSucre: boolean;
    obstAnemie: string;
    obstSyphilis: string;
    obstAghbs: string;
    obstRdv: Date | null;
  }

  interface CponRecord {
    cponIdVisite: string;
    cponConsultation: boolean;
    cponCounselling: boolean;
    cponInvestigationPhysique: boolean;
    cponDuree: string | null;
    cponIdUser: string | null;
  }

  interface TestGrossesseRecord {
    testIdVisite: string;
    testConsultation: boolean;
    testResultat: string;
  }

  interface AccouchementRecord {
    accouchementIdVisite: string;
    accouchementConsultation: boolean;
    accouchementLieu: string;
    accouchementStatutVat: string;
    accouchementComplications: string;
    accouchementEvacuationMere: string;
    accouchementTypeEvacuation: string;
    accouchementEvacuationEnfant: string;
    accouchementMultiple: string;
    accouchementEtatNaissance: string;
    accouchementEnfantVivant: number;
    accouchementEnfantMortNeFrais: number;
    accouchementEnfantMortNeMacere: number;
    accouchementNbPoidsEfantVivant: number;
    accouchementIdUser: string;
  }

  interface SaaRecord {
    saaIdVisite: string;
    saaTypeAvortement: string;
    saaMethodeAvortement: string;
    saaConsultation: boolean;
    saaSuiviPostAvortement: boolean;
    saaSuiviAutoRefere: boolean;
    saaCounsellingPre: boolean;
    saaMotifDemande: string;
    saaConsultationPost: boolean;
    saaCounsellingPost: boolean;
    saaTypePec: string;
    saaTraitementComplication: string;
    saaIdUser: string;
  }

  interface DepistageVihRecord {
    depistageVihIdVisite: string;
    depistageVihTypeClient: string;
    depistageVihConsultation: boolean;
    depistageVihCounsellingPreTest: boolean;
    depistageVihInvestigationTestRapide: boolean;
    depistageVihResultat: string;
    depistageVihCounsellingPostTest: boolean;
    depistageVihCounsellingReductionRisque: boolean;
    depistageVihCounsellingSoutienPsychoSocial: boolean;
    depistageVihIdUser: string;
    depistageVihResultatPositifMisSousArv: boolean;
  }

  interface PecVihRecord {
    pecVihIdVisite: string;
    pecVihCounselling: boolean;
    pecVihTypeclient: string;
    pecVihMoleculeArv: string;
    pecVihAesArv: boolean;
    pecVihCotrimo: boolean;
    pecVihSpdp: boolean;
    pecVihIoPaludisme: boolean;
    pecVihIoTuberculose: boolean;
    pecVihIoAutre: boolean;
    pecVihSoutienPsychoSocial: boolean;
  }

  interface RecapVisiteRecord {
    idVisite: string;
    prescripteurs: string[];
  }

  interface ExamenPvVihRecord {
    examenPvVihIdVisite: string;
    examenPvVihDatePrelevement: Date | null;
    examenPvVihDateTraitement: Date | null;
    examenPvVihFemmeEnceinte: string;
    examenPvVihAllaitement: string;
    examenPvVihTypage: string;
    examenPvVihChargeVirale: number | null;
    examenPvVihCd4: number | null;
    examenPvVihGlycemie: number | null;
    examenPvVihCreatinemie: number | null;
    examenPvVihTransaminases: number | null;
    examenPvVihUree: number | null;
    examenPvVihCholesterolHdl: number | null;
    examenPvVihCholesterolTotal: number | null;
    examenPvVihHemoglobineNfs: number | null;
    examenPvVihConsultation: boolean;
  }

  interface FactureEchographieRecord {
    idVisite: string;
    libelleEchographie: string;
    prixEchographie: number;
  }

  interface FactureExamenRecord {
    idVisite: string;
    libelleExamen: string;
    prixExamen: number;
  }

  interface FacturePrestationRecord {
    idVisite: string;
    prixPrestation: number;
  }

  interface FactureProduitRecord {
    idVisite: string;
    montantProduit: number;
  }

  interface CouvертureRecord {
    couvertIdVisite: string;
    couvertType: string;
  }

  interface ClientWithRelations {
    id: string;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    sexe: string;
    code: string;
    idClinique: string;
    ethnie: string | null;
    serologie: string | null;
    sourceInfo: string | null;
    quartier: string | null;
    Visite: VisiteWithRelations[];
    Planning?: PlanningRecord[];
    Gynecologie?: GynecologieRecord[];
    Ist?: IstRecord[];
    Infertilite?: InfertiliteRecord[];
    Vbg?: VbgRecord[];
    Medecine?: MedecineRecord[];
    Grossesse?: GrossesseRecord[];
    Obstetrique?: ObstetriqueRecord[];
    Cpon?: CponRecord[];
    TestGrossesse?: TestGrossesseRecord[];
    Accouchement?: AccouchementRecord[];
    Saa?: SaaRecord[];
    DepistageVih?: DepistageVihRecord[];
    PecVih?: PecVihRecord[];
    RecapVisite?: RecapVisiteRecord[];
    ExamenPvVih?: ExamenPvVihRecord[];
    FactureEchographie?: FactureEchographieRecord[];
    FactureExamen?: FactureExamenRecord[];
    FacturePrestation?: FacturePrestationRecord[];
    FactureProduit?: FactureProduitRecord[];
    Couverture?: CouvертureRecord[];
  }

  clients.forEach((client) => {
    client.Visite.forEach((visite) => {
      if (
        visite.dateVisite >= dateVisite1 &&
        visite.dateVisite <= dateVisite2
      ) {
        // 🔑 Récupération par idVisite et non par index
        const planning = client.Planning?.find(
          (p) => p.idVisite === visite.id
        );
        const gyneco = client.Gynecologie?.find(
          (g) => g.idVisite === visite.id
        );
        const ist = client.Ist?.find(
          (i) => i.istIdVisite === visite.id
        );
        const infert = client.Infertilite?.find(
          (f) => f.infertIdVisite === visite.id
        );
        const vbg = client.Vbg?.find(
          (v) => v.vbgIdVisite === visite.id
        );
        const medecine = client.Medecine?.find(
          (m) => m.mdgIdVisite === visite.id
        );
        const grossesse = client.Grossesse?.find(
          (g) => g.grossesseIdVisite === visite.id
        );
        const obstetrique = client.Obstetrique?.find(
          (o) => o.obstIdVisite === visite.id
        );
        const cpon = client.Cpon?.find(
          (c) => c.cponIdVisite === visite.id
        );
        const testGrossesse = client.TestGrossesse?.find(
          (c) => c.testIdVisite === visite.id
        );
        const accouchement = client.Accouchement?.find(
          (c) => c.accouchementIdVisite === visite.id
        );
        const saa = client.Saa?.find(
          (c) => c.saaIdVisite === visite.id
        );
        const depistageVih = client.DepistageVih?.find(
          (d) => d.depistageVihIdVisite === visite.id
        );
        const pecVih = client.PecVih?.find(
          (p) => p.pecVihIdVisite === visite.id
        );
        const recapVisite = client.RecapVisite?.find(
          (r) => r.idVisite === visite.id
        );
        const examenPvVih = client.ExamenPvVih?.find(
          (e) => e.examenPvVihIdVisite === visite.id
        );

        const echographie = client.FactureEchographie?.filter(
          (e) => e.idVisite === visite.id
        );
        const examen = client.FactureExamen?.filter(
          (e) => e.idVisite === visite.id
        );

        const prestation = client.FacturePrestation?.filter(
          (e) => e.idVisite === visite.id
        );
        const produit = client.FactureProduit?.filter(
          (e) => e.idVisite === visite.id
        );
        // let montantTotalPaiement = 0;
        const couverture = client.Couverture?.find(
          (c) => c.couvertIdVisite === visite.id
        );

        visitsData.push({
          id: client.id,
          idVisite: visite.id,
          dateVisite: visite.dateVisite.toLocaleDateString(),
          idActiviteVisite: visite.idActivite || "",
          idLieu: visite.idLieu || "",
          activite:
            allActivites.find((act) => act.id === visite.idActivite)?.libelle ||
            "",
          lieuActivite:
            allLieux.find((lieu) => lieu.id === visite.idLieu)?.lieu || "",
          motifVisite: visite.motifVisite,
          nom: client.nom,
          prenom: client.prenom,
          age: calculerAge(client.dateNaissance),
          sexe: client.sexe,
          code: client.code,
          clinique: client.idClinique,
          ethnie: client.ethnie || "",
          serologie: client.serologie || "",
          sourceInformation: client.sourceInfo || "",
          quartier: client.quartier || "",

          // Planning
          methodePrise: planning?.methodePrise || false,
          typeContraception: planning?.typeContraception || "",
          statut: planning?.statut || "",
          motifVisitePf: planning?.motifVisite || "",
          consultationPf: planning?.consultation || false,
          counsellingPf: planning?.counsellingPf || false,
          courtDuree: planning?.courtDuree || null,
          implanon: planning?.implanon || null,
          retraitImplanon: planning?.retraitImplanon || false,
          jadelle: planning?.jadelle || null,
          retraitJadelle: planning?.retraitJadelle || false,
          sterilet: planning?.sterilet || null,
          retraitSterilet: planning?.retraitSterilet || false,
          raisonRetrait: planning?.raisonRetrait || null,
          raisonEffetSecondaire: planning?.raisonEffetSecondaire || null,
          rdvPf: planning?.rdvPf || null,
          pfUserId: planning?.idUser || "",

          // Gyneco
          consultationGyneco: gyneco?.consultation || false,
          motifVisiteGyneco: gyneco?.motifConsultation || "",
          counsellingAvantDepistage: gyneco?.counsellingAvantDepitage || false,
          counsellingApresDepistage: gyneco?.counsellingApresDepitage || false,
          resultatIva: gyneco?.resultatIva || "",
          eligibleTraitementIva: gyneco?.eligibleTraitementIva || false,
          typeTraitementIva: gyneco?.typeTraitement || "",
          counsellingCancerSein: gyneco?.counselingCancerSein || false,
          resultatCancerSein: gyneco?.resultatCancerSein || "",
          counsellingAutreProbleme: gyneco?.counselingAutreProbleme || false,
          examenPhysique: gyneco?.examenPhysique || false,
          examenPalpationSein: gyneco?.examenPalpation || false,
          toucheeVaginale: gyneco?.toucheeVaginale || false,
          regleIrreguliere: gyneco?.reglesIrreguliere || false,
          regularisationMenstruelle: gyneco?.regularisationMenstruelle || false,
          autreProblemeGyneco: gyneco?.autreProblemeGyneco || false,

          // IST
          istCounsellingAvantDepitage:
            ist?.istCounsellingAvantDepitage || false,
          istType: ist?.istType || "",
          istCounsellingApresDepitage:
            ist?.istCounsellingApresDepitage || false,
          istCounselingReductionRisque:
            ist?.istCounselingReductionRisque || false,
          istExamenPhysique: ist?.istExamenPhysique || false,
          istPecEtiologique: ist?.istPecEtiologique || "",
          istTypeClient: ist?.istTypeClient || "",
          istTypePec: ist?.istTypePec || "",

          // Infertilité
          infertConsultation: infert?.infertConsultation || false,
          infertCounselling: infert?.infertCounselling || false,
          infertExamenPhysique: infert?.infertExamenPhysique || false,
          infertTraitement: infert?.infertTraitement || "",
          infertIdUser: infert?.infertIdUser || "",

          // VBG
          vbgType: vbg?.vbgType || "",
          vbgDuree: vbg?.vbgDuree || 0,
          vbgConsultation: vbg?.vbgConsultation || "",
          vbgCounsellingRelation: vbg?.vbgCounsellingRelation || false,
          vbgCounsellingViolenceSexuel:
            vbg?.vbgCounsellingViolenceSexuel || false,
          vbgCounsellingViolencePhysique:
            vbg?.vbgCounsellingViolencePhysique || false,
          vbgCounsellingSexuelite: vbg?.vbgCounsellingSexuelite || false,
          vbgPreventionViolenceSexuelle:
            vbg?.vbgPreventionViolenceSexuelle || false,
          vbgPreventionViolencePhysique:
            vbg?.vbgPreventionViolencePhysique || false,
          vbgIdUser: vbg?.vbgIdUser || "",

          // Médecine
          mdgConsultation: medecine?.mdgConsultation || false,
          mdgCounselling: medecine?.mdgCounselling || false,
          mdgEtatFemme: medecine?.mdgEtatFemme || "",
          mdgMotifConsultation: medecine?.mdgMotifConsultation || "",
          mdgTypeVisite: medecine?.mdgTypeVisite || "",
          mdgExamenPhysique: medecine?.mdgExamenPhysique || false,
          mdgSuspicionPalu: medecine?.mdgSuspicionPalu || "",
          mdgDiagnostic: medecine?.mdgDiagnostic || [],
          mdgAutreDiagnostic: medecine?.mdgAutreDiagnostic || "",
          mdgSoins: medecine?.mdgSoins || "",
          mdgPecAffection: medecine?.mdgPecAffection || "",
          mdgTypeAffection: medecine?.mdgTypeAffection || "",
          mdgTraitement: medecine?.mdgTraitement || [],
          mdgMiseEnObservation: medecine?.mdgMiseEnObservation || false,
          mdgTestRapidePalu: medecine?.mdgTestRapidePalu || false,
          mdgDureeObservation: medecine?.mdgDureeObservation || 0,
          mdgIdUser: medecine?.mdgIdUser || "",
          mdgIdClient: medecine?.mdgIdClient || "",

          // Grossesse
          obstIdGrossesse: grossesse?.id || "",
          grossesseHta: grossesse?.grossesseHta || "",
          grossesseDiabete: grossesse?.grossesseDiabete || "",
          grossesseGestite: grossesse?.grossesseGestite || 0,
          grossesseParite: grossesse?.grossesseParite || 0,
          grossesseAge: grossesse?.grossesseAge || 0,
          grossesseDdr: grossesse?.grossesseDdr || new Date(),
          termePrevu: grossesse?.termePrevu || new Date(),
          grossesseInterruption: grossesse?.grossesseInterruption || false,
          grossesseMotifInterruption:
            grossesse?.grossesseMotifInterruption || "",

          // Obstétrique
          obstConsultation: obstetrique?.obstConsultation || false,
          obstCounselling: obstetrique?.obstCounselling || false,
          obstTypeVisite: obstetrique?.obstTypeVisite || "",
          obstVat: obstetrique?.obstVat || null,
          obstSp: obstetrique?.obstSp || null,
          obstFer: obstetrique?.obstFer || false,
          obstFolate: obstetrique?.obstFolate || false,
          obstDeparasitant: obstetrique?.obstDeparasitant || false,
          obstMilda: obstetrique?.obstMilda || false,
          obstInvestigations: obstetrique?.obstInvestigations || false,
          obstEtatNutritionnel: obstetrique?.obstEtatNutritionnel || "",
          obstEtatGrossesse: obstetrique?.obstEtatGrossesse || "",
          obstPfppi: obstetrique?.obstPfppi || false,
          obstAlbuminieSucre: obstetrique?.obstAlbuminieSucre || false,
          obstAnemie: obstetrique?.obstAnemie || "Non",
          obstSyphilis: obstetrique?.obstSyphilis || "Non",
          obstAghbs: obstetrique?.obstAghbs || "Non",
          obstRdv: obstetrique?.obstRdv || null,

          // Cpon
          cponConsultation: cpon?.cponConsultation || false,
          cponCounselling: cpon?.cponCounselling || false,
          cponInvestigationPhysique: cpon?.cponInvestigationPhysique || false,
          cponDuree: cpon?.cponDuree || null,
          cponIdUser: cpon?.cponIdUser || null,
          // Test de grossesse
          testConsultation: testGrossesse?.testConsultation || false,
          testResultat: testGrossesse?.testResultat || "",
          // Accouchement
          accouchementConsultation:
            accouchement?.accouchementConsultation || false,
          accouchementLieu: accouchement?.accouchementLieu || "",
          accouchementStatutVat: accouchement?.accouchementStatutVat || "",
          accouchementComplications:
            accouchement?.accouchementComplications || "",
          accouchementEvacuationMere:
            accouchement?.accouchementEvacuationMere || "",
          accouchementTypeEvacuation:
            accouchement?.accouchementTypeEvacuation || "",
          accouchementEvacuationEnfant:
            accouchement?.accouchementEvacuationEnfant || "",
          accouchementMultiple: accouchement?.accouchementMultiple || "",
          accouchementEtatNaissance:
            accouchement?.accouchementEtatNaissance || "",
          accouchementEnfantVivant: accouchement?.accouchementEnfantVivant || 0,
          accouchementEnfantMortNeFrais:
            accouchement?.accouchementEnfantMortNeFrais || 0,
          accouchementEnfantMortNeMacere:
            accouchement?.accouchementEnfantMortNeMacere || 0,
          accouchementNbPoidsEfantVivant:
            accouchement?.accouchementNbPoidsEfantVivant || 0,
          accouchementIdUser: accouchement?.accouchementIdUser || "",
          // SAA
          saaTypeAvortement: saa?.saaTypeAvortement || "",
          saaMethodeAvortement: saa?.saaMethodeAvortement || "",
          saaConsultation: saa?.saaConsultation || false,
          saaSuiviPostAvortement: saa?.saaSuiviPostAvortement || false,
          saaSuiviAutoRefere: saa?.saaSuiviAutoRefere || false,
          saaCounsellingPre: saa?.saaCounsellingPre || false,
          saaMotifDemande: saa?.saaMotifDemande || "",
          saaConsultationPost: saa?.saaConsultationPost || false,
          saaCounsellingPost: saa?.saaCounsellingPost || false,
          saaTypePec: saa?.saaTypePec || "",
          saaTraitementComplication: saa?.saaTraitementComplication || "",
          saaIdUser: saa?.saaIdUser || "",
          // saaMotifDemande: saa?.saaMotifDemande || "",
          // Dépistage VIH
          depistageVihTypeClient: depistageVih?.depistageVihTypeClient || "",
          depistageVihConsultation:
            depistageVih?.depistageVihConsultation || false,
          depistageVihCounsellingPreTest:
            depistageVih?.depistageVihCounsellingPreTest || false,
          depistageVihInvestigationTestRapide:
            depistageVih?.depistageVihInvestigationTestRapide || false,
          depistageVihResultat: depistageVih?.depistageVihResultat || "",
          depistageVihCounsellingPostTest:
            depistageVih?.depistageVihCounsellingPostTest || false,
          depistageVihCounsellingReductionRisque:
            depistageVih?.depistageVihCounsellingReductionRisque || false,
          depistageVihCounsellingSoutienPsychoSocial:
            depistageVih?.depistageVihCounsellingSoutienPsychoSocial || false,
          depistageVihIdUser: depistageVih?.depistageVihIdUser || "",
          depistageVihResultatPositifMisSousArv:
            depistageVih?.depistageVihResultatPositifMisSousArv || false,

          // Pec VIH
          pecVihCounselling: pecVih?.pecVihCounselling || false,
          pecVihTypeclient: pecVih?.pecVihTypeclient || "", //consultation Initiale, Suivi, Autre
          pecVihMoleculeArv: pecVih?.pecVihMoleculeArv || "",
          pecVihAesArv: pecVih?.pecVihAesArv || false,
          pecVihCotrimo: pecVih?.pecVihCotrimo || false,
          pecVihSpdp: pecVih?.pecVihSpdp || false,
          pecVihIoPaludisme: pecVih?.pecVihIoPaludisme || false,
          pecVihIoTuberculose: pecVih?.pecVihIoTuberculose || false,
          pecVihIoAutre: pecVih?.pecVihIoAutre || false,
          pecVihSoutienPsychoSocial: pecVih?.pecVihSoutienPsychoSocial || false,

          recapPrescripteur: recapVisite?.prescripteurs || [],
          nomPrescripteur: "",
          idPrescripteur: "",

          // Examen Pec VIH
          examenPvVihDatePrelevement:
            examenPvVih?.examenPvVihDatePrelevement || null,
          examenPvVihDateTraitement:
            examenPvVih?.examenPvVihDateTraitement || null,
          examenPvVihFemmeEnceinte:
            examenPvVih?.examenPvVihFemmeEnceinte === "oui" || false,
          examenPvVihAllaitement:
            examenPvVih?.examenPvVihAllaitement === "oui" || false,
          examenPvVihTypage: examenPvVih?.examenPvVihTypage || "",
          examenPvVihChargeVirale: examenPvVih?.examenPvVihChargeVirale ?? "",
          examenPvVihCd4: examenPvVih?.examenPvVihCd4 || null,
          examenPvVihGlycemie: examenPvVih?.examenPvVihGlycemie || null,
          examenPvVihCreatinemie: examenPvVih?.examenPvVihCreatinemie || null,
          examenPvVihTransaminases:
            examenPvVih?.examenPvVihTransaminases || null,
          examenPvVihUree: examenPvVih?.examenPvVihUree || null,
          examenPvVihCholesterolHdl:
            examenPvVih?.examenPvVihCholesterolHdl || null,
          examenPvVihCholesterolTotal:
            examenPvVih?.examenPvVihCholesterolTotal || null,
          examenPvVihHemoglobineNfs:
            examenPvVih?.examenPvVihHemoglobineNfs || null,
          examenPvVihConsultation:
            examenPvVih?.examenPvVihConsultation || false,
          // Indicateur viral pour les grossesses (peut venir de la table Grossesse)
          grossesseFeChargViralIndetectable: false,

          echographie: echographie
            ? echographie.map(
                (e: FactureEchographieRecord) => e.libelleEchographie
              )
            : [],
          laboMedecine: examen
            ? examen
                .filter((e: FactureExamenRecord) =>
                  examensMedecine.some(
                    (em: Examen) => em.nomExamen === e.libelleExamen
                  )
                )
                .map((e: FactureExamenRecord) => e.libelleExamen)
            : [],
          laboIst: examen
            ? examen
                .filter((e: FactureExamenRecord) =>
                  examensIst.some(
                    (ei: Examen) => ei.nomExamen === e.libelleExamen
                  )
                )
                .map((e: FactureExamenRecord) => e.libelleExamen)
            : [],
          laboObstetrique: examen
            ? examen
                .filter((e: FactureExamenRecord) =>
                  examensObstetrique.some(
                    (em: Examen) => em.nomExamen === e.libelleExamen
                  )
                )
                .map((e: FactureExamenRecord) => e.libelleExamen)
            : [],
          laboGyneco: examen
            ? examen
                .filter((e: FactureExamenRecord) =>
                  examensGynecologie.some(
                    (em: Examen) => em.nomExamen === e.libelleExamen
                  )
                )
                .map((e: FactureExamenRecord) => e.libelleExamen)
            : [],
          montantTotalPaiement:
            (echographie
              ? echographie.reduce(
                  (sum: number, e: FactureEchographieRecord) =>
                    sum + e.prixEchographie,
                  0
                )
              : 0) +
            (examen
              ? examen.reduce(
                  (sum: number, e: FactureExamenRecord) => sum + e.prixExamen,
                  0
                )
              : 0) +
            (prestation
              ? prestation.reduce(
                  (sum: number, e: FacturePrestationRecord) =>
                    sum + e.prixPrestation,
                  0
                )
              : 0) +
            (produit
              ? produit.reduce(
                  (sum: number, e: FactureProduitRecord) =>
                    sum + e.montantProduit,
                  0
                )
              : 0),
          couverture: couverture ? couverture.couvertType : "Aucune",
        });
      }
    });
  });

  // 🔄 Mise à jour Grossesse si nécessaire
  const visitsAllData: ClientData[] = [];
  const visitsDataCpnFalse = visitsData.filter(
    (visit) => !visit.obstConsultation
  );
  const visitsDataCpn = visitsData.filter((visit) => visit.obstConsultation);
  const visitsDataCpnUpdate = await visiteDataCpnUpdate(visitsDataCpn);
  visitsAllData.push(...visitsDataCpnUpdate);
  visitsAllData.push(...visitsDataCpnFalse);

  visitsAllData.sort((a, b) => {
    const dateA = new Date(a.dateVisite);
    const dateB = new Date(b.dateVisite);
    return dateA.getTime() - dateB.getTime();
  });

  // Ajout nom clinique
  const visitsAllDataWithCliniqueName = visitsAllData.map((v) => {
    const clinique = allClinique.find((c: Clinique) => c.id === v.clinique);
    return {
      ...v,
      clinique: clinique ? clinique.nomClinique : "Clinique inconnue",
    };
  });

  return visitsAllDataWithCliniqueName;
};

const visiteDataCpnUpdate = async (clients: ClientData[]) => {
  for (const client of clients) {
    const data = await getOneGrossesse(client.obstIdGrossesse);
    if (data) {
      client.grossesseHta = data.grossesseHta;
      client.grossesseDiabete = data.grossesseDiabete;
      client.grossesseGestite = data.grossesseGestite;
      client.grossesseParite = data.grossesseParite;
      client.grossesseAge = data.grossesseAge || 0;
      client.grossesseDdr = data.grossesseDdr || new Date();
      client.termePrevu = data.termePrevu || new Date();
      client.grossesseInterruption = data.grossesseInterruption || false;
      client.grossesseMotifInterruption = data.grossesseMotifInterruption || "";
      client.grossesseFeChargViralIndetectable =
        data.grossesseIdVisite &&
        client.idVisite &&
        client.examenPvVihChargeVirale &&
        Number(client.examenPvVihChargeVirale) < 1000
          ? true
          : false;
    }
  }
  return clients;
};

export const fetchClientsStatusProtege = async (
  clinicIds: string[],
  dateVisite1: Date,
  dateVisite2: Date
): Promise<ClientStatusInfo[]> => {
  if (!clinicIds) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  const clients = await prisma.client.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
      Visite: {
        some: {
          dateVisite: {
            // gte: dateVisite1,
            lte: dateVisite2,
          },
        },
      },
    },
    include: {
      Planning: true,
      Visite: true,
    },
  });

  const clientsStatus: ClientStatusInfo[] = [];
  const clientsAvecMethodePrise: ClientWithVisitsAndPlanning[] = clients.filter(
    (client: ClientWithVisitsAndPlanning) =>
      client.Planning?.some((plan) => plan.methodePrise === true)
  );
  for (const client of clientsAvecMethodePrise) {
    for (const plan of client.Planning || []) {
      if (!plan.methodePrise) continue;

      const isLongueDuree = !!(
        plan.implanon ||
        plan.jadelle ||
        plan.sterilet
      );
      const retrait =
        plan.retraitImplanon || plan.retraitJadelle || plan.retraitSterilet;

      // Récupérer la date de visite
      let dateVisiste = "";
      if (client.Visite?.[0]?.dateVisite) {
        const rawDate = await getDateVisite(plan.idVisite);
        if (rawDate instanceof Date) {
          dateVisiste = rawDate.toLocaleDateString("fr-FR");
        }
      }

      const status: ClientStatusInfo = {
        nom: client.nom,
        prenom: client.prenom,
        age: calculerAge(client.dateNaissance),
        sexe: client.sexe,
        code: client.code,
        dateVisiste: dateVisiste,
        rdvPf: plan.rdvPf as Date | null,
        statut: plan.statut || "",
        courtDuree: plan.courtDuree,
        implanon: plan.implanon,
        jadelle: plan.jadelle,
        sterilet: plan.sterilet,
        methodePrise: plan.methodePrise,
        protege: false,
        perdueDeVue: false,
        abandon: false,
        arret: false,
      };

      // === MÉTHODES DE LONGUE DURÉE (Implant, DIU) ===
      // Protection basée sur la durée de la méthode depuis l'insertion :
      // Implanon = 3 ans, Jadelle = 5 ans, COPPER TCU-DIU = 10 ans
      // Sauf retrait avant la fin de la période de protection
      if (isLongueDuree) {
        // Durée de protection selon la méthode
        let dureeProtectionAnnees = 0;
        if (plan.implanon) dureeProtectionAnnees = 3;
        else if (plan.jadelle) dureeProtectionAnnees = 5;
        else if (plan.sterilet) dureeProtectionAnnees = 10;

        // Date d'insertion = date de la visite associée au Planning
        const visiteInsertion = client.Visite.find(
          (v) => v.id === plan.idVisite
        );
        if (!visiteInsertion) continue;
        const dateInsertion = new Date(visiteInsertion.dateVisite);

        // Date de fin de protection
        const dateFinProtection = new Date(dateInsertion);
        dateFinProtection.setFullYear(
          dateFinProtection.getFullYear() + dureeProtectionAnnees
        );

        // Vérifier si un retrait a eu lieu dans une visite ultérieure
        const hasRetraitUlterieur = client.Planning.some((otherPlan) => {
          if (otherPlan.id === plan.id) return false;
          const otherVisite = client.Visite.find(
            (v) => v.id === otherPlan.idVisite
          );
          if (!otherVisite) return false;
          const dateRetrait = new Date(otherVisite.dateVisite);
          return (
            dateRetrait > dateInsertion &&
            dateRetrait <= dateVisite2 &&
            (otherPlan.retraitImplanon ||
              otherPlan.retraitJadelle ||
              otherPlan.retraitSterilet)
          );
        });

        if (retrait || hasRetraitUlterieur) {
          status.arret = true;
        } else if (dateVisite2 <= dateFinProtection) {
          status.protege = true;
        } else {
          // Protection expirée → Abandon
          status.abandon = true;
        }
      }
      // === MÉTHODES DE COURTE DURÉE (Pilules, Injectables, Préservatifs, etc.) ===
      else if (plan.rdvPf) {
        const rendezVous = new Date(plan.rdvPf);
        const diffJours = Math.floor(
          (dateVisite2.getTime() - rendezVous.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Exclusion si trop ancien (plus de 90 jours après le rdv)
        if (diffJours > 90) continue;

        if (rendezVous >= dateVisite2) {
          // RDV pas encore passé → cliente protégée
          status.protege = true;
        } else if (diffJours <= 30) {
          // 1-30 jours de retard → Perdu de vue (peut encore revenir)
          status.perdueDeVue = true;
        } else if (diffJours <= 90) {
          // 31-90 jours de retard → Abandon
          status.abandon = true;
        }
      } else {
        // Pas de rdvPf et méthode courte durée → non classifiable
        continue;
      }

      // Vérification supplémentaire : retrait dans une visite ultérieure
      checkClientStatus(status, clientsAvecMethodePrise, dateVisite2);

      clientsStatus.push(status);
    }
  }

  // Fonction pour convertir une date au format "JJ/MM/AAAA" en objet Date
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split("/").map(Number);
    // Le mois est 0-indexé en JavaScript (0 pour Janvier, 11 pour Décembre)
    return new Date(year, month - 1, day);
  };

  // Convertit la date cible en objet Date pour la comparaison
  const targetDate = dateVisite2;

  // Utilise un objet pour stocker le client le plus proche pour chaque code
  const closestClients = clientsStatus.reduce((acc, currentClient) => {
    const existingClient = acc[currentClient.code];
    const currentDate = parseDate(currentClient.dateVisiste as string);

    // Si aucun client avec ce code n'a été enregistré, ou si le client actuel a une date plus proche
    if (
      !existingClient ||
      Math.abs(currentDate.getTime() - targetDate.getTime()) <
        Math.abs(
          parseDate(existingClient.dateVisiste as string).getTime() -
            targetDate.getTime()
        )
    ) {
      acc[currentClient.code] = currentClient;
    }

    return acc;
  }, {} as Record<string, ClientStatusInfo>);

  // Convertit l'objet des résultats en un tableau
  const clientsProtege = Object.values(closestClients);

  return clientsProtege;
};
