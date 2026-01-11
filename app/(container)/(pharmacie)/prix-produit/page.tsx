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
  User,
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
import { getOneUser } from "@/lib/actions/authActions";

export default function PrixProduitPage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [user, setUser] = useState<User | null>(null);
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [editingTarif, setEditingTarif] = useState<TarifProduit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUpdatingTrue, setIsUpdatingTrue] = useState(false);
  const [recherche, setRecherche] = useState<string>("");
  const [selectedClinique, setSelectedClinique] = useState<string>("");

  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

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
    if (!user) return;
    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.TARIF_PRODUIT
        );
        setPermission(perm || null);
      } catch (error) {
        console.error("Erreur permissions :", error);
      }
    };
    fetchPermissions();
  }, [user]);

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

        // Si même type, trier par nom de produit
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
          tarif.prixUnitaire.toString().includes(terme)
        );
      });
    }

    const triees = trierParTypeProduit(filtres);
    setTarifsFiltres(triees);
  }, [recherche, selectedClinique, listeTarifProduit, produits, cliniques]);

  const onSubmit = async (data: TarifProduit) => {
    if (!permission?.canCreate && user?.role !== "ADMIN") {
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
    if (!permission?.canDelete && user?.role !== "ADMIN") {
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

  // Filtrer les produits qui n'ont pas encore de tarif pour la clinique sélectionnée
  const produitsDisponibles = produits.filter((produit) => {
    // Si on est en mode édition, inclure le produit en cours d'édition
    if (editingTarif && editingTarif.idProduit === produit.id) {
      return true;
    }
    // Vérifier si le produit a déjà un tarif pour cette clinique
    const aTarifExistant = listeTarifProduit.some(
      (tarif) =>
        tarif.idProduit === produit.id && tarif.idClinique === selectedClinique
    );
    return !aTarifExistant;
  });

  const TableRowSkeleton = () => (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );

  // Filtrer les cliniques selon le rôle de l'utilisateur
  const cliniquesAccessibles =
    user?.role === "ADMIN"
      ? cliniques
      : cliniques.filter((clinique) => user?.idCliniques.includes(clinique.id));

  return (
    <div className="space-y-4 max-w-300 p-4 flex flex-col mx-auto">
      <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
        <h1 className="text-2xl font-bold">Gestion des tarifs produits</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={selectedClinique} onValueChange={setSelectedClinique}>
            <SelectTrigger className="w-full sm:w-62.5 bg-gray-50">
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
          <Button
            onClick={handleCreate}
            className="w-full sm:w-auto"
            disabled={!selectedClinique}
          >
            Ajouter un tarif
          </Button>
        </div>
      </div>

      <TarifProduitDialog
        produits={produitsDisponibles}
        cliniques={cliniquesAccessibles}
        isUpdating={!!editingTarif}
        initialData={editingTarif || undefined}
        // isUpdatingTrue={isUpdatingTrue}
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

      {!selectedClinique ? (
        <div className="bg-blue-50 border border-blue-200 p-8 rounded-lg text-center">
          <p className="text-blue-700 text-lg">
            Veuillez sélectionner une clinique pour afficher les tarifs
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
                <TableCell>Actions</TableCell>
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

                    return (
                      <React.Fragment key={item.id}>
                        {showTypeHeader && (
                          <TableRow className="bg-blue-50 hover:bg-blue-50">
                            <TableCell
                              colSpan={6}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  });
                })()
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
      )}
    </div>
  );
}
