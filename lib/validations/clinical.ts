import { z } from "zod";
import { IdSchema, OptionalIdSchema, OptionalBoolSchema, OptionalStringSchema, RequiredStringSchema, DateSchema, OptionalDateSchema, PositiveIntSchema, OptionalIntSchema, OptionalFloatSchema, StringArraySchema } from "./base";

// ===== Gynécologie =====
export const GynecologieCreateSchema = z.object({
  consultation: z.boolean(),
  motifConsultation: RequiredStringSchema,
  counsellingAvantDepitage: z.boolean().optional().nullable(),
  counsellingApresDepitage: z.boolean().optional().nullable(),
  resultatIva: OptionalStringSchema,
  eligibleTraitementIva: z.boolean().optional().nullable(),
  typeTraitement: OptionalStringSchema,
  counselingCancerSein: z.boolean().optional().nullable(),
  resultatCancerSein: OptionalStringSchema,
  counselingAutreProbleme: z.boolean().optional().nullable(),
  examenPhysique: z.boolean().optional().nullable(),
  examenPalpation: z.boolean().optional().nullable(),
  toucheeVaginale: z.boolean().optional().nullable(),
  reglesIrreguliere: z.boolean().optional().nullable(),
  regularisationMenstruelle: z.boolean().optional().nullable(),
  autreProblemeGyneco: z.boolean().optional().nullable(),
  idUser: IdSchema,
  idClient: IdSchema,
  idVisite: IdSchema,
  idClinique: IdSchema,
}).passthrough();

// ===== IST =====
export const IstCreateSchema = z.object({
  istTypeClient: RequiredStringSchema,
  istType: RequiredStringSchema,
  istCounsellingAvantDepitage: z.boolean(),
  istExamenPhysique: z.boolean(),
  istCounsellingApresDepitage: z.boolean(),
  istCounselingReductionRisque: z.boolean(),
  istTypePec: RequiredStringSchema,
  istPecEtiologique: z.string().default(""),
  istIdUser: IdSchema,
  istIdClient: IdSchema,
  istIdVisite: IdSchema,
  istIdClinique: IdSchema,
}).passthrough();

// ===== Infertilité =====
export const InfertiliteCreateSchema = z.object({
  infertConsultation: z.boolean(),
  infertCounselling: z.boolean(),
  infertExamenPhysique: z.boolean(),
  infertTraitement: OptionalStringSchema,
  infertIdUser: IdSchema,
  infertIdClient: IdSchema,
  infertIdVisite: IdSchema,
  infertIdClinique: IdSchema,
}).passthrough();

// ===== VBG =====
export const VbgCreateSchema = z.object({
  vbgType: RequiredStringSchema,
  vbgDuree: z.number().int(),
  vbgConsultation: RequiredStringSchema,
  vbgCounsellingRelation: z.boolean(),
  vbgCounsellingViolenceSexuel: z.boolean(),
  vbgCounsellingViolencePhysique: z.boolean(),
  vbgCounsellingSexuelite: z.boolean(),
  vbgPreventionViolenceSexuelle: z.boolean(),
  vbgPreventionViolencePhysique: z.boolean(),
  vbgIdUser: IdSchema,
  vbgIdClient: IdSchema,
  vbgIdVisite: IdSchema,
  vbgIdClinique: IdSchema,
}).passthrough();

// ===== Médecine =====
export const MedecineCreateSchema = z.object({
  mdgConsultation: z.boolean().default(true),
  mdgCounselling: z.boolean().default(true),
  mdgTestRapidePalu: z.boolean().default(false),
  mdgEtatFemme: RequiredStringSchema,
  mdgMotifConsultation: RequiredStringSchema,
  mdgTypeVisite: RequiredStringSchema,
  mdgExamenPhysique: z.boolean().default(false),
  mdgSuspicionPalu: OptionalStringSchema,
  mdgDiagnostic: StringArraySchema,
  mdgAutreDiagnostic: OptionalStringSchema,
  mdgSoins: OptionalStringSchema,
  mdgPecAffection: OptionalStringSchema,
  mdgTypeAffection: OptionalStringSchema,
  mdgTraitement: StringArraySchema,
  mdgMiseEnObservation: z.boolean().optional().nullable(),
  mdgDureeObservation: OptionalFloatSchema,
  mdgIdUser: IdSchema,
  mdgIdClient: IdSchema,
  mdgIdVisite: IdSchema,
  mdgIdClinique: IdSchema,
}).passthrough();

// ===== Grossesse =====
export const GrossesseCreateSchema = z.object({
  grossesseConsultation: z.boolean().default(true),
  grossesseIdVisite: IdSchema,
  grossesseHta: RequiredStringSchema,
  grossesseDiabete: RequiredStringSchema,
  grossesseGestite: z.number().int().default(1),
  grossesseParite: z.number().int().default(0),
  grossesseAge: OptionalFloatSchema,
  grossesseDdr: OptionalDateSchema,
  termePrevu: OptionalDateSchema,
  grossesseInterruption: z.boolean().default(false),
  grossesseMotifInterruption: OptionalStringSchema,
  grossesseIdUser: IdSchema,
  grossesseIdClient: IdSchema,
  grossesseIdClinique: IdSchema,
}).passthrough();

// ===== Obstétrique =====
export const ObstetriqueCreateSchema = z.object({
  obstIdVisite: IdSchema,
  obstConsultation: z.boolean().default(true),
  obstCounselling: z.boolean().default(true),
  obstTypeVisite: RequiredStringSchema,
  obstVat: OptionalStringSchema,
  obstSp: OptionalStringSchema,
  obstFer: z.boolean().default(false),
  obstFolate: z.boolean().default(false),
  obstDeparasitant: z.boolean().default(false),
  obstMilda: z.boolean().default(false),
  obstInvestigations: z.boolean(),
  obstEtatNutritionnel: z.string().default(""),
  obstEtatGrossesse: RequiredStringSchema,
  obstPfppi: z.boolean().default(true),
  obstAlbuminieSucre: z.boolean().default(false),
  obstAnemie: z.string().default("Non"),
  obstSyphilis: z.string().default("Non"),
  obstAghbs: z.string().default("Non"),
  obstRdv: OptionalDateSchema,
  obstIdGrossesse: OptionalIdSchema,
  obstIdUser: IdSchema,
  obstIdClient: IdSchema,
  obstIdClinique: IdSchema,
}).passthrough();

// ===== Accouchement =====
export const AccouchementCreateSchema = z.object({
  accouchementConsultation: z.boolean().default(true),
  accouchementLieu: RequiredStringSchema,
  accouchementStatutVat: RequiredStringSchema,
  accouchementComplications: RequiredStringSchema,
  accouchementEvacuationMere: OptionalStringSchema,
  accouchementTypeEvacuation: OptionalStringSchema,
  accouchementEvacuationEnfant: RequiredStringSchema,
  accouchementMultiple: RequiredStringSchema,
  accouchementEtatNaissance: RequiredStringSchema,
  accouchementEnfantVivant: z.number().int(),
  accouchementEnfantMortNeFrais: z.number().int(),
  accouchementEnfantMortNeMacere: z.number().int(),
  accouchementNbPoidsEfantVivant: z.number().int(),
  accouchementIdUser: IdSchema,
  accouchementIdClient: IdSchema,
  accouchementIdVisite: IdSchema,
  accouchementIdGrossesse: OptionalIdSchema,
  accouchementIdClinique: IdSchema,
}).passthrough();

// ===== CPON =====
export const CponCreateSchema = z.object({
  cponConsultation: z.boolean().default(true),
  cponCounselling: z.boolean().default(true),
  cponInvestigationPhysique: z.boolean().default(true),
  cponDuree: RequiredStringSchema,
  cponIdUser: IdSchema,
  cponIdClient: IdSchema,
  cponIdVisite: IdSchema,
  cponIdGrossesse: OptionalIdSchema,
  cponIdClinique: IdSchema,
}).passthrough();

// ===== Test Grossesse =====
export const TestGrossesseCreateSchema = z.object({
  testConsultation: z.boolean().default(true),
  testResultat: RequiredStringSchema,
  testIdUser: IdSchema,
  testIdClient: IdSchema,
  testIdVisite: IdSchema,
  testIdGrossesse: OptionalIdSchema,
  testIdClinique: IdSchema,
}).passthrough();

// ===== SAA =====
export const SaaCreateSchema = z.object({
  saaTypeAvortement: RequiredStringSchema,
  saaMethodeAvortement: OptionalStringSchema,
  saaConsultation: z.boolean().default(true),
  saaSuiviPostAvortement: z.boolean().default(false),
  saaSuiviAutoRefere: z.boolean().default(false),
  saaCounsellingPre: z.boolean(),
  saaMotifDemande: OptionalStringSchema,
  saaConsultationPost: z.boolean(),
  saaCounsellingPost: z.boolean(),
  saaTypePec: OptionalStringSchema,
  saaTraitementComplication: OptionalStringSchema,
  saaIdUser: IdSchema,
  saaIdClient: IdSchema,
  saaIdVisite: IdSchema,
  saaIdGrossesse: OptionalIdSchema,
  saaIdClinique: IdSchema,
}).passthrough();

// ===== Dépistage VIH =====
export const DepistageVihCreateSchema = z.object({
  depistageVihTypeClient: RequiredStringSchema,
  depistageVihConsultation: z.boolean().default(true),
  depistageVihCounsellingPreTest: z.boolean().default(true),
  depistageVihInvestigationTestRapide: z.boolean().default(false),
  depistageVihResultat: RequiredStringSchema,
  depistageVihCounsellingPostTest: z.boolean().default(false),
  depistageVihCounsellingReductionRisque: z.boolean().default(false),
  depistageVihCounsellingSoutienPsychoSocial: z.boolean().default(false),
  depistageVihResultatPositifMisSousArv: z.boolean().default(false),
  depistageVihIdUser: IdSchema,
  depistageVihIdClient: IdSchema,
  depistageVihIdVisite: IdSchema,
  depistageVihIdClinique: IdSchema,
}).passthrough();

// ===== PEC VIH =====
export const PecVihCreateSchema = z.object({
  pecVihCounselling: z.boolean().default(true),
  pecVihTypeclient: RequiredStringSchema,
  pecVihMoleculeArv: RequiredStringSchema,
  pecVihAesArv: z.boolean().default(false),
  pecVihCotrimo: z.boolean().default(false),
  pecVihSpdp: z.boolean().default(true),
  pecVihIoPaludisme: z.boolean().default(false),
  pecVihIoTuberculose: z.boolean().default(false),
  pecVihIoAutre: z.boolean().default(false),
  pecVihSoutienPsychoSocial: z.boolean().default(false),
  pecDateRdvSuivi: DateSchema,
  pecVihIdUser: IdSchema,
  pecVihIdClient: IdSchema,
  pecVihIdVisite: IdSchema,
  pecVihIdClinique: IdSchema,
}).passthrough();

// ===== Examen PVVIH =====
export const ExamenPvVihCreateSchema = z.object({
  examenPvVihConsultation: z.boolean().default(true),
  examenPvVihDatePrelevement: DateSchema,
  examenPvVihDateTraitement: DateSchema,
  examenPvVihFemmeEnceinte: OptionalStringSchema,
  examenPvVihAllaitement: OptionalStringSchema,
  examenPvVihTypage: OptionalStringSchema,
  examenPvVihChargeVirale: OptionalIntSchema,
  examenPvVihChargeViraleLog: OptionalIntSchema,
  examenPvVihCd4: OptionalIntSchema,
  examenPvVihGlycemie: OptionalIntSchema,
  examenPvVihCreatinemie: OptionalIntSchema,
  examenPvVihTransaminases: OptionalIntSchema,
  examenPvVihUree: OptionalIntSchema,
  examenPvVihCholesterolHdl: OptionalIntSchema,
  examenPvVihCholesterolTotal: OptionalIntSchema,
  examenPvVihHemoglobineNfs: OptionalIntSchema,
  examenPvVihIdUser: IdSchema,
  examenPvVihIdClient: IdSchema,
  examenPvVihIdVisite: IdSchema,
  examenPvVihIdClinique: IdSchema,
}).passthrough();

// ===== Référence =====
export const ReferenceCreateSchema = z.object({
  consultation: z.boolean().default(true),
  motifReference: RequiredStringSchema,
  autreMotif: OptionalStringSchema,
  structureReference: RequiredStringSchema,
  service: OptionalStringSchema,
  examenClinique: OptionalStringSchema,
  antecedentMedicaux: OptionalStringSchema,
  allergies: OptionalStringSchema,
  diagnosticPropose: OptionalStringSchema,
  soinsRecu: OptionalStringSchema,
  depuisQuand: OptionalDateSchema,
  ivaGestite: OptionalIntSchema,
  ivaParite: OptionalIntSchema,
  ivaLesionLargeDuCol: z.boolean().default(false),
  ivaAutre: z.boolean().default(false),
  ivaLesionSuspectDuCol: z.boolean().default(false),
  ivaRealisee: z.boolean().default(false),
  ivaResultat: z.boolean().default(false),
  observations: OptionalStringSchema,
  nomPrenomReferant: RequiredStringSchema,
  telReferant: RequiredStringSchema,
  qualification: RequiredStringSchema,
  refIdVisite: IdSchema,
  idClient: IdSchema,
  idUser: IdSchema,
  idClinique: IdSchema,
}).passthrough();

// ===== Contre-Référence =====
export const ContreReferenceCreateSchema = z.object({
  consultation: z.boolean().default(true),
  numeroDossier: OptionalStringSchema,
  diagnosticPose: OptionalStringSchema,
  patientHospitalise: z.boolean().default(false),
  traitementRecu: OptionalStringSchema,
  traitementASuivre: OptionalStringSchema,
  ivaBilan: OptionalStringSchema,
  nomPrenomPrestataire: RequiredStringSchema,
  telPrestataire: RequiredStringSchema,
  qualification: RequiredStringSchema,
  refIdVisite: IdSchema,
  idClient: IdSchema,
  idReference: IdSchema,
  idUser: IdSchema,
  idClinique: IdSchema,
}).passthrough();

// ===== Ordonnance =====
export const OrdonnanceCreateSchema = z.object({
  ordonnanceIdVisite: IdSchema,
  ordonnanceIdClient: IdSchema,
  ordonnanceIdUser: IdSchema,
  ordonnanceMedicaments: StringArraySchema,
  ordonnanceIdClinique: IdSchema,
}).passthrough();
