// types/prisma.ts
import { Prisma, User } from "@prisma/client";

/**
 * Type User sans le champ password (retourné par toutes les requêtes user).
 * Utilisé côté client car les server actions ne renvoient jamais le password.
 */
export type SafeUser = Omit<User, "password">;

// Type Inventaire avec toutes ses relations
export type InventaireWithRelations = Prisma.InventaireGetPayload<{
  include: {
    Clinique: true;
    User: true;
    detailInventaire: {
      include: {
        User: true;
        tarifProduit: {
          include: {
            Produit: true;
          };
        };
        AnomalieInventaire: true;
      };
    };
  };
}>;

// Type DetailInventaire avec ses relations
export type DetailInventaireWithRelations = Prisma.DetailInventaireGetPayload<{
  include: {
    User: true;
    inventaire: true;
    tarifProduit: {
      include: {
        Produit: true;
      };
    };
    AnomalieInventaire: true;
  };
}>;

// Type AnomalieInventaire avec ses relations
export type AnomalieInventaireWithRelations =
  Prisma.AnomalieInventaireGetPayload<{
    include: {
      tarifProduit: {
        include: {
          Produit: true;
        };
      };
      User: true;
      detailInventaire: true;
    };
  }>;
