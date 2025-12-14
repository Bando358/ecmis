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
import { Permission, Produit, TableName } from "@prisma/client";
import {
  createProduit,
  deleteProduit,
  getAllProduits,
  updateProduit,
} from "@/lib/actions/produitActions";
import { Trash2, Search } from "lucide-react";
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
import { useSession } from "next-auth/react";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function ProduitPage() {
  const [listeProduits, setListeProduits] = useState<Produit[]>([]);
  const [produitsFiltres, setProduitsFiltres] = useState<Produit[]>([]);
  const [recherche, setRecherche] = useState<string>("");
  const [permission, setPermission] = useState<Permission | null>(null);
  const { data: session } = useSession();

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

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.PRODUIT
        );
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'accéder à cette page.");
        //   router.back();
        // }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [session?.user]);

  const handleCreateProduit = async (data: Produit) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un produit. Contactez un administrateur."
      );
      return;
    } else {
      try {
        await createProduit(data);
        const updatedList = await getAllProduits();
        setListeProduits(updatedList);
      } catch (error) {
        throw error;
      }
    }
  };

  const handleUpdateProduit = async (data: Produit) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un produit. Contactez un administrateur."
      );
      return;
    } else {
      try {
        await updateProduit(data.id, data);
        const updatedList = await getAllProduits();
        setListeProduits(updatedList);
      } catch (error) {
        throw error;
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un  produit. Contactez un administrateur."
      );
      return;
    } else {
      try {
        await deleteProduit(id);
        setListeProduits((prev) => prev.filter((p) => p.id !== id));
        toast.success("Produit supprimé avec succès! 🎉");
      } catch (error) {
        toast.error("Erreur lors de la suppression du produit.");
        console.error(error);
      }
    }
  };

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
