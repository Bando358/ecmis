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
  Inventaire,
  Permission,
  TableName,
  DetailInventaire,
  AnomalieInventaire,
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
import { InventaireDialog } from "@/components/inventaireDialog";
import {
  createInventaire,
  // getAllInventaire,
  getRecentInventaires,
} from "@/lib/actions/inventaireActions";
import {
  createDetailInventaire,
  getAllDetailInventaireByTabIdDetailInventaire,
} from "@/lib/actions/detailInventaireActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Search } from "lucide-react";
import { AnomalieInventaireDialog } from "@/components/anomalieInventaireDialog";
import { createAnomalie } from "@/lib/actions/anomalieActions";
import { SpinnerCustom } from "@/components/ui/spinner";
import { getOneUser } from "@/lib/actions/authActions";

export default function DetailInventairePage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [detailInventaires, setDetailInventaires] = useState<
    DetailInventaire[]
  >([]);
  const [currentInventaire, setCurrentInventaire] = useState<Inventaire | null>(
    null
  );
  const [, setCurrentAnomalie] = useState<AnomalieInventaire | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalieInventaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validatingProducts, setValidatingProducts] = useState<{
    [key: string]: boolean;
  }>({});
  const [adjustingProducts] = useState<{
    [key: string]: boolean;
  }>({});
  const [permissionInventaire, setPermissionInventaire] =
    useState<Permission | null>(null);
  const [permissionAjustement, setPermissionAjustement] =
    useState<Permission | null>(null);
  const [permissionDetailInventaire, setPermissionDetailInventaire] =
    useState<Permission | null>(null);
  const [recherche, setRecherche] = useState<string>("");
  const [prescripteur, setPrescripteur] = useState<User>();
  const [quantitesReelles, setQuantitesReelles] = useState<{
    [key: string]: number;
  }>({});

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
      if (status === "loading") return;

      setIsLoading(true);
      try {
        const [oneUser, tarifs, produitsData, cliniquesData, inventairesData] =
          await Promise.all([
            getOneUser(idUser),
            getAllTarifProduits(),
            getAllProduits(),
            getAllClinique(),
            getRecentInventaires(),
          ]);

        setListeTarifProduit(tarifs);
        setTarifsFiltres(tarifs);
        setProduits(produitsData);
        setCliniques(cliniquesData);

        // Filtrer les inventaires selon les cliniques de l'utilisateur
        let filteredInventaires = inventairesData;
        const allIdInventaire = inventairesData.map(
          (inventaire: { id: string }) => inventaire.id
        );

        if (oneUser?.role !== "ADMIN") {
          const tabCliniquesUser = oneUser?.idCliniques || [];
          filteredInventaires = inventairesData.filter(
            (inventaire: { idClinique: string }) =>
              tabCliniquesUser.includes(inventaire.idClinique)
          );

          const detail = await getAllDetailInventaireByTabIdDetailInventaire(
            allIdInventaire
          );
          setDetailInventaires(detail);
        }
        setInventaires(filteredInventaires);

        const detail = await getAllDetailInventaireByTabIdDetailInventaire(
          allIdInventaire
        );
        setDetailInventaires(detail);

        // Initialiser les quantités réelles avec les stocks actuels
        const initialQuantites: { [key: string]: number } = {};
        tarifs.forEach((tarif: { id: string; quantiteStock: number }) => {
          initialQuantites[tarif.id] = tarif.quantiteStock;
        });
        setQuantitesReelles(initialQuantites);

        console.log("Inventaires chargés:", inventairesData);
      } catch (error) {
        toast.error("Erreur lors du chargement des données.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [prescripteur?.role, status]);

  // Filtrage des tarifs produits
  useEffect(() => {
    if (recherche.trim() === "") {
      setTarifsFiltres(listeTarifProduit);
    } else {
      const termeRecherche = recherche.toLowerCase();
      const filtered = listeTarifProduit.filter((tarif) => {
        const produit = produits.find((p) => p.id === tarif.idProduit);
        const clinique = cliniques.find((c) => c.id === tarif.idClinique);

        return (
          produit?.nomProduit.toLowerCase().includes(termeRecherche) ||
          clinique?.nomClinique.toLowerCase().includes(termeRecherche) ||
          tarif.quantiteStock.toString().includes(termeRecherche)
        );
      });
      setTarifsFiltres(filtered);
    }
  }, [recherche, listeTarifProduit, produits, cliniques]);

  useEffect(() => {
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.INVENTAIRE
        );
        setPermissionInventaire(perm || null);
        const permDetail = permissions.find(
          (p: { table: string }) => p.table === TableName.DETAIL_INVENTAIRE
        );
        setPermissionDetailInventaire(permDetail || null);
        setPermissionInventaire(perm || null);
        const permAjustement = permissions.find(
          (p: { table: string }) => p.table === TableName.AJUSTEMENT_STOCK
        );
        setPermissionAjustement(permAjustement || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [session?.user]);

  // Création d'un nouvel inventaire
  const handleCreateInventaire = async (
    data: Partial<Inventaire>
  ): Promise<Inventaire | null> => {
    if (!permissionInventaire?.canCreate && session?.user?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer cet inventaire. Contactez un administrateur ou votre supérieur."
      );
      return null;
    }
    const dateISO =
      typeof data.dateInventaire === "string"
        ? new Date(data.dateInventaire)
        : data.dateInventaire instanceof Date
        ? data.dateInventaire
        : new Date();

    try {
      const uuid =
        crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
      const nouvelInventaire = await createInventaire({
        id: data.id && typeof data.id === "string" ? data.id : uuid,
        idClinique: data.idClinique || "",
        dateInventaire: dateISO,
        idUser: idUser,
      });

      // If createInventaire can return undefined, normalize to null to satisfy the expected return type.
      if (!nouvelInventaire) {
        toast.error("Erreur lors de la création de l'inventaire");
        return null;
      }

      setCurrentInventaire(nouvelInventaire);
      setInventaires((prev) => [...prev, nouvelInventaire]);
      toast.success("Inventaire créé avec succès!");
      return nouvelInventaire;
    } catch (error) {
      toast.error("Erreur lors de la création de l'inventaire");
      console.error(error);
      return null;
    }
  };

  // Création d'une nouvelle anomalie
  const handleCreateAnomalie = async (data: Partial<AnomalieInventaire>) => {
    if (!permissionAjustement?.canCreate && session?.user?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de faire cet ajustement. Contactez un administrateur ou votre supérieur."
      );
      return null;
    }
    if (
      !data.idTarifProduit ||
      !data.idDetailInventaire ||
      data.quantiteManquante === undefined
    ) {
      toast.error("Données d'anomalie incomplètes.");
      return null;
    }
    const dateISO =
      typeof data.dateAnomalie === "string"
        ? new Date(data.dateAnomalie)
        : data.dateAnomalie instanceof Date
        ? data.dateAnomalie
        : new Date();
    const uuid =
      crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);

    // Normalize quantiteManquante to a number that cannot be undefined
    const q = data.quantiteManquante ?? 0;

    try {
      const nouvelAnomalie = await createAnomalie({
        id: uuid,
        idUser: idUser,
        idTarifProduit: data.idTarifProduit || "",
        idDetailInventaire: data.idDetailInventaire || "",
        quantiteManquante: q,
        dateAnomalie: dateISO,
        description: data.description ?? null,
      });
      await updateQuantiteStockTarifProduit(data.idTarifProduit, Math.abs(q));
      // Mettre à jour la liste des tarifs produits après ajustement
      const tarifsMisAJour = tarifsFiltres.map((tarif) => {
        if (tarif.id === data.idTarifProduit) {
          return {
            ...tarif,
            quantiteStock:
              q < 0
                ? tarif.quantiteStock - Math.abs(q)
                : tarif.quantiteStock + Math.abs(q),
          };
        }
        return tarif;
      });
      setListeTarifProduit(tarifsMisAJour);

      setCurrentAnomalie(nouvelAnomalie);
      setAnomalies((prev) => [...prev, nouvelAnomalie]);
      toast.success("Anomalie créée avec succès!");
      return nouvelAnomalie;
    } catch (error) {
      toast.error("Erreur lors de la création de l'anomalie");
      console.error(error);
      return null;
    }
  };

  // Gestion du changement de quantité réelle
  const handleQuantiteReelleChange = (tarifId: string, value: string) => {
    const quantite = Number(value);
    if (!isNaN(quantite)) {
      setQuantitesReelles((prev) => ({
        ...prev,
        [tarifId]: quantite,
      }));
    }
  };

  // Validation d'un produit dans l'inventaire
  const handleValiderProduit = async (tarifProduit: TarifProduit) => {
    if (
      !permissionDetailInventaire?.canCreate &&
      session?.user?.role !== "ADMIN"
    ) {
      alert(
        "Vous n'avez pas la permission de créer les détails d'inventaire. Contactez un administrateur."
      );
      return;
    }

    // Début de la validation pour ce produit spécifique
    setValidatingProducts((prev) => ({
      ...prev,
      [tarifProduit.id]: true,
    }));

    if (!currentInventaire) {
      toast.error("Aucun inventaire en cours.");
      setValidatingProducts((prev) => ({
        ...prev,
        [tarifProduit.id]: false,
      }));
      return;
    }

    const quantiteReelle =
      quantitesReelles[tarifProduit.id] || tarifProduit.quantiteStock;
    const quantiteTheorique = tarifProduit.quantiteStock;
    const ecart = quantiteReelle - quantiteTheorique;

    try {
      const uuid =
        crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);

      const detail = await createDetailInventaire({
        id: uuid,
        idInventaire: currentInventaire.id,
        idTarifProduit: tarifProduit.id,
        idUser: idUser,
        quantiteTheorique,
        quantiteReelle,
        ecart,
        createdAt: new Date(),
      });
      setDetailInventaires((prev) => [...prev, detail]);

      toast.success("Produit validé dans l'inventaire!");
    } catch (error) {
      toast.error("Erreur lors de la validation du produit");
      console.error(error);
    } finally {
      // Fin de la validation pour ce produit spécifique
      setValidatingProducts((prev) => ({
        ...prev,
        [tarifProduit.id]: false,
      }));
    }
  };

  // Gestion du changement d'inventaire
  const handleInventaireChange = (value: string) => {
    if (value === "none") {
      setCurrentInventaire(null);
    } else {
      const selected = inventaires.find((i) => i.id === value);
      setCurrentInventaire(selected || null);
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
        <h1 className="text-2xl font-bold">Détail de {`l'inventaire`}</h1>
        <InventaireDialog
          cliniques={cliniques}
          onCreateInventaire={handleCreateInventaire}
        >
          <Button>Nouvel Inventaire</Button>
        </InventaireDialog>
      </div>

      {inventaires && inventaires.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Label
              htmlFor="select-inventaire"
              className="font-semibold text-blue-900 whitespace-nowrap"
            >
              Inventaire en cours :
            </Label>
            <Select
              value={currentInventaire?.id || "none"}
              onValueChange={handleInventaireChange}
            >
              <SelectTrigger
                id="select-inventaire"
                className="w-87.5 bg-white"
              >
                <SelectValue placeholder="Sélectionnez un inventaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sélectionnez un inventaire</SelectItem>
                {inventaires.map((inventaire) => {
                  const clinique = cliniques.find(
                    (c) => c.id === inventaire.idClinique
                  );
                  return (
                    <SelectItem key={inventaire.id} value={inventaire.id}>
                      {`${
                        clinique?.nomClinique || "Clinique inconnue"
                      } - ${new Date(
                        inventaire.dateInventaire
                      ).toLocaleDateString("fr-FR")}`}
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
          placeholder="Rechercher un produit, clinique ou stock..."
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
              <TableCell>Quantité théorique</TableCell>
              <TableCell>Quantité réelle</TableCell>
              <TableCell>Écart</TableCell>
              <TableCell>Actions</TableCell>
              <TableCell>Ajustement</TableCell>
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
                const idTarifProduit = item.id;
                const idDetailInventaire = detailInventaires.find(
                  (d) => d.idTarifProduit === item.id
                )?.id;
                const quantiteTheorique = item.quantiteStock;
                const quantiteReelle =
                  quantitesReelles[item.id] || quantiteTheorique;
                const ecart = quantiteReelle - quantiteTheorique;

                const isValidating = validatingProducts[item.id] || false;
                const isAdjusting = adjustingProducts[item.id] || false;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{produit?.nomProduit || "Inconnu"}</TableCell>
                    <TableCell>{clinique?.nomClinique || "Inconnu"}</TableCell>
                    <TableCell>{quantiteTheorique}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={quantiteReelle}
                        onChange={(e) =>
                          handleQuantiteReelleChange(item.id, e.target.value)
                        }
                        className="w-24"
                        disabled={
                          detailInventaires.find(
                            (d) =>
                              d.idInventaire === currentInventaire?.id &&
                              d.idTarifProduit === item.id
                          ) !== undefined || currentInventaire === null
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          ecart === 0
                            ? "bg-green-100 text-green-800"
                            : ecart > 0
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ecart > 0 ? `+${ecart}` : ecart}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(() => {
                          const isAlreadyValidated =
                            detailInventaires.find(
                              (d) =>
                                d.idInventaire === currentInventaire?.id &&
                                d.idTarifProduit === item.id
                            ) !== undefined;

                          const buttonClass = isAlreadyValidated
                            ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
                            : "";

                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleValiderProduit(item)}
                              disabled={
                                !currentInventaire ||
                                isAlreadyValidated ||
                                isValidating
                              }
                              className={buttonClass}
                              style={
                                isValidating
                                  ? { width: "65px", background: "#22c55e" }
                                  : {}
                              }
                            >
                              {isValidating ? <SpinnerCustom /> : "Valider"}
                            </Button>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <AnomalieInventaireDialog
                          quantiteReelle={quantiteReelle}
                          ecart={ecart}
                          idDetailInventaire={idDetailInventaire || ""}
                          idTarifProduit={idTarifProduit}
                          produit={produit?.nomProduit || "Inconnu"}
                          idUser={idUser}
                          onCreateAnomalie={handleCreateAnomalie}
                        >
                          <Button
                            disabled={
                              ecart === 0 ||
                              currentInventaire === null ||
                              idDetailInventaire === undefined ||
                              anomalies.find(
                                (a) =>
                                  a.idDetailInventaire === idDetailInventaire
                              ) !== undefined ||
                              isAdjusting
                            }
                          >
                            {isAdjusting ? <SpinnerCustom /> : "Ajuster"}
                          </Button>
                        </AnomalieInventaireDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
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
