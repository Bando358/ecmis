import { ClientData } from "@/components/rapportPfActions";
import { FactureProduit, Produit, TarifProduit } from "@prisma/client";

export const countProduitByOldSync = (
  clientData: ClientData[],
  minAge: number,
  maxAge: number,
  methodePrise: boolean,
  produitName: string,
  statut: string,
  // Nouvelles données nécessaires passées en paramètres
  allProduits: Produit[],
  allTarifProduits: TarifProduit[],
  allFactureProduits: FactureProduit[],
  getFacturesByVisiteId: (idVisite: string) => FactureProduit[]
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Vérification des nouvelles données nécessaires
  if (
    !Array.isArray(allProduits) ||
    !Array.isArray(allTarifProduits) ||
    !Array.isArray(allFactureProduits)
  ) {
    console.warn("Données produits/tarifs/factures manquantes ou invalides.");
    return 0;
  }

  // Filtrer les clients par âge et statut
  const clients = clientData.filter((client) => {
    const ageCondition = client.age >= minAge && client.age <= maxAge;
    const statutCondition =
      typeof client.statut === "string" &&
      client.statut.trim().toLowerCase() === statut.trim().toLowerCase();

    return ageCondition && statutCondition;
  });

  if (clients.length === 0) {
    return 0;
  }

  // Trouver le produit par son nom (synchrone)
  const produit = allProduits.find(
    (p) =>
      p.nomProduit?.trim().toLowerCase() === produitName.trim().toLowerCase()
  );

  if (!produit) {
    console.warn(`Produit "${produitName}" non trouvé.`);
    return 0;
  }

  let count = 0;

  // Parcourir tous les clients filtrés
  for (const client of clients) {
    // Récupérer toutes les factures produits pour ce client (synchrone)
    const facturesClient = getFacturesByVisiteId(client.idVisite);

    // Filtrer par méthode si nécessaire
    const facturesFiltrees = methodePrise
      ? facturesClient.filter((facture) => facture.methode === true)
      : facturesClient;

    // Compter les produits correspondants
    for (const facture of facturesFiltrees) {
      const tarifProduit = allTarifProduits.find(
        (p) => p.id === facture.idTarifProduit
      );
      const produitFacture = allProduits.find(
        (p) => p.id === tarifProduit?.idProduit
      );

      if (produitFacture?.id === produit.id) {
        count += facture.quantite || 0;
      }
    }
  }

  return count;
};
