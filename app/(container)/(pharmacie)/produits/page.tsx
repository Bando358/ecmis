"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Produit, TableName } from "@prisma/client";
import {
  createProduit,
  deleteProduit,
  getAllProduits,
  updateProduit,
} from "@/lib/actions/produitActions";
import {
  Trash2,
  Search,
  Loader2,
  Package,
  Pill,
  Syringe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ProduitDialog from "@/components/produitDialog";
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

export default function ProduitPage() {
  const [listeProduits, setListeProduits] = useState<Produit[]>([]);
  const [produitsFiltres, setProduitsFiltres] = useState<Produit[]>([]);
  const [recherche, setRecherche] = useState<string>("");
  const [filtreType, setFiltreType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const {
    canCreate,
    canUpdate,
    canDelete,
    canRead,
    isLoading: isLoadingPermissions,
  } = usePermissionContext();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const produits = await getAllProduits();
      setListeProduits(produits);
      setProduitsFiltres(produits);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...listeProduits];

    if (filtreType !== "all") {
      filtered = filtered.filter((p) => p.typeProduit === filtreType);
    }

    if (recherche.trim() !== "") {
      const terme = recherche.toLowerCase();
      filtered = filtered.filter(
        (produit) =>
          produit.nomProduit.toLowerCase().includes(terme) ||
          produit.typeProduit.toLowerCase().includes(terme) ||
          produit.description?.toLowerCase().includes(terme)
      );
    }

    // Tri par type puis par nom
    const ordreTypes = ["CONTRACEPTIF", "MEDICAMENTS", "CONSOMMABLES"];
    filtered.sort((a, b) => {
      const indexA = ordreTypes.indexOf(a.typeProduit);
      const indexB = ordreTypes.indexOf(b.typeProduit);
      if (indexA !== indexB) return indexA - indexB;
      return a.nomProduit.localeCompare(b.nomProduit);
    });

    setProduitsFiltres(filtered);
    setCurrentPage(1);
  }, [recherche, filtreType, listeProduits]);

  const handleCreateProduit = async (data: Produit) => {
    if (!canCreate(TableName.PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    try {
      await createProduit(data);
      const updatedList = await getAllProduits();
      setListeProduits(updatedList);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateProduit = async (data: Produit) => {
    if (!canUpdate(TableName.PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
    try {
      await updateProduit(data.id, data);
      const updatedList = await getAllProduits();
      setListeProduits(updatedList);
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete(TableName.PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteProduit(id);
      setListeProduits((prev) => prev.filter((p) => p.id !== id));
      toast.success("Produit supprimé avec succès!");
    } catch (error) {
      toast.error("Erreur lors de la suppression du produit.");
      console.error(error);
    }
  };

  // Stats
  const stats = {
    total: listeProduits.length,
    contraceptifs: listeProduits.filter((p) => p.typeProduit === "CONTRACEPTIF")
      .length,
    medicaments: listeProduits.filter((p) => p.typeProduit === "MEDICAMENTS")
      .length,
    consommables: listeProduits.filter((p) => p.typeProduit === "CONSOMMABLES")
      .length,
  };

  // Pagination
  const paginatedProduits = produitsFiltres.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(produitsFiltres.length / itemsPerPage);

  if (isLoadingPermissions)
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (!canRead(TableName.PRODUIT)) {
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
            Gestion des Produits
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gérez le catalogue des produits pharmaceutiques
          </p>
        </div>
        {canCreate(TableName.PRODUIT) && (
          <ProduitDialog onSubmit={handleCreateProduit}>
            <Button>
              <Package className="mr-2 h-4 w-4" />
              Ajouter un produit
            </Button>
          </ProduitDialog>
        )}
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-100 p-2">
                <Pill className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contraceptifs</p>
                <p className="text-xl font-bold">{stats.contraceptifs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Syringe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Médicaments</p>
                <p className="text-xl font-bold">{stats.medicaments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Consommables</p>
                <p className="text-xl font-bold">{stats.consommables}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-col md:flex-row gap-2 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            <div className="w-full sm:w-full md:w-56">
              <Select value={filtreType} onValueChange={setFiltreType}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="CONTRACEPTIF">Contraceptifs</SelectItem>
                  <SelectItem value="MEDICAMENTS">Médicaments</SelectItem>
                  <SelectItem value="CONSOMMABLES">Consommables</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            Liste des produits
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {produitsFiltres.length} produit(s) trouvé(s)
            {recherche && ` pour "${recherche}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6">
          {produitsFiltres.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm w-12">
                      N°
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">Nom</TableHead>
                    <TableHead className="text-xs sm:text-sm">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm">
                      Description
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProduits.map((item, index) => {
                    const typeInfo = typeLabels[item.typeProduit] || {
                      label: item.typeProduit,
                      color: "bg-gray-50 text-gray-700 border-gray-200",
                    };
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs sm:text-sm">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {item.nomProduit.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-xs ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-xs sm:text-sm text-muted-foreground">
                          {item.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {canUpdate(TableName.PRODUIT) && (
                              <ProduitDialog
                                isUpdating
                                initialData={item}
                                onSubmit={handleUpdateProduit}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  Modifier
                                </Button>
                              </ProduitDialog>
                            )}

                            {canDelete(TableName.PRODUIT) && (
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
                                      Supprimer ce produit ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Voulez-vous
                                      vraiment supprimer ce produit ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 text-white"
                                      onClick={() => handleDelete(item.id)}
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center mb-3 sm:mb-4">
                <Package className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {recherche || filtreType !== "all"
                  ? "Aucun produit ne correspond à vos critères."
                  : "Aucun produit disponible."}
              </p>
              {(recherche || filtreType !== "all") && (
                <Button
                  variant="outline"
                  className="mt-3 sm:mt-4 text-xs sm:text-sm"
                  onClick={() => {
                    setRecherche("");
                    setFiltreType("all");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {produitsFiltres.length > 0 && (
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
                  Page {currentPage} sur {totalPages} ({produitsFiltres.length}{" "}
                  résultat
                  {produitsFiltres.length > 1 ? "s" : ""})
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
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
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
    </div>
  );
}
