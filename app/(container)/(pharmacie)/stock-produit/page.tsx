"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import React from "react";
import {
  TarifProduit,
  Produit,
  Clinique,
  CommandeFournisseur,
  DetailCommande,
  Permission,
  TableName,
  User,
} from "@prisma/client";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  getAllTarifProduits,
  updateQuantiteStockTarifProduitByDetailCommande,
  updateTarifProduitByDetailCommandeAnnule,
} from "@/lib/actions/tarifProduitActions";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandeFournisseurDialog } from "@/components/CommandeFournisseurDialog";
import { DetailCommandeDialog } from "@/components/detailCommandeDialog";
import {
  createCommandeFournisseur,
  getAllCommandesFournisseur,
} from "@/lib/actions/commandeFournisseurActions";
import {
  createDetailCommande,
  deleteDetailCommande,
  getAllDetailCommande,
} from "@/lib/actions/detailCommandeActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Search, Trash2 } from "lucide-react";
import { getOneUser } from "@/lib/actions/authActions";
import { Badge } from "@/components/ui/badge";

export default function GestionStockProduitPage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [detailCommande, setDetailCommande] = useState<DetailCommande[]>([]);
  const [currentCommande, setCurrentCommande] =
    useState<CommandeFournisseur | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [recherche, setRecherche] = useState<string>("");
  const [selectedClinique, setSelectedClinique] = useState<string>("");

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "loading") return;

      setIsLoading(true);
      try {
        const [tarifs, produitsData, cliniquesData, commandesData, allDetails] =
          await Promise.all([
            getAllTarifProduits(),
            getAllProduits(),
            getAllClinique(),
            getAllCommandesFournisseur(),
            getAllDetailCommande(),
          ]);
        setListeTarifProduit(tarifs);
        setProduits(produitsData);
        setCliniques(cliniquesData);
        setDetailCommande(allDetails);

        let filteredCommandes = commandesData;
        if (prescripteur?.role !== "ADMIN") {
          const tabCliniquesUser = prescripteur?.idCliniques || [];
          filteredCommandes = commandesData.filter(
            (commande: { idClinique: string }) =>
              tabCliniquesUser.includes(commande.idClinique)
          );
        }
        setCommandes(filteredCommandes);
      } catch (error) {
        toast.error("Erreur lors du chargement des données.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [prescripteur?.role, prescripteur?.idCliniques, status]);

  // Filtrage et tri des tarifs
  useEffect(() => {
    const trierParTypeProduit = (tarifs: TarifProduit[]) => {
      const ordreTypes = ["CONTRACEPTIF", "MEDICAMENTS", "CONSOMMABLES"];

      return tarifs.sort((a, b) => {
        const produitA = produits.find((p) => p.id === a.idProduit);
        const produitB = produits.find((p) => p.id === b.idProduit);

        if (!produitA || !produitB) return 0;

        const indexA = ordreTypes.indexOf(produitA.typeProduit);
        const indexB = ordreTypes.indexOf(produitB.typeProduit);

        if (indexA !== indexB) {
          return indexA - indexB;
        }

        return produitA.nomProduit.localeCompare(produitB.nomProduit);
      });
    };

    let filtres = [...listeTarifProduit];

    // Filtrer par clinique (obligatoire)
    if (selectedClinique) {
      filtres = filtres.filter(
        (tarif) => tarif.idClinique === selectedClinique
      );
    }

    // Filtrer par recherche
    if (recherche.trim() !== "") {
      const terme = recherche.toLowerCase();
      filtres = filtres.filter((tarif) => {
        const produit = produits.find((p) => p.id === tarif.idProduit);
        const clinique = cliniques.find((c) => c.id === tarif.idClinique);
        return (
          produit?.nomProduit.toLowerCase().includes(terme) ||
          clinique?.nomClinique.toLowerCase().includes(terme) ||
          tarif.prixUnitaire.toString().includes(terme) ||
          tarif.quantiteStock.toString().includes(terme)
        );
      });
    }

    const triees = trierParTypeProduit(filtres);
    setTarifsFiltres(triees);
  }, [recherche, selectedClinique, listeTarifProduit, produits, cliniques]);

  useEffect(() => {
    if (!prescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(prescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.STOCK_PRODUIT
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [prescripteur]);

  const handleCreateCommande = async (data: Partial<CommandeFournisseur>) => {
    const dateISO =
      typeof data.dateCommande === "string"
        ? new Date(data.dateCommande)
        : data.dateCommande instanceof Date
        ? data.dateCommande
        : new Date();
    try {
      const uuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15);
      const nouvelleCommande = await createCommandeFournisseur({
        id: data.id && typeof data.id === "string" ? data.id : uuid,
        idClinique: data.idClinique || "",
        dateCommande: dateISO,
      });
      setCurrentCommande(nouvelleCommande);
      setCommandes((prev) => [...prev, nouvelleCommande]);
      toast.success("Commande créée avec succès!");
      return nouvelleCommande;
    } catch (error) {
      toast.error("Erreur lors de la création de la commande");
      console.error(error);
      return null;
    }
  };

  const handleAddDetailCommande = async (
    data: Partial<DetailCommande>,
    tarifProduit: TarifProduit
  ): Promise<void> => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un stock. Contactez un administrateur."
      );
      return;
    }
    if (!currentCommande) {
      toast.error("Aucune commande en cours.");
      return;
    }

    if (!data.idCommande) {
      data.idCommande = currentCommande.id;
    }

    const quantite =
      typeof data.quantiteCommandee === "number"
        ? data.quantiteCommandee
        : Number(data.quantiteCommandee);

    if (!quantite || isNaN(quantite)) {
      toast.error("Quantité commandée est requise et doit être un nombre.");
      return;
    }

    try {
      // Mettre à jour le stock
      await updateQuantiteStockTarifProduitByDetailCommande(
        tarifProduit.id,
        quantite
      );

      // Créer le détail de commande
      const uuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15);

      const nouveauDetail = await createDetailCommande({
        id: data.id && typeof data.id === "string" ? data.id : uuid,
        idTarifProduit: tarifProduit.id,
        quantiteCommandee: quantite,
        idCommande: data.idCommande || "",
        createdAt: new Date(),
        idUser: idUser,
        idClinique: selectedClinique || "",
        quantiteInitiale: tarifProduit.quantiteStock,
      });

      // Rafraîchir les données
      const [updatedTarifs, updatedDetails] = await Promise.all([
        getAllTarifProduits(),
        getAllDetailCommande(),
      ]);

      setListeTarifProduit(updatedTarifs);
      setDetailCommande(updatedDetails);

      toast.success("Produit ajouté à la commande!");
    } catch (error) {
      toast.error("Erreur lors de l'ajout du produit à la commande");
      console.error(error);
    }
  };

  const handleCommandeChange = (value: string) => {
    if (value === "none") {
      setCurrentCommande(null);
    } else {
      const selected = commandes.find((c) => c.id === value);
      setCurrentCommande(selected || null);
    }
  };

  const handleDelete = async (id: string) => {
    const idDetail = getIdDetail(id);
    if (!idDetail) {
      toast.error("Détail de commande introuvable.");
      return;
    }
    if (!permission?.canDelete && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer ce détail de commande. Contactez un administrateur."
      );
      return;
    }
    //  Confirmer la suppression
    if (
      !confirm("Êtes-vous sûr de vouloir supprimer ce détail de commande ?")
    ) {
      return;
    }

    try {
      // Mettre à jour le stock en soustrayant la quantité commandée
      await deleteDetailCommande(idDetail.id);
      await updateTarifProduitByDetailCommandeAnnule(
        idDetail.idTarifProduit,
        idDetail.quantiteCommandee
      );
      // Rafraîchir les données
      setDetailCommande((prev) =>
        prev.filter((detail) => detail.id !== idDetail.id)
      );
      setListeTarifProduit(
        listeTarifProduit.map((tp) => {
          if (tp.id === idDetail.idTarifProduit) {
            return {
              ...tp,
              quantiteStock: tp.quantiteStock - idDetail.quantiteCommandee,
            };
          }
          return tp;
        })
      );

      toast.success("Détail de commande supprimé avec succès!");
    } catch (error) {
      toast.error("Erreur lors de la suppression du détail de commande");
      console.error(error);
    }
  };

  const TableRowSkeleton = () => (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );

  // Filtrer les cliniques selon le rôle de l'utilisateur
  const cliniquesAccessibles =
    prescripteur?.role === "ADMIN"
      ? cliniques
      : cliniques.filter((clinique) =>
          prescripteur?.idCliniques.includes(clinique.id)
        );

  // Réinitialiser la commande en cours si elle ne correspond plus à la clinique sélectionnée
  useEffect(() => {
    if (currentCommande && currentCommande.idClinique !== selectedClinique) {
      setCurrentCommande(null);
    }
  }, [selectedClinique, currentCommande]);

  // Calculer la quantité commandée pour un produit
  const getQuantiteCommandee = (idTarifProduit: string) => {
    if (!currentCommande) return 0;

    // Filtrer les détails de commande pour la commande actuelle et le produit
    const details = detailCommande.filter(
      (detail) =>
        detail.idCommande === currentCommande.id &&
        detail.idTarifProduit === idTarifProduit
    );

    // Sommer toutes les quantités commandées pour ce produit
    const total = details.reduce(
      (sum, detail) => sum + detail.quantiteCommandee,
      0
    );

    return total;
  };
  const getIdDetail = (idTarifProduit: string) => {
    if (!currentCommande) return 0;

    // Filtrer les détails de commande pour la commande actuelle et le produit
    const details = detailCommande.find(
      (detail) =>
        detail.idCommande === currentCommande.id &&
        detail.idTarifProduit === idTarifProduit
    );

    return details;
  };

  if (status === "loading") {
    return (
      <div className="space-y-4 max-w-300 p-4 flex flex-col mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-300 p-4 flex flex-col mx-auto">
      <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
        <h1 className="text-2xl font-bold">Gestion des stocks produits</h1>
        <div className="flex gap-2 flex-col sm:flex-row md:flex-row items-center">
          <Select value={selectedClinique} onValueChange={setSelectedClinique}>
            <SelectTrigger className="w-40.5 min-w-40.5 bg-gray-50 truncate">
              <SelectValue placeholder="Sélectionner une clinique *" />
            </SelectTrigger>
            <SelectContent>
              {cliniquesAccessibles.map((clinique) => (
                <SelectItem key={clinique.id} value={clinique.id}>
                  {clinique.nomClinique}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CommandeFournisseurDialog
            cliniques={cliniquesAccessibles}
            onCreateCommande={handleCreateCommande}
          >
            <Button
              className="w-full sm:w-auto"
              disabled={
                !selectedClinique ||
                (!permission?.canCreate && prescripteur?.role !== "ADMIN")
              }
            >
              Commande Fournisseur
            </Button>
          </CommandeFournisseurDialog>
        </div>
      </div>

      {commandes && commandes.length > 0 && selectedClinique && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 flex-wrap">
            <Label
              htmlFor="select-commande"
              className="font-semibold text-blue-900 whitespace-nowrap"
            >
              Commande en cours :
            </Label>
            <Select
              value={currentCommande?.id || "none"}
              onValueChange={handleCommandeChange}
            >
              <SelectTrigger
                id="select-commande"
                className="w-full sm:w-87.5 bg-white"
              >
                <SelectValue placeholder="Sélectionnez une commande fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sélectionnez une commande fournisseur
                </SelectItem>
                {commandes
                  .filter((cmd) => cmd.idClinique === selectedClinique)
                  .map((commande) => {
                    const clinique = cliniques.find(
                      (c) => c.id === commande.idClinique
                    );
                    return (
                      <SelectItem key={commande.id} value={commande.id}>
                        {`${
                          clinique?.nomClinique || "Clinique inconnue"
                        } - ${new Date(
                          commande.dateCommande
                        ).toLocaleDateString("fr-FR")}`}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit, prix ou stock..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10"
        />
      </div>

      {!selectedClinique ? (
        <div className="bg-blue-50 border border-blue-200 p-8 rounded-lg text-center">
          <p className="text-blue-700 text-lg">
            Veuillez sélectionner une clinique pour afficher les stocks
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>N°</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell>Clinique</TableCell>
                <TableCell>Prix unitaire</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Qté commandée</TableCell>
                <TableCell className="text-center">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : tarifsFiltres.length ? (
                (() => {
                  let currentType = "";
                  let globalIndex = 0;

                  return tarifsFiltres.map((item) => {
                    const produit = produits.find(
                      (p) => p.id === item.idProduit
                    );
                    const clinique = cliniques.find(
                      (c) => c.id === item.idClinique
                    );

                    const showTypeHeader =
                      produit && produit.typeProduit !== currentType;
                    if (showTypeHeader) {
                      currentType = produit.typeProduit;
                    }

                    globalIndex++;

                    const typeLabels: Record<string, string> = {
                      CONTRACEPTIF: "Contraceptifs",
                      MEDICAMENTS: "Médicaments",
                      CONSOMMABLES: "Consommables",
                    };

                    const qteCommandee = getQuantiteCommandee(item.id);
                    const idDetail = getQuantiteCommandee(item.id);

                    return (
                      <React.Fragment key={item.id}>
                        {showTypeHeader && (
                          <TableRow className="bg-blue-50 hover:bg-blue-50">
                            <TableCell
                              colSpan={7}
                              className="font-semibold text-blue-700"
                            >
                              {typeLabels[currentType] || currentType}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell>{globalIndex}</TableCell>
                          <TableCell>{produit?.nomProduit}</TableCell>
                          <TableCell>{clinique?.nomClinique}</TableCell>
                          <TableCell>{item.prixUnitaire} Fcfa</TableCell>
                          <TableCell>
                            <span
                              className={
                                item.quantiteStock > 10
                                  ? ""
                                  : "text-red-600 font-black"
                              }
                            >
                              {item.quantiteStock}
                            </span>{" "}
                          </TableCell>
                          <TableCell className="text-center">
                            {qteCommandee > 0 ? (
                              <span className="font-medium text-green-700 bg-green-50 py-1 rounded-full">
                                <Badge
                                  className="h-5 min-w-5 bg-green-600 rounded-full px-1 font-mono tabular-nums"
                                  // variant=""
                                >
                                  {qteCommandee}
                                </Badge>
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                <Badge
                                  className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                                  variant="secondary"
                                >
                                  --
                                </Badge>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center items-center">
                              {currentCommande ? (
                                <DetailCommandeDialog
                                  tarifProduit={item}
                                  idCommande={currentCommande.id}
                                  onAddDetail={handleAddDetailCommande}
                                >
                                  <Button
                                    variant="outline"
                                    className={
                                      qteCommandee > 0
                                        ? "opacity-50 cursor-not-allowed bg-green-600 w-30.5"
                                        : "w-30.5"
                                    }
                                    size="sm"
                                    disabled={
                                      (!permission?.canCreate &&
                                        prescripteur?.role !== "ADMIN") ||
                                      qteCommandee > 0
                                    }
                                  >
                                    {qteCommandee > 0
                                      ? "Déjà ajouté"
                                      : "Ajouter produits"}
                                  </Button>
                                </DetailCommandeDialog>
                              ) : (
                                <Button variant="outline" size="sm" disabled>
                                  Créez une commande
                                </Button>
                              )}
                              {qteCommandee > 0 && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className={
                                    permission?.canDelete ||
                                    prescripteur?.role === "ADMIN"
                                      ? ""
                                      : "p-2 hidden"
                                  }
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2
                                    className={qteCommandee > 0 ? "" : "hidden"}
                                  />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  });
                })()
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {recherche
                      ? "Aucun produit trouvé."
                      : "Aucun tarif produit trouvé."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
