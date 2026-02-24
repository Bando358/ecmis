import { z } from "zod";
import { IdSchema, OptionalIdSchema, OptionalStringSchema, RequiredStringSchema, DateSchema, OptionalDateSchema, PositiveIntSchema } from "./base";

// ===== Prestation =====
export const PrestationCreateSchema = z.object({
  nomPrestation: RequiredStringSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Tarif Prestation =====
export const TarifPrestationCreateSchema = z.object({
  montantPrestation: PositiveIntSchema,
  nomPrestation: RequiredStringSchema,
  idPrestation: IdSchema,
  idClinique: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Facture Prestation =====
export const FacturePrestationCreateSchema = z.object({
  libellePrestation: RequiredStringSchema,
  prixPrestation: PositiveIntSchema,
  idVisite: IdSchema,
  idClient: IdSchema,
  idClinique: IdSchema,
  idPrestation: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Facture Examen =====
export const FactureExamenCreateSchema = z.object({
  libelleExamen: RequiredStringSchema,
  prixExamen: PositiveIntSchema,
  idVisite: IdSchema,
  idClient: IdSchema,
  idClinique: IdSchema,
  remiseExamen: z.number().int().default(0),
  soustraitanceExamen: z.boolean().default(false),
  idDemandeExamen: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Facture Echographie =====
export const FactureEchographieCreateSchema = z.object({
  libelleEchographie: RequiredStringSchema,
  prixEchographie: PositiveIntSchema,
  serviceEchographieFacture: RequiredStringSchema,
  idVisite: IdSchema,
  idClient: IdSchema,
  idClinique: IdSchema,
  remiseEchographie: z.number().int().default(0),
  partEchographe: z.number().int().default(0),
  idDemandeEchographie: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Facture Produit =====
export const FactureProduitCreateSchema = z.object({
  idTarifProduit: IdSchema,
  nomProduit: RequiredStringSchema,
  idClient: IdSchema,
  idClinique: IdSchema,
  quantite: z.number().int().min(1, "Quantité minimum 1"),
  montantProduit: PositiveIntSchema,
  methode: z.boolean().default(false),
  idUser: IdSchema,
  idVisite: IdSchema,
}).passthrough();

// ===== Produit =====
export const ProduitCreateSchema = z.object({
  nomProduit: RequiredStringSchema,
  description: OptionalStringSchema,
  typeProduit: z.enum(["CONTRACEPTIF", "MEDICAMENTS", "CONSOMMABLES"]),
  idUser: IdSchema,
}).passthrough();

// ===== Tarif Produit =====
export const TarifProduitCreateSchema = z.object({
  prixUnitaire: PositiveIntSchema,
  quantiteStock: z.number().int().min(0),
  idProduit: IdSchema,
  idClinique: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Inventaire =====
export const InventaireCreateSchema = z.object({
  idClinique: IdSchema,
  idUser: IdSchema,
}).passthrough();

// ===== Détail Inventaire =====
export const DetailInventaireCreateSchema = z.object({
  idInventaire: IdSchema,
  idUser: IdSchema,
  idTarifProduit: IdSchema,
  quantiteTheorique: z.number().int(),
  quantiteReelle: z.number().int(),
  ecart: z.number().int(),
}).passthrough();

// ===== Anomalie Inventaire =====
export const AnomalieInventaireCreateSchema = z.object({
  idTarifProduit: IdSchema,
  idUser: IdSchema,
  idDetailInventaire: IdSchema,
  quantiteManquante: z.number().int(),
  description: OptionalStringSchema,
}).passthrough();

// ===== Commande Fournisseur =====
export const CommandeFournisseurCreateSchema = z.object({
  idClinique: IdSchema,
}).passthrough();

// ===== Détail Commande =====
export const DetailCommandeCreateSchema = z.object({
  idTarifProduit: IdSchema,
  quantiteInitiale: z.number().int(),
  quantiteCommandee: z.number().int().min(1, "Quantité minimum 1"),
  idCommande: IdSchema,
  idUser: IdSchema,
  idClinique: IdSchema,
}).passthrough();

// ===== Prescripteur =====
export const PrescripteurCreateSchema = z.object({
  nom: RequiredStringSchema,
  prenom: RequiredStringSchema,
  centre: RequiredStringSchema,
  contact: RequiredStringSchema,
  idClinique: IdSchema,
}).passthrough();

// ===== Commission Examen =====
export const CommissionExamenCreateSchema = z.object({
  idFactureExamen: IdSchema,
  idPrescripteur: IdSchema,
  idVisite: IdSchema,
  montantCommission: PositiveIntSchema,
  paye: z.boolean().default(false),
  datePaiement: OptionalDateSchema,
}).passthrough();

// ===== Commission Echographie =====
export const CommissionEchographieCreateSchema = z.object({
  idFactureEchographie: IdSchema,
  idPrescripteur: IdSchema,
  idVisite: IdSchema,
  montantCommission: PositiveIntSchema,
  paye: z.boolean().default(false),
  datePaiement: OptionalDateSchema,
}).passthrough();
