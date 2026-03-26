"use client";
// ecmis-02/lib/permissionData.ts
import { TableName, PostStatus } from "@prisma/client";

export const dataPermission = [
  {
    table: TableName.USER,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.CLINIQUE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.CLIENT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.VISITE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ACTIVITE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.LIEU,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.POST,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.PRESTATION,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.PRODUIT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.EXAMEN,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.GYNECOLOGIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.IST,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.INFERTILITE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.MEDECINE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.VBG,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.GROSSESSE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.OBSTETRIQUE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ACCOUCHEMENT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.CPON,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.TEST_GROSSESSE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.SAA,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.DEPISTAGE_VIH,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.PEC_VIH,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.REFERENCE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.CONTRE_REFERENCE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ORDONNANCE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ECHOGRAPHIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.FACTURE_PRESTATION,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.FACTURE_PRODUIT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.FACTURE_EXAMEN,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.FACTURE_ECHOGRAPHIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.PLANNING,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.CONSTANTE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.COMMANDE_FOURNISSEUR,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.DETAIL_COMMANDE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.BILAN,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.TARIF_PRESTATION,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.TARIF_PRODUIT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ANOMALIE_INVENTAIRE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.TARIF_EXAMEN,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.TARIF_ECHOGRAPHIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.RESULTAT_EXAMEN,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.RESULTAT_ECHOGRAPHIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.DEMANDE_EXAMEN,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.DEMANDE_ECHOGRAPHIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.REGION,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.CLIENT_VIH,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.IMPORT_CLIENT_VIH,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.STOCK_PRODUIT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.PERMISSION,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ADMINISTRATION,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.AJUSTEMENT_STOCK,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.DETAIL_INVENTAIRE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.INVENTAIRE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.DISTRICT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.SAVED_ANALYSIS,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.ANALYSE_VISUALISER,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.JOURNAL_PHARMACIE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.VENTE_DIRECTE,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    table: TableName.FUSION_CLIENT,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  },
];

// ============================================================
// Profils de permissions par poste (PostStatus)
// ============================================================
// Chaque profil définit les tables activées et leurs droits CRUD.
// Les tables non listées dans un profil restent à false (template de base).

type PermissionOverride = {
  table: TableName;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
};

// Helper : CRUD complet
const crud = { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
// Helper : lecture seule
const readOnly = { canRead: true };
// Helper : création + lecture + modification
const cru = { canCreate: true, canRead: true, canUpdate: true };

// --- Tables cliniques communes (consultations, fiches médicales) ---
const tablesCliniquesFull: PermissionOverride[] = [
  { table: TableName.CLIENT, ...crud },
  { table: TableName.VISITE, ...crud },
  { table: TableName.CONSTANTE, ...crud },
  { table: TableName.PLANNING, ...crud },
  { table: TableName.GYNECOLOGIE, ...crud },
  { table: TableName.IST, ...crud },
  { table: TableName.INFERTILITE, ...crud },
  { table: TableName.MEDECINE, ...crud },
  { table: TableName.VBG, ...crud },
  { table: TableName.GROSSESSE, ...crud },
  { table: TableName.OBSTETRIQUE, ...crud },
  { table: TableName.ACCOUCHEMENT, ...crud },
  { table: TableName.CPON, ...crud },
  { table: TableName.TEST_GROSSESSE, ...crud },
  { table: TableName.SAA, ...crud },
  { table: TableName.DEPISTAGE_VIH, ...crud },
  { table: TableName.PEC_VIH, ...crud },
  { table: TableName.REFERENCE, ...crud },
  { table: TableName.CONTRE_REFERENCE, ...crud },
  { table: TableName.ORDONNANCE, ...crud },
  { table: TableName.DEMANDE_EXAMEN, ...cru },
  { table: TableName.DEMANDE_ECHOGRAPHIE, ...cru },
  { table: TableName.RESULTAT_EXAMEN, ...readOnly },
  { table: TableName.RESULTAT_ECHOGRAPHIE, ...readOnly },
  { table: TableName.FACTURE_PRESTATION, ...cru },
  { table: TableName.FACTURE_PRODUIT, ...cru },
  { table: TableName.FACTURE_EXAMEN, ...cru },
  { table: TableName.FACTURE_ECHOGRAPHIE, ...cru },
  { table: TableName.GESTION_RDV, ...crud },
  { table: TableName.LISTING, ...readOnly },
  { table: TableName.RAPPORT, ...readOnly },
];

// --- Tables réduites pour conseiller / aide-soignant ---
const tablesConseillerBase: PermissionOverride[] = [
  { table: TableName.CLIENT, ...crud },
  { table: TableName.VISITE, ...crud },
  { table: TableName.CONSTANTE, ...cru },
  { table: TableName.TEST_GROSSESSE, ...crud },
  { table: TableName.DEPISTAGE_VIH, ...crud },
  { table: TableName.PLANNING, ...cru },
  { table: TableName.DEMANDE_EXAMEN, ...cru },
  { table: TableName.DEMANDE_ECHOGRAPHIE, ...cru },
  { table: TableName.GESTION_RDV, ...crud },
  { table: TableName.LISTING, ...readOnly },
];

// Helper : lecture + suppression (pas de création/modification)
const rd = { canRead: true, canDelete: true };

// --- Tables communes AMD & ADMIN ---
const tablesAdminBase: PermissionOverride[] = [
  ...tablesCliniquesFull,
  { table: TableName.RESULTAT_EXAMEN, ...crud },
  { table: TableName.RESULTAT_ECHOGRAPHIE, ...crud },
  { table: TableName.USER, ...cru },
  { table: TableName.POST, ...crud },
  { table: TableName.PERMISSION, ...crud },
  { table: TableName.ACTIVITE, ...crud },
  { table: TableName.LIEU, ...crud },
  { table: TableName.PRESTATION, ...crud },
  { table: TableName.TARIF_PRESTATION, ...crud },
  { table: TableName.TARIF_PRODUIT, ...crud },
  { table: TableName.TARIF_EXAMEN, ...crud },
  { table: TableName.TARIF_ECHOGRAPHIE, ...crud },
  { table: TableName.STOCK_PRODUIT, ...crud },
  { table: TableName.INVENTAIRE, ...crud },
  { table: TableName.DETAIL_INVENTAIRE, ...crud },
  { table: TableName.AJUSTEMENT_STOCK, ...crud },
  { table: TableName.ANOMALIE_INVENTAIRE, ...crud },
  { table: TableName.COMMANDE_FOURNISSEUR, ...crud },
  { table: TableName.DETAIL_COMMANDE, ...crud },
  { table: TableName.BILAN, ...crud },
  { table: TableName.ADMINISTRATION, ...crud },
  { table: TableName.PRESCRIPTEUR, ...crud },
  { table: TableName.COMMISSION_EXAMEN, ...crud },
  { table: TableName.COMMISSION_ECHOGRAPHIE, ...crud },
  { table: TableName.JOURNAL_PHARMACIE, ...crud },
  { table: TableName.VENTE_DIRECTE, ...crud },
  { table: TableName.FUSION_CLIENT, ...crud },
  { table: TableName.DISTRICT, ...crud },
  { table: TableName.SAVED_ANALYSIS, ...crud },
  { table: TableName.ANALYSE_VISUALISER, ...crud },
  { table: TableName.RAPPORT, ...crud },
  { table: TableName.LISTING, ...crud },
  { table: TableName.CLIENT_VIH, ...crud },
  { table: TableName.IMPORT_CLIENT_VIH, ...crud },
];

// --- AMD : lecture seule sur REGION, CLINIQUE, PRODUIT, EXAMEN, ECHOGRAPHIE ---
const tablesAMD: PermissionOverride[] = [
  ...tablesAdminBase,
  { table: TableName.REGION, ...readOnly },
  { table: TableName.CLINIQUE, ...readOnly },
  { table: TableName.PRODUIT, ...readOnly },
  { table: TableName.EXAMEN, ...readOnly },
  { table: TableName.ECHOGRAPHIE, ...readOnly },
];

// --- ADMIN : CRUD complet sur tout ---
const tablesAdmin: PermissionOverride[] = [
  ...tablesAdminBase,
  { table: TableName.REGION, ...crud },
  { table: TableName.CLINIQUE, ...crud },
  { table: TableName.PRODUIT, ...crud },
  { table: TableName.EXAMEN, ...crud },
  { table: TableName.ECHOGRAPHIE, ...crud },
];

// --- Tables labo ---
const tablesLaborantin: PermissionOverride[] = [
  { table: TableName.CLIENT, ...readOnly },
  { table: TableName.VISITE, ...readOnly },
  { table: TableName.EXAMEN, ...readOnly },
  { table: TableName.TARIF_EXAMEN, ...readOnly },
  { table: TableName.DEMANDE_EXAMEN, ...cru },
  { table: TableName.RESULTAT_EXAMEN, ...crud },
  { table: TableName.ECHOGRAPHIE, ...readOnly },
  { table: TableName.TARIF_ECHOGRAPHIE, ...readOnly },
  { table: TableName.DEMANDE_ECHOGRAPHIE, ...cru },
  { table: TableName.RESULTAT_ECHOGRAPHIE, ...crud },
  { table: TableName.LISTING, ...readOnly },
];

// --- Tables caissière (pas de suppression) ---
const tablesCaissiere: PermissionOverride[] = [
  { table: TableName.CLIENT, ...readOnly },
  { table: TableName.VISITE, ...readOnly },
  { table: TableName.CONSTANTE, ...readOnly },
  { table: TableName.PRESTATION, ...readOnly },
  { table: TableName.TARIF_PRESTATION, ...readOnly },
  { table: TableName.FACTURE_PRESTATION, ...cru },
  { table: TableName.PRODUIT, ...readOnly },
  { table: TableName.TARIF_PRODUIT, ...cru },
  { table: TableName.FACTURE_PRODUIT, ...cru },
  { table: TableName.EXAMEN, ...readOnly },
  { table: TableName.TARIF_EXAMEN, ...cru },
  { table: TableName.DEMANDE_EXAMEN, ...cru },
  { table: TableName.FACTURE_EXAMEN, ...cru },
  { table: TableName.ECHOGRAPHIE, ...readOnly },
  { table: TableName.TARIF_ECHOGRAPHIE, ...cru },
  { table: TableName.DEMANDE_ECHOGRAPHIE, ...cru },
  { table: TableName.FACTURE_ECHOGRAPHIE, ...cru },
  { table: TableName.STOCK_PRODUIT, ...readOnly },
  { table: TableName.PRESCRIPTEUR, ...cru },
  { table: TableName.COMMISSION_EXAMEN, ...cru },
  { table: TableName.COMMISSION_ECHOGRAPHIE, ...cru },
  { table: TableName.VENTE_DIRECTE, ...cru },
  { table: TableName.LISTING, ...readOnly },
  { table: TableName.JOURNAL_PHARMACIE, ...readOnly },
];

// --- Tables comptable ---
const tablesComptable: PermissionOverride[] = [
  { table: TableName.CLIENT, ...readOnly },
  { table: TableName.FACTURE_PRESTATION, ...readOnly },
  { table: TableName.FACTURE_PRODUIT, ...readOnly },
  { table: TableName.FACTURE_EXAMEN, ...readOnly },
  { table: TableName.FACTURE_ECHOGRAPHIE, ...readOnly },
  { table: TableName.BILAN, ...crud },
  { table: TableName.RAPPORT, ...readOnly },
  { table: TableName.LISTING, ...readOnly },
  { table: TableName.JOURNAL_PHARMACIE, ...readOnly },
  { table: TableName.STOCK_PRODUIT, ...readOnly },
  { table: TableName.INVENTAIRE, ...readOnly },
  { table: TableName.COMMANDE_FOURNISSEUR, ...readOnly },
  { table: TableName.COMMISSION_EXAMEN, ...readOnly },
  { table: TableName.COMMISSION_ECHOGRAPHIE, ...readOnly },
];

// --- Tables suivi & évaluation ---
const tablesSuiviEvaluation: PermissionOverride[] = [
  { table: TableName.CLIENT, ...readOnly },
  { table: TableName.VISITE, ...readOnly },
  { table: TableName.DEMANDE_EXAMEN, ...cru },
  { table: TableName.DEMANDE_ECHOGRAPHIE, ...cru },
  { table: TableName.RAPPORT, ...crud },
  { table: TableName.LISTING, ...crud },
  { table: TableName.ANALYSE_VISUALISER, ...crud },
  { table: TableName.SAVED_ANALYSIS, ...crud },
  { table: TableName.DISTRICT, ...readOnly },
  { table: TableName.ACTIVITE, ...readOnly },
  { table: TableName.BILAN, ...readOnly },
];

// ============================================================
// Map PostStatus → PermissionOverride[]
// ============================================================
export const postPermissionProfiles: Record<PostStatus, PermissionOverride[]> = {
  [PostStatus.AMD]: tablesAMD,
  [PostStatus.ADMIN]: tablesAdmin,
  [PostStatus.INFIRMIER]: tablesCliniquesFull,
  [PostStatus.SAGE_FEMME]: tablesCliniquesFull,
  [PostStatus.MEDECIN]: tablesCliniquesFull,
  [PostStatus.CONSEILLER]: tablesConseillerBase,
  [PostStatus.AIDE_SOIGNANT]: tablesConseillerBase,
  [PostStatus.LABORANTIN]: tablesLaborantin,
  [PostStatus.CAISSIERE]: tablesCaissiere,
  [PostStatus.COMPTABLE]: tablesComptable,
  [PostStatus.SUIVI_EVALLUATION]: tablesSuiviEvaluation,
};

/**
 * Génère les permissions pour un userId selon son PostStatus.
 * Applique le profil du poste sur le template de base (dataPermission).
 */
export function buildPermissionsForPost(
  postStatus: PostStatus,
  userId: string,
) {
  const overrides = postPermissionProfiles[postStatus] ?? [];
  const overrideMap = new Map(overrides.map((o) => [o.table, o]));

  return dataPermission.map((base) => {
    const override = overrideMap.get(base.table);
    return {
      userId,
      table: base.table,
      canCreate: override?.canCreate ?? false,
      canRead: override?.canRead ?? false,
      canUpdate: override?.canUpdate ?? false,
      canDelete: override?.canDelete ?? false,
    };
  });
}
