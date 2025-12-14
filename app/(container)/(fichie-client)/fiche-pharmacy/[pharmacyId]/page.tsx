import { use } from "react";
import FichePharmacyServer from "./FichePharmacyServer";
import FichePharmacyClient from "./FichePharmacy";
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

interface FichePharmacyServerData {
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
}

// Composant principal qui utilise le serveur component
export default function FichePharmacy({
  params,
}: {
  params: Promise<{ pharmacyId: string }>;
}) {
  const { pharmacyId } = use(params);

  return (
    <FichePharmacyServer pharmacyId={pharmacyId}>
      {(serverData: FichePharmacyServerData) => (
        <FichePharmacyClient params={params} serverData={serverData} />
      )}
    </FichePharmacyServer>
  );
}
