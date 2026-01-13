"use client";

import React, { useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { fetchVentesData } from "@/lib/actions/venteActions";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// ====================== TYPES ======================
import type {
  FactureExamenType,
  FactureProduitType,
  FacturePrestationType,
  FactureEchographieType,
} from "@/lib/actions/venteActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  Examen,
  Prestation,
  Produit,
  TarifExamen,
  TarifPrestation,
  TarifProduit,
} from "@prisma/client";
import { getAllExamen } from "@/lib/actions/examenActions";
import { getAllProduits } from "@/lib/actions/produitActions";
import { getAllPrestation } from "@/lib/actions/prestationActions";
import { getAllTarifExamen } from "@/lib/actions/tarifExamenActions";
import { getAllTarifProduits } from "@/lib/actions/tarifProduitActions";
import { getAllTarifPrestation } from "@/lib/actions/tarifPrestationActions";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

// ====================== INTERFACES ======================
interface CliniqueOption {
  value: string;
  label: string;
}

interface GroupedExamen {
  libelle: string;
  remise: number;
  soustraitance: boolean;
  prixUnitaire: number;
  quantite: number;
  montant: number;
}

interface GroupedEchographie {
  libelle: string;
  remise: number;
  prixUnitaire: number;
  quantite: number;
  montant: number;
}

interface ProduitCalculations {
  prixUnitaire: number;
  quantite: number;
  montant: number;
  stockFinal: number;
}

// react-select importé seulement côté client
const Select = dynamic(() => import("react-select"), { ssr: false });

const FormValuesSchema = z.object({
  dateDebut: z.string().nonempty("Date de début requise"),
  dateFin: z.string().nonempty("Date de fin requise"),
  idCliniques: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .min(1, "Sélectionnez au moins une clinique"),
});

type FormValuesType = z.infer<typeof FormValuesSchema>;

// ====================== COMPOSANT ======================
export default function VentesPage() {
  const [facturesExamens, setFacturesExamens] = useState<FactureExamenType[]>(
    []
  );
  const [facturesProduits, setFacturesProduits] = useState<
    FactureProduitType[]
  >([]);
  const [facturesPrestations, setFacturesPrestations] = useState<
    FacturePrestationType[]
  >([]);
  const [facturesEchographies, setFacturesEchographies] = useState<
    FactureEchographieType[]
  >([]);
  const [spinner, setSpinner] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  const [selectedCliniqueIds, setSelectedCliniqueIds] = useState<string[]>([]);
  const [allExamens, setAllExamens] = useState<Examen[]>([]);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [allPrestations, setAllPrestations] = useState<Prestation[]>([]);
  const [allTarifExamens, setAllTarifExamens] = useState<TarifExamen[]>([]);
  const [allTarifProduits, setAllTarifProduits] = useState<TarifProduit[]>([]);
  const [allTarifPrestations, setAllTarifPrestations] = useState<
    TarifPrestation[]
  >([]);
  const [cliniques, setCliniques] = useState<CliniqueOption[]>([]);

  const { data: session } = useSession();
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValuesType>({
    resolver: zodResolver(FormValuesSchema),
    defaultValues: {
      idCliniques: [],
      dateDebut: new Date().toISOString().split("T")[0],
      dateFin: new Date().toISOString().split("T")[0],
    },
  });

  // Charger toutes les données initiales en parallèle
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingInitialData(true);
        setError(null);

        const [
          cliniquesData,
          exams,
          produits,
          prestations,
          tarifsExam,
          tarifsProd,
          tarifsPrest,
        ] = await Promise.all([
          getAllClinique(),
          getAllExamen(),
          getAllProduits(),
          getAllPrestation(),
          getAllTarifExamen(),
          getAllTarifProduits(),
          getAllTarifPrestation(),
        ]);

        setCliniques(
          cliniquesData.map((clinique: any) => ({
            value: clinique.id,
            label: clinique.nomClinique,
          }))
        );

        setAllExamens(exams);
        setAllProduits(produits);
        setAllPrestations(prestations);
        setAllTarifExamens(tarifsExam);
        setAllTarifProduits(tarifsProd);
        setAllTarifPrestations(tarifsPrest);
      } catch (err) {
        console.error("Erreur lors du chargement des données initiales:", err);
        setError(
          "Impossible de charger les données initiales. Veuillez rafraîchir la page."
        );
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    loadInitialData();
  }, []);

  const onSubmit: SubmitHandler<FormValuesType> = async (data) => {
    const { idCliniques, dateDebut, dateFin } = data;

    // Validation des dates
    if (!dateDebut || !dateFin) {
      setError("Les dates sont requises");
      return;
    }

    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Dates invalides");
      return;
    }

    if (startDate > endDate) {
      setError("La date de début doit être antérieure à la date de fin");
      return;
    }

    const selectedIds = idCliniques.map((cl) => cl.value);
    setSelectedCliniqueIds(selectedIds);
    setSpinner(true);
    setError(null);

    try {
      const result = await fetchVentesData(selectedIds, startDate, endDate);

      setFacturesExamens(result.facturesExamens || []);
      setFacturesProduits(result.facturesProduits || []);
      setFacturesPrestations(result.facturesPrestations || []);
      setFacturesEchographies(result.facturesEchographies || []);
    } catch (err) {
      console.error("Erreur lors du chargement des ventes:", err);
      setError(
        "Échec du chargement des ventes. Veuillez vérifier vos paramètres et réessayer."
      );
    } finally {
      setSpinner(false);
    }
  };

  // ================== Fonctions helpers ==================
  const getTarifForClinique = useCallback(
    (tarifs: any[], cliniqueId: string) => {
      return tarifs.find((t) => t.idClinique === cliniqueId);
    },
    []
  );

  // ================== Calculs pour les examens ==================
  const examensCalculations = useMemo(() => {
    const calculations: Record<
      string,
      { prixUnitaire: number; quantite: number; montant: number }
    > = {};

    if (selectedCliniqueIds.length === 0) return calculations;

    facturesExamens.forEach((facture) => {
      const key = facture.examLibelle;
      if (!calculations[key]) {
        calculations[key] = {
          prixUnitaire: 0,
          quantite: 0,
          montant: 0,
        };
      }
      calculations[key].quantite += 1;
      calculations[key].montant += facture.examPrixTotal;
    });

    // Calculer les prix unitaires
    Object.keys(calculations).forEach((libelle) => {
      const examen = allExamens.find((ex) => ex.nomExamen === libelle);
      if (examen) {
        const tarifExamen = allTarifExamens.filter(
          (tarif) => tarif.idExamen === examen.id
        );
        const tarifClinique = getTarifForClinique(
          tarifExamen,
          selectedCliniqueIds[0]
        );
        calculations[libelle].prixUnitaire = tarifClinique
          ? tarifClinique.prixExamen
          : 0;
      }
    });

    return calculations;
  }, [
    facturesExamens,
    allExamens,
    allTarifExamens,
    selectedCliniqueIds,
    getTarifForClinique,
  ]);

  // ================== Calculs pour les prestations ==================
  const prestationsCalculations = useMemo(() => {
    const calculations: Record<
      string,
      { prixUnitaire: number; quantite: number; montant: number }
    > = {};

    if (selectedCliniqueIds.length === 0) return calculations;

    facturesPrestations.forEach((facture) => {
      const key = facture.prestLibelle;
      if (!calculations[key]) {
        calculations[key] = {
          prixUnitaire: 0,
          quantite: 0,
          montant: 0,
        };
      }
      calculations[key].quantite += 1;
      calculations[key].montant += facture.prestPrixTotal;
    });

    // Calculer les prix unitaires
    Object.keys(calculations).forEach((libelle) => {
      const prestation = allPrestations.find(
        (pr) => pr.nomPrestation === libelle
      );
      if (prestation) {
        const tarif = allTarifPrestations.filter(
          (t) => t.idPrestation === prestation.id
        );
        const tarifClinique = getTarifForClinique(
          tarif,
          selectedCliniqueIds[0]
        );
        calculations[libelle].prixUnitaire = tarifClinique
          ? tarifClinique.montantPrestation
          : 0;
      }
    });

    return calculations;
  }, [
    facturesPrestations,
    allPrestations,
    allTarifPrestations,
    selectedCliniqueIds,
    getTarifForClinique,
  ]);

  // ================== Calculs pour les produits ==================
  const produitsCalculations = useMemo(() => {
    const calculations: Record<string, ProduitCalculations> = {};

    if (selectedCliniqueIds.length === 0 || allTarifProduits.length === 0)
      return calculations;

    // Pré-calculer les mappings
    const tarifProduitMap = allTarifProduits.reduce((map, tarif) => {
      if (!map[tarif.idProduit]) {
        map[tarif.idProduit] = [];
      }
      map[tarif.idProduit].push(tarif);
      return map;
    }, {} as Record<string, TarifProduit[]>);

    // Traiter les factures de produits
    facturesProduits.forEach((facture) => {
      const tarif = allTarifProduits.find(
        (t) => t.id === facture.prodIdTarifProduit
      );
      if (tarif) {
        const produit = allProduits.find((p) => p.id === tarif.idProduit);
        if (produit) {
          const key = produit.nomProduit;
          if (!calculations[key]) {
            calculations[key] = {
              prixUnitaire: 0,
              quantite: 0,
              montant: 0,
              stockFinal: 0,
            };
          }
          calculations[key].quantite += facture.prodQuantite || 0;
          calculations[key].montant += facture.prodMontantTotal;
        }
      }
    });

    // Calculer les prix unitaires et stocks finaux
    allProduits.forEach((produit) => {
      const key = produit.nomProduit;
      if (!calculations[key]) {
        calculations[key] = {
          prixUnitaire: 0,
          quantite: 0,
          montant: 0,
          stockFinal: 0,
        };
      }

      const tarifs = tarifProduitMap[produit.id] || [];
      if (tarifs.length > 0 && selectedCliniqueIds.length > 0) {
        const tarifClinique = getTarifForClinique(
          tarifs,
          selectedCliniqueIds[0]
        );
        if (tarifClinique) {
          calculations[key].prixUnitaire = tarifClinique.prixUnitaire;
          calculations[key].stockFinal = tarifClinique.quantiteStock;
        }
      }
    });

    return calculations;
  }, [
    facturesProduits,
    allProduits,
    allTarifProduits,
    selectedCliniqueIds,
    getTarifForClinique,
  ]);

  // ================== Données groupées ==================
  const groupedExamens = useMemo(() => {
    return Object.values(
      facturesExamens.reduce((acc, examen) => {
        const isSousTraite = examen.examSoustraitanceExamen;
        const key = `${examen.examLibelle}-${isSousTraite}-${examen.examRemise}`;

        if (!acc[key]) {
          acc[key] = {
            libelle: examen.examLibelle,
            remise: isSousTraite ? 0 : examen.examRemise,
            soustraitance: isSousTraite,
            prixUnitaire: examen.examPrixTotal,
            quantite: 1,
            montant: examen.examPrixTotal,
          };
        } else {
          acc[key].quantite += 1;
          acc[key].montant += examen.examPrixTotal;
        }
        return acc;
      }, {} as Record<string, GroupedExamen>)
    ).sort((a, b) => {
      const cmpLibelle = a.libelle.localeCompare(b.libelle);
      if (cmpLibelle !== 0) return cmpLibelle;

      if (a.soustraitance !== b.soustraitance) {
        return a.soustraitance ? 1 : -1;
      }

      return a.remise - b.remise;
    });
  }, [facturesExamens]);

  const groupedEchographies = useMemo(() => {
    return Object.values(
      facturesEchographies.reduce((acc, echographie) => {
        const key = `${echographie.echoLibelle}-${echographie.echoRemise}`;
        if (!acc[key]) {
          acc[key] = {
            libelle: echographie.echoLibelle,
            remise: echographie.echoRemise,
            prixUnitaire: echographie.echoPrixTotal,
            quantite: 1,
            montant: echographie.echoPrixTotal,
          };
        } else {
          acc[key].quantite += 1;
          acc[key].montant += echographie.echoPrixTotal;
        }
        return acc;
      }, {} as Record<string, GroupedEchographie>)
    ).sort((a, b) => {
      const cmpLibelle = a.libelle.localeCompare(b.libelle);
      if (cmpLibelle !== 0) return cmpLibelle;
      return a.remise - b.remise;
    });
  }, [facturesEchographies]);

  const produitsGroupedByType = useMemo(() => {
    return allProduits.reduce((acc, produit) => {
      if (!acc[produit.typeProduit]) {
        acc[produit.typeProduit] = [];
      }
      acc[produit.typeProduit].push(produit);
      return acc;
    }, {} as Record<string, typeof allProduits>);
  }, [allProduits]);

  // ================== Fonctions utilitaires ==================
  const formatExamenLibelle = useCallback((examen: GroupedExamen) => {
    let libelleFormate = examen.libelle;

    if (examen.remise > 0 && !examen.soustraitance) {
      libelleFormate += ` ${examen.remise}%`;
    }

    if (examen.soustraitance) {
      libelleFormate += " ST";
    }

    return libelleFormate;
  }, []);

  const getCliniqueNameById = useCallback(
    (id: string) => {
      const clinique = cliniques.find((cl) => cl.value === id);
      return clinique ? clinique.label : "Inconnu";
    },
    [cliniques]
  );

  const getAllCliniqueNameById = useCallback(
    (ids: string[]) => {
      return ids.map((id) => getCliniqueNameById(id)).join(", ");
    },
    [getCliniqueNameById]
  );

  // ================== Totaux ==================
  const totalRecette = useMemo(() => {
    return (
      facturesProduits.reduce((total, f) => total + f.prodMontantTotal, 0) +
      facturesPrestations.reduce((total, f) => total + f.prestPrixTotal, 0) +
      facturesExamens.reduce((total, f) => total + f.examPrixTotal, 0) +
      facturesEchographies.reduce((total, f) => total + f.echoPrixTotal, 0)
    );
  }, [
    facturesProduits,
    facturesPrestations,
    facturesExamens,
    facturesEchographies,
  ]);

  const totalProduitsQuantite = useMemo(() => {
    return facturesProduits.reduce(
      (total, f) => total + (f.prodQuantite || 0),
      0
    );
  }, [facturesProduits]);

  // ================== Impression et PDF ==================
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      toast.info("Génération du PDF en cours...");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      /* ================= LOGO ================= */
      try {
        const logo = new Image();
        logo.src = "/LOGO_AIBEF_IPPF.png";

        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
        });

        const pageWidth = doc.internal.pageSize.width;
        const logoWidth = 120;
        const logoHeight = 15;
        doc.addImage(
          logo,
          "PNG",
          (pageWidth - logoWidth) / 2,
          10,
          logoWidth,
          logoHeight
        );
      } catch (e) {
        console.warn("Logo non chargé");
      }

      /* ================= TITRE ================= */
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("RAPPORT DE VENTE JOURNALIÈRE", 105, 35, { align: "center" });

      /* ================= INFOS ================= */
      doc.setFontSize(11);
      doc.setTextColor(80);

      doc.text(`Caissière : ${session?.user?.name || "Non spécifiée"}`, 14, 48);
      doc.text(
        `Clinique(s) : ${getAllCliniqueNameById(selectedCliniqueIds)}`,
        14,
        55
      );
      doc.text(
        `Période : ${format(new Date(watch("dateDebut")), "dd/MM/yyyy", {
          locale: fr,
        })}`,
        14,
        62
      );

      doc.text(
        `Total Recette : ${formatNumberForPDF(totalRecette)} FCFA`,
        14,
        72
      );

      let startY = 80;

      /* ================= PRODUITS ================= */
      const totalProduitsQuantite = Object.values(produitsCalculations).reduce(
        (sum, calc) => sum + calc.quantite,
        0
      );
      const totalProduitsMontant = Object.values(produitsCalculations).reduce(
        (sum, calc) => sum + calc.montant,
        0
      );

      autoTable(doc, {
        startY,
        head: [["Produit", "PU", "Qté", "Montant", "Stock Final"]],
        body: Object.entries(produitsCalculations).map(([libelle, calc]) => [
          libelle,
          formatNumberForPDF(calc.prixUnitaire),
          calc.quantite.toString(),
          formatNumberForPDF(calc.montant),
          calc.stockFinal.toString(),
        ]),
        foot: [
          [
            "TOTAL PRODUITS",
            "",
            totalProduitsQuantite.toString(),
            formatNumberForPDF(totalProduitsMontant),
            "",
          ],
        ],
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
        },
        styles: { fontSize: 9 },
        didDrawPage: () => {
          addFooter(doc);
        },
      });

      startY = (doc as any).lastAutoTable.finalY + 10;

      /* ================= PRESTATIONS ================= */
      const totalPrestationsQuantite = Object.values(
        prestationsCalculations
      ).reduce((sum, calc) => sum + calc.quantite, 0);
      const totalPrestationsMontant = Object.values(
        prestationsCalculations
      ).reduce((sum, calc) => sum + calc.montant, 0);

      autoTable(doc, {
        startY,
        head: [["Prestation", "PU", "Qté", "Montant"]],
        body: Object.entries(prestationsCalculations).map(([libelle, calc]) => [
          libelle,
          formatNumberForPDF(calc.prixUnitaire),
          calc.quantite.toString(),
          formatNumberForPDF(calc.montant),
        ]),
        foot: [
          [
            "TOTAL PRESTATIONS",
            "",
            totalPrestationsQuantite.toString(),
            formatNumberForPDF(totalPrestationsMontant),
          ],
        ],
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: 255,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
        },
        styles: { fontSize: 9 },
        didDrawPage: () => {
          addFooter(doc);
        },
      });

      startY = (doc as any).lastAutoTable.finalY + 10;

      /* ================= EXAMENS ================= */
      const totalExamensQuantite = groupedExamens.reduce(
        (sum, ex) => sum + ex.quantite,
        0
      );
      const totalExamensMontant = groupedExamens.reduce(
        (sum, ex) => sum + ex.montant,
        0
      );

      autoTable(doc, {
        startY,
        head: [["Examen", "PU", "Qté", "Montant"]],
        body: groupedExamens.map((ex) => [
          formatExamenLibelle(ex),
          formatNumberForPDF(ex.prixUnitaire),
          ex.quantite.toString(),
          formatNumberForPDF(ex.montant),
        ]),
        foot: [
          [
            "TOTAL EXAMENS",
            "",
            totalExamensQuantite.toString(),
            formatNumberForPDF(totalExamensMontant),
          ],
        ],
        headStyles: {
          fillColor: [168, 85, 247],
          textColor: 255,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
        },
        styles: { fontSize: 9 },
        didDrawPage: () => {
          addFooter(doc);
        },
      });

      /* ================= ÉCHOGRAPHIES (si présentes) ================= */
      if (groupedEchographies.length > 0) {
        startY = (doc as any).lastAutoTable.finalY + 10;

        const totalEchographiesQuantite = groupedEchographies.reduce(
          (sum, echo) => sum + echo.quantite,
          0
        );
        const totalEchographiesMontant = groupedEchographies.reduce(
          (sum, echo) => sum + echo.montant,
          0
        );

        autoTable(doc, {
          startY,
          head: [["Échographie", "PU", "Qté", "Montant"]],
          body: groupedEchographies.map((echo) => [
            echo.remise > 0
              ? `${echo.libelle} (${echo.remise}%)`
              : echo.libelle,
            formatNumberForPDF(echo.prixUnitaire),
            echo.quantite.toString(),
            formatNumberForPDF(echo.montant),
          ]),
          foot: [
            [
              "TOTAL ÉCHOGRAPHIES",
              "",
              totalEchographiesQuantite.toString(),
              formatNumberForPDF(totalEchographiesMontant),
            ],
          ],
          headStyles: {
            fillColor: [234, 88, 12],
            textColor: 255,
            fontStyle: "bold",
          },
          footStyles: {
            fillColor: [240, 240, 240],
            textColor: 0,
            fontStyle: "bold",
          },
          styles: { fontSize: 9 },
          didDrawPage: () => {
            addFooter(doc);
          },
        });
      }

      /* ================= NOM FICHIER ================= */
      const filename = `vente_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
      doc.save(filename);

      toast.success("PDF généré avec succès !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${doc.getCurrentPageInfo().pageNumber} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );
  };

  const handlePrint = useCallback(() => {
    const printContent = document.createElement("div");
    printContent.innerHTML = contentRef.current?.innerHTML || "";

    // Supprimer les boutons d'action
    const buttons = printContent.querySelectorAll(".no-print-buttons");
    buttons.forEach((button) => button.remove());

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fiche de Vente Journalière</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #000;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left;
              }
              th { 
                background-color: #f2f2f2; 
              }
              .header { 
                text-align: center; 
                margin-bottom: 30px;
              }
              .total { 
                font-weight: bold; 
                text-align: right;
              }
              @media print {
                @page { margin: 0; }
                body { margin: 1.6cm; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();

      // Attendre que le contenu soit chargé avant d'imprimer
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };
    }
  }, []);

  // Fonction pour formater les nombres pour le PDF (évite les problèmes avec les espaces insécables)
  const formatNumberForPDF = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // ================== RENDER ==================
  if (isLoadingInitialData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner show={true} size="large" />
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Vente Journalière</h1>
        <p className="text-gray-600">
          Générez et exportez vos rapports de ventes
        </p>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  {...register("dateDebut")}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {errors.dateDebut && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.dateDebut.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin *
                </label>
                <input
                  type="date"
                  {...register("dateFin")}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {errors.dateFin && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.dateFin.message}
                  </p>
                )}
              </div>
            </div>

            {/* Sélection des cliniques */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliniques *
              </label>
              <Select
                isMulti
                options={cliniques}
                classNamePrefix="select"
                placeholder="Sélectionnez une ou plusieurs cliniques..."
                value={watch("idCliniques")}
                onChange={(selected) => {
                  setValue("idCliniques", selected as any);
                }}
                className="border border-gray-300 rounded-lg"
                styles={{
                  control: (base) => ({
                    ...base,
                    padding: "4px",
                    borderColor: "#d1d5db",
                    "&:hover": {
                      borderColor: "#9ca3af",
                    },
                  }),
                }}
              />
              {errors.idCliniques && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.idCliniques.message}
                </p>
              )}
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={spinner}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {spinner ? (
                <>
                  <Spinner show={true} size="small" />
                  Génération en cours...
                </>
              ) : (
                "Générer le rapport"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Indicateur de chargement */}
      {spinner && <SpinnerBar />}

      {/* Résultats */}
      {selectedCliniqueIds.length > 0 && !spinner && (
        <>
          {/* Zone d'impression/PDF */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Rapport de Ventes
                </h2>
                <p className="text-gray-600">
                  {new Date(watch("dateDebut")).toLocaleDateString("fr-FR")}
                  {watch("dateDebut") !== watch("dateFin") &&
                    ` au ${new Date(watch("dateFin")).toLocaleDateString(
                      "fr-FR"
                    )}`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handlePrint}
                  className="bg-gray-100 hidden text-gray-700 hover:bg-gray-200 border border-gray-300"
                >
                  Imprimer
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Spinner
                        show={true}
                        size="small"
                        className="text-white"
                      />
                      Génération PDF...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Télécharger PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Contenu du rapport */}
            <div ref={contentRef} className="space-y-8">
              {/* En-tête du rapport */}
              <div className="text-center border-b pb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  FICHE DE VENTE JOURNALIÈRE
                </h1>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="text-left">
                    <p>
                      <strong>Caissière :</strong>{" "}
                      {session?.user?.name || "Non spécifié"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p>
                      <strong>Clinique(s) :</strong>{" "}
                      {getAllCliniqueNameById(selectedCliniqueIds)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      <strong>Période :</strong>{" "}
                      {new Date(watch("dateDebut")).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Produits */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  PRODUITS VENDUS
                </h3>

                {Object.entries(produitsGroupedByType).map(
                  ([type, produits]) => (
                    <div key={type} className="mb-6">
                      <h4 className="font-medium text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
                        {type === "CONTRACEPTIF" && "Contraceptifs"}
                        {type === "MEDICAMENTS" && "Médicaments"}
                        {type === "CONSOMMABLES" && "Consommables"}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                Libellé
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                Prix Unitaire (FCFA)
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                Quantité
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                Montant (FCFA)
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                Stock Final
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {produits.map((produit) => {
                              const calc = produitsCalculations[
                                produit.nomProduit
                              ] || {
                                prixUnitaire: 0,
                                quantite: 0,
                                montant: 0,
                                stockFinal: 0,
                              };
                              return (
                                <tr
                                  key={produit.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="border border-gray-300 px-4 py-3 text-sm">
                                    {produit.nomProduit}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                                    {calc.prixUnitaire.toLocaleString("fr-FR")}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                                    {calc.quantite}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                                    {calc.montant.toLocaleString("fr-FR")}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                                    {calc.stockFinal}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td
                                colSpan={2}
                                className="border border-gray-300 px-4 py-3 text-sm font-medium"
                              >
                                Total Produits
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                                {totalProduitsQuantite}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                                {facturesProduits
                                  .reduce(
                                    (sum, f) => sum + f.prodMontantTotal,
                                    0
                                  )
                                  .toLocaleString("fr-FR")}
                              </td>
                              <td className="border border-gray-300 px-4 py-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Prestations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  PRESTATIONS
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Libellé
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Prix Unitaire (FCFA)
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Quantité
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Montant (FCFA)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allPrestations.map((prestation) => {
                        const calc = prestationsCalculations[
                          prestation.nomPrestation
                        ] || {
                          prixUnitaire: 0,
                          quantite: 0,
                          montant: 0,
                        };
                        return (
                          <tr key={prestation.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 text-sm">
                              {prestation.nomPrestation}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                              {calc.prixUnitaire.toLocaleString("fr-FR")}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                              {calc.quantite}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                              {calc.montant.toLocaleString("fr-FR")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={2}
                          className="border border-gray-300 px-4 py-3 text-sm font-medium"
                        >
                          Total Prestations
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                          {facturesPrestations.length}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                          {facturesPrestations
                            .reduce((sum, f) => sum + f.prestPrixTotal, 0)
                            .toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Examens */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                  EXAMENS
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Libellé
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Prix Unitaire (FCFA)
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Quantité
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Montant (FCFA)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {groupedExamens.map((examen, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 text-sm">
                            {formatExamenLibelle(examen)}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                            {examen.prixUnitaire.toLocaleString("fr-FR")}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                            {examen.quantite}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                            {examen.montant.toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={2}
                          className="border border-gray-300 px-4 py-3 text-sm font-medium"
                        >
                          Total Examens
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                          {facturesExamens.length}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                          {facturesExamens
                            .reduce((sum, f) => sum + f.examPrixTotal, 0)
                            .toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Échographies */}
              {groupedEchographies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                    ÉCHOGRAPHIES
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Libellé
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Prix Unitaire (FCFA)
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Quantité
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Montant (FCFA)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupedEchographies.map((echographie, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 text-sm">
                              {echographie.remise > 0
                                ? `${echographie.libelle} (${echographie.remise}%)`
                                : echographie.libelle}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                              {echographie.prixUnitaire.toLocaleString("fr-FR")}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-sm text-right">
                              {echographie.quantite}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium">
                              {echographie.montant.toLocaleString("fr-FR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan={2}
                            className="border border-gray-300 px-4 py-3 text-sm font-medium"
                          >
                            Total Échographies
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                            {facturesEchographies.length}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-right">
                            {facturesEchographies
                              .reduce((sum, f) => sum + f.echoPrixTotal, 0)
                              .toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Résumé global */}
              <div className="mt-8 pt-6 border-t">
                <div className="max-w-md ml-auto">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">
                      RÉCAPITULATIF
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Caissière :</span>
                        <span className="font-medium">
                          {session?.user?.name || "Non spécifié"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Clinique(s) :</span>
                        <span className="font-medium text-right max-w-xs">
                          {getAllCliniqueNameById(selectedCliniqueIds)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Période :</span>
                        <span className="font-medium">
                          {new Date(watch("dateDebut")).toLocaleDateString(
                            "fr-FR"
                          )}
                          {watch("dateDebut") !== watch("dateFin") &&
                            ` - ${new Date(watch("dateFin")).toLocaleDateString(
                              "fr-FR"
                            )}`}
                        </span>
                      </div>
                      <div className="pt-3 border-t mt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-bold text-gray-900">
                            RECETTE TOTALE :
                          </span>
                          <span className="text-lg font-bold text-blue-700">
                            {totalRecette.toLocaleString("fr-FR")} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons d'action (seront cachés dans le PDF) */}
              <div className="no-print-buttons flex justify-center gap-4 mt-8 pt-8 border-t">
                <Button
                  onClick={handlePrint}
                  className="bg-gray-100 hidden text-gray-700 hover:bg-gray-200 border border-gray-300"
                >
                  Imprimer le rapport
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Spinner
                        show={true}
                        size="small"
                        className="text-white"
                      />
                      Génération PDF...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Télécharger en PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
