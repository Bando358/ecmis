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
  updateQuantiteStockTarifProduit,
} from "@/lib/actions/tarifProduitActions";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandeFournisseurDialog } from "@/components/CommandeFournisseurDialog";
import { DetailCommandeDialog } from "@/components/detailCommandeDialog";
import {
  createCommandeFournisseur,
  getAllCommandesFournisseur,
} from "@/lib/actions/commandeFournisseurActions";
import { createDetailCommande } from "@/lib/actions/detailCommandeActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Search } from "lucide-react";
import { getOneUser } from "@/lib/actions/authActions";

export default function GestionStockProduitPage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [currentCommande, setCurrentCommande] =
    useState<CommandeFournisseur | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [recherche, setRecherche] = useState<string>("");

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);
  // Chargement des données initiales
  useEffect(() => {
    const fetchData = async () => {
      // Ne pas exécuter si la session n'est pas encore chargée
      if (status === "loading") return;

      setIsLoading(true);
      try {
        const [tarifs, produitsData, cliniquesData, commandesData] =
          await Promise.all([
            getAllTarifProduits(),
            getAllProduits(),
            getAllClinique(),
            getAllCommandesFournisseur(),
          ]);
        setListeTarifProduit(tarifs);
        setTarifsFiltres(tarifs);
        setProduits(produitsData);
        setCliniques(cliniquesData);

        // Filtrer les commandes selon les cliniques de l'utilisateur
        let filteredCommandes = commandesData;
        if (prescripteur?.role !== "ADMIN") {
          const tabCliniquesUser = prescripteur?.idCliniques || [];
          filteredCommandes = commandesData.filter((commande: { idClinique: string }) =>
            tabCliniquesUser.includes(commande.idClinique)
          );
        }
        setCommandes(filteredCommandes);

        // Ne pas sélectionner automatiquement la première commande afin que
        // l'option placeholder (value="none") reste sélectionnée par défaut.

        console.log("Commandes chargées:", commandesData);
      } catch (error) {
        toast.error("Erreur lors du chargement des données.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [prescripteur?.role, status]); // Dépendances plus spécifiques

  // Filtrage des tarifs produits basé sur la recherche
  useEffect(() => {
    if (recherche.trim() === "") {
      setTarifsFiltres(listeTarifProduit);
    } else {
      const termeRecherche = recherche.toLowerCase();
      const tarifsFiltres = listeTarifProduit.filter((tarif) => {
        const produit = produits.find((p) => p.id === tarif.idProduit);
        const clinique = cliniques.find((c) => c.id === tarif.idClinique);

        return (
          produit?.nomProduit.toLowerCase().includes(termeRecherche) ||
          clinique?.nomClinique.toLowerCase().includes(termeRecherche) ||
          tarif.prixUnitaire.toString().includes(termeRecherche) ||
          tarif.quantiteStock.toString().includes(termeRecherche)
        );
      });
      setTarifsFiltres(tarifsFiltres);
    }
  }, [recherche, listeTarifProduit, produits, cliniques]);

  useEffect(() => {
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
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
  }, [session?.user]);

  // Création d'une nouvelle commande fournisseur
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
      console.log("Nouvelle commande créée:", nouvelleCommande);
      setCommandes((prev) => [...prev, nouvelleCommande]);
      toast.success("Commande créée avec succès!");
      return nouvelleCommande;
    } catch (error) {
      toast.error("Erreur lors de la création de la commande");
      console.error(error);
      return null;
    }
  };

  // Ajout d'un détail à la commande
  const handleAddDetailCommande = async (
    data: Partial<DetailCommande>,
    tarifProduit: TarifProduit
  ) => {
    if (!permission?.canCreate && session?.user?.role !== "ADMIN") {
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

    await updateQuantiteStockTarifProduit(tarifProduit.id, quantite);
    const newQuantite = await getAllTarifProduits();
    setListeTarifProduit(newQuantite);

    try {
      const uuid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15);
      if (idUser) {
        await createDetailCommande({
          id: data.id && typeof data.id === "string" ? data.id : uuid,
          idTarifProduit: tarifProduit.id,
          quantiteCommandee: quantite,
          idCommande: data.idCommande || "",
          createdAt: new Date(),
          idUser,
        });
        toast.success("Produit ajouté à la commande!");
      }

      const updatedTarifs = listeTarifProduit.map((t) =>
        t.id === tarifProduit.id
          ? {
              ...t,
              quantiteStock: t.quantiteStock + quantite,
            }
          : t
      );
      setListeTarifProduit(updatedTarifs);
    } catch (error) {
      toast.error("Erreur lors de l'ajout du produit à la commande");
      console.error(error);
    }
  };

  // Gestion du changement de commande
  const handleCommandeChange = (value: string) => {
    if (value === "none") {
      setCurrentCommande(null);
    } else {
      const selected = commandes.find((c) => c.id === value);
      setCurrentCommande(selected || null);
    }
  };

  const TableRowSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-6 w-6" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
    </TableRow>
  );

  // Afficher un loader pendant le chargement de la session
  if (status === "loading") {
    return (
      <div className="space-y-4 max-w-300 p-4 flex flex-col mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="bg-gray-50 p-4 rounded-sm">
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRowSkeleton key={index} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-300 p-4 flex flex-col mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des stocks produits</h1>
        <CommandeFournisseurDialog
          cliniques={cliniques}
          onCreateCommande={handleCreateCommande}
        >
          <Button>Commande Fournisseur</Button>
        </CommandeFournisseurDialog>
      </div>

      {commandes && commandes.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
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
                className="w-87.5 bg-white"
              >
                <SelectValue placeholder="Sélectionnez une commande fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sélectionnez une commande fournisseur
                </SelectItem>
                {commandes.map((commande) => {
                  const clinique = cliniques.find(
                    (c) => c.id === commande.idClinique
                  );
                  return (
                    <SelectItem key={commande.id} value={commande.id}>
                      {`${
                        clinique?.nomClinique || "Clinique inconnue"
                      } - ${new Date(commande.dateCommande).toLocaleDateString(
                        "fr-FR"
                      )}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit, clinique, prix ou stock..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Affichage du nombre de résultats */}
      {recherche && (
        <div className="text-sm text-muted-foreground">
          {tarifsFiltres.length} produit(s) trouvé(s) pour {`"${recherche}"`}
        </div>
      )}

      <div className="bg-gray-50 opacity-90 p-4 rounded-sm">
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
              Array.from({ length: 3 }).map((_, index) => (
                <TableRowSkeleton key={index} />
              ))
            ) : tarifsFiltres && tarifsFiltres.length > 0 ? (
              tarifsFiltres.map((item, index) => {
                const produit = produits.find((p) => p.id === item.idProduit);
                const clinique = cliniques.find(
                  (c) => c.id === item.idClinique
                );

                return (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{produit?.nomProduit || "Inconnu"}</TableCell>
                    <TableCell>{clinique?.nomClinique || "Inconnu"}</TableCell>
                    <TableCell>{item.prixUnitaire} Cfa</TableCell>
                    <TableCell>{item.quantiteStock}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {currentCommande ? (
                          <DetailCommandeDialog
                            tarifProduit={item}
                            idCommande={currentCommande.id}
                            onAddDetail={handleAddDetailCommande}
                          >
                            <Button variant="outline" size="sm">
                              Ajouter produits
                            </Button>
                          </DetailCommandeDialog>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            {"Créez d'abord une commande"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {recherche
                    ? "Aucun produit trouvé pour votre recherche."
                    : "Aucun tarif produit trouvé."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
