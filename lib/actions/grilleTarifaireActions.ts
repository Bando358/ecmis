"use server";

import prisma from "@/lib/prisma";

export type TarifType =
  | "produit"
  | "prestation"
  | "examen"
  | "echographie";

export type GrilleTarifaireRow = {
  itemId: string; // id du produit / prestation / examen / echographie
  itemLabel: string; // nom de l'item
  itemSublabel?: string; // type / catégorie secondaire (ex: CONTRACEPTIF)
  // Map cliniqueId -> prix
  prix: Record<string, number | null>;
};

export type GrilleTarifaireResult = {
  type: TarifType;
  rows: GrilleTarifaireRow[];
};

export async function getGrilleTarifaire(
  type: TarifType,
  cliniqueIds: string[],
): Promise<GrilleTarifaireResult> {
  if (cliniqueIds.length === 0) return { type, rows: [] };

  if (type === "produit") {
    const [produits, tarifs] = await Promise.all([
      prisma.produit.findMany({
        select: { id: true, nomProduit: true, typeProduit: true },
        orderBy: { nomProduit: "asc" },
      }),
      prisma.tarifProduit.findMany({
        where: { idClinique: { in: cliniqueIds } },
        select: { idProduit: true, idClinique: true, prixUnitaire: true },
      }),
    ]);

    const map = new Map<string, Map<string, number>>();
    tarifs.forEach((t) => {
      if (!map.has(t.idProduit)) map.set(t.idProduit, new Map());
      map.get(t.idProduit)!.set(t.idClinique, t.prixUnitaire);
    });

    // Ordre imposé : CONTRACEPTIF → CONSOMMABLES → MEDICAMENTS
    const TYPE_ORDER: Record<string, number> = {
      CONTRACEPTIF: 0,
      CONSOMMABLES: 1,
      MEDICAMENTS: 2,
    };
    const produitsSorted = [...produits].sort((a, b) => {
      const diff =
        (TYPE_ORDER[a.typeProduit] ?? 99) - (TYPE_ORDER[b.typeProduit] ?? 99);
      if (diff !== 0) return diff;
      return a.nomProduit.localeCompare(b.nomProduit);
    });

    const rows: GrilleTarifaireRow[] = produitsSorted.map((p) => {
      const byClinique = map.get(p.id) || new Map();
      const prix: Record<string, number | null> = {};
      cliniqueIds.forEach((cid) => {
        prix[cid] = byClinique.has(cid) ? byClinique.get(cid)! : null;
      });
      return {
        itemId: p.id,
        itemLabel: p.nomProduit,
        itemSublabel: p.typeProduit,
        prix,
      };
    });
    return { type, rows };
  }

  if (type === "prestation") {
    const [prestations, tarifs] = await Promise.all([
      prisma.prestation.findMany({
        select: { id: true, nomPrestation: true },
        orderBy: { nomPrestation: "asc" },
      }),
      prisma.tarifPrestation.findMany({
        where: { idClinique: { in: cliniqueIds } },
        select: {
          idPrestation: true,
          idClinique: true,
          montantPrestation: true,
        },
      }),
    ]);

    const map = new Map<string, Map<string, number>>();
    tarifs.forEach((t) => {
      if (!map.has(t.idPrestation)) map.set(t.idPrestation, new Map());
      map.get(t.idPrestation)!.set(t.idClinique, t.montantPrestation);
    });

    const rows: GrilleTarifaireRow[] = prestations.map((p) => {
      const byClinique = map.get(p.id) || new Map();
      const prix: Record<string, number | null> = {};
      cliniqueIds.forEach((cid) => {
        prix[cid] = byClinique.has(cid) ? byClinique.get(cid)! : null;
      });
      return { itemId: p.id, itemLabel: p.nomPrestation, prix };
    });
    return { type, rows };
  }

  if (type === "examen") {
    const [examens, tarifs] = await Promise.all([
      prisma.examen.findMany({
        select: { id: true, nomExamen: true, typeExamen: true },
        orderBy: { nomExamen: "asc" },
      }),
      prisma.tarifExamen.findMany({
        where: { idClinique: { in: cliniqueIds } },
        select: { idExamen: true, idClinique: true, prixExamen: true },
      }),
    ]);

    const map = new Map<string, Map<string, number>>();
    tarifs.forEach((t) => {
      if (!map.has(t.idExamen)) map.set(t.idExamen, new Map());
      map.get(t.idExamen)!.set(t.idClinique, t.prixExamen);
    });

    const rows: GrilleTarifaireRow[] = examens.map((e) => {
      const byClinique = map.get(e.id) || new Map();
      const prix: Record<string, number | null> = {};
      cliniqueIds.forEach((cid) => {
        prix[cid] = byClinique.has(cid) ? byClinique.get(cid)! : null;
      });
      return {
        itemId: e.id,
        itemLabel: e.nomExamen,
        itemSublabel: e.typeExamen,
        prix,
      };
    });
    return { type, rows };
  }

  if (type === "echographie") {
    const [echographies, tarifs] = await Promise.all([
      prisma.echographie.findMany({
        select: {
          id: true,
          nomEchographie: true,
          typeEchographie: true,
          regionExaminee: true,
        },
        orderBy: { nomEchographie: "asc" },
      }),
      prisma.tarifEchographie.findMany({
        where: { idClinique: { in: cliniqueIds } },
        select: {
          idEchographie: true,
          idClinique: true,
          prixEchographie: true,
        },
      }),
    ]);

    const map = new Map<string, Map<string, number>>();
    tarifs.forEach((t) => {
      if (!map.has(t.idEchographie)) map.set(t.idEchographie, new Map());
      map.get(t.idEchographie)!.set(t.idClinique, t.prixEchographie);
    });

    const rows: GrilleTarifaireRow[] = echographies.map((e) => {
      const byClinique = map.get(e.id) || new Map();
      const prix: Record<string, number | null> = {};
      cliniqueIds.forEach((cid) => {
        prix[cid] = byClinique.has(cid) ? byClinique.get(cid)! : null;
      });
      return {
        itemId: e.id,
        itemLabel: e.nomEchographie,
        itemSublabel: `${e.typeEchographie} - ${e.regionExaminee}`,
        prix,
      };
    });
    return { type, rows };
  }

  return { type, rows: [] };
}
