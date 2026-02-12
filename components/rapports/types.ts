import type {
  FactureExamenType,
  FactureProduitType,
  FacturePrestationType,
  FactureEchographieType,
} from "@/lib/actions/venteActions";
import { Produit, Prestation } from "@prisma/client";

// Types pour les calculs
export interface GroupedExamen {
  libelle: string;
  remise: number;
  soustraitance: boolean;
  prixUnitaire: number;
  quantite: number;
  montant: number;
}

export interface GroupedEchographie {
  libelle: string;
  remise: number;
  prixUnitaire: number;
  quantite: number;
  montant: number;
}

export interface ProduitCalculations {
  prixUnitaire: number;
  quantite: number;
  montant: number;
  stockFinal: number;
}

export interface PrestationCalculations {
  prixUnitaire: number;
  quantite: number;
  montant: number;
}

// Types pour les commissions - Nouveau format simplifié
export interface CommissionDetailRow {
  dateVisite: string;
  prescripteur: string;
  client: string;
  commission: number;
}

// Ancien format (conservé pour compatibilité)
export interface CommissionDetailItem {
  client: string;
  dateVisite: string;
  montantCommission: number;
}

export interface CommissionDetailPrescripteur {
  prescripteur: string;
  prescripteurId: string;
  details: CommissionDetailItem[];
  total: number;
}

export interface CommissionTotal {
  prescripteur: string;
  prescripteurId: string;
  contact: string;
  nombreCommissions: number;
  total: number;
}

// Props pour les composants de rapport
export interface FicheVenteRapportProps {
  session: { user?: { name?: string | null } } | null;
  selectedCliniqueIds: string[];
  getAllCliniqueNameById: (ids: string[]) => string;
  dateDebut: string;
  dateFin: string;
  produitsGroupedByType: Record<string, Produit[]>;
  produitsCalculations: Record<string, ProduitCalculations>;
  totalProduitsQuantite: number;
  facturesProduits: FactureProduitType[];
  allPrestations: Prestation[];
  prestationsCalculations: Record<string, PrestationCalculations>;
  facturesPrestations: FacturePrestationType[];
  groupedExamens: GroupedExamen[];
  formatExamenLibelle: (examen: GroupedExamen) => string;
  facturesExamens: FactureExamenType[];
  groupedEchographies: GroupedEchographie[];
  facturesEchographies: FactureEchographieType[];
  totalRecette: number;
}

export interface CommissionExamenDetailRapportProps {
  dateDebut: string;
  dateFin: string;
  commissionsExamenDetail: CommissionDetailRow[];
}

export interface CommissionExamenTotalRapportProps {
  dateDebut: string;
  dateFin: string;
  commissionsExamenTotal: CommissionTotal[];
}

export interface CommissionEchographieDetailRapportProps {
  dateDebut: string;
  dateFin: string;
  commissionsEchographieDetail: CommissionDetailRow[];
}

export interface CommissionEchographieTotalRapportProps {
  dateDebut: string;
  dateFin: string;
  commissionsEchographieTotal: CommissionTotal[];
}
