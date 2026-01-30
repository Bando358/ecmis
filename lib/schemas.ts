/**
 * Schémas de validation Zod centralisés
 * Utilisés avec React Hook Form pour la validation des formulaires
 */

import { z } from "zod";
import { LIMITS, ERROR_MESSAGES } from "@/lib/constants";

// ============================================
// SCHÉMAS DE BASE RÉUTILISABLES
// ============================================

/** Validation d'email */
export const emailSchema = z
  .string()
  .min(1, ERROR_MESSAGES.REQUIRED_FIELD)
  .email("Adresse email invalide");

/** Validation de mot de passe */
export const passwordSchema = z
  .string()
  .min(
    LIMITS.MIN_PASSWORD_LENGTH,
    `Le mot de passe doit contenir au moins ${LIMITS.MIN_PASSWORD_LENGTH} caractères`
  )
  .max(100, "Le mot de passe ne peut pas dépasser 100 caractères");

/** Validation de nom d'utilisateur */
export const usernameSchema = z
  .string()
  .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
  .max(
    LIMITS.MAX_USERNAME_LENGTH,
    `Le nom d'utilisateur ne peut pas dépasser ${LIMITS.MAX_USERNAME_LENGTH} caractères`
  )
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores"
  );

/** Validation de numéro de téléphone */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+\d{1,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/,
    "Numéro de téléphone invalide"
  )
  .optional()
  .or(z.literal(""));

/** Validation de date */
export const dateSchema = z.coerce.date({
  message: ERROR_MESSAGES.INVALID_DATE,
});

/** Validation de date optionnelle */
export const optionalDateSchema = dateSchema.optional().nullable();

/** Validation d'ID (UUID ou CUID) */
export const idSchema = z.string().min(1, "ID requis");

/** Validation de montant positif */
export const positiveAmountSchema = z
  .number()
  .min(0, "Le montant doit être positif")
  .or(z.string().transform((val) => parseFloat(val) || 0));

// ============================================
// SCHÉMAS D'AUTHENTIFICATION
// ============================================

/** Schéma de connexion */
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, ERROR_MESSAGES.REQUIRED_FIELD),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Schéma d'inscription */
export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmation du mot de passe requise"),
    nom: z.string().min(1, "Le nom est requis"),
    prenom: z.string().min(1, "Le prénom est requis"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// SCHÉMAS CLIENT
// ============================================

/** Schéma de création/modification de client */
export const clientSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(100),
  prenom: z.string().min(1, "Le prénom est requis").max(100),
  dateNaissance: optionalDateSchema,
  sexe: z.enum(["M", "F"]).optional(),
  adresse: z.string().max(255).optional(),
  tel_1: phoneSchema,
  tel_2: phoneSchema,
  profession: z.string().max(100).optional(),
  codeVih: z.string().max(50).optional(),
  cliniqueId: idSchema,
});

export type ClientInput = z.infer<typeof clientSchema>;

/** Schéma de recherche de client */
export const clientSearchSchema = z.object({
  search: z.string().optional(),
  dateDebut: optionalDateSchema,
  dateFin: optionalDateSchema,
  cliniqueId: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

export type ClientSearchInput = z.infer<typeof clientSearchSchema>;

// ============================================
// SCHÉMAS VISITE
// ============================================

/** Schéma de création de visite */
export const visiteSchema = z.object({
  idClient: idSchema,
  idClinique: idSchema,
  dateVisite: dateSchema,
  motif: z.string().min(1, "Le motif est requis").max(500),
  observations: z.string().max(2000).optional(),
});

export type VisiteInput = z.infer<typeof visiteSchema>;

// ============================================
// SCHÉMAS CONSTANTES VITALES
// ============================================

/** Schéma des constantes vitales */
export const constanteSchema = z.object({
  idVisite: idSchema,
  poids: positiveAmountSchema.optional(),
  taille: positiveAmountSchema.optional(),
  temperature: z
    .number()
    .min(30, "Température trop basse")
    .max(45, "Température trop haute")
    .optional(),
  tensionSystolique: positiveAmountSchema.optional(),
  tensionDiastolique: positiveAmountSchema.optional(),
  pouls: positiveAmountSchema.optional(),
  frequenceRespiratoire: positiveAmountSchema.optional(),
  saturationOxygene: z
    .number()
    .min(0)
    .max(100, "La saturation doit être entre 0 et 100%")
    .optional(),
});

export type ConstanteInput = z.infer<typeof constanteSchema>;

// ============================================
// SCHÉMAS PRODUIT
// ============================================

/** Schéma de produit */
export const produitSchema = z.object({
  nom: z.string().min(1, "Le nom du produit est requis").max(200),
  description: z.string().max(1000).optional(),
  unite: z.string().min(1, "L'unité est requise").max(50),
  stockMinimum: z.number().min(0).default(0),
});

export type ProduitInput = z.infer<typeof produitSchema>;

/** Schéma de tarif produit */
export const tarifProduitSchema = z.object({
  idProduit: idSchema,
  idClinique: idSchema,
  prixUnitaire: positiveAmountSchema,
  quantiteStock: z.number().min(0).default(0),
});

export type TarifProduitInput = z.infer<typeof tarifProduitSchema>;

// ============================================
// SCHÉMAS FACTURATION
// ============================================

/** Schéma de facture */
export const factureSchema = z.object({
  idVisite: idSchema,
  idClient: idSchema,
  idClinique: idSchema,
  remise: z.number().min(0).max(100).default(0),
  montantTotal: positiveAmountSchema,
});

export type FactureInput = z.infer<typeof factureSchema>;

// ============================================
// SCHÉMAS PLANNING FAMILIAL
// ============================================

/** Schéma planning familial */
export const planningSchema = z.object({
  idVisite: idSchema,
  methode: z.string().min(1, "La méthode est requise"),
  dateDebut: dateSchema,
  dateFin: optionalDateSchema,
  observations: z.string().max(2000).optional(),
});

export type PlanningInput = z.infer<typeof planningSchema>;

// ============================================
// SCHÉMAS RAPPORT
// ============================================

/** Schéma de filtre de rapport */
export const rapportFilterSchema = z.object({
  dateDebut: dateSchema,
  dateFin: dateSchema,
  cliniqueId: z.string().optional(),
  type: z
    .enum([
      "mensuel",
      "bimestriel",
      "trimestriel",
      "semestriel",
      "annuel",
    ])
    .optional(),
});

export type RapportFilterInput = z.infer<typeof rapportFilterSchema>;

// ============================================
// UTILITAIRES
// ============================================

/**
 * Valide des données avec un schéma Zod et retourne le résultat formaté
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { success: false, errors };
}

/**
 * Crée un schéma de pagination
 */
export function createPaginationSchema(maxPageSize: number = 100) {
  return z.object({
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(maxPageSize).default(20),
  });
}
