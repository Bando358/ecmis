// types/prisma.ts
import { Prisma } from "@prisma/client";

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
