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
  Prescripteur,
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
import { getAllPrescripteurs } from "@/lib/actions/prescripteurActions";
import {
  getCommissionsExamenByDateRange,
  getCommissionsEchographieByDateRange,
} from "@/lib/actions/commissionActions";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

// ====================== COMPOSANTS RAPPORTS ======================
import {
  FicheVenteRapport,
  CommissionExamenDetailRapport,
  CommissionExamenTotalRapport,
  CommissionEchographieDetailRapport,
  CommissionEchographieTotalRapport,
  GroupedExamen,
  GroupedEchographie,
  ProduitCalculations,
  CommissionDetailRow,
  CommissionTotal,
} from "@/components/rapports";

// ====================== INTERFACES ======================
interface CliniqueOption {
  value: string;
  label: string;
}

interface ReportTypeOption {
  value: string;
  label: string;
}

// Types pour les commissions
interface CommissionExamenData {
  id: string;
  idFactureExamen: string;
  idPrescripteur: string;
  idVisite: string;
  montantCommission: number;
  paye: boolean;
  datePaiement: Date | null;
  FactureExamen: {
    id: string;
    idVisite: string;
    prixExamen: number;
    remise: number;
  } | null;
  Prescripteur: {
    id: string;
    nom: string;
    prenom: string;
    centre: string;
    contact: string;
  } | null;
  Visite: {
    id: string;
    dateVisite: Date;
    Client: {
      id: string;
      nom: string;
      prenom: string;
    } | null;
  } | null;
}

interface CommissionEchographieData {
  id: string;
  idFactureEchographie: string;
  idPrescripteur: string;
  idVisite: string;
  montantCommission: number;
  paye: boolean;
  datePaiement: Date | null;
  FactureEchographie: {
    id: string;
    idVisite: string;
    prixEchographie: number;
    remise: number;
  } | null;
  Prescripteur: {
    id: string;
    nom: string;
    prenom: string;
    centre: string;
    contact: string;
  } | null;
  Visite: {
    id: string;
    dateVisite: Date;
    Client: {
      id: string;
      nom: string;
      prenom: string;
    } | null;
  } | null;
}

// Options de types de rapport
const REPORT_TYPES: ReportTypeOption[] = [
  { value: "fiche_vente", label: "Fiche de vente journalière" },
  { value: "commission_examen_detail", label: "Commission prescripteur - Détail client (Examen)" },
  { value: "commission_examen_total", label: "Commission prescripteur - Total (Examen)" },
  { value: "commission_echographie_detail", label: "Commission prescripteur - Détail client (Échographie)" },
  { value: "commission_echographie_total", label: "Commission prescripteur - Total (Échographie)" },
];

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

  // États pour le type de rapport et les commissions
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeOption>(REPORT_TYPES[0]);
  const [commissionsExamen, setCommissionsExamen] = useState<CommissionExamenData[]>([]);
  const [commissionsEchographie, setCommissionsEchographie] = useState<CommissionEchographieData[]>([]);
  const [allPrescripteurs, setAllPrescripteurs] = useState<Prescripteur[]>([]);

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
          prescripteurs,
        ] = await Promise.all([
          getAllClinique(),
          getAllExamen(),
          getAllProduits(),
          getAllPrestation(),
          getAllTarifExamen(),
          getAllTarifProduits(),
          getAllTarifPrestation(),
          getAllPrescripteurs(),
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
        setAllPrescripteurs(prescripteurs);
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
    // Ajuster endDate à la fin de la journée
    endDate.setHours(23, 59, 59, 999);

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
      // Charger les données en fonction du type de rapport sélectionné
      console.log("Type de rapport sélectionné:", selectedReportType.value);

      if (selectedReportType.value === "fiche_vente") {
        console.log("Chargement fiche de vente...", { selectedIds, startDate, endDate });
        const result = await fetchVentesData(selectedIds, startDate, endDate);
        console.log("Résultat fetchVentesData:", {
          examens: result.facturesExamens?.length || 0,
          produits: result.facturesProduits?.length || 0,
          prestations: result.facturesPrestations?.length || 0,
          echographies: result.facturesEchographies?.length || 0,
        });
        setFacturesExamens(result.facturesExamens || []);
        setFacturesProduits(result.facturesProduits || []);
        setFacturesPrestations(result.facturesPrestations || []);
        setFacturesEchographies(result.facturesEchographies || []);
        setCommissionsExamen([]);
        setCommissionsEchographie([]);
      } else if (selectedReportType.value.includes("examen")) {
        // Charger les commissions d'examen
        const commissions = await getCommissionsExamenByDateRange(startDate, endDate);
        setCommissionsExamen(commissions as unknown as CommissionExamenData[]);
        setCommissionsEchographie([]);
        // Réinitialiser les données de vente
        setFacturesExamens([]);
        setFacturesProduits([]);
        setFacturesPrestations([]);
        setFacturesEchographies([]);
      } else if (selectedReportType.value.includes("echographie")) {
        // Charger les commissions d'échographie
        const commissions = await getCommissionsEchographieByDateRange(startDate, endDate);
        setCommissionsEchographie(commissions as unknown as CommissionEchographieData[]);
        setCommissionsExamen([]);
        // Réinitialiser les données de vente
        setFacturesExamens([]);
        setFacturesProduits([]);
        setFacturesPrestations([]);
        setFacturesEchographies([]);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError(
        "Échec du chargement des données. Veuillez vérifier vos paramètres et réessayer."
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

  // ================== Calculs pour les commissions ==================
  // Commission Examen - Détail (Date visite, Prescripteur, Client, Commission)
  const commissionsExamenDetail = useMemo((): CommissionDetailRow[] => {
    // Grouper par client + prescripteur + date pour avoir le total par visite
    const groupedData: Record<string, CommissionDetailRow> = {};

    commissionsExamen.forEach((commission) => {
      const clientNom = commission.Visite?.Client
        ? `${commission.Visite.Client.nom} ${commission.Visite.Client.prenom}`
        : "Inconnu";
      const prescripteurNom = commission.Prescripteur
        ? `${commission.Prescripteur.nom} ${commission.Prescripteur.prenom}`
        : "Inconnu";
      const dateVisite = commission.Visite?.dateVisite
        ? format(new Date(commission.Visite.dateVisite), "dd/MM/yyyy", { locale: fr })
        : "-";

      // Clé unique pour regrouper les commissions du même client, même prescripteur, même date
      const key = `${dateVisite}-${prescripteurNom}-${clientNom}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          dateVisite,
          prescripteur: prescripteurNom,
          client: clientNom,
          commission: 0,
        };
      }
      groupedData[key].commission += commission.montantCommission;
    });

    // Convertir en tableau et trier par date puis par prescripteur
    return Object.values(groupedData).sort((a, b) => {
      const dateCompare = a.dateVisite.localeCompare(b.dateVisite);
      if (dateCompare !== 0) return dateCompare;
      return a.prescripteur.localeCompare(b.prescripteur);
    });
  }, [commissionsExamen]);

  // Commission Examen - Total par prescripteur
  const commissionsExamenTotal = useMemo(() => {
    const result: {
      prescripteur: string;
      prescripteurId: string;
      contact: string;
      nombreCommissions: number;
      total: number;
    }[] = [];

    const groupedByPrescripteur = commissionsExamen.reduce((acc, commission) => {
      const prescripteurId = commission.idPrescripteur;
      if (!acc[prescripteurId]) {
        acc[prescripteurId] = [];
      }
      acc[prescripteurId].push(commission);
      return acc;
    }, {} as Record<string, CommissionExamenData[]>);

    Object.entries(groupedByPrescripteur).forEach(([prescripteurId, commissions]) => {
      const prescripteur = commissions[0]?.Prescripteur;
      const prescripteurNom = prescripteur
        ? `${prescripteur.nom} ${prescripteur.prenom}`
        : "Inconnu";
      const prescripteurContact = prescripteur?.contact || "-";

      result.push({
        prescripteur: prescripteurNom,
        prescripteurId,
        contact: prescripteurContact,
        nombreCommissions: commissions.length,
        total: commissions.reduce((sum, c) => sum + c.montantCommission, 0),
      });
    });

    return result.sort((a, b) => a.prescripteur.localeCompare(b.prescripteur));
  }, [commissionsExamen]);

  // Commission Echographie - Détail (Date visite, Prescripteur, Client, Commission)
  const commissionsEchographieDetail = useMemo((): CommissionDetailRow[] => {
    // Grouper par client + prescripteur + date pour avoir le total par visite
    const groupedData: Record<string, CommissionDetailRow> = {};

    commissionsEchographie.forEach((commission) => {
      const clientNom = commission.Visite?.Client
        ? `${commission.Visite.Client.nom} ${commission.Visite.Client.prenom}`
        : "Inconnu";
      const prescripteurNom = commission.Prescripteur
        ? `${commission.Prescripteur.nom} ${commission.Prescripteur.prenom}`
        : "Inconnu";
      const dateVisite = commission.Visite?.dateVisite
        ? format(new Date(commission.Visite.dateVisite), "dd/MM/yyyy", { locale: fr })
        : "-";

      // Clé unique pour regrouper les commissions du même client, même prescripteur, même date
      const key = `${dateVisite}-${prescripteurNom}-${clientNom}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          dateVisite,
          prescripteur: prescripteurNom,
          client: clientNom,
          commission: 0,
        };
      }
      groupedData[key].commission += commission.montantCommission;
    });

    // Convertir en tableau et trier par date puis par prescripteur
    return Object.values(groupedData).sort((a, b) => {
      const dateCompare = a.dateVisite.localeCompare(b.dateVisite);
      if (dateCompare !== 0) return dateCompare;
      return a.prescripteur.localeCompare(b.prescripteur);
    });
  }, [commissionsEchographie]);

  // Commission Echographie - Total par prescripteur
  const commissionsEchographieTotal = useMemo(() => {
    const result: {
      prescripteur: string;
      prescripteurId: string;
      contact: string;
      nombreCommissions: number;
      total: number;
    }[] = [];

    const groupedByPrescripteur = commissionsEchographie.reduce((acc, commission) => {
      const prescripteurId = commission.idPrescripteur;
      if (!acc[prescripteurId]) {
        acc[prescripteurId] = [];
      }
      acc[prescripteurId].push(commission);
      return acc;
    }, {} as Record<string, CommissionEchographieData[]>);

    Object.entries(groupedByPrescripteur).forEach(([prescripteurId, commissions]) => {
      const prescripteur = commissions[0]?.Prescripteur;
      const prescripteurNom = prescripteur
        ? `${prescripteur.nom} ${prescripteur.prenom}`
        : "Inconnu";
      const prescripteurContact = prescripteur?.contact || "-";

      result.push({
        prescripteur: prescripteurNom,
        prescripteurId,
        contact: prescripteurContact,
        nombreCommissions: commissions.length,
        total: commissions.reduce((sum, c) => sum + c.montantCommission, 0),
      });
    });

    return result.sort((a, b) => a.prescripteur.localeCompare(b.prescripteur));
  }, [commissionsEchographie]);

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

      let startY = 80;

      /* ================= FONCTION FORMAT PERIODE ================= */
      const formatPeriode = () => {
        const debut = format(new Date(watch("dateDebut")), "dd/MM/yyyy", { locale: fr });
        const fin = format(new Date(watch("dateFin")), "dd/MM/yyyy", { locale: fr });
        return debut === fin ? `Période : ${fin}` : `Période : ${debut} - ${fin}`;
      };

      /* ================= FONCTION SIGNATURES ================= */
      const addSignatures = (doc: jsPDF) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        const signatureHeight = 35; // Hauteur nécessaire pour les signatures

        let signatureY = finalY + 20;

        // Vérifier s'il y a assez de place, sinon ajouter une nouvelle page
        if (signatureY + signatureHeight > pageHeight - 20) {
          doc.addPage();
          signatureY = 40;
        }

        doc.setFontSize(11);
        doc.setTextColor(0);

        // Signature Caissière (à gauche)
        doc.text("Signature Caissière", 30, signatureY);
        doc.line(20, signatureY + 20, 80, signatureY + 20); // Ligne pour signature

        // Signature Comptable (à droite)
        doc.text("Signature Comptable", pageWidth - 60, signatureY);
        doc.line(pageWidth - 80, signatureY + 20, pageWidth - 20, signatureY + 20); // Ligne pour signature
      };

      // ============== PDF FICHE DE VENTE ==============
      if (selectedReportType.value === "fiche_vente") {
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
          formatPeriode(),
          14,
          62
        );

        doc.text(
          `Total Recette : ${formatNumberForPDF(totalRecette)} FCFA`,
          14,
          72
        );

        /* ================= PRODUITS ================= */
        const totalProduitsQte = Object.values(produitsCalculations).reduce(
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
              totalProduitsQte.toString(),
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

        // Ajouter les signatures
        addSignatures(doc);
      }

      // ============== PDF COMMISSION EXAMEN DETAIL ==============
      else if (selectedReportType.value === "commission_examen_detail") {
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text("COMMISSION PRESCRIPTEUR - DÉTAIL CLIENT", 105, 35, { align: "center" });
        doc.setFontSize(14);
        doc.text("(EXAMEN)", 105, 42, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(
          formatPeriode(),
          14,
          55
        );

        startY = 65;

        const totalGlobalExamen = commissionsExamenDetail.reduce((sum, row) => sum + row.commission, 0);

        autoTable(doc, {
          startY,
          head: [["Date visite", "Prescripteur", "Client", "Commission (FCFA)"]],
          body: commissionsExamenDetail.map((row) => [
            row.dateVisite,
            row.prescripteur,
            row.client,
            formatNumberForPDF(row.commission),
          ]),
          foot: [
            [
              "TOTAL COMMISSIONS EXAMEN",
              "",
              "",
              formatNumberForPDF(totalGlobalExamen),
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

        // Ajouter les signatures
        addSignatures(doc);
      }

      // ============== PDF COMMISSION EXAMEN TOTAL ==============
      else if (selectedReportType.value === "commission_examen_total") {
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text("COMMISSION PRESCRIPTEUR - TOTAL", 105, 35, { align: "center" });
        doc.setFontSize(14);
        doc.text("(EXAMEN)", 105, 42, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(
          formatPeriode(),
          14,
          55
        );

        startY = 65;

        autoTable(doc, {
          startY,
          head: [["Prescripteur", "Contact", "Nombre de commissions", "Total (FCFA)"]],
          body: commissionsExamenTotal.map((data) => [
            data.prescripteur,
            data.contact,
            data.nombreCommissions.toString(),
            formatNumberForPDF(data.total),
          ]),
          foot: [
            [
              "TOTAL",
              "",
              commissionsExamenTotal.reduce((sum, d) => sum + d.nombreCommissions, 0).toString(),
              formatNumberForPDF(commissionsExamenTotal.reduce((sum, d) => sum + d.total, 0)),
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

        // Ajouter les signatures
        addSignatures(doc);
      }

      // ============== PDF COMMISSION ECHOGRAPHIE DETAIL ==============
      else if (selectedReportType.value === "commission_echographie_detail") {
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text("COMMISSION PRESCRIPTEUR - DÉTAIL CLIENT", 105, 35, { align: "center" });
        doc.setFontSize(14);
        doc.text("(ÉCHOGRAPHIE)", 105, 42, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(
          formatPeriode(),
          14,
          55
        );

        startY = 65;

        const totalGlobalEcho = commissionsEchographieDetail.reduce((sum, row) => sum + row.commission, 0);

        autoTable(doc, {
          startY,
          head: [["Date visite", "Prescripteur", "Client", "Commission (FCFA)"]],
          body: commissionsEchographieDetail.map((row) => [
            row.dateVisite,
            row.prescripteur,
            row.client,
            formatNumberForPDF(row.commission),
          ]),
          foot: [
            [
              "TOTAL COMMISSIONS ÉCHOGRAPHIE",
              "",
              "",
              formatNumberForPDF(totalGlobalEcho),
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

        // Ajouter les signatures
        addSignatures(doc);
      }

      // ============== PDF COMMISSION ECHOGRAPHIE TOTAL ==============
      else if (selectedReportType.value === "commission_echographie_total") {
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text("COMMISSION PRESCRIPTEUR - TOTAL", 105, 35, { align: "center" });
        doc.setFontSize(14);
        doc.text("(ÉCHOGRAPHIE)", 105, 42, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(
          formatPeriode(),
          14,
          55
        );

        startY = 65;

        autoTable(doc, {
          startY,
          head: [["Prescripteur", "Contact", "Nombre de commissions", "Total (FCFA)"]],
          body: commissionsEchographieTotal.map((data) => [
            data.prescripteur,
            data.contact,
            data.nombreCommissions.toString(),
            formatNumberForPDF(data.total),
          ]),
          foot: [
            [
              "TOTAL",
              "",
              commissionsEchographieTotal.reduce((sum, d) => sum + d.nombreCommissions, 0).toString(),
              formatNumberForPDF(commissionsEchographieTotal.reduce((sum, d) => sum + d.total, 0)),
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

        // Ajouter les signatures
        addSignatures(doc);
      }

      /* ================= NOM FICHIER ================= */
      const reportTypeNames: Record<string, string> = {
        fiche_vente: "vente",
        commission_examen_detail: "commission_examen_detail",
        commission_examen_total: "commission_examen_total",
        commission_echographie_detail: "commission_echographie_detail",
        commission_echographie_total: "commission_echographie_total",
      };
      const filename = `${reportTypeNames[selectedReportType.value] || "rapport"}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
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

            {/* Sélection du type de rapport */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de rapport
              </label>
              <Select
                options={REPORT_TYPES}
                classNamePrefix="select"
                placeholder="Sélectionnez le type de rapport..."
                value={selectedReportType}
                onChange={(selected) => {
                  if (selected) {
                    setSelectedReportType(selected as ReportTypeOption);
                  }
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
                  {selectedReportType.label}
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
              {/* ================== FICHE DE VENTE ================== */}
              {selectedReportType.value === "fiche_vente" && (
                <FicheVenteRapport
                  session={session}
                  selectedCliniqueIds={selectedCliniqueIds}
                  getAllCliniqueNameById={getAllCliniqueNameById}
                  dateDebut={watch("dateDebut")}
                  dateFin={watch("dateFin")}
                  produitsGroupedByType={produitsGroupedByType}
                  produitsCalculations={produitsCalculations}
                  totalProduitsQuantite={totalProduitsQuantite}
                  facturesProduits={facturesProduits}
                  allPrestations={allPrestations}
                  prestationsCalculations={prestationsCalculations}
                  facturesPrestations={facturesPrestations}
                  groupedExamens={groupedExamens}
                  formatExamenLibelle={formatExamenLibelle}
                  facturesExamens={facturesExamens}
                  groupedEchographies={groupedEchographies}
                  facturesEchographies={facturesEchographies}
                  totalRecette={totalRecette}
                />
              )}

              {/* ================== COMMISSION EXAMEN DETAIL ================== */}
              {selectedReportType.value === "commission_examen_detail" && (
                <CommissionExamenDetailRapport
                  dateDebut={watch("dateDebut")}
                  dateFin={watch("dateFin")}
                  commissionsExamenDetail={commissionsExamenDetail}
                />
              )}

              {/* ================== COMMISSION EXAMEN TOTAL ================== */}
              {selectedReportType.value === "commission_examen_total" && (
                <CommissionExamenTotalRapport
                  dateDebut={watch("dateDebut")}
                  dateFin={watch("dateFin")}
                  commissionsExamenTotal={commissionsExamenTotal}
                />
              )}

              {/* ================== COMMISSION ECHOGRAPHIE DETAIL ================== */}
              {selectedReportType.value === "commission_echographie_detail" && (
                <CommissionEchographieDetailRapport
                  dateDebut={watch("dateDebut")}
                  dateFin={watch("dateFin")}
                  commissionsEchographieDetail={commissionsEchographieDetail}
                />
              )}

              {/* ================== COMMISSION ECHOGRAPHIE TOTAL ================== */}
              {selectedReportType.value === "commission_echographie_total" && (
                <CommissionEchographieTotalRapport
                  dateDebut={watch("dateDebut")}
                  dateFin={watch("dateFin")}
                  commissionsEchographieTotal={commissionsEchographieTotal}
                />
              )}

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
