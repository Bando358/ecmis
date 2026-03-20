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

// Wrapper pour isoler les erreurs par requête : une requête qui échoue
// ne fait plus échouer les 16 autres (problème principal avec Promise.all)
async function safe<T>(fn: Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn;
  } catch (error) {
    console.error("FichePharmacyServer query failed:", error);
    return fallback;
  }
}

export default async function FichePharmacyServer({
  pharmacyId,
  children,
}: FichePharmacyServerProps) {
  // Phase 1 : Client (critique) + requêtes indépendantes en parallèle
  // Chaque requête est isolée : un échec individuel retourne un fallback
  const [
    clientResult,
    visitesResult,
    examensResult,
    prestationsResult,
    produitsResult,
    echographiesResult,
    tabProduitFactureClient,
    tabPrestationFactureClient,
    tabEchographieFactureClient,
    tabExamenFactureClient,
    tabDemandeExamensClient,
    tabDemandeEchographiesClient,
  ] = await Promise.all([
    safe(getOneClient(pharmacyId), null),
    safe(getAllVisiteByIdClient(pharmacyId), []),
    safe(getAllExamen(), []),
    safe(getAllPrestation(), []),
    safe(getAllProduits(), []),
    safe(getAllEchographies(), []),
    safe(getAllFactureProduitByIdClient(pharmacyId), []),
    safe(getAllFacturePrestationByIdClient(pharmacyId), []),
    safe(getAllFactureEchographieByIdClient(pharmacyId), []),
    safe(getAllFactureExamenByIdClient(pharmacyId), []),
    safe(getAllDemandeExamensByIdClient(pharmacyId), []),
    safe(getAllDemandeEchographiesByIdClient(pharmacyId), []),
  ]);

  const client = (clientResult ?? {}) as Client;
  const idClinique = client?.idClinique || "";

  // Phase 2 : Requêtes dépendant de idClinique (aussi isolées)
  const [
    tarifProduitsResult,
    tarifExamensResult,
    cliniqueResult,
    tarifEchographiesResult,
    tarifPrestationsResult,
  ] = await Promise.all([
    safe(getAllTarifProduitsByIdClinique(idClinique), []),
    safe(getAllTarifExamenByClinique(idClinique), []),
    safe(getOneClinique(idClinique), null),
    safe(getAllTarifEchographieByClinique(idClinique), []),
    safe(getAllTarifPrestationByClinique(idClinique), []),
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
}
