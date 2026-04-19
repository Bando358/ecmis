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
  TableHead,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import React from "react";
import {
  TarifProduit,
  Produit,
  Clinique,
  CommandeFournisseur,
  DetailCommande,
  TableName,
} from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  getAllTarifProduits,
  updateQuantiteStockTarifProduitByDetailCommande,
  updateTarifProduitByDetailCommandeAnnule,
} from "@/lib/actions/tarifProduitActions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import {
  Search,
  Trash2,
  Loader2,
  PackagePlus,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { getOneUser } from "@/lib/actions/authActions";
import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, { label: string; color: string }> = {
  CONTRACEPTIF: {
    label: "Contraceptifs",
    color: "bg-pink-50 text-pink-700 border-pink-200",
  },
  MEDICAMENTS: {
    label: "Médicaments",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CONSOMMABLES: {
    label: "Consommables",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

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
  const [prescripteur, setPrescripteur] = useState<SafeUser>();
  const [recherche, setRecherche] = useState<string>("");
  const [selectedClinique, setSelectedClinique] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";
  const {
    canCreate,
    canDelete,
    canRead,
    isLoading: isLoadingPermissions,
  } = usePermissionContext();
  const router = useRouter();

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

    if (selectedClinique) {
      filtres = filtres.filter(
        (tarif) => tarif.idClinique === selectedClinique
      );
    }

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
    setCurrentPage(1);
  }, [recherche, selectedClinique, listeTarifProduit, produits, cliniques]);

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
    if (!canCreate(TableName.STOCK_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
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
      const uuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15);

      const detailId = data.id && typeof data.id === "string" ? data.id : uuid;

      // Exécuter les 2 opérations DB en parallèle (indépendantes)
      const [, nouveauDetail] = await Promise.all([
        updateQuantiteStockTarifProduitByDetailCommande(tarifProduit.id, quantite),
        createDetailCommande({
          id: detailId,
          idTarifProduit: tarifProduit.id,
          quantiteCommandee: quantite,
          idCommande: data.idCommande || "",
          createdAt: new Date(),
          idUser: idUser,
          idClinique: selectedClinique || "",
          quantiteInitiale: tarifProduit.quantiteStock,
        }),
      ]);

      // Mise à jour optimiste locale (pas de refetch DB)
      setListeTarifProduit((prev) =>
        prev.map((t) =>
          t.id === tarifProduit.id
            ? { ...t, quantiteStock: t.quantiteStock + quantite }
            : t,
        ),
      );
      setDetailCommande((prev) => [nouveauDetail, ...prev]);

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
    if (!canDelete(TableName.STOCK_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    if (
      !confirm("Êtes-vous sûr de vouloir supprimer ce détail de commande ?")
    ) {
      return;
    }

    try {
      await deleteDetailCommande(idDetail.id);
      await updateTarifProduitByDetailCommandeAnnule(
        idDetail.idTarifProduit,
        idDetail.quantiteCommandee
      );
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

  const cliniquesAccessibles =
    prescripteur?.role === "ADMIN"
      ? cliniques
      : cliniques.filter((clinique) =>
          prescripteur?.idCliniques.includes(clinique.id)
        );

  // Auto-sélection pour les utilisateurs avec une seule clinique
  useEffect(() => {
    if (cliniquesAccessibles.length === 1 && !selectedClinique) {
      setSelectedClinique(cliniquesAccessibles[0].id);
    }
  }, [cliniquesAccessibles, selectedClinique]);

  useEffect(() => {
    if (currentCommande && currentCommande.idClinique !== selectedClinique) {
      setCurrentCommande(null);
    }
  }, [selectedClinique, currentCommande]);

  const getQuantiteCommandee = (idTarifProduit: string) => {
    if (!currentCommande) return 0;

    const details = detailCommande.filter(
      (detail) =>
        detail.idCommande === currentCommande.id &&
        detail.idTarifProduit === idTarifProduit
    );

    const total = details.reduce(
      (sum, detail) => sum + detail.quantiteCommandee,
      0
    );

    return total;
  };

  const getIdDetail = (idTarifProduit: string) => {
    if (!currentCommande) return 0;

    const details = detailCommande.find(
      (detail) =>
        detail.idCommande === currentCommande.id &&
        detail.idTarifProduit === idTarifProduit
    );

    return details;
  };

  // Pagination
  const paginatedTarifs = tarifsFiltres.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(tarifsFiltres.length / itemsPerPage);

  // Stats
  const stockStats = {
    totalProduits: tarifsFiltres.length,
    enRupture: tarifsFiltres.filter((t) => t.quantiteStock === 0).length,
    stockFaible: tarifsFiltres.filter(
      (t) => t.quantiteStock > 0 && t.quantiteStock <= 10
    ).length,
    stockOk: tarifsFiltres.filter((t) => t.quantiteStock > 10).length,
  };

  if (isLoadingPermissions || status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!canRead(TableName.STOCK_PRODUIT)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Gestion des Stocks
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gérez les stocks et passez vos commandes fournisseur
          </p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row items-stretch sm:items-center">
          {cliniquesAccessibles.length > 1 ? (
            <Select value={selectedClinique} onValueChange={setSelectedClinique}>
              <SelectTrigger className="w-full sm:w-56 text-sm">
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
          ) : cliniquesAccessibles.length === 1 ? (
            <Badge variant="secondary" className="text-sm font-medium px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"><Building2 className="h-3.5 w-3.5" />{cliniquesAccessibles[0].nomClinique}</Badge>
          ) : null}
          <CommandeFournisseurDialog
            cliniques={cliniquesAccessibles}
            onCreateCommande={handleCreateCommande}
          >
            <Button
              className="w-full sm:w-auto"
              disabled={
                !selectedClinique || !canCreate(TableName.STOCK_PRODUIT)
              }
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              Commande Fournisseur
            </Button>
          </CommandeFournisseurDialog>
        </div>
      </div>

      {/* Stats (visible seulement quand clinique sélectionnée) */}
      {selectedClinique && !isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <Warehouse className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{stockStats.totalProduits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Warehouse className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock OK</p>
                  <p className="text-xl font-bold text-green-600">
                    {stockStats.stockOk}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Warehouse className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock faible</p>
                  <p className="text-xl font-bold text-amber-600">
                    {stockStats.stockFaible}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2">
                  <Warehouse className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">En rupture</p>
                  <p className="text-xl font-bold text-red-600">
                    {stockStats.enRupture}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Commande en cours */}
      {commandes && commandes.length > 0 && selectedClinique && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Label
                htmlFor="select-commande"
                className="font-semibold text-blue-900 whitespace-nowrap text-sm"
              >
                Commande en cours :
              </Label>
              <Select
                value={currentCommande?.id || "none"}
                onValueChange={handleCommandeChange}
              >
                <SelectTrigger
                  id="select-commande"
                  className="w-full sm:w-80 bg-white text-sm"
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
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit, prix ou stock..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {!selectedClinique ? (
        <Card>
          <CardContent className="py-12 sm:py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-blue-50 flex items-center justify-center mb-3 sm:mb-4">
                <Warehouse className="h-8 w-8 sm:h-12 sm:w-12 text-blue-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-blue-900">
                Sélectionnez une clinique
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Veuillez sélectionner une clinique pour afficher les stocks
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              État des stocks
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {tarifsFiltres.length} produit(s) trouvé(s)
              {recherche && ` pour "${recherche}"`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 md:p-6">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Clinique</TableHead>
                    <TableHead>Prix unitaire</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Qté commandée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            ) : tarifsFiltres.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm w-12">
                        N°
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        Produit
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        Clinique
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        Prix unitaire
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">
                        Stock
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-center">
                        Qté commandée
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      let currentType = "";
                      let globalIndex = (currentPage - 1) * itemsPerPage;

                      return paginatedTarifs.map((item) => {
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

                        const qteCommandee = getQuantiteCommandee(item.id);

                        return (
                          <React.Fragment key={item.id}>
                            {showTypeHeader && (
                              <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableCell
                                  colSpan={7}
                                  className="font-semibold text-slate-700 text-xs sm:text-sm"
                                >
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      typeLabels[currentType]?.color ||
                                      "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {typeLabels[currentType]?.label ||
                                      currentType}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow>
                              <TableCell className="text-xs sm:text-sm">
                                {globalIndex}
                              </TableCell>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                {produit?.nomProduit}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {clinique?.nomClinique}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {item.prixUnitaire.toLocaleString("fr-FR")}{" "}
                                Fcfa
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium ${
                                    item.quantiteStock > 10
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : item.quantiteStock > 0
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {item.quantiteStock}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {qteCommandee > 0 ? (
                                  <Badge className="h-5 min-w-5 bg-green-600 rounded-full px-2 font-mono tabular-nums text-xs">
                                    {qteCommandee}
                                  </Badge>
                                ) : (
                                  <Badge
                                    className="h-5 min-w-5 rounded-full px-2 font-mono tabular-nums text-xs"
                                    variant="secondary"
                                  >
                                    --
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex gap-2 justify-center items-center">
                                  {currentCommande ? (
                                    <DetailCommandeDialog
                                      tarifProduit={item}
                                      nomProduit={produit?.nomProduit || ""}
                                      idCommande={currentCommande.id}
                                      onAddDetail={handleAddDetailCommande}
                                    >
                                      <Button
                                        variant="outline"
                                        className={`text-xs ${
                                          qteCommandee > 0
                                            ? "opacity-50 cursor-not-allowed bg-green-50"
                                            : ""
                                        }`}
                                        size="sm"
                                        disabled={
                                          !canCreate(
                                            TableName.STOCK_PRODUIT
                                          ) || qteCommandee > 0
                                        }
                                      >
                                        {qteCommandee > 0
                                          ? "Déjà ajouté"
                                          : "Ajouter"}
                                      </Button>
                                    </DetailCommandeDialog>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="text-xs"
                                    >
                                      Créez une commande
                                    </Button>
                                  )}
                                  {qteCommandee > 0 &&
                                    canDelete(TableName.STOCK_PRODUIT) && (
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDelete(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center mb-3 sm:mb-4">
                  <Search className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  Aucun produit trouvé
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {recherche
                    ? "Aucun produit trouvé pour votre recherche."
                    : "Aucun tarif produit trouvé pour cette clinique."}
                </p>
              </div>
            )}

            {/* Pagination */}
            {tarifsFiltres.length > 0 && !isLoading && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 px-2 py-3 sm:py-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    Lignes par page:
                  </Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-17.5 h-8 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages} (
                    {tarifsFiltres.length} résultat
                    {tarifsFiltres.length > 1 ? "s" : ""})
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="flex-1 sm:flex-none text-xs sm:text-sm"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Précédent</span>
                      <span className="sm:hidden">Préc.</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1)
                        )
                      }
                      disabled={currentPage >= totalPages}
                      className="flex-1 sm:flex-none text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Suivant</span>
                      <span className="sm:hidden">Suiv.</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
