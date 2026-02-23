import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllTarifProduitsByIdClinique } from "@/lib/actions/tarifProduitActions";
import { getAllTarifExamenByClinique } from "@/lib/actions/tarifExamenActions";
import { getAllExamen } from "@/lib/actions/examenActions";
import { getAllPrestation } from "@/lib/actions/prestationActions";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllTarifPrestationByClinique } from "@/lib/actions/tarifPrestationActions";
import { getOneClinique } from "@/lib/actions/cliniqueActions";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import { getAllTarifEchographieByClinique } from "@/lib/actions/tarifEchographieActions";
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
  TarifPrestation,
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
    clinique: Clinique | null;
    tabEchographie: Echographie[];
    tabTarifEchographies: TarifEchographie[];
    tabTarifPrestations: TarifPrestation[];
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
    // Phase 1 : Client + Visites en parallèle → obtenir idClinique
    const [clientResult, visitesResult] = await Promise.all([
      getOneClient(pharmacyId),
      getAllVisiteByIdClient(pharmacyId),
    ]);

    const client = clientResult as Client;
    const idClinique = client?.idClinique || "";

    // Phase 2 : Requêtes restantes en parallèle, tarifs filtrés par clinique
    const [
      tarifProduitsResult,
      tarifExamensResult,
      examensResult,
      prestationsResult,
      produitsResult,
      cliniqueResult,
      echographiesResult,
      tarifEchographiesResult,
      tarifPrestationsResult,
      tabProduitFactureClient,
      tabPrestationFactureClient,
      tabEchographieFactureClient,
      tabExamenFactureClient,
      tabDemandeExamensClient,
      tabDemandeEchographiesClient,
    ] = await Promise.all([
      getAllTarifProduitsByIdClinique(idClinique),
      getAllTarifExamenByClinique(idClinique),
      getAllExamen(),
      getAllPrestation(),
      getAllProduits(),
      getOneClinique(idClinique),
      getAllEchographies(),
      getAllTarifEchographieByClinique(idClinique),
      getAllTarifPrestationByClinique(idClinique),
      getAllFactureProduitByIdClient(pharmacyId),
      getAllFacturePrestationByIdClient(pharmacyId),
      getAllFactureEchographieByIdClient(pharmacyId),
      getAllFactureExamenByIdClient(pharmacyId),
      getAllDemandeExamensByIdClient(pharmacyId),
      getAllDemandeEchographiesByIdClient(pharmacyId),
    ]);

    const data = {
      visites: visitesResult as Visite[],
      client,
      tabTarifProduit: tarifProduitsResult as TarifProduit[],
      tabTarifExamens: tarifExamensResult as TarifExamen[],
      tabExamen: examensResult as Examen[],
      prestations: prestationsResult as Prestation[],
      tabProduit: produitsResult as Produit[],
      clinique: cliniqueResult as Clinique | null,
      tabEchographie: echographiesResult as Echographie[],
      tabTarifEchographies: tarifEchographiesResult as TarifEchographie[],
      tabTarifPrestations: tarifPrestationsResult as TarifPrestation[],
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

    const emptyData = {
      visites: [],
      client: {} as Client,
      tabTarifProduit: [],
      tabTarifExamens: [],
      tabExamen: [],
      prestations: [],
      tabProduit: [],
      clinique: null,
      tabEchographie: [],
      tabTarifEchographies: [],
      tabTarifPrestations: [],
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
