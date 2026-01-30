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
import { useEffect, useState, useCallback, useRef } from "react";
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
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { InventaireDialog } from "@/components/inventaireDialog";
import {
  createInventaire,
  getRecentInventaires,
} from "@/lib/actions/inventaireActions";
import {
  createDetailInventaire,
  getAllDetailInventaireByTabIdDetailInventaire,
} from "@/lib/actions/detailInventaireActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Search, Printer, Download } from "lucide-react";
import { AnomalieInventaireDialog } from "@/components/anomalieInventaireDialog";
import { createAnomalie } from "@/lib/actions/anomalieActions";
import { SpinnerCustom } from "@/components/ui/spinner";
import { getOneUser } from "@/lib/actions/authActions";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";

// Déclarer l'interface pour jsPDF avec autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function DetailInventairePage() {
  const [listeTarifProduit, setListeTarifProduit] = useState<TarifProduit[]>(
    []
  );
  const [tarifsFiltres, setTarifsFiltres] = useState<TarifProduit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [idCliniques, setIdCliniques] = useState<string[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [detailInventaires, setDetailInventaires] = useState<
    DetailInventaire[]
  >([]);
  const [currentInventaire, setCurrentInventaire] = useState<Inventaire | null>(
    null
  );
  const [anomalies, setAnomalies] = useState<AnomalieInventaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [validatingProducts, setValidatingProducts] = useState<{
    [key: string]: boolean;
  }>({});
  const [adjustingProducts, setAdjustingProducts] = useState<{
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
  const [selectedClinique, setSelectedClinique] = useState<string>("");
  const [quantitesReelles, setQuantitesReelles] = useState<{
    [key: string]: number;
  }>({});

  const { data: session, status } = useSession();
  const idUser = session?.user?.id ?? "";
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      if (idUser) {
        try {
          const user = await getOneUser(idUser);
          setPrescripteur(user!);
          setIdCliniques(user?.idCliniques || []);
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
      if (!prescripteur) return;

      // Pour les non-admin, vérifier qu'ils ont des cliniques
      if (prescripteur.role !== "ADMIN" && !idCliniques.length) return;

      setIsLoading(true);
      try {
        const [userData, tarifs, produitsData, cliniquesData, inventairesData] =
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

        // Admin voit toutes les cliniques, les autres voient uniquement leurs cliniques
        if (prescripteur.role === "ADMIN") {
          setCliniques(cliniquesData);
        } else {
          setCliniques(cliniquesData.filter((c) => idCliniques.includes(c.id)));
        }

        // Filtrer les inventaires selon les cliniques de l'utilisateur
        let filteredInventaires = inventairesData;
        const allIdInventaire = inventairesData.map(
          (inventaire: { id: string }) => inventaire.id
        );

        if (userData?.role !== "ADMIN") {
          const tabCliniquesUser = userData?.idCliniques || [];
          filteredInventaires = inventairesData.filter(
            (inventaire: { idClinique: string }) =>
              tabCliniquesUser.includes(inventaire.idClinique)
          );
        }
        setInventaires(filteredInventaires);

        // Charger les détails d'inventaire
        const detail = await getAllDetailInventaireByTabIdDetailInventaire(
          allIdInventaire
        );
        setDetailInventaires(detail);

        // Charger les anomalies existantes
        const anomalyPromises = allIdInventaire.map(async (id: string) => {
          return [];
        });
        const anomaliesData = await Promise.all(anomalyPromises);
        setAnomalies(anomaliesData.flat());

        // Initialiser les quantités réelles avec les stocks actuels
        const initialQuantites: { [key: string]: number } = {};
        tarifs.forEach((tarif: { id: string; quantiteStock: number }) => {
          initialQuantites[tarif.id] = tarif.quantiteStock;
        });
        setQuantitesReelles(initialQuantites);

        console.log("Données chargées avec succès");
      } catch (error) {
        toast.error("Erreur lors du chargement des données.");
        console.error("Erreur détaillée:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [idUser, status, prescripteur, idCliniques]);

  // Filtrage des tarifs produits
  useEffect(() => {
    let filtered = listeTarifProduit;

    // Filtre par clinique sélectionnée
    if (selectedClinique) {
      filtered = filtered.filter(
        (tarif) => tarif.idClinique === selectedClinique
      );
    }

    // Filtre par clinique si un inventaire est sélectionné
    if (currentInventaire) {
      filtered = filtered.filter(
        (tarif) => tarif.idClinique === currentInventaire.idClinique
      );
    }

    // Filtre par recherche
    if (recherche.trim() !== "") {
      const termeRecherche = recherche.toLowerCase();
      filtered = filtered.filter((tarif) => {
        const produit = produits.find((p) => p.id === tarif.idProduit);
        const clinique = cliniques.find((c) => c.id === tarif.idClinique);

        return (
          produit?.nomProduit.toLowerCase().includes(termeRecherche) ||
          clinique?.nomClinique.toLowerCase().includes(termeRecherche) ||
          tarif.quantiteStock.toString().includes(termeRecherche)
        );
      });
    }

    setTarifsFiltres(filtered);
  }, [
    recherche,
    listeTarifProduit,
    produits,
    cliniques,
    currentInventaire,
    selectedClinique,
  ]);

  useEffect(() => {
    if (!prescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(prescripteur.id);
        const permInventaire = permissions.find(
          (p: { table: string }) => p.table === TableName.INVENTAIRE
        );
        setPermissionInventaire(permInventaire || null);

        const permDetail = permissions.find(
          (p: { table: string }) => p.table === TableName.DETAIL_INVENTAIRE
        );
        setPermissionDetailInventaire(permDetail || null);

        const permAjustement = permissions.find(
          (p: { table: string }) => p.table === TableName.AJUSTEMENT_STOCK
        );
        setPermissionAjustement(permAjustement || null);

        // Vérification de l'accès à la page
        if (permInventaire?.canRead || prescripteur.role === "ADMIN") {
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
  }, [prescripteur, router]);

  // Création d'un nouvel inventaire
  const handleCreateInventaire = useCallback(
    async (data: Partial<Inventaire>): Promise<Inventaire | null> => {
      if (!permissionInventaire?.canCreate && prescripteur?.role !== "ADMIN") {
        alert(
          "Vous n'avez pas la permission de créer cet inventaire. Contactez un administrateur ou votre supérieur."
        );
        return null;
      }

      if (!data.idClinique) {
        toast.error("Veuillez sélectionner une clinique");
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
          idClinique: data.idClinique,
          dateInventaire: dateISO,
          idUser: idUser,
        });

        if (!nouvelInventaire) {
          toast.error("Erreur lors de la création de l'inventaire");
          return null;
        }
        // Ajouter le nouvel inventaire à la liste et le sélectionner si date inventaire n'est pas passée de 2 jours
        const now = new Date();
        const twoDaysAgo = new Date(now);
        twoDaysAgo.setDate(now.getDate() - 2);

        if (nouvelInventaire.dateInventaire >= twoDaysAgo) {
          setCurrentInventaire(nouvelInventaire);
          setInventaires((prev) => [...prev, nouvelInventaire]);
          toast.success("Inventaire créé avec succès!");
        }
        return nouvelInventaire;
      } catch (error) {
        toast.error("Erreur lors de la création de l'inventaire");
        console.error(error);
        return null;
      }
    },
    [permissionInventaire?.canCreate, prescripteur?.role, idUser]
  );

  // Création d'une nouvelle anomalie
  const handleCreateAnomalie = useCallback(
    async (data: Partial<AnomalieInventaire>) => {
      if (!permissionAjustement?.canCreate && prescripteur?.role !== "ADMIN") {
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

      // Récupérer le détail d'inventaire pour obtenir la quantité réelle
      const detailInventaire = detailInventaires.find(
        (d) => d.id === data.idDetailInventaire
      );

      if (!detailInventaire) {
        toast.error("Détail d'inventaire introuvable");
        return null;
      }

      const quantiteReelleDetail = detailInventaire.quantiteReelle;

      // Marquer le produit comme en cours d'ajustement
      if (data.idTarifProduit) {
        setAdjustingProducts((prev) => ({
          ...prev,
          [data.idTarifProduit!]: true,
        }));
      }

      try {
        const nouvelAnomalie = await createAnomalie({
          id: uuid,
          idUser: idUser,
          idTarifProduit: data.idTarifProduit,
          idDetailInventaire: data.idDetailInventaire,
          quantiteManquante: data.quantiteManquante ?? 0,
          dateAnomalie: dateISO,
          description: data.description ?? null,
        });

        // Mettre à jour le stock avec la quantité réelle du détail d'inventaire
        await updateQuantiteStockTarifProduit(
          data.idTarifProduit,
          quantiteReelleDetail
        );

        // Mettre à jour la liste des tarifs produits après ajustement
        setListeTarifProduit((prev) =>
          prev.map((tarif) => {
            if (tarif.id === data.idTarifProduit) {
              return {
                ...tarif,
                quantiteStock: quantiteReelleDetail,
              };
            }
            return tarif;
          })
        );

        // Mettre à jour les quantités réelles
        if (data.idTarifProduit) {
          setQuantitesReelles((prev) => ({
            ...prev,
            [data.idTarifProduit as string]: quantiteReelleDetail,
          }));
        }

        setAnomalies((prev) => [...prev, nouvelAnomalie]);
        toast.success("Anomalie créée avec succès!");
        return nouvelAnomalie;
      } catch (error) {
        toast.error("Erreur lors de la création de l'anomalie");
        console.error(error);
        return null;
      } finally {
        // Fin de l'ajustement pour ce produit
        if (data.idTarifProduit) {
          setAdjustingProducts((prev) => ({
            ...prev,
            [data.idTarifProduit!]: false,
          }));
        }
      }
    },
    [
      permissionAjustement?.canCreate,
      prescripteur?.role,
      idUser,
      detailInventaires,
    ]
  );

  // Gestion du changement de quantité réelle
  const handleQuantiteReelleChange = useCallback(
    (tarifId: string, value: string) => {
      const quantite = Number(value);
      if (!isNaN(quantite) && quantite >= 0) {
        setQuantitesReelles((prev) => ({
          ...prev,
          [tarifId]: quantite,
        }));
      }
    },
    []
  );

  // Validation d'un produit dans l'inventaire
  const handleValiderProduit = useCallback(
    async (tarifProduit: TarifProduit) => {
      if (
        !permissionDetailInventaire?.canCreate &&
        prescripteur?.role !== "ADMIN"
      ) {
        alert(
          "Vous n'avez pas la permission de créer les détails d'inventaire. Contactez un administrateur."
        );
        return;
      }

      if (!currentInventaire) {
        toast.error("Veuillez sélectionner un inventaire en cours.");
        setValidatingProducts((prev) => ({
          ...prev,
          [tarifProduit.id]: false,
        }));
        return;
      }

      // Vérifier si le produit est déjà validé dans cet inventaire
      const isAlreadyValidated = detailInventaires.some(
        (d) =>
          d.idInventaire === currentInventaire.id &&
          d.idTarifProduit === tarifProduit.id
      );

      if (isAlreadyValidated) {
        toast.warning("Ce produit a déjà été validé dans cet inventaire.");
        return;
      }

      // Début de la validation pour ce produit spécifique
      setValidatingProducts((prev) => ({
        ...prev,
        [tarifProduit.id]: true,
      }));

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
    },
    [
      permissionDetailInventaire?.canCreate,
      prescripteur?.role,
      currentInventaire,
      detailInventaires,
      quantitesReelles,
      idUser,
    ]
  );

  // Gestion du changement d'inventaire
  const handleInventaireChange = useCallback(
    (value: string) => {
      if (value === "none") {
        setCurrentInventaire(null);
      } else {
        const selected = inventaires.find((i) => i.id === value);
        setCurrentInventaire(selected || null);
      }
    },
    [inventaires]
  );

  // Fonction pour télécharger en PDF (CORRIGÉE)
  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);

    try {
      toast.info("Génération du PDF en cours...");

      const cliniqueName = selectedClinique
        ? cliniques.find((c) => c.id === selectedClinique)?.nomClinique ||
          "Clinique inconnue"
        : "Toutes les cliniques";

      const dateInventaire = currentInventaire
        ? new Date(currentInventaire.dateInventaire).toLocaleDateString("fr-FR")
        : new Date().toLocaleDateString("fr-FR");

      // Initialiser le PDF
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
        // 60% de la largeur de la page (210mm) = 126mm
        const logoWidth = 126;
        const logoHeight = 15;
        const pageWidth = doc.internal.pageSize.width;
        const logoX = (pageWidth - logoWidth) / 2; // Centrer le logo
        doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);
      } catch (error) {
        console.warn("Impossible de charger le logo:", error);
      }

      // Ajouter l'en-tête
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("INVENTAIRE DES PRODUITS", 105, 37, { align: "center" });

      // Informations de l'inventaire
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Clinique: ${cliniqueName}`, 14, 46);
      doc.text(`Date: ${dateInventaire}`, 14, 52);
      if (recherche) {
        doc.text(`Recherche: "${recherche}"`, 14, 58);
      }
      doc.text(
        `Nombre de produits: ${tarifsFiltres.length}`,
        14,
        recherche ? 64 : 58
      );

      // Préparer les données du tableau
      const tableData = tarifsFiltres.map((item, index) => {
        const produit = produits.find((p) => p.id === item.idProduit);
        const clinique = cliniques.find((c) => c.id === item.idClinique);
        const quantiteTheorique = item.quantiteStock;

        return [
          (index + 1).toString(),
          produit?.nomProduit || "Inconnu",
          clinique?.nomClinique || "Inconnu",
          quantiteTheorique.toString(),
          "", // Quantité réelle vide
          "", // Écart vide
        ];
      });

      // Ajouter le tableau avec autoTable
      autoTable(doc, {
        head: [
          [
            "N°",
            "Produit",
            "Clinique",
            "Quantité théorique",
            "Quantité réelle",
            "Écart",
          ],
        ],
        body: tableData,
        startY: recherche ? 70 : 64,
        headStyles: {
          fillColor: [76, 175, 80] as [number, number, number], // Vert
          textColor: [255, 255, 255] as [number, number, number],
          fontSize: 10,
          fontStyle: "bold" as const,
        },
        bodyStyles: {
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245] as [number, number, number],
        },
        styles: {
          overflow: "linebreak" as const,
          cellWidth: "wrap" as const,
        },
        columnStyles: {
          0: { cellWidth: 15 }, // N°
          1: { cellWidth: 50 }, // Produit
          2: { cellWidth: 40 }, // Clinique
          3: { cellWidth: 30 }, // Quantité théorique
          4: { cellWidth: 30 }, // Quantité réelle
          5: { cellWidth: 25 }, // Écart
        },
        didDrawPage: (data: { pageNumber: number }) => {
          // Pied de page
          const pageCount: number = doc.getNumberOfPages();
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${data.pageNumber} sur ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" }
          );

          // Date de génération
          const now: Date = new Date();
          const generatedDate: string = now.toLocaleDateString("fr-FR");
          const generatedTime: string = now.toLocaleTimeString("fr-FR");
          doc.text(
            `Généré le ${generatedDate} à ${generatedTime}`,
            14,
            doc.internal.pageSize.height - 10
          );
        },
      });

      // Nom du fichier
      const filename = `Debut_Inventaire_${
        cliniqueName?.replace(/\s+/g, "_") || "Inventaire"
      }_${dateInventaire.replace(/\//g, "-")}.pdf`;

      // Sauvegarder le PDF
      doc.save(filename);

      toast.success("PDF téléchargé avec succès!");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);

      // Message d'erreur plus spécifique
      if (error instanceof Error) {
        if (error.message.includes("jsPDF")) {
          toast.error("Erreur avec la bibliothèque PDF. Veuillez réessayer.");
        } else {
          toast.error(`Erreur lors de la génération du PDF: ${error.message}`);
        }
      } else {
        toast.error("Erreur inconnue lors de la génération du PDF");
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [
    tarifsFiltres,
    produits,
    cliniques,
    detailInventaires,
    currentInventaire,
    recherche,
    selectedClinique,
  ]);

  // Fonction pour imprimer les produits
  const handlePrintProducts = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const cliniqueName = selectedClinique
      ? cliniques.find((c) => c.id === selectedClinique)?.nomClinique ||
        "Clinique inconnue"
      : "Toutes les cliniques";

    const dateInventaire = currentInventaire
      ? new Date(currentInventaire.dateInventaire).toLocaleDateString("fr-FR")
      : new Date().toLocaleDateString("fr-FR");

    const produitsToDisplay = tarifsFiltres.map((item, index) => {
      const produit = produits.find((p) => p.id === item.idProduit);
      const clinique = cliniques.find((c) => c.id === item.idClinique);
      const detailInventaire = detailInventaires.find(
        (d) =>
          d.idTarifProduit === item.id &&
          d.idInventaire === currentInventaire?.id
      );
      const quantiteTheorique = item.quantiteStock;
      const quantiteReelle =
        detailInventaire?.quantiteReelle ??
        (quantitesReelles[item.id] || quantiteTheorique);
      const ecart =
        detailInventaire?.ecart ?? quantiteReelle - quantiteTheorique;

      return {
        index: index + 1,
        produit,
        clinique,
        quantiteTheorique,
        quantiteReelle,
        ecart,
      };
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventaire - ${cliniqueName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            .logo-container {
              text-align: center;
              margin-bottom: 20px;
            }
            .logo-container img {
              width: 60%;
              max-width: 600px;
              height: auto;
            }
            h1 {
              text-align: center;
              color: #333;
            }
            .header-info {
              text-align: center;
              margin-bottom: 20px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #4CAF50;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
            .ecart-positif {
              color: #2563eb;
              font-weight: bold;
            }
            .ecart-negatif {
              color: #dc2626;
              font-weight: bold;
            }
            .ecart-zero {
              color: #16a34a;
              font-weight: bold;
            }
            .print-button {
              display: none;
            }
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="logo-container">
            <img src="/LOGO_AIBEF_IPPF.png" alt="Logo AIBEF IPPF" />
          </div>
          <h1>Inventaire des Produits</h1>
          <div class="header-info">
            <p><strong>Clinique:</strong> ${cliniqueName}</p>
            <p><strong>Date:</strong> ${dateInventaire}</p>
            ${
              recherche
                ? `<p><strong>Recherche:</strong> "${recherche}"</p>`
                : ""
            }
            <p><strong>Nombre de produits:</strong> ${
              produitsToDisplay.length
            }</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Produit</th>
                <th>Clinique</th>
                <th>Quantité théorique</th>
                <th>Quantité réelle</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              ${produitsToDisplay
                .map(
                  (item) => `
                <tr>
                  <td>${item.index}</td>
                  <td>${item.produit?.nomProduit || "Inconnu"}</td>
                  <td>${item.clinique?.nomClinique || "Inconnu"}</td>
                  <td>${item.quantiteTheorique}</td>
                  <td></td>
                  <td></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, [
    tarifsFiltres,
    produits,
    cliniques,
    detailInventaires,
    currentInventaire,
    quantitesReelles,
    recherche,
    selectedClinique,
  ]);

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
      <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
    </TableRow>
  );

  // Afficher un loader pendant la vérification des permissions
  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom />
      </div>
    );
  }

  if (!hasAccess) return null;

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
    <div className="space-y-4 max-w-7xl p-2 sm:p-4 md:p-6 mx-auto">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">
          Détail de l'inventaire
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Select value={selectedClinique} onValueChange={setSelectedClinique}>
            <SelectTrigger className="w-full sm:w-50 bg-gray-50">
              <SelectValue placeholder="Sélectionner une clinique" />
            </SelectTrigger>
            <SelectContent>
              {cliniques.map((clinique) => (
                <SelectItem key={clinique.id} value={clinique.id}>
                  {clinique.nomClinique}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            disabled={
              !selectedClinique || isGeneratingPDF || tarifsFiltres.length === 0
            }
            className="w-full sm:w-auto"
          >
            {isGeneratingPDF ? (
              <>
                <SpinnerCustom className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Génération...</span>
                <span className="sm:hidden">PDF...</span>
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Télécharger PDF</span>
                <span className="sm:hidden">PDF</span>
              </>
            )}
          </Button>
          <Button
            onClick={handlePrintProducts}
            variant="outline"
            disabled={!selectedClinique || tarifsFiltres.length === 0}
            className="w-full sm:w-auto"
          >
            <Printer className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Imprimer</span>
            <span className="sm:hidden">Print</span>
          </Button>
          <InventaireDialog
            cliniques={cliniques}
            allInventaires={inventaires.filter((inv) =>
              idCliniques.includes(inv.idClinique)
            )}
            onCreateInventaire={handleCreateInventaire}
          >
            <Button disabled={!selectedClinique} className="w-full sm:w-auto">
              Nouvel Inventaire
            </Button>
          </InventaireDialog>
        </div>
      </div>

      {inventaires && inventaires.length > 0 && (
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Label
              htmlFor="select-inventaire"
              className="font-semibold text-blue-900 whitespace-nowrap text-sm sm:text-base"
            >
              Inventaire en cours :
            </Label>
            <Select
              value={currentInventaire?.id || "none"}
              onValueChange={handleInventaireChange}
            >
              <SelectTrigger
                id="select-inventaire"
                className="w-full sm:max-w-xs bg-white"
              >
                <SelectValue placeholder="Sélectionnez un inventaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sélectionnez un inventaire</SelectItem>
                {inventaires
                  .filter((inventaire) =>
                    selectedClinique
                      ? inventaire.idClinique === selectedClinique
                      : true
                  )
                  .map((inventaire) => {
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
          {currentInventaire && (
            <p className="text-xs sm:text-sm text-blue-700 mt-2 wrap-break-word">
              Inventaire sélectionné :{" "}
              {
                cliniques.find((c) => c.id === currentInventaire.idClinique)
                  ?.nomClinique
              }{" "}
              -
              {new Date(currentInventaire.dateInventaire).toLocaleDateString(
                "fr-FR"
              )}
            </p>
          )}
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="pl-10 text-sm sm:text-base"
        />
      </div>

      {/* Affichage du nombre de résultats */}
      {recherche && selectedClinique && (
        <div className="text-xs sm:text-sm text-muted-foreground">
          {tarifsFiltres.length} produit(s) trouvé(s) pour "{recherche}"
        </div>
      )}

      {!selectedClinique ? (
        <div className="bg-blue-50 p-6 sm:p-8 rounded-lg border border-blue-200 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center mb-3 sm:mb-4">
            <Search className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">
            Sélectionnez une clinique
          </h3>
          <p className="text-xs sm:text-sm text-blue-700">
            Veuillez sélectionner une clinique pour afficher les produits
            disponibles.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 p-2 sm:p-4 rounded-lg overflow-x-auto">
          <Table className="min-w-200">
            <TableHeader>
              <TableRow>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  N°
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Produit
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Clinique
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Qté théorique
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Qté réelle
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Écart
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Actions
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                  Ajustement
                </TableCell>
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
                  const detailInventaire = detailInventaires.find(
                    (d) =>
                      d.idTarifProduit === item.id &&
                      d.idInventaire === currentInventaire?.id
                  );
                  const idDetailInventaire = detailInventaire?.id;
                  const quantiteTheorique = item.quantiteStock;
                  const quantiteReelle =
                    quantitesReelles[item.id] || quantiteTheorique;
                  const ecart = quantiteReelle - quantiteTheorique;

                  const isValidating = validatingProducts[item.id] || false;
                  const isAdjusting = adjustingProducts[item.id] || false;

                  // Vérifier si le produit est déjà validé
                  const isAlreadyValidated = !!detailInventaire;
                  // Vérifier si une anomalie existe déjà pour ce détail
                  const hasAnomalie = anomalies.some(
                    (a) => a.idDetailInventaire === idDetailInventaire
                  );

                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs sm:text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {produit?.nomProduit || "Inconnu"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {clinique?.nomClinique || "Inconnu"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {quantiteTheorique}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={
                            isAlreadyValidated
                              ? detailInventaire?.quantiteReelle ||
                                quantiteReelle
                              : quantiteReelle
                          }
                          onChange={(e) =>
                            handleQuantiteReelleChange(item.id, e.target.value)
                          }
                          className="w-20 sm:w-24 text-xs sm:text-sm"
                          disabled={isAlreadyValidated || !currentInventaire}
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const detailInventaire = detailInventaires.find(
                            (d) =>
                              d.idInventaire === currentInventaire?.id &&
                              d.idTarifProduit === item.id
                          );
                          const ecartFinal = detailInventaire?.ecart ?? ecart;

                          return (
                            <span
                              className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${
                                ecartFinal === 0
                                  ? "bg-green-100 text-green-800"
                                  : ecartFinal > 0
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {ecartFinal > 0 ? `+${ecartFinal}` : ecartFinal}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant={isAlreadyValidated ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleValiderProduit(item)}
                            disabled={
                              !currentInventaire ||
                              isAlreadyValidated ||
                              isValidating
                            }
                            className={
                              isAlreadyValidated
                                ? "bg-green-500 text-white hover:bg-green-600 text-xs sm:text-sm px-2 sm:px-3"
                                : "text-xs sm:text-sm px-2 sm:px-3"
                            }
                            style={isValidating ? { width: "50px" } : {}}
                          >
                            {isValidating ? (
                              <SpinnerCustom />
                            ) : isAlreadyValidated ? (
                              "Validé"
                            ) : (
                              "Valider"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 sm:gap-2">
                          <AnomalieInventaireDialog
                            quantiteReelle={
                              detailInventaire?.quantiteReelle || ecart
                            }
                            ecart={detailInventaire?.ecart || ecart}
                            idDetailInventaire={idDetailInventaire || ""}
                            idTarifProduit={idTarifProduit}
                            produit={produit?.nomProduit || "Inconnu"}
                            idUser={idUser}
                            onCreateAnomalie={handleCreateAnomalie}
                          >
                            <Button
                              variant="default"
                              size="sm"
                              disabled={
                                !currentInventaire ||
                                !isAlreadyValidated ||
                                !detailInventaire ||
                                detailInventaire.quantiteReelle ===
                                  quantiteTheorique ||
                                hasAnomalie ||
                                isAdjusting
                              }
                              className="text-xs sm:text-sm px-2 sm:px-3"
                              style={isAdjusting ? { width: "50px" } : {}}
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
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 sm:py-8 text-xs sm:text-sm"
                  >
                    {recherche
                      ? "Aucun produit trouvé pour votre recherche."
                      : "Aucun tarif produit trouvé."}
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
