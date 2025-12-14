"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import {
  TarifProduit,
  Produit,
  Clinique,
  Permission,
  TableName,
} from "@prisma/client";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  createTarifProduit,
  deleteTarifProduit,
  getAllTarifProduits,
  updateTarifProduit,
} from "@/lib/actions/tarifProduitActions";
import { Pencil, Trash2, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import TarifProduitDialog from "@/components/tarifProduitDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function PrixProduitPage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [editingTarif, setEditingTarif] = useState<TarifProduit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recherche, setRecherche] = useState<string>("");

  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

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
    if (!session?.user) return;
    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.TARIF_PRODUIT
        );
        setPermission(perm || null);
      } catch (error) {
        console.error("Erreur permissions :", error);
      }
    };
    fetchPermissions();
  }, [session?.user]);

  useEffect(() => {
    if (recherche.trim() === "") {
      setTarifsFiltres(listeTarifProduit);
    } else {
      const terme = recherche.toLowerCase();
      const filtres = listeTarifProduit.filter((tarif) => {
        const produit = produits.find((p) => p.id === tarif.idProduit);
        const clinique = cliniques.find((c) => c.id === tarif.idClinique);
        return (
          produit?.nomProduit.toLowerCase().includes(terme) ||
          clinique?.nomClinique.toLowerCase().includes(terme) ||
          tarif.prixUnitaire.toString().includes(terme)
        );
      });
      setTarifsFiltres(filtres);
    }
  }, [recherche, listeTarifProduit, produits, cliniques]);

  const onSubmit = async (data: TarifProduit) => {
    if (!permission?.canCreate && session?.user?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer ce tarif produit. Contactez un administrateur."
      );
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
    if (!permission?.canDelete && session?.user?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer ce tarif produit. Contactez un administrateur."
      );
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

  const TableRowSkeleton = () => (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <div className="space-y-4 max-w-300 p-4 flex flex-col mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des tarifs produits</h1>

        <Button onClick={handleCreate}>Ajouter un tarif</Button>
      </div>

      <TarifProduitDialog
        produits={produits}
        cliniques={cliniques}
        isUpdating={!!editingTarif}
        initialData={editingTarif || undefined}
        onSubmit={onSubmit}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit ou une clinique..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>N°</TableCell>
              <TableCell>Produit</TableCell>
              <TableCell>Clinique</TableCell>
              <TableCell>Prix unitaire</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))
            ) : tarifsFiltres.length ? (
              tarifsFiltres.map((item, index) => {
                const produit = produits.find((p) => p.id === item.idProduit);
                const clinique = cliniques.find(
                  (c) => c.id === item.idClinique
                );
                return (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{produit?.nomProduit}</TableCell>
                    <TableCell>{clinique?.nomClinique}</TableCell>
                    <TableCell>{item.prixUnitaire} Fcfa</TableCell>
                    <TableCell>{item.quantiteStock}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Pencil
                          className="text-blue-600 cursor-pointer"
                          size={16}
                          onClick={() => handleEdit(item)}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Trash2 className="text-red-600 cursor-pointer" />
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
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucun tarif trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
