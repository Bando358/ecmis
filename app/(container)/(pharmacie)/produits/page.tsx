"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import de l'input
import { Produit, TableName } from "@prisma/client";
import {
  createProduit,
  deleteProduit,
  getAllProduits,
  updateProduit,
} from "@/lib/actions/produitActions";
import { Trash2, Search, Loader2 } from "lucide-react";
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
import ProduitDialog from "@/components/produitDialog";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { useRouter } from "next/navigation";

export default function ProduitPage() {
  const [listeProduits, setListeProduits] = useState<Produit[]>([]);
  const [produitsFiltres, setProduitsFiltres] = useState<Produit[]>([]);
  const [recherche, setRecherche] = useState<string>("");
  const { canCreate, canUpdate, canDelete, canRead, isLoading: isLoadingPermissions } = usePermissionContext();
  const router = useRouter();

  // Chargement initial des produits
  useEffect(() => {
    const fetchData = async () => {
      const produits = await getAllProduits();
      setListeProduits(produits);
      setProduitsFiltres(produits);
    };
    fetchData();
  }, []);

  // Filtrage des produits basé sur la recherche
  useEffect(() => {
    if (recherche.trim() === "") {
      setProduitsFiltres(listeProduits);
    } else {
      const termeRecherche = recherche.toLowerCase();
      const produitsFiltres = listeProduits.filter((produit) =>
        produit.nomProduit.toLowerCase().includes(termeRecherche)
      );
      setProduitsFiltres(produitsFiltres);
    }
  }, [recherche, listeProduits]);

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

  if (isLoadingPermissions) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!canRead(TableName.PRODUIT)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  return (
    <div className="space-y-4 max-w-225 p-4 flex flex-col mx-auto">
      <h1 className="text-2xl font-bold text-center">Liste des Produits</h1>

      <div className="flex justify-between items-center">
        {/* Barre de recherche */}
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Bouton d'ajout */}
        <ProduitDialog onSubmit={handleCreateProduit}>
          <Button>Ajouter un produit</Button>
        </ProduitDialog>
      </div>

      {/* Affichage du nombre de résultats */}
      {recherche && (
        <div className="text-sm text-muted-foreground">
          {produitsFiltres.length} produit(s) trouvé(s) pour {`"${recherche}"`}
        </div>
      )}

      {/* Tableau des produits */}
      <Table className="bg-gray-50 opacity-90 p-4 rounded-sm">
        <TableHeader>
          <TableRow>
            <TableCell>N°</TableCell>
            <TableCell>Nom</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produitsFiltres.length > 0 ? (
            produitsFiltres.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">
                  {item.nomProduit.toUpperCase()}
                </TableCell>
                <TableCell>{item.typeProduit}</TableCell>
                <TableCell className="max-w-50 truncate">
                  {item.description || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <ProduitDialog
                      isUpdating
                      initialData={item}
                      onSubmit={handleUpdateProduit}
                    >
                      <Button variant="ghost" size="icon">
                        Modifier
                      </Button>
                    </ProduitDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Supprimer ce produit ?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Voulez-vous vraiment
                            supprimer ce produit ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 text-white"
                            onClick={() => handleDelete(item.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                {recherche
                  ? "Aucun produit trouvé pour votre recherche."
                  : "Aucun produit disponible."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
