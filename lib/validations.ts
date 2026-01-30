/**
 * Schémas de validation Zod pour l'application eCMIS
 * Ces schémas peuvent être utilisés dans les Server Actions et les formulaires
 *
 * Usage:
 * import { ClientCreateSchema } from "@/lib/validations";
 * const validated = ClientCreateSchema.parse(data);
 */

import { z } from "zod";

// ============================================
// Schémas de base réutilisables
// ============================================

export const PhoneSchema = z
  .string()
  .min(8, "Numéro de téléphone trop court")
  .max(20, "Numéro de téléphone trop long")
  .regex(/^[\d\s\-\+]+$/, "Format de téléphone invalide");

export const DateSchema = z.coerce.date({
  message: "Format de date invalide",
});

export const UUIDSchema = z.string().uuid("ID invalide");

// ============================================
// Schéma Client
// ============================================

export const ClientCreateSchema = z.object({
  nom: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  prenom: z
    .string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères"),
  dateNaissance: DateSchema,
  dateEnregistrement: DateSchema,
  sexe: z.enum(["M", "F"], {
    message: "Sexe invalide (M ou F requis)",
  }),
  tel_1: PhoneSchema,
  tel_2: z.string().optional().default(""),
  code: z.string().min(1, "Code requis"),
  sourceInfo: z.string().min(1, "Source d'information requise"),
  statusClient: z.string().min(1, "Statut requis"),
  cliniqueId: UUIDSchema,
  idClinique: z.string().min(1, "Clinique requise"),

  // Champs optionnels
  codeVih: z.string().optional().nullable(),
  lieuNaissance: z.string().optional().nullable(),
  niveauScolaire: z.string().optional().nullable(),
  ethnie: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  serologie: z.string().optional().nullable(),
  quartier: z.string().optional().nullable(),
  etatMatrimonial: z.string().optional().nullable(),
  idUser: z.string().optional().nullable(),
});

export type ClientCreateInput = z.infer<typeof ClientCreateSchema>;

// ============================================
// Schéma Visite
// ============================================

export const VisiteCreateSchema = z.object({
  dateVisite: DateSchema.optional().default(() => new Date()),
  motifVisite: z.string().min(1, "Motif de visite requis"),
  idUser: UUIDSchema,
  idClinique: UUIDSchema,
  idClient: UUIDSchema,
  idActivite: z.string().optional().nullable(),
  idLieu: z.string().optional().nullable(),
});

export type VisiteCreateInput = z.infer<typeof VisiteCreateSchema>;

// ============================================
// Schéma Constante
// ============================================

export const ConstanteCreateSchema = z.object({
  idVisite: UUIDSchema,
  idClient: UUIDSchema,
  poids: z.number().positive("Le poids doit être positif"),
  taille: z.number().positive("La taille doit être positive").optional().nullable(),
  psSystolique: z.number().int().positive().optional().nullable(),
  psDiastolique: z.number().int().positive().optional().nullable(),
  temperature: z.number().min(35).max(42).optional().nullable(),
  pouls: z.number().int().positive().optional().nullable(),
  frequenceRespiratoire: z.number().int().positive().optional().nullable(),
  saturationOxygene: z.number().int().min(0).max(100).optional().nullable(),
  idUser: z.string().optional().nullable(),
});

export type ConstanteCreateInput = z.infer<typeof ConstanteCreateSchema>;

// ============================================
// Schéma Planning (Contraception)
// ============================================

export const PlanningCreateSchema = z.object({
  idVisite: UUIDSchema,
  idClient: UUIDSchema,
  idClinique: UUIDSchema,
  idUser: UUIDSchema,
  statut: z.string().min(1, "Statut requis"),
  typeContraception: z.string().min(1, "Type de contraception requis"),
  motifVisite: z.string().min(1, "Motif requis"),
  consultation: z.boolean().default(false),
  counsellingPf: z.boolean().default(false),
  methodePrise: z.boolean().default(false),
  rdvPf: DateSchema.optional().nullable(),

  // Champs optionnels
  courtDuree: z.string().optional().nullable(),
  implanon: z.string().optional().nullable(),
  jadelle: z.string().optional().nullable(),
  sterilet: z.string().optional().nullable(),
  retraitImplanon: z.boolean().default(false),
  retraitJadelle: z.boolean().default(false),
  retraitSterilet: z.boolean().default(false),
  raisonRetrait: z.string().optional().nullable(),
  raisonEffetSecondaire: z.string().optional().nullable(),
});

export type PlanningCreateInput = z.infer<typeof PlanningCreateSchema>;

// ============================================
// Schéma User (pour création de compte)
// ============================================

export const UserCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  email: z.string().email("Email invalide"),
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores"
    ),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
    ),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  prescripteur: z.boolean().default(false),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

// ============================================
// Schéma de connexion
// ============================================

export const LoginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================
// Fonctions utilitaires
// ============================================

/**
 * Valide les données et retourne un résultat typé
 * @param schema - Schéma Zod
 * @param data - Données à valider
 * @returns { success: true, data } | { success: false, error }
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Formater les erreurs pour un message lisible
  const issues = result.error.issues || [];
  const errors = issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  return { success: false, error: errors || "Validation échouée" };
}
