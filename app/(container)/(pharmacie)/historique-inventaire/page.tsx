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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback } from "react";
import {
  Inventaire,
  DetailInventaire,
  Clinique,
  User,
  AnomalieInventaire,
  Produit,
  TarifProduit,
  Permission,
  TableName,
} from "@prisma/client";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye, MoreVertical } from "lucide-react";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  deleteInventaire,
  getAllInventaire,
} from "@/lib/actions/inventaireActions";
import {
  deleteDetailInventairesByIds,
  getAllDetailInventaireByInventaireId,
} from "@/lib/actions/detailInventaireActions";
import { getOneUser } from "@/lib/actions/authActions";
import {
  deleteAnomaliesByIds,
  getAnomaliesByDetailInventaireIds,
} from "@/lib/actions/anomalieActions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InventaireDetailDialog } from "@/components/inventaire-detail-dialog";
import { SpinnerCustom } from "@/components/ui/spinner";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllTarifProduits } from "@/lib/actions/tarifProduitActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

// Types étendus pour inclure les relations
type InventaireWithRelations = Inventaire & {
  Clinique: Clinique;
  User: User;
  detailInventaire: (DetailInventaire & {
    User: User;
    tarifProduit: TarifProduit;
    AnomalieInventaire: AnomalieInventaire[];
  })[];
};

export default function HistoriqueInventairePage() {
  const [inventaires, setInventaires] = useState<InventaireWithRelations[]>([]);
  const [inventairesFiltres, setInventairesFiltres] = useState<
    InventaireWithRelations[]
  >([]);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [idCliniques, setIdCliniques] = useState<string[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [tarifProduits, setTarifProduits] = useState<TarifProduit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recherche, setRecherche] = useState<string>("");
  const [filtreClinique, setFiltreClinique] = useState<string>("all");
  const [filtreStatut, setFiltreStatut] = useState<string>("all");
  const [selectedInventaire, setSelectedInventaire] =
    useState<InventaireWithRelations | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";
  const router = useRouter();

  //  Récupération de l'utilisateur courant
  useEffect(() => {
    const fetchUser = async () => {
      if (idUser) {
        try {
          const user = await getOneUser(idUser);
          setIdCliniques(user?.idCliniques || []);
          setUser(user!);
        } catch (error) {
          console.error(
            "Erreur lors de la récupération de l'utilisateur:",
            error
          );
        }
      }
    };
    fetchUser();
  }, [idUser]);
  // Chargement des données initiales
  useEffect(() => {
    const fetchData = async () => {
      if (status === "loading") return;
      if (!user) return;

      // Pour les non-admin, vérifier qu'ils ont des cliniques
      if (user.role !== "ADMIN" && !idCliniques.length) return;

      setIsLoading(true);
      try {
        const [cliniquesData, inventairesData, produit, tarifProduit] =
          await Promise.all([
            getAllClinique(),
            getAllInventaire(),
            getAllProduits(),
            getAllTarifProduits(),
          ]);

        // Admin voit toutes les cliniques, les autres voient uniquement leurs cliniques
        if (user.role === "ADMIN") {
          setCliniques(cliniquesData);
        } else {
          setCliniques(cliniquesData.filter((c) => idCliniques.includes(c.id)));
        }

        setProduits(produit);
        setTarifProduits(tarifProduit);

        // Filtrer les inventaires par cliniques autorisées
        let inventairesAutorises = inventairesData;
        if (user.role !== "ADMIN") {
          inventairesAutorises = inventairesData.filter((inv) =>
            idCliniques.includes(inv.idClinique)
          );
        }

        // Charger les détails et relations pour chaque inventaire
        const inventairesComplets = await Promise.all(
          inventairesAutorises.map(async (inventaire) => {
            const details = await getAllDetailInventaireByInventaireId(
              inventaire.id
            );

            // Charger les données de l'utilisateur qui a créé l'inventaire
            const user = await getOneUser(inventaire.idUser);

            // Charger les anomalies pour tous les détails d'inventaire
            const detailIds = (details || []).map((d) => d.id);
            const anomalies = await getAnomaliesByDetailInventaireIds(
              detailIds
            );

            // Charger les utilisateurs et enrichir les relations pour chaque détail
            const detailsWithUser = await Promise.all(
              (details || []).map(async (detail) => {
                const detailUser = await getOneUser(detail.idUser);
                const tarifProduitData = tarifProduit.find(
                  (tp) => tp.id === detail.idTarifProduit
                );
                const produitData = produit.find(
                  (p) => p.id === tarifProduitData?.idProduit
                );
                const detailAnomalies = anomalies.filter(
                  (a) => a.idDetailInventaire === detail.id
                );

                // Debug - à supprimer après
                if (!tarifProduitData) {
                  console.log("TarifProduit non trouvé pour detail:", {
                    detailId: detail.id,
                    idTarifProduit: detail.idTarifProduit,
                    tarifProduitsDisponibles: tarifProduit.length,
                  });
                }

                return {
                  ...detail,
                  User: detailUser || ({} as User),
                  tarifProduit: tarifProduitData
                    ? {
                        ...tarifProduitData,
                        produit: produitData || ({} as Produit),
                      }
                    : undefined,
                  AnomalieInventaire: detailAnomalies,
                };
              })
            );

            return {
              ...inventaire,
              Clinique:
                cliniquesData.find((c) => c.id === inventaire.idClinique) ||
                ({} as Clinique),
              User: user || ({} as User),
              detailInventaire: detailsWithUser,
            } as InventaireWithRelations;
          })
        );

        // Trier par date décroissante
        inventairesComplets.sort(
          (a, b) =>
            new Date(b.dateInventaire).getTime() -
            new Date(a.dateInventaire).getTime()
        );

        // Debug - Vérifier les données construites
        console.log("Inventaires complets:", inventairesComplets);
        if (
          inventairesComplets.length > 0 &&
          inventairesComplets[0].detailInventaire.length > 0
        ) {
          console.log(
            "Premier detail inventaire:",
            inventairesComplets[0].detailInventaire[0]
          );
          console.log(
            "TarifProduit du premier detail:",
            inventairesComplets[0].detailInventaire[0].tarifProduit
          );
        }
        console.log("Total produits chargés:", produit.length);
        console.log("Total tarifProduits chargés:", tarifProduit.length);

        setInventaires(inventairesComplets);
        setInventairesFiltres(inventairesComplets);
      } catch (error) {
        toast.error(
          "Erreur lors du chargement de l'historique des inventaires."
        );
        console.error("Erreur détaillée:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status, idUser, idCliniques, user]);

  useEffect(() => {
    if (!user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(user.id);
        const permInventaire = permissions.find(
          (p: { table: string }) => p.table === TableName.INVENTAIRE
        );
        setPermission(permInventaire || null);

        if (permInventaire?.canRead || user.role === "ADMIN") {
          setHasAccess(true);
        } else {
          alert("Vous n'avez pas la permission d'accéder à cette page.");
          router.back();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    fetchPermissions();
  }, [user, router]);

  // Filtrage des inventaires
  useEffect(() => {
    let filtered = inventaires;

    // Filtre par recherche
    if (recherche.trim() !== "") {
      const termeRecherche = recherche.toLowerCase();
      filtered = filtered.filter((inventaire) => {
        const cliniqueNom =
          inventaire.Clinique?.nomClinique?.toLowerCase() || "";
        const userName = inventaire.User?.name?.toLowerCase() || "";
        const dateStr = format(
          new Date(inventaire.dateInventaire),
          "dd/MM/yyyy",
          { locale: fr }
        );

        return (
          cliniqueNom.includes(termeRecherche) ||
          userName.includes(termeRecherche) ||
          dateStr.includes(termeRecherche) ||
          inventaire.id.toLowerCase().includes(termeRecherche)
        );
      });
    }

    // Filtre par clinique
    if (filtreClinique !== "all") {
      filtered = filtered.filter(
        (inventaire) => inventaire.idClinique === filtreClinique
      );
    }

    // Filtre par statut (à adapter selon votre logique métier)
    if (filtreStatut !== "all") {
      filtered = filtered.filter((inventaire) => {
        // Exemple de logique de statut
        const totalProduits = inventaire.detailInventaire.length;
        const produitsValides = inventaire.detailInventaire.filter(
          (d) => d.ecart === 0
        ).length;

        if (filtreStatut === "completed") {
          return totalProduits > 0 && produitsValides === totalProduits;
        } else if (filtreStatut === "in_progress") {
          return totalProduits > 0 && produitsValides < totalProduits;
        } else if (filtreStatut === "with_anomalies") {
          return inventaire.detailInventaire.some(
            (d) => d.AnomalieInventaire && d.AnomalieInventaire.length > 0
          );
        }
        return true;
      });
    }

    setInventairesFiltres(filtered);
    setCurrentPage(1); // Réinitialiser à la première page lors du filtrage
  }, [recherche, filtreClinique, filtreStatut, inventaires]);

  // Fonction pour obtenir le statut d'un inventaire
  const getInventaireStatus = (inventaire: InventaireWithRelations) => {
    const totalProduits = inventaire.detailInventaire.length;
    if (totalProduits === 0) return { label: "Non commencé", color: "gray" };

    const produitsValides = inventaire.detailInventaire.filter(
      (d) => d.ecart === 0
    ).length;
    const hasAnomalies = inventaire.detailInventaire.some(
      (d) => d.AnomalieInventaire && d.AnomalieInventaire.length > 0
    );

    if (hasAnomalies) return { label: "Avec anomalies", color: "red" };
    if (produitsValides === totalProduits)
      return { label: "Complété", color: "green" };
    return { label: "En cours", color: "yellow" };
  };

  // Fonction pour obtenir les statistiques d'un inventaire
  const getInventaireStats = (inventaire: InventaireWithRelations) => {
    const totalProduits = inventaire.detailInventaire.length;
    const produitsValides = inventaire.detailInventaire.filter(
      (d) => d.ecart === 0
    ).length;
    const totalAnomalies = inventaire.detailInventaire.reduce(
      (sum, d) => sum + (d.AnomalieInventaire?.length || 0),
      0
    );
    const totalEcart = inventaire.detailInventaire.reduce(
      (sum, d) => sum + Math.abs(d.ecart),
      0
    );

    return { totalProduits, produitsValides, totalAnomalies, totalEcart };
  };

  // Télécharger le PDF d'un inventaire
  const handleDownloadPDF = useCallback(
    async (inventaire: InventaireWithRelations) => {
      setIsGeneratingPDF(true);

      try {
        toast.info("Génération du PDF en cours...");

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // En-tête
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("RAPPORT D'INVENTAIRE", 105, 20, { align: "center" });

        // Informations générales
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);

        const dateInventaire = format(
          new Date(inventaire.dateInventaire),
          "dd/MM/yyyy à HH:mm",
          { locale: fr }
        );
        doc.text(
          `Clinique: ${inventaire.Clinique?.nomClinique || "Non spécifiée"}`,
          14,
          35
        );
        doc.text(`Date: ${dateInventaire}`, 14, 42);
        doc.text(
          `Réalisé par: ${inventaire.User?.name || "Utilisateur inconnu"}`,
          14,
          49
        );

        const stats = getInventaireStats(inventaire);
        doc.text(`Produits inventoriés: ${stats.totalProduits}`, 14, 56);
        doc.text(`Produits conformes: ${stats.produitsValides}`, 14, 63);
        doc.text(`Anomalies détectées: ${stats.totalAnomalies}`, 14, 70);
        doc.text(`Écart total: ${stats.totalEcart} unités`, 14, 77);

        // Tableau des produits
        const tableData = inventaire.detailInventaire.map((detail, index) => ({
          index: index + 1,
          produit:
            produits.find((p) => p.id === detail.tarifProduit?.idProduit)
              ?.nomProduit || "Produit inconnu",
          theorique: detail.quantiteTheorique,
          reel: detail.quantiteReelle,
          ecart: detail.ecart,
          anomalies:
            detail.AnomalieInventaire && detail.AnomalieInventaire.length > 0
              ? detail.AnomalieInventaire.map(
                  (a) => a.description || "Sans description"
                ).join(", ")
              : "-",
        }));

        autoTable(doc, {
          head: [["N°", "Produit", "Théorique", "Réel", "Écart", "Anomalies"]],
          body: tableData.map((d) => [
            d.index.toString(),
            d.produit,
            d.theorique.toString(),
            d.reel.toString(),
            d.ecart > 0 ? `+${d.ecart}` : d.ecart.toString(),
            d.anomalies,
          ]),
          startY: 85,
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: "bold",
          },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 50 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 50 },
          },
          didDrawPage: (data) => {
            // Pied de page
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(
              `Page ${data.pageNumber} sur ${pageCount}`,
              doc.internal.pageSize.width / 2,
              doc.internal.pageSize.height - 10,
              { align: "center" }
            );
            doc.text(
              `Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", {
                locale: fr,
              })}`,
              14,
              doc.internal.pageSize.height - 10
            );
          },
        });

        // Nom du fichier
        const filename = `Historique_Inventaire_${
          inventaire.Clinique?.nomClinique?.replace(/\s+/g, "_") || "Inventaire"
        }_${format(new Date(inventaire.dateInventaire), "yyyy-MM-dd", {
          locale: fr,
        })}.pdf`;

        doc.save(filename);
        toast.success("PDF téléchargé avec succès!");
      } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        toast.error("Erreur lors de la génération du PDF");
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [produits]
  );

  // Suppression d'un inventaire
  const handleDeleteInventaire = async (
    inventaire: InventaireWithRelations
  ) => {
    if (!permission?.canDelete && user?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de Supprimer cet inventaire. Contactez un administrateur ou votre supérieur."
      );
      return null;
    }
    try {
      // Confirmation avant suppression
      const confirmDelete = confirm(
        "Êtes-vous sûr de vouloir supprimer cet inventaire ?"
      );
      if (!confirmDelete) {
        return;
      }

      setIsDeleting(true);

      // 1. D'abord supprimer toutes les anomalies liées aux détails
      const toutesLesAnomalies = inventaire.detailInventaire.flatMap(
        (detail) => detail.AnomalieInventaire
      );
      if (toutesLesAnomalies.length > 0) {
        const anomalieIds = toutesLesAnomalies.map((a) => a.id);
        await deleteAnomaliesByIds(anomalieIds);
      }

      // 2. Ensuite supprimer tous les détails d'inventaire
      if (inventaire.detailInventaire.length > 0) {
        const detailIds = inventaire.detailInventaire.map((d) => d.id);
        await deleteDetailInventairesByIds(detailIds);
      }

      // 3. Enfin supprimer l'inventaire lui-même
      await deleteInventaire(inventaire.id);

      toast.success("Inventaire supprimé avec succès");

      // Mettre à jour la liste locale
      setInventaires((prev) => prev.filter((inv) => inv.id !== inventaire.id));
      setInventairesFiltres((prev) =>
        prev.filter((inv) => inv.id !== inventaire.id)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de l'inventaire");
    } finally {
      setIsDeleting(false);
    }
  };

  // Voir les détails d'un inventaire
  const handleViewDetails = (inventaire: InventaireWithRelations) => {
    setSelectedInventaire(inventaire);
    setIsDetailDialogOpen(true);
  };

  // Skeleton pour le chargement
  const TableRowSkeleton = () => (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-24" />
      </TableCell>
    </TableRow>
  );

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom />
      </div>
    );
  }

  if (!hasAccess) return null;

  if (status === "loading") {
    return (
      <div className="space-y-4 p-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clinique</TableHead>
                  <TableHead>Réalisé par</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead>Écart total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRowSkeleton key={index} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Historique des inventaires
            </h1>
            <p className="text-muted-foreground">
              Consultez l'historique complet des inventaires réalisés
            </p>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Barre de recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par clinique, date, utilisateur..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtre par clinique */}
              <div className="w-full md:w-64">
                <Select
                  value={filtreClinique}
                  onValueChange={setFiltreClinique}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par clinique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les cliniques</SelectItem>
                    {cliniques.map((clinique) => (
                      <SelectItem key={clinique.id} value={clinique.id}>
                        {clinique.nomClinique}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre par statut */}
              <div className="w-full md:w-64">
                <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Complétés</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="with_anomalies">
                      Avec anomalies
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Résultats */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des inventaires</CardTitle>
            <CardDescription>
              {inventairesFiltres.length} inventaire(s) trouvé(s)
              {recherche && ` pour "${recherche}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clinique</TableHead>
                    <TableHead>Réalisé par</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Écart total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </TableBody>
              </Table>
            ) : inventairesFiltres.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clinique</TableHead>
                    <TableHead>Réalisé par</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Écart total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventairesFiltres
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )
                    .map((inventaire) => {
                      const status = getInventaireStatus(inventaire);
                      const stats = getInventaireStats(inventaire);
                      const dateFormatted = format(
                        new Date(inventaire.dateInventaire),
                        "dd/MM/yyyy HH:mm",
                        { locale: fr }
                      );

                      return (
                        <TableRow key={inventaire.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{dateFormatted}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {inventaire.id.substring(0, 8)}...
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {inventaire.Clinique?.nomClinique || "N/A"}
                          </TableCell>
                          <TableCell>
                            {inventaire.User?.name || "Utilisateur inconnu"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{stats.totalProduits} produits</span>
                              <span className="text-xs text-green-600">
                                {stats.produitsValides} conforme(s)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${
                                stats.totalEcart > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {stats.totalEcart > 0
                                ? `+${stats.totalEcart}`
                                : stats.totalEcart}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`
                            ${
                              status.color === "green"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : ""
                            }
                            ${
                              status.color === "red"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : ""
                            }
                            ${
                              status.color === "yellow"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : ""
                            }
                            ${
                              status.color === "gray"
                                ? "bg-gray-50 text-gray-700 border-gray-200"
                                : ""
                            }
                          `}
                            >
                              {status.label}
                            </Badge>
                            {stats.totalAnomalies > 0 && (
                              <span className="ml-2 text-xs text-red-600">
                                ({stats.totalAnomalies} anomalie
                                {stats.totalAnomalies > 1 ? "s" : ""})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(inventaire)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir les détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPDF(inventaire)}
                                >
                                  {isGeneratingPDF ? (
                                    <SpinnerCustom className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                  )}
                                  Télécharger PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={
                                    user?.role !== "ADMIN" ? "hidden" : ""
                                  }
                                  disabled={user?.role !== "ADMIN"}
                                  onClick={() =>
                                    handleDeleteInventaire(inventaire)
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Aucun inventaire trouvé
                </h3>
                <p className="text-muted-foreground">
                  {recherche ||
                  filtreClinique !== "all" ||
                  filtreStatut !== "all"
                    ? "Aucun inventaire ne correspond à vos critères de recherche."
                    : "Aucun inventaire n'a été réalisé pour le moment."}
                </p>
                {(recherche ||
                  filtreClinique !== "all" ||
                  filtreStatut !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setRecherche("");
                      setFiltreClinique("all");
                      setFiltreStatut("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && inventairesFiltres.length > 0 && (
              <div className="flex items-center justify-between px-2 py-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    Lignes par page:
                  </Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-17.5 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur{" "}
                    {Math.ceil(inventairesFiltres.length / itemsPerPage)}(
                    {inventairesFiltres.length} résultat
                    {inventairesFiltres.length > 1 ? "s" : ""})
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            Math.ceil(inventairesFiltres.length / itemsPerPage),
                            prev + 1
                          )
                        )
                      }
                      disabled={
                        currentPage >=
                        Math.ceil(inventairesFiltres.length / itemsPerPage)
                      }
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de détail */}
        <InventaireDetailDialog
          inventaire={selectedInventaire}
          produits={produits}
          tarifProduits={tarifProduits}
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
        />
      </div>

      {/* Overlay de suppression */}
      {isDeleting && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center w-full h-full"
          style={{ zIndex: 999 }}
        >
          <div className="bg-black/80 text-gray-300 opacity-90 rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl max-w-6xl max-h-full overflow-auto">
            <SpinnerCustom className="h-16 w-16 text-red-800" />
            <p className="text-lg font-semibold">Suppression en cours...</p>
            <p className="text-sm text-muted-foreground">Veuillez patienter</p>
          </div>
        </div>
      )}
    </>
  );
}
