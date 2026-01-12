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
  CommandeFournisseur,
  DetailCommande,
  Clinique,
  User,
  TarifProduit,
  Produit,
  Permission,
  TableName,
} from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Search,
  Download,
  Eye,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  deleteCommandeFournisseur,
  getAllCommandesFournisseur,
} from "@/lib/actions/commandeFournisseurActions";
// import {
//   deleteDetailCommandesByIds,
//   getAllDetailCommandeByCommandeId,
// } from "@/lib/actions/detailCommandeActions";
import { getOneUser } from "@/lib/actions/authActions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CommandeDetailDialog } from "@/components/CommandeDetailDialog";
import { SpinnerCustom } from "@/components/ui/spinner";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllTarifProduits } from "@/lib/actions/tarifProduitActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import {
  deleteDetailCommandesByIds,
  getAllDetailCommandeByCommandeId,
} from "@/lib/actions/detailCommandeActions";

// Types étendus pour inclure les relations
type CommandeFournisseurWithRelations = CommandeFournisseur & {
  Clinique: Clinique;
  detailCommande: (DetailCommande & {
    User: User;
    tarifProduit: TarifProduit & {
      produit?: Produit;
    };
  })[];
};

export default function HistoriqueCommandesPage() {
  const [commandes, setCommandes] = useState<
    CommandeFournisseurWithRelations[]
  >([]);
  const [commandesFiltrees, setCommandesFiltrees] = useState<
    CommandeFournisseurWithRelations[]
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
  const [selectedCommande, setSelectedCommande] =
    useState<CommandeFournisseurWithRelations | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";
  const router = useRouter();

  // Récupération de l'utilisateur courant
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

  // Vérification des permissions
  useEffect(() => {
    if (!user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(user.id);
        const permCommande = permissions.find(
          (p: { table: string }) => p.table === TableName.COMMANDE_FOURNISSEUR
        );
        setPermission(permCommande || null);

        if (permCommande?.canRead || user.role === "ADMIN") {
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

  // Chargement des données initiales
  useEffect(() => {
    const fetchData = async () => {
      if (status === "loading") return;
      if (!user) return;

      // Pour les non-admin, vérifier qu'ils ont des cliniques
      if (user.role !== "ADMIN" && !idCliniques.length) return;

      setIsLoading(true);
      try {
        const [cliniquesData, commandesData, produit, tarifProduit] =
          await Promise.all([
            getAllClinique(),
            getAllCommandesFournisseur(),
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

        // Filtrer les commandes par cliniques autorisées
        let commandesAutorisees = commandesData;
        if (user.role !== "ADMIN") {
          commandesAutorisees = commandesData.filter((cmd) =>
            idCliniques.includes(cmd.idClinique)
          );
        }

        // Charger les détails et relations pour chaque commande
        const commandesCompletes = await Promise.all(
          commandesAutorisees.map(async (commande) => {
            const details = await getAllDetailCommandeByCommandeId(commande.id);

            // Charger les utilisateurs et enrichir les relations pour chaque détail
            const detailsWithRelations = await Promise.all(
              (details || []).map(async (detail) => {
                const detailUser = await getOneUser(detail.idUser);
                const tarifProduitData = tarifProduit.find(
                  (tp) => tp.id === detail.idTarifProduit
                );
                const produitData = produit.find(
                  (p) => p.id === tarifProduitData?.idProduit
                );

                return {
                  ...detail,
                  User: detailUser || ({} as User),
                  tarifProduit: tarifProduitData
                    ? {
                        ...tarifProduitData,
                        produit: produitData || ({} as Produit),
                      }
                    : undefined,
                };
              })
            );

            return {
              ...commande,
              Clinique:
                cliniquesData.find((c) => c.id === commande.idClinique) ||
                ({} as Clinique),
              detailCommande: detailsWithRelations,
            } as CommandeFournisseurWithRelations;
          })
        );

        // Trier par date décroissante
        commandesCompletes.sort(
          (a, b) =>
            new Date(b.dateCommande).getTime() -
            new Date(a.dateCommande).getTime()
        );

        setCommandes(commandesCompletes);
        setCommandesFiltrees(commandesCompletes);
      } catch (error) {
        toast.error("Erreur lors du chargement de l'historique des commandes.");
        console.error("Erreur détaillée:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status, idUser, idCliniques, user]);

  // Filtrage des commandes
  useEffect(() => {
    let filtered = commandes;

    // Filtre par recherche
    if (recherche.trim() !== "") {
      const termeRecherche = recherche.toLowerCase();
      filtered = filtered.filter((commande) => {
        const cliniqueNom = commande.Clinique?.nomClinique?.toLowerCase() || "";
        const dateStr = format(new Date(commande.dateCommande), "dd/MM/yyyy", {
          locale: fr,
        });

        return (
          cliniqueNom.includes(termeRecherche) ||
          dateStr.includes(termeRecherche) ||
          commande.id.toLowerCase().includes(termeRecherche)
        );
      });
    }

    // Filtre par clinique
    if (filtreClinique !== "all") {
      filtered = filtered.filter(
        (commande) => commande.idClinique === filtreClinique
      );
    }

    // Filtre par statut (ajuster selon vos besoins)
    if (filtreStatut !== "all") {
      filtered = filtered.filter((commande) => {
        // Exemple de logique de statut basée sur les quantités
        const totalProduits = commande.detailCommande.length;
        const produitsCommandes = commande.detailCommande.reduce(
          (sum, d) => sum + d.quantiteCommandee,
          0
        );
        const produitsInitials = commande.detailCommande.reduce(
          (sum, d) => sum + d.quantiteInitiale,
          0
        );

        if (filtreStatut === "completed") {
          return produitsCommandes > 0 && produitsCommandes >= produitsInitials;
        } else if (filtreStatut === "pending") {
          return produitsCommandes < produitsInitials;
        } else if (filtreStatut === "empty") {
          return totalProduits === 0;
        }
        return true;
      });
    }

    setCommandesFiltrees(filtered);
    setCurrentPage(1);
  }, [recherche, filtreClinique, filtreStatut, commandes]);

  // Fonction pour obtenir le statut d'une commande
  const getCommandeStatus = (commande: CommandeFournisseurWithRelations) => {
    const totalProduits = commande.detailCommande.length;
    if (totalProduits === 0) return { label: "Vide", color: "gray" };

    const totalCommandee = commande.detailCommande.reduce(
      (sum, d) => sum + d.quantiteCommandee,
      0
    );
    const totalInitiale = commande.detailCommande.reduce(
      (sum, d) => sum + d.quantiteInitiale,
      0
    );

    if (totalCommandee === 0) return { label: "Non traitée", color: "yellow" };
    if (totalCommandee >= totalInitiale)
      return { label: "Complète", color: "green" };
    return { label: "Partielle", color: "blue" };
  };

  // Fonction pour obtenir les statistiques d'une commande
  const getCommandeStats = (commande: CommandeFournisseurWithRelations) => {
    const totalProduits = commande.detailCommande.length;
    const totalInitiale = commande.detailCommande.reduce(
      (sum, d) => sum + d.quantiteInitiale,
      0
    );
    const totalCommandee = commande.detailCommande.reduce(
      (sum, d) => sum + d.quantiteCommandee,
      0
    );
    // const difference = totalCommandee - totalInitiale;

    // return { totalProduits, totalInitiale, totalCommandee, difference };
    return { totalProduits, totalInitiale, totalCommandee };
  };

  // Télécharger le PDF d'une commande
  const handleDownloadPDF = useCallback(
    async (commande: CommandeFournisseurWithRelations) => {
      setIsGeneratingPDF(true);

      try {
        toast.info("Génération du PDF en cours...");

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Ajouter le logo
        try {
          const logo = new Image();
          logo.src = "/LOGO_AIBEF_IPPF.png";
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
          });
          const logoWidth = 126;
          const logoHeight = 15;
          const pageWidth = doc.internal.pageSize.width;
          const logoX = (pageWidth - logoWidth) / 2;
          doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);
        } catch (error) {
          console.warn("Impossible de charger le logo:", error);
        }

        // En-tête
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("BON DE COMMANDE FOURNISSEUR", 105, 37, { align: "center" });

        // Informations générales
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);

        const dateCommande = format(
          new Date(commande.dateCommande),
          "dd/MM/yyyy à HH:mm",
          { locale: fr }
        );
        doc.text(
          `Clinique: ${commande.Clinique?.nomClinique || "Non spécifiée"}`,
          14,
          48
        );
        doc.text(`Date: ${dateCommande}`, 14, 55);
        doc.text(`N° Commande: ${commande.id.substring(0, 8)}...`, 14, 62);

        const stats = getCommandeStats(commande);
        doc.text(`Produits référencés: ${stats.totalProduits}`, 14, 69);
        doc.text(`Quantité initiale: ${stats.totalInitiale}`, 14, 76);
        doc.text(`Quantité commandée: ${stats.totalCommandee}`, 14, 83);
        doc.text(
          `Nouvelle Qté: ${stats.totalCommandee + stats.totalInitiale}`,
          14,
          90
        );

        // Tableau des produits
        const tableData = commande.detailCommande.map((detail, index) => ({
          index: index + 1,
          produit:
            produits.find((p) => p.id === detail.tarifProduit?.idProduit)
              ?.nomProduit || "Produit inconnu",
          initiale: detail.quantiteInitiale,
          commandee: detail.quantiteCommandee,
          "Nouvelle Qté": detail.quantiteCommandee + detail.quantiteInitiale,
          responsable: detail.User?.name || "Non spécifié",
        }));

        autoTable(doc, {
          head: [
            [
              "N°",
              "Produit",
              "Initiale",
              "Commandée",
              "Nouvelle Qté",
              "Responsable",
            ],
          ],
          body: tableData.map((d) => [
            d.index.toString(),
            d.produit,
            d.initiale.toString(),
            d.commandee.toString(),
            d["Nouvelle Qté"].toString(),
            d.responsable,
          ]),
          startY: 98,
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
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 35 },
          },
          didDrawPage: (data) => {
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

        const filename = `Commande_Fournisseur_${
          commande.Clinique?.nomClinique?.replace(/\s+/g, "_") || "Commande"
        }_${format(new Date(commande.dateCommande), "yyyy-MM-dd", {
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

  // Suppression d'une commande
  const handleDeleteCommande = async (
    commande: CommandeFournisseurWithRelations
  ) => {
    if (!permission?.canDelete && user?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer cette commande. Contactez un administrateur ou votre supérieur."
      );
      return;
    }

    try {
      const confirmDelete = confirm(
        "Êtes-vous sûr de vouloir supprimer cette commande ?"
      );
      if (!confirmDelete) return;

      setIsDeleting(true);

      // 1. Supprimer tous les détails de commande
      if (commande.detailCommande.length > 0) {
        const detailIds = commande.detailCommande.map((d) => d.id);
        await deleteDetailCommandesByIds(detailIds);
      }

      // 2. Supprimer la commande elle-même
      await deleteCommandeFournisseur(commande.id);

      toast.success("Commande supprimée avec succès");

      // Mettre à jour la liste locale
      setCommandes((prev) => prev.filter((cmd) => cmd.id !== commande.id));
      setCommandesFiltrees((prev) =>
        prev.filter((cmd) => cmd.id !== commande.id)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de la commande");
    } finally {
      setIsDeleting(false);
    }
  };

  // Voir les détails d'une commande
  const handleViewDetails = (commande: CommandeFournisseurWithRelations) => {
    setSelectedCommande(commande);
    setIsDetailDialogOpen(true);
  };

  // Créer une nouvelle commande
  const handleCreateNewCommande = () => {
    if (!permission?.canCreate && user?.role !== "ADMIN") {
      alert("Vous n'avez pas la permission de créer une commande.");
      return;
    }
    router.push("/commandes/nouvelle");
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
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
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
      <div className="space-y-4 p-2 sm:p-4 max-w-7xl mx-auto">
        <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 mb-4 sm:mb-6" />
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-40" />
          <Skeleton className="h-10 w-full sm:w-40" />
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
                  <TableHead>Produits</TableHead>
                  <TableHead>Quantité</TableHead>
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
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Historique des commandes fournisseurs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Consultez et gérez l'historique des commandes auprès des
              fournisseurs
            </p>
          </div>
          {/* {(permission?.canCreate || user?.role === "ADMIN") && (
            <Button onClick={handleCreateNewCommande}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle commande
            </Button>
          )} */}
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-col md:flex-row gap-2 sm:gap-4">
              {/* Barre de recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>

              {/* Filtre par clinique */}
              <div className="w-full sm:w-full md:w-64">
                <Select
                  value={filtreClinique}
                  onValueChange={setFiltreClinique}
                >
                  <SelectTrigger className="w-full text-sm">
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
              <div className="w-full sm:w-full md:w-64">
                <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Complètes</SelectItem>
                    <SelectItem value="pending">Partielles</SelectItem>
                    <SelectItem value="empty">Vides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Résultats */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">
              Liste des commandes
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {commandesFiltrees.length} commande(s) trouvée(s)
              {recherche && ` pour "${recherche}"`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 md:p-6">
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clinique</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Quantité</TableHead>
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
            ) : commandesFiltrees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="min-w-200">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                        Date
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                        Clinique
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                        Produits
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                        Quantité
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">
                        Statut
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commandesFiltrees
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      .map((commande) => {
                        const status = getCommandeStatus(commande);
                        const stats = getCommandeStats(commande);
                        const dateFormatted = format(
                          new Date(commande.dateCommande),
                          "dd/MM/yyyy HH:mm",
                          { locale: fr }
                        );

                        return (
                          <TableRow key={commande.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              <div className="flex flex-col">
                                <span>{dateFormatted}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  ID: {commande.id.substring(0, 8)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {commande.Clinique?.nomClinique || "N/A"}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <div className="flex flex-col">
                                <span>{stats.totalProduits} produits</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  Initiale: {stats.totalInitiale}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {stats.totalCommandee} commandés
                                </span>
                                <span
                                // className={`text-[10px] sm:text-xs ${
                                //   stats.difference > 0
                                //     ? "text-green-600"
                                //     : stats.difference < 0
                                //     ? "text-red-600"
                                //     : "text-muted-foreground"
                                // }`}
                                >
                                  {/* {stats.difference > 0
                                    ? `+${stats.difference}`
                                    : stats.difference} */}
                                  {"Total: " +
                                    (stats.totalCommandee +
                                      stats.totalInitiale)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] sm:text-xs
                            ${
                              status.color === "green"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : ""
                            }
                            ${
                              status.color === "blue"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
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
                                    onClick={() => handleViewDetails(commande)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir les détails
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDownloadPDF(commande)}
                                  >
                                    {isGeneratingPDF ? (
                                      <SpinnerCustom className="mr-2 h-4 w-4" />
                                    ) : (
                                      <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Télécharger PDF
                                  </DropdownMenuItem>
                                  {(permission?.canDelete ||
                                    user?.role === "ADMIN") && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteCommande(commande)
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                  <Search className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  Aucune commande trouvée
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {recherche ||
                  filtreClinique !== "all" ||
                  filtreStatut !== "all"
                    ? "Aucune commande ne correspond à vos critères de recherche."
                    : "Aucune commande n'a été créée pour le moment."}
                </p>
                {(recherche ||
                  filtreClinique !== "all" ||
                  filtreStatut !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-3 sm:mt-4 text-xs sm:text-sm"
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
            {!isLoading && commandesFiltrees.length > 0 && (
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
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Page {currentPage} sur{" "}
                    {Math.ceil(commandesFiltrees.length / itemsPerPage)}(
                    {commandesFiltrees.length} résultat
                    {commandesFiltrees.length > 1 ? "s" : ""})
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
                          Math.min(
                            Math.ceil(commandesFiltrees.length / itemsPerPage),
                            prev + 1
                          )
                        )
                      }
                      disabled={
                        currentPage >=
                        Math.ceil(commandesFiltrees.length / itemsPerPage)
                      }
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

        {/* Dialog de détail */}
        <CommandeDetailDialog
          commande={selectedCommande}
          produits={produits}
          tarifProduits={tarifProduits}
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
        />
      </div>

      {/* Overlay de suppression */}
      {isDeleting && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center w-full h-full px-4"
          style={{ zIndex: 999 }}
        >
          <div className="bg-black/80 text-gray-300 opacity-90 rounded-lg p-6 sm:p-8 flex flex-col items-center gap-3 sm:gap-4 shadow-xl max-w-sm sm:max-w-6xl max-h-full overflow-auto">
            <SpinnerCustom className="h-12 w-12 sm:h-16 sm:w-16 text-red-800" />
            <p className="text-base sm:text-lg font-semibold">
              Suppression en cours...
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Veuillez patienter
            </p>
          </div>
        </div>
      )}
    </>
  );
}
