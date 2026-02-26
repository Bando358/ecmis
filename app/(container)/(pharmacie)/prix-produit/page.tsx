"use client";

import React from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  TarifProduit,
  Produit,
  Clinique,
  TableName,
} from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  createTarifProduit,
  deleteTarifProduit,
  getAllTarifProduits,
  updateTarifProduit,
} from "@/lib/actions/tarifProduitActions";
import {
  Pencil,
  Trash2,
  Search,
  Loader2,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import TarifProduitDialog from "@/components/tarifProduitDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getOneUser } from "@/lib/actions/authActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { useRouter } from "next/navigation";

const typeLabels: Record<string, { label: string; color: string }> = {
  CONTRACEPTIF: {
    label: "Contraceptif",
    color: "bg-pink-50 text-pink-700 border-pink-200",
  },
  MEDICAMENTS: {
    label: "Médicament",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CONSOMMABLES: {
    label: "Consommable",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export default function PrixProduitPage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [user, setUser] = useState<SafeUser | null>(null);
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTarif, setEditingTarif] = useState<TarifProduit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUpdatingTrue, setIsUpdatingTrue] = useState(false);
  const [recherche, setRecherche] = useState<string>("");
  const [selectedClinique, setSelectedClinique] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";
  const {
    canCreate,
    canUpdate,
    canDelete,
    canRead,
    isLoading: isLoadingPermissions,
  } = usePermissionContext();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getOneUser(idUser);
      setUser(user!);
    };
    fetchUser();
  }, [idUser]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [tarifs, produitsData, cliniquesData] = await Promise.all([
          getAllTarifProduits(),
          getAllProduits(),
          getAllClinique(),
        ]);
        setListeTarifProduit(tarifs);
        setTarifsFiltres(tarifs);
        setProduits(produitsData);
        setCliniques(cliniquesData);
      } catch (error) {
        console.error("Erreur chargement données :", error);
        toast.error("Erreur lors du chargement des données.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
          tarif.prixUnitaire.toString().includes(terme)
        );
      });
    }

    const triees = trierParTypeProduit(filtres);
    setTarifsFiltres(triees);
    setCurrentPage(1);
  }, [recherche, selectedClinique, listeTarifProduit, produits, cliniques]);

  const onSubmit = async (data: TarifProduit) => {
    if (!canCreate(TableName.TARIF_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    try {
      if (editingTarif) {
        await updateTarifProduit(editingTarif.id, { ...data, idUser });
        toast.success("Tarif produit mis à jour !");
      } else {
        await createTarifProduit({ ...data, idUser });
        toast.success("Tarif produit créé !");
      }
      const updated = await getAllTarifProduits();
      setListeTarifProduit(updated);
      setDialogOpen(false);
      setEditingTarif(null);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde.");
      console.error("Erreur lors de la sauvegarde :", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete(TableName.TARIF_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      if (!confirm("Confirmer la suppression de ce tarif ?")) return;
      await deleteTarifProduit(id);
      setListeTarifProduit((prev) => prev.filter((p) => p.id !== id));
      toast.success("Tarif supprimé !");
    } catch {
      toast.error("Erreur suppression.");
    }
  };

  const handleEdit = (tarif: TarifProduit) => {
    setIsUpdatingTrue(true);
    setEditingTarif(tarif);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTarif(null);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingTarif(null);
  };

  const produitsDisponibles = produits.filter((produit) => {
    if (editingTarif && editingTarif.idProduit === produit.id) {
      return true;
    }
    const aTarifExistant = listeTarifProduit.some(
      (tarif) =>
        tarif.idProduit === produit.id && tarif.idClinique === selectedClinique
    );
    return !aTarifExistant;
  });

  const cliniquesAccessibles =
    user?.role === "ADMIN"
      ? cliniques
      : cliniques.filter((clinique) => user?.idCliniques.includes(clinique.id));

  // Pagination
  const paginatedTarifs = tarifsFiltres.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(tarifsFiltres.length / itemsPerPage);

  const TableRowSkeleton = () => (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );

  if (isLoadingPermissions)
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (!canRead(TableName.TARIF_PRODUIT)) {
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
            Tarification des Produits
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gérez les prix unitaires par clinique et par produit
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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
          {canCreate(TableName.TARIF_PRODUIT) && (
            <Button
              onClick={handleCreate}
              className="w-full sm:w-auto"
              disabled={!selectedClinique}
            >
              <Tag className="mr-2 h-4 w-4" />
              Ajouter un tarif
            </Button>
          )}
        </div>
      </div>

      <TarifProduitDialog
        produits={produitsDisponibles}
        cliniques={cliniquesAccessibles}
        isUpdating={!!editingTarif}
        initialData={editingTarif || undefined}
        onSubmit={onSubmit}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit, une clinique ou un prix..."
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
                <Tag className="h-8 w-8 sm:h-12 sm:w-12 text-blue-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-blue-900">
                Sélectionnez une clinique
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Veuillez sélectionner une clinique pour afficher les tarifs
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              Liste des tarifs
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {tarifsFiltres.length} tarif(s) trouvé(s)
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
                    <TableHead>Type</TableHead>
                    <TableHead>Clinique</TableHead>
                    <TableHead>Prix unitaire</TableHead>
                    <TableHead>Stock</TableHead>
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
                        Type
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
                      <TableHead className="text-xs sm:text-sm text-right">
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

                        const typeInfo = produit
                          ? typeLabels[produit.typeProduit] || {
                              label: produit.typeProduit,
                              color:
                                "bg-gray-50 text-gray-700 border-gray-200",
                            }
                          : {
                              label: "Inconnu",
                              color:
                                "bg-gray-50 text-gray-700 border-gray-200",
                            };

                        return (
                          <React.Fragment key={item.id}>
                            {showTypeHeader && (
                              <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableCell
                                  colSpan={7}
                                  className="font-semibold text-slate-700 text-xs sm:text-sm"
                                >
                                  {typeLabels[currentType]?.label ||
                                    currentType}
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
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] sm:text-xs ${typeInfo.color}`}
                                >
                                  {typeInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {clinique?.nomClinique}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm font-medium">
                                {item.prixUnitaire.toLocaleString("fr-FR")}{" "}
                                Fcfa
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <span
                                  className={
                                    item.quantiteStock > 10
                                      ? "text-green-600 font-medium"
                                      : item.quantiteStock > 0
                                      ? "text-amber-600 font-medium"
                                      : "text-red-600 font-bold"
                                  }
                                >
                                  {item.quantiteStock}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  {canUpdate(TableName.TARIF_PRODUIT) && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Pencil className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  )}
                                  {canDelete(TableName.TARIF_PRODUIT) && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Supprimer ce tarif ?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Cette action est irréversible.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Annuler
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-red-600 text-white"
                                            onClick={() =>
                                              handleDelete(item.id)
                                            }
                                          >
                                            Supprimer
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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
                  Aucun tarif trouvé
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {recherche
                    ? "Aucun tarif ne correspond à votre recherche."
                    : "Aucun tarif produit pour cette clinique."}
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
