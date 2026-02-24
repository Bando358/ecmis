import { z } from "zod";
import { IdSchema, OptionalStringSchema, RequiredStringSchema, OptionalFloatSchema, PositiveIntSchema, OptionalIntSchema } from "./base";

// ===== Examen =====
export const ExamenCreateSchema = z.object({
  typeExamen: z.enum(["MEDECIN", "GYNECOLOGIE", "OBSTETRIQUE", "VIH", "IST"]),
  nomExamen: RequiredStringSchema,
  uniteMesureExamen: OptionalStringSchema,
  valeurUsuelleMinH: OptionalFloatSchema,
  valeurUsuelleMaxH: OptionalFloatSchema,
  valeurUsuelleMinF: OptionalFloatSchema,
  valeurUsuelleMaxF: OptionalFloatSchema,
  abreviation: RequiredStringSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Tarif Examen =====
export const TarifExamenCreateSchema = z.object({
  prixExamen: PositiveIntSchema,
  nomExamen: RequiredStringSchema,
  idExamen: IdSchema,
  idClinique: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Demande Examen =====
export const DemandeExamenCreateSchema = z.object({
  idVisite: IdSchema,
  idClient: IdSchema,
  idClinique: IdSchema,
  idTarifExamen: RequiredStringSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Résultat Examen =====
export const ResultatExamenCreateSchema = z.object({
  resultatExamen: RequiredStringSchema,
  observations: OptionalStringSchema,
  valeurResultat: z.number().int(),
  idFactureExamen: IdSchema,
  idClinique: IdSchema,
  idUser: IdSchema,
  idVisite: IdSchema,
  idClient: IdSchema,
}).passthrough();

// ===== Echographie =====
export const EchographieCreateSchema = z.object({
  typeEchographie: z.enum(["OBST", "GYN", "INF", "MDG", "CAR"]),
  regionExaminee: z.enum([
    "ABDOMEN", "PELVIS_BASSIN", "GYNECOLOGIE_OBSTETRIQUE", "SEINS", "COU",
    "MUSCLES_ET_ARTICULATIONS", "TESTICULES", "PROSTATE", "COEUR",
    "PELVIENNE_ABDOMINALE", "LOMBES_PELVIENNE", "ZONE_LOCALISEE",
    "BOURSES", "HANCHES", "MEMBRES_COU", "THORAX", "OESOPHAGE",
  ]),
  nomEchographie: RequiredStringSchema,
  idUser: IdSchema,
  organeExaminee: OptionalStringSchema,
}).passthrough();

// ===== Tarif Echographie =====
export const TarifEchographieCreateSchema = z.object({
  prixEchographie: PositiveIntSchema,
  nomEchographie: RequiredStringSchema,
  idEchographie: IdSchema,
  idClinique: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Demande Echographie =====
export const DemandeEchographieCreateSchema = z.object({
  idVisite: IdSchema,
  idClient: IdSchema,
  idClinique: IdSchema,
  idTarifEchographie: RequiredStringSchema,
  serviceEchographie: z.enum(["OBSTETRIQUE", "GYNECOLOGIE", "INFERTILITE", "MEDECINE_GENERALE"]),
  idUser: IdSchema,
}).passthrough();

// ===== Résultat Echographie =====
export const ResultatEchographieCreateSchema = z.object({
  resultatEchographie: RequiredStringSchema,
  observations: OptionalStringSchema,
  valeurResultat: z.number().int(),
  idFactureEchographie: IdSchema,
  idClinique: IdSchema,
  idUser: IdSchema,
  idVisite: IdSchema,
  idClient: IdSchema,
}).passthrough();
