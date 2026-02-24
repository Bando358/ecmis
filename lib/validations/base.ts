import { z } from "zod";

// Primitives réutilisables
export const IdSchema = z.string().min(1, "ID requis");
export const OptionalIdSchema = z.string().optional().nullable();
export const DateSchema = z.coerce.date({ message: "Format de date invalide" });
export const OptionalDateSchema = DateSchema.optional().nullable();
export const BoolSchema = z.boolean();
export const OptionalBoolSchema = z.boolean().optional().default(false);
export const PositiveIntSchema = z.number().int().min(0);
export const OptionalIntSchema = z.number().int().optional().nullable();
export const OptionalFloatSchema = z.number().optional().nullable();
export const OptionalStringSchema = z.string().optional().nullable();
export const RequiredStringSchema = z.string().min(1, "Champ requis");
export const StringArraySchema = z.array(z.string()).default([]);

/**
 * Valide les données côté serveur et lance une erreur si invalide.
 * À utiliser dans les server actions avant d'envoyer les données à Prisma.
 */
export function validateServerData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Validation échouée: ${errors}`);
  }
  return result.data;
}
