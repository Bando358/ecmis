import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllTarifProduits } from "@/lib/actions/tarifProduitActions";
import { getAllTarifExamen } from "@/lib/actions/tarifExamenActions";
import { getAllExamen } from "@/lib/actions/examenActions";
import { getAllPrestation } from "@/lib/actions/prestationActions";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import { getAllTarifEchographie } from "@/lib/actions/tarifEchographieActions";
import {
  Visite,
  Client,
  TarifProduit,
  TarifExamen,
  Examen,
  Prestation,
  Produit,
  Clinique,
  Echographie,
  TarifEchographie,
  FactureProduit,
  FacturePrestation,
  FactureEchographie,
  FactureExamen,
  DemandeExamen,
  DemandeEchographie,
} from "@prisma/client";
import { getAllFactureProduitByIdClient } from "@/lib/actions/factureProduitActions";
import { getAllFacturePrestationByIdClient } from "@/lib/actions/facturePrestationActions";
import { getAllFactureExamenByIdClient } from "@/lib/actions/factureExamenActions";
import { getAllFactureEchographieByIdClient } from "@/lib/actions/factureEchographieActions";
import { getAllDemandeExamensByIdClient } from "@/lib/actions/demandeExamenActions";
import { getAllDemandeEchographiesByIdClient } from "@/lib/actions/demandeEchographieActions";

interface FichePharmacyServerProps {
  pharmacyId: string;
  children: (data: {
    visites: Visite[];
    client: Client;
    tabTarifProduit: TarifProduit[];
    tabTarifExamens: TarifExamen[];
    tabExamen: Examen[];
    prestations: Prestation[];
    tabProduit: Produit[];
    tabClinique: Clinique[];
    tabEchographie: Echographie[];
    tabTarifEchographies: TarifEchographie[];
    tabProduitFactureClient: FactureProduit[];
    tabPrestationFactureClient: FacturePrestation[];
    tabEchographieFactureClient: FactureEchographie[];
    tabExamenFactureClient: FactureExamen[];
    tabDemandeExamensClient: DemandeExamen[];
    tabDemandeEchographiesClient: DemandeEchographie[];
  }) => React.ReactNode;
}

export default async function FichePharmacyServer({
  pharmacyId,
  children,
}: FichePharmacyServerProps) {
  try {
    // Récupération de toutes les données en parallèle
    const [
      visitesResult,
      clientResult,
      tarifProduitsResult,
      tarifExamensResult,
      examensResult,
      prestationsResult,
      produitsResult,
      cliniquesResult,
      echographiesResult,
      tarifEchographiesResult,
      tabProduitFactureClient,
      tabPrestationFactureClient,
      tabEchographieFactureClient,
      tabExamenFactureClient,
      tabDemandeExamensClient,
      tabDemandeEchographiesClient,
    ] = await Promise.all([
      getAllVisiteByIdClient(pharmacyId),
      getOneClient(pharmacyId),
      getAllTarifProduits(),
      getAllTarifExamen(),
      getAllExamen(),
      getAllPrestation(),
      getAllProduits(),
      getAllClinique(),
      getAllEchographies(),
      getAllTarifEchographie(),
      getAllFactureProduitByIdClient(pharmacyId),
      getAllFacturePrestationByIdClient(pharmacyId),
      getAllFactureEchographieByIdClient(pharmacyId),
      getAllFactureExamenByIdClient(pharmacyId),
      getAllDemandeExamensByIdClient(pharmacyId),
      getAllDemandeEchographiesByIdClient(pharmacyId),
    ]);

    // Transformation des données avec types appropriés
    const data = {
      visites: visitesResult as Visite[],
      client: clientResult as Client,
      tabTarifProduit: tarifProduitsResult as TarifProduit[],
      tabTarifExamens: tarifExamensResult as TarifExamen[],
      tabExamen: examensResult as Examen[],
      prestations: prestationsResult as Prestation[],
      tabProduit: produitsResult as Produit[],
      tabClinique: cliniquesResult as Clinique[],
      tabEchographie: echographiesResult as Echographie[],
      tabTarifEchographies: tarifEchographiesResult as TarifEchographie[],
      tabProduitFactureClient: tabProduitFactureClient as FactureProduit[],
      tabPrestationFactureClient:
        tabPrestationFactureClient as FacturePrestation[],
      tabEchographieFactureClient:
        tabEchographieFactureClient as FactureEchographie[],
      tabExamenFactureClient: tabExamenFactureClient as FactureExamen[],
      tabDemandeExamensClient: tabDemandeExamensClient as DemandeExamen[],
      tabDemandeEchographiesClient:
        tabDemandeEchographiesClient as DemandeEchographie[],
    };

    return children(data);
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);

    // Retourner des données vides en cas d'erreur
    const emptyData = {
      visites: [],
      client: {} as Client,
      tabTarifProduit: [],
      tabTarifExamens: [],
      tabExamen: [],
      prestations: [],
      tabProduit: [],
      tabClinique: [],
      tabEchographie: [],
      tabTarifEchographies: [],
      tabProduitFactureClient: [],
      tabPrestationFactureClient: [],
      tabEchographieFactureClient: [],
      tabExamenFactureClient: [],
      tabDemandeExamensClient: [],
      tabDemandeEchographiesClient: [],
    };

    return children(emptyData);
  }
}
