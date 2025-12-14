// tableVisite.tsx
"use client";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { FacturePrestation, FactureProduit, Visite } from "@prisma/client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllFactureProduitByIdVisiteByData } from "@/lib/actions/factureProduitActions";
import { getAllFacturePrestationByIdVisiteByData } from "@/lib/actions/facturePrestationActions";
import { Skeleton } from "@/components/ui/skeleton"; // Assurez-vous d'importer Skeleton

export function Table04({ id }: { id: string }) {
  const [data, setData] = useState<Visite[]>([]);
  const [tabPrestation, setTabPrestation] = useState<FacturePrestation[]>([]);
  const [tabFactureProduits, setTabFactureProduits] = useState<
    FactureProduit[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // 1. Récupérer les visites du client
        const tab = await getAllVisiteByIdClient(id);
        setData(tab);

        // 2. Préparer les idVisite
        const tabId = tab.map((visite: Visite) => ({
          idVisite: visite.id,
        }));

        // 3. Récupérer toutes les factures liées
        const [tabFacture, tabFacturePrestation] = await Promise.all([
          getAllFactureProduitByIdVisiteByData(tabId),
          getAllFacturePrestationByIdVisiteByData(tabId),
        ]);

        setTabFactureProduits(tabFacture);
        setTabPrestation(tabFacturePrestation);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fonction pour calculer le total des produits pour une visite
  const calculateProduitsTotal = (visiteId: string) => {
    return tabFactureProduits.reduce((acc, curr) => {
      if (curr.idVisite === visiteId) {
        acc += curr.montantProduit;
      }
      return acc;
    }, 0);
  };

  // Fonction pour calculer le total des prestations pour une visite
  const calculatePrestationsTotal = (visiteId: string) => {
    return tabPrestation.reduce((acc, curr) => {
      if (curr.idVisite === visiteId) {
        acc += curr.prixPrestation;
      }
      return acc;
    }, 0);
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {data.length === 0 && !loading
          ? "Aucune Facture"
          : "Liste des Factures du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Visites</TableHead>
          <TableHead>Produits</TableHead>
          <TableHead>Prestations</TableHead>
          <TableHead>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? // Affichage du squelette pendant le chargement
            Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16" />
                </TableCell>
              </TableRow>
            ))
          : // Affichage des données une fois chargées
            data.map((d) => {
              const produitsTotal = calculateProduitsTotal(d.id);
              const prestationsTotal = calculatePrestationsTotal(d.id);
              const total = produitsTotal + prestationsTotal;

              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.dateVisite.toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="font-bold">
                    {produitsTotal} FCFA
                  </TableCell>
                  <TableCell className="font-bold">
                    {prestationsTotal} FCFA
                  </TableCell>
                  <TableCell className="font-bold">{total} FCFA</TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}
