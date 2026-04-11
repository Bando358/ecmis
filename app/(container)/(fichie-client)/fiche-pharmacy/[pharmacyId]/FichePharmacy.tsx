"use client";

import { useState, useEffect, useRef, use, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
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
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Receipt,
  Package,
  Stethoscope,
  FlaskConical,
  ScanLine,
  Handshake,
  Printer,
  ArrowLeft,
  FileWarning,
  CircleDollarSign,
  CalendarDays,
  Building2,
  User2,
  ClipboardCheck,
  ShoppingCart,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { updateQuantiteStockTarifProduit } from "@/lib/actions/tarifProduitActions";
import {
  batchFacturation,
  updateRecapVisiteAfterDelete,
} from "@/lib/actions/facturationBatchActions";

import { FactureModal } from "@/components/factureModal";
import { deleteFactureProduit } from "@/lib/actions/factureProduitActions";
import { deleteFacturePrestation } from "@/lib/actions/facturePrestationActions";

import { Spinner } from "@/components/ui/spinner";
import {
  Produit,
  FactureProduit,
  TypeBilan,
  Visite,
  FacturePrestation,
  Prestation,
  Client,
  TarifProduit,
  Clinique,
  FactureExamen,
  TarifExamen,
  Examen,
  DemandeExamen,
  TypeCouverture,
  Echographie,
  DemandeEchographie,
  TarifEchographie,
  FactureEchographie,
  TableName,
  TarifPrestation,
  TypeEchographie,
} from "@prisma/client";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useForm, useWatch } from "react-hook-form";
import PrestationsModal from "@/components/prestationModal";
import ExamensModal from "@/components/examenModal";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { deleteFactureExamen } from "@/lib/actions/factureExamenActions";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { getAllDemandeExamensByIdVisite } from "@/lib/actions/demandeExamenActions";
import { getAllDemandeEchographiesByIdVisite } from "@/lib/actions/demandeEchographieActions";
import EchographiesModal from "@/components/echographieModal";
import { deleteFactureEchographie } from "@/lib/actions/factureEchographieActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

import Retour from "@/components/retour";
import CommissionsDialog from "@/components/CommissionsDialog";

const typeEchographieColors: Record<TypeEchographie, string> = {
  OBST: "bg-pink-100 text-pink-800 border-pink-200",
  GYN: "bg-purple-100 text-purple-800 border-purple-200",
  INF: "bg-blue-100 text-blue-800 border-blue-200",
  MDG: "bg-green-100 text-green-800 border-green-200",
  CAR: "bg-red-100 text-red-800 border-red-200",
};

type DemandeExamenFormValues = {
  prixExamen: number;
  id: string;
  idVisite: string;
  idClient: string;
  idClinique: string;
  idTarifExamen: string;

  updatedAt: Date;
  createdAt: Date;
  idUser: string;
};

type DemandeEchographieFormValues = {
  prixEchographie: number;
  id: string;
  idVisite: string;
  idClient: string;
  idClinique: string;
  idTarifEchographie: string;
  updatedAt: Date;
  createdAt: Date;
  idUser: string;
};

type VisiteType = {
  idVisite: string;
  typeExamen: string;
  couverture: string;
  remiseExamen: 0;
  remiseEchographie: 0;
  partEchographe: 0;
  soustractionExamen: false;
};

// Fonctions de calcul pures — hors composant pour éviter les re-créations
const montantProduits = (produits: FactureProduit[]) =>
  produits.reduce((total, p) => total + (p.montantProduit || 0), 0);

const montantExamen = (produits: DemandeExamenFormValues[]) =>
  produits.reduce((total, p) => total + (p.prixExamen || 0), 0);

const montantPrestations = (prestations: FacturePrestation[]) =>
  prestations?.reduce((total, p) => total + (Number(p.prixPrestation) || 0), 0) || 0;

const montantFactureExamens = (examens: FactureExamen[]) =>
  examens.reduce((total, e) => total + (Number(e.prixExamen) || 0), 0);

const montantFactureEchographies = (echographies: FactureEchographie[]) =>
  echographies.reduce((total, e) => total + (Number(e.prixEchographie) || 0), 0);

// Reconstitue le prix saisi dans la dialog "Ajouter une échographie" à partir du net stocké
// Formule : gross = (net + partEchographe/n) / (1 - remise/100)
// où n = nombre d'échographies dans le même batch (même idVisite + même partEchographe)
const getPrixSaisiEchographie = (
  echo: FactureEchographie,
  allEchos: FactureEchographie[],
): number => {
  const batchSize = allEchos.filter(
    (e) => e.idVisite === echo.idVisite && e.partEchographe === echo.partEchographe,
  ).length;
  const n = batchSize > 0 ? batchSize : 1;
  const partEchoPerEcho = (Number(echo.partEchographe) || 0) / n;
  const remise = Number(echo.remiseEchographie) || 0;
  const denominateur = 1 - remise / 100;
  if (denominateur <= 0) return Number(echo.prixEchographie) || 0;
  return Math.round(
    ((Number(echo.prixEchographie) || 0) + partEchoPerEcho) / denominateur,
  );
};

// Composant client principal
export default function FichePharmacyClient({
  params,
  serverData,
}: {
  params: Promise<{ pharmacyId: string }>;
  serverData: {
    visites: Visite[];
    client: Client;
    tabTarifProduit: TarifProduit[];
    tabTarifExamens: TarifExamen[];
    tabExamen: Examen[];
    prestations: Prestation[];
    tabProduit: Produit[];
    clinique: Clinique | null;
    tabEchographie: Echographie[];
    tabTarifEchographies: TarifEchographie[];
    tabTarifPrestations: TarifPrestation[];
    tabProduitFactureClient: FactureProduit[];
    tabPrestationFactureClient: FacturePrestation[];
    tabEchographieFactureClient: FactureEchographie[];
    tabExamenFactureClient: FactureExamen[];
    tabDemandeExamensClient: DemandeExamen[];
    tabDemandeEchographiesClient: DemandeEchographie[];
  };
}) {
  const { pharmacyId } = use(params);
  const [open, setOpen] = useState(false);
  const [openPrestation, setOpenPrestation] = useState(false);
  const [openExamens, setOpenExamens] = useState(false);
  const [openEchographies, setOpenEchographies] = useState(false);
  const [openCommissions, setOpenCommissions] = useState(false);

  // Données statiques du serveur (pas de setter → pas besoin de useState)
  const visites = serverData.visites;
  const client = serverData.client;
  const clinique = serverData.clinique;
  const tabProduit = serverData.tabProduit;
  const tabTarifProduit = serverData.tabTarifProduit;
  const tabExamen = serverData.tabExamen;
  const tabEchographie = serverData.tabEchographie;
  const tabTarifExamens = serverData.tabTarifExamens;
  const tabTarifEchographies = serverData.tabTarifEchographies;
  const prestations = serverData.prestations;

  const [echographiesFacture, setEchographiesFacture] = useState<
    FactureEchographie[]
  >([]);
  const [tabDemandeExamens, setTabDemandeExamens] = useState<DemandeExamen[]>(
    [],
  );
  const [tabDemandeEchographies, setTabDemandeEchographies] = useState<
    DemandeEchographie[]
  >([]);
  const [facturePrestation, setFacturePrestation] = useState<
    FacturePrestation[]
  >([]);
  const [examensFacture, setExamensFacture] = useState<FactureExamen[]>([]);
  const [demandeExamens, setDemandeExamens] = useState<
    DemandeExamenFormValues[]
  >([]);
  const [demandeEchographies, setDemandeEchographies] = useState<
    DemandeEchographieFormValues[]
  >([]);
  const [prestationfacture, setPrestationFacture] = useState<
    FacturePrestation[]
  >([]);
  const [factureProduit, setFactureProduit] = useState<FactureProduit[]>([]);
  const [produitFacture, setProduitFacture] = useState<FactureProduit[]>([]);
  const [selectedProduits, setSelectedProduits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // IDs des factures cochées pour apparaître sur le ticket FACTURE CLIENT
  // Par défaut, toutes les factures chargées sont cochées
  const [ticketSelectedIds, setTicketSelectedIds] = useState<Set<string>>(new Set());
  // Ref des IDs déjà vus (pour distinguer nouveaux IDs vs IDs décochés)
  const knownFactureIdsRef = useRef<Set<string>>(new Set());

  const [selectedIdVisite, setSelectedIdVisite] = useState<string>("");

  // Date de visite sélectionnée (pour affichage sur la facture)
  const dateVisiteSelectionnee = useMemo(() => {
    const visite = visites.find((v) => v.id === selectedIdVisite);
    return visite ? new Date(visite.dateVisite) : new Date();
  }, [visites, selectedIdVisite]);

  const { canCreate, canDelete } = usePermissionContext();
  // IDs des factures supprimées localement (pour exclure du filtrage serverData)
  const deletedFactureIds = useRef<Set<string>>(new Set());

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  // Maps de lookup O(1) au lieu de Array.find() O(n) à chaque render
  const prestationMap = useMemo(
    () => new Map(prestations.map((p) => [p.id, p.nomPrestation])),
    [prestations],
  );
  const produitMap = useMemo(
    () => new Map(tabProduit.map((p) => [p.id, p.nomProduit])),
    [tabProduit],
  );
  const tarifProduitMap = useMemo(
    () => new Map(tabTarifProduit.map((t) => [t.id, t])),
    [tabTarifProduit],
  );
  const tarifExamenMap = useMemo(
    () => new Map(tabTarifExamens.map((t) => [t.id, t])),
    [tabTarifExamens],
  );
  const tarifEchographieMap = useMemo(
    () => new Map(tabTarifEchographies.map((t) => [t.id, t])),
    [tabTarifEchographies],
  );
  const echographieMap = useMemo(
    () => new Map(tabEchographie.map((e) => [e.id, e])),
    [tabEchographie],
  );
  const examenMap = useMemo(
    () => new Map(tabExamen.map((e) => [e.id, e])),
    [tabExamen],
  );

  // Lookup : idDemandeExamen → TarifExamen.prixExamen (prix catalogue)
  const demandeExamenMap = useMemo(
    () => new Map(tabDemandeExamens.map((d) => [d.id, d.idTarifExamen])),
    [tabDemandeExamens],
  );
  const getPrixCatalogueExamen = useCallback(
    (idDemandeExamen: string): number | null => {
      const idTarif = demandeExamenMap.get(idDemandeExamen);
      if (!idTarif) return null;
      return tarifExamenMap.get(idTarif)?.prixExamen ?? null;
    },
    [demandeExamenMap, tarifExamenMap],
  );

  // Lookup : idDemandeEchographie → TarifEchographie.prixEchographie (prix catalogue)
  const demandeEchographieMap = useMemo(
    () => new Map(tabDemandeEchographies.map((d) => [d.id, d.idTarifEchographie])),
    [tabDemandeEchographies],
  );
  const getPrixCatalogueEchographie = useCallback(
    (idDemandeEchographie: string): number | null => {
      const idTarif = demandeEchographieMap.get(idDemandeEchographie);
      if (!idTarif) return null;
      return tarifEchographieMap.get(idTarif)?.prixEchographie ?? null;
    },
    [demandeEchographieMap, tarifEchographieMap],
  );

  // Fonctions de lookup utilisant les Maps
  const handleDelete = (idProduit: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      setFactureProduit(
        factureProduit.filter((produit) => produit.id !== idProduit),
      );
    }
  };

  const handleDeleteFacturePrestation = (id: string) => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer cette facture de prestation ?",
      )
    ) {
      setFacturePrestation(
        facturePrestation.filter(
          (prestation) => prestation.idPrestation !== id,
        ),
      );
    }
  };

  const handleDeleteDemandeExamen = (id: string) => {
    if (
      confirm("Êtes-vous sûr de vouloir supprimer cette demande d'examen ?")
    ) {
      setDemandeExamens(demandeExamens.filter((examen) => examen.id !== id));
    }
  };

  const handleDeleteDemandeEchographie = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette échographie ?")) {
      setDemandeEchographies(
        demandeEchographies.filter((echographie) => echographie.id !== id),
      );
    }
  };

  const handleDeleteProduitFactureInBd = async (
    idProduit: string,
    idFacture: string,
    quantite: number,
  ) => {
    if (!canDelete(TableName.FACTURE_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await updateQuantiteStockTarifProduit(idProduit, quantite);
      await deleteFactureProduit(idFacture);
      toast.info("Produit supprimé avec succès !");
      deletedFactureIds.current.add(idFacture);
      setProduitFacture(produitFacture.filter((p) => p.id !== idFacture));
      await updateRecapVisiteAfterDelete(
        selectedIdVisite,
        "05 Fiche facturation",
      );
    } catch (error) {
      toast.error("Erreur lors de la suppression du produit");
      console.error(error);
    }
  };

  const handleDeletePrestationFactureInBd = async (id: string) => {
    if (!canDelete(TableName.FACTURE_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteFacturePrestation(id);
      toast.info("Prestation supprimée avec succès !");
      deletedFactureIds.current.add(id);
      setPrestationFacture(prestationfacture.filter((p) => p.id !== id));
      await updateRecapVisiteAfterDelete(
        selectedIdVisite,
        "05 Fiche facturation",
      );
    } catch (error) {
      toast.error("Erreur lors de la suppression de la prestation");
      console.error(error);
    }
  };

  const handleDeleteExamenFactureInBd = async (id: string) => {
    if (!canDelete(TableName.FACTURE_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteFactureExamen(id);
      toast.info("Examen supprimé avec succès !");
      deletedFactureIds.current.add(id);
      setExamensFacture(examensFacture.filter((e) => e.id !== id));
      await updateRecapVisiteAfterDelete(
        selectedIdVisite,
        "05 Fiche facturation",
      );
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'examen");
      console.error(error);
    }
  };

  const handleDeleteEchographieFactureInBd = async (id: string) => {
    if (!canDelete(TableName.FACTURE_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deleteFactureEchographie(id);
      toast.info("Echographie supprimée avec succès !");
      deletedFactureIds.current.add(id);
      setEchographiesFacture(echographiesFacture.filter((e) => e.id !== id));
      await updateRecapVisiteAfterDelete(
        selectedIdVisite,
        "05 Fiche facturation",
      );
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'echographie");
      console.error(error);
    }
  };

  // Lookups O(1) via Maps
  const nomPrestation = (id: string) =>
    prestationMap.get(id) || "Prestation introuvable";

  const nomClinique = (id: string) =>
    id && clinique && id === clinique.id ? clinique.nomClinique : "Clinique introuvable";

  const renameValue = (idTarifProduit: string) => {
    const tarif = tarifProduitMap.get(idTarifProduit);
    return produitMap.get(tarif?.idProduit || "") || "Produit introuvable";
  };

  const getExamenPrix = (id: string) => {
    const demand = demandeExamens.find((e) => e.id === id);
    return tarifExamenMap.get(demand?.idTarifExamen || "")?.prixExamen || 0;
  };

  const renameExamen = (idDemandeExamen: string) => {
    const demande = tabDemandeExamens.find((p) => p.id === idDemandeExamen);
    const tarif = tarifExamenMap.get(demande?.idTarifExamen || "");
    return examenMap.get(tarif?.idExamen || "")?.nomExamen || "Examen introuvable";
  };

  const renameEchographie = (idDemandeEchographie: string) => {
    const demande = demandeEchographies.find((p) => p.id === idDemandeEchographie);
    const tarif = tarifEchographieMap.get(demande?.idTarifEchographie || "");
    return echographieMap.get(tarif?.idEchographie || "")?.nomEchographie || "Echographie introuvable";
  };

  const getEchographiePrix = (id: string) => {
    const demand = demandeEchographies.find((e) => e.id === id);
    return tarifEchographieMap.get(demand?.idTarifEchographie || "")?.prixEchographie || 0;
  };

  const getServiceEchographie = (idTarifEchographie: string) => {
    const demandeService = tabDemandeEchographies.find(
      (d) => d.idTarifEchographie === idTarifEchographie,
    );
    return demandeService?.serviceEchographie || "";
  };

  const getTypeEchographieFromDemande = (
    idDemandeEchographie: string,
  ): TypeEchographie | undefined => {
    const demande = demandeEchographies.find((d) => d.id === idDemandeEchographie);
    if (!demande) return undefined;
    const tarif = tarifEchographieMap.get(demande.idTarifEchographie);
    if (!tarif) return undefined;
    return echographieMap.get(tarif.idEchographie)?.typeEchographie;
  };

  const getTypeEchographieFromSaved = (
    idDemandeEchographie: string,
  ): TypeEchographie | undefined => {
    const demande = tabDemandeEchographies.find((d) => d.id === idDemandeEchographie);
    if (!demande) return undefined;
    const tarif = tarifEchographieMap.get(demande.idTarifEchographie);
    if (!tarif) return undefined;
    return echographieMap.get(tarif.idEchographie)?.typeEchographie;
  };

  const montantEchographie = (
    echographies: DemandeEchographieFormValues[],
    remise: number,
  ) => {
    const total = echographies.reduce(
      (sum, e) => sum + (e.prixEchographie || 0),
      0,
    );
    return total * (1 - (remise || 0) / 100);
  };

  const form = useForm<VisiteType>({
    defaultValues: {
      idVisite: "",
      typeExamen: "",
      couverture: "",
      remiseExamen: 0,
      remiseEchographie: 0,
      partEchographe: 0,
      soustractionExamen: false,
    },
  });

  // Utiliser useWatch pour éviter les re-renders
  const watchedIdVisite = useWatch({ control: form.control, name: "idVisite" });
  const watchedRemiseExamen = useWatch({
    control: form.control,
    name: "remiseExamen",
  });
  const watchedRemiseEchographie = useWatch({
    control: form.control,
    name: "remiseEchographie",
  });
  const watchedPartEchographe = useWatch({
    control: form.control,
    name: "partEchographe",
  });
  const watchedCouverture = useWatch({
    control: form.control,
    name: "couverture",
  });
  const watchedSoustractionExamen = useWatch({
    control: form.control,
    name: "soustractionExamen",
  });
  const watchedTypeExamen = useWatch({
    control: form.control,
    name: "typeExamen",
  });

  // Synchroniser watchedIdVisite avec selectedIdVisite
  useEffect(() => {
    if (watchedIdVisite) {
      setSelectedIdVisite(watchedIdVisite);
    }
  }, [watchedIdVisite]);

  // Filtrage local des factures pré-chargées côté serveur par visite sélectionnée
  useEffect(() => {
    const deleted = deletedFactureIds.current;

    if (!selectedIdVisite) {
      setProduitFacture([]);
      setPrestationFacture([]);
      setExamensFacture([]);
      setTabDemandeExamens([]);
      setTabDemandeEchographies([]);
      setEchographiesFacture([]);
      return;
    }

    setProduitFacture(
      serverData.tabProduitFactureClient.filter(
        (p) => p.idVisite === selectedIdVisite && !deleted.has(p.id),
      ),
    );
    setPrestationFacture(
      serverData.tabPrestationFactureClient.filter(
        (p) => p.idVisite === selectedIdVisite && !deleted.has(p.id),
      ),
    );
    setExamensFacture(
      serverData.tabExamenFactureClient.filter(
        (e) => e.idVisite === selectedIdVisite && !deleted.has(e.id),
      ),
    );
    setTabDemandeExamens(
      serverData.tabDemandeExamensClient.filter((d) => d.idVisite === selectedIdVisite),
    );
    setTabDemandeEchographies(
      serverData.tabDemandeEchographiesClient.filter((d) => d.idVisite === selectedIdVisite),
    );
    setEchographiesFacture(
      serverData.tabEchographieFactureClient.filter(
        (e) => e.idVisite === selectedIdVisite && !deleted.has(e.id),
      ),
    );
  }, [
    selectedIdVisite,
    serverData.tabProduitFactureClient,
    serverData.tabPrestationFactureClient,
    serverData.tabExamenFactureClient,
    serverData.tabDemandeExamensClient,
    serverData.tabDemandeEchographiesClient,
    serverData.tabEchographieFactureClient,
  ]);

  // Synchroniser les IDs cochés du ticket avec les factures chargées :
  // - Les nouveaux IDs (jamais vus) sont cochés par défaut
  // - Les IDs supprimés sont retirés
  // - Les choix utilisateur (cases décochées) sont préservés pour les IDs existants
  useEffect(() => {
    const currentIds = new Set<string>();
    produitFacture.forEach((p) => currentIds.add(p.id));
    prestationfacture.forEach((p) => currentIds.add(p.id));
    examensFacture.forEach((e) => currentIds.add(e.id));
    echographiesFacture.forEach((e) => currentIds.add(e.id));

    const known = knownFactureIdsRef.current;
    setTicketSelectedIds((prev) => {
      const next = new Set<string>();
      // Conserver les IDs déjà cochés qui existent encore
      for (const id of prev) {
        if (currentIds.has(id)) next.add(id);
      }
      // Cocher par défaut les nouveaux IDs (jamais vus avant)
      for (const id of currentIds) {
        if (!known.has(id)) {
          next.add(id);
        }
      }
      return next;
    });

    // Mettre à jour la ref des IDs connus
    knownFactureIdsRef.current = currentIds;
  }, [produitFacture, prestationfacture, examensFacture, echographiesFacture]);

  // Toggle d'une ligne du ticket
  const toggleTicketSelection = useCallback((id: string) => {
    setTicketSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Tous les IDs des factures enregistrées
  const allFactureIds = useMemo(() => {
    const ids: string[] = [];
    produitFacture.forEach((p) => ids.push(p.id));
    prestationfacture.forEach((p) => ids.push(p.id));
    examensFacture.forEach((e) => ids.push(e.id));
    echographiesFacture.forEach((e) => ids.push(e.id));
    return ids;
  }, [produitFacture, prestationfacture, examensFacture, echographiesFacture]);

  // État du master checkbox : "checked", "unchecked" ou "indeterminate"
  const allTicketChecked = useMemo(() => {
    if (allFactureIds.length === 0) return false;
    return allFactureIds.every((id) => ticketSelectedIds.has(id));
  }, [allFactureIds, ticketSelectedIds]);

  // Toggle tous les IDs
  const toggleAllTicketSelection = useCallback(() => {
    setTicketSelectedIds((prev) => {
      const allChecked = allFactureIds.length > 0 && allFactureIds.every((id) => prev.has(id));
      if (allChecked) return new Set();
      return new Set(allFactureIds);
    });
  }, [allFactureIds]);

  // Données filtrées pour le ticket FACTURE CLIENT (uniquement les lignes cochées)
  const ticketProduits = useMemo(
    () => produitFacture.filter((p) => ticketSelectedIds.has(p.id)),
    [produitFacture, ticketSelectedIds],
  );
  const ticketPrestations = useMemo(
    () => prestationfacture.filter((p) => ticketSelectedIds.has(p.id)),
    [prestationfacture, ticketSelectedIds],
  );
  const ticketExamens = useMemo(
    () => examensFacture.filter((e) => ticketSelectedIds.has(e.id)),
    [examensFacture, ticketSelectedIds],
  );
  const ticketEchographies = useMemo(
    () => echographiesFacture.filter((e) => ticketSelectedIds.has(e.id)),
    [echographiesFacture, ticketSelectedIds],
  );

  // Helper : vérifie si un produit est de type CONTRACEPTIF
  const isContraceptifProduit = (idTarifProduit: string): boolean => {
    const tarifProduit = tabTarifProduit.find((p) => p.id === idTarifProduit);
    if (!tarifProduit) return false;
    const produit = tabProduit.find((p) => p.id === tarifProduit.idProduit);
    return produit?.typeProduit === "CONTRACEPTIF";
  };

  const handleFacturation = async () => {
    if (!canCreate(TableName.FACTURE_PRODUIT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    if (!idUser) return;

    if (factureProduit.length > 0) {
      // Vérification : max 1 produit avec methode = true
      const idsToMark = factureProduit
        .filter((produit) => produit.methode === true)
        .map((produit) => produit.id);
      if (idsToMark.length > 1) {
        setSelectedProduits(idsToMark);
        toast.error(
          "Plusieurs produits contraceptifs sélectionnés en tant que méthodes. Un seul est autorisé.",
        );
        return;
      }

      // Vérification des doublons par idTarifProduit
      const grouped = new Map<string, FactureProduit[]>();
      for (const p of factureProduit) {
        const key = p.idTarifProduit;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(p);
      }
      for (const [idTarif, items] of grouped) {
        if (items.length <= 1) continue;
        if (!isContraceptifProduit(idTarif)) {
          toast.error(
            `Le produit "${renameValue(idTarif)}" est en doublon. Seuls les contraceptifs peuvent être facturés deux fois.`,
          );
          return;
        }
        if (items.length > 2) {
          toast.error(
            `Le produit "${renameValue(idTarif)}" ne peut apparaître que 2 fois (1 méthode + 1 achat).`,
          );
          return;
        }
        const hasMethode = items.some((i) => i.methode === true);
        const hasAchat = items.some((i) => i.methode === false);
        if (!hasMethode || !hasAchat) {
          toast.error(
            `Le produit "${renameValue(idTarif)}" est en doublon. L'un doit être coché comme méthode et l'autre décoché (achat).`,
          );
          return;
        }
      }
    }

    // Validations avant l'appel DB
    if (demandeExamens.length > 0 && isNaN(Number(watchedRemiseExamen))) {
      toast.error("La remise pour les examens doit être un nombre valide");
      return;
    }
    if (
      demandeEchographies.length > 0 &&
      isNaN(Number(watchedRemiseEchographie))
    ) {
      toast.error("La remise pour les échographies doit être un nombre valide");
      return;
    }

    try {
      setIsLoading(true);

      // Préparer toutes les données AVANT l'appel DB
      const produitsData = factureProduit.map((produit) => ({
        id: crypto.randomUUID(),
        idVisite: watchedIdVisite,
        nomProduit: renameValue(produit.idTarifProduit),
        montantProduit: produit.montantProduit || 0,
        idTarifProduit: produit.idTarifProduit,
        idClient: produit.idClient,
        idClinique: produit.idClinique,
        quantite: Number(produit.quantite),
        methode: produit.methode,
        dateFacture: produit.dateFacture || new Date(),
        idUser: idUser,
        quantiteToDecrement: Number(produit.quantite),
      }));

      const prestationsData = facturePrestation.map((prestation) => ({
        id: prestation.id || crypto.randomUUID(),
        idVisite: watchedIdVisite,
        idClient: pharmacyId,
        idClinique: client?.idClinique || "",
        prixPrestation: Number(prestation.prixPrestation),
        libellePrestation: nomPrestation(prestation.idPrestation),
        dateFacture: prestation.dateFacture || new Date(),
        idUser: idUser,
        idPrestation: prestation.idPrestation,
      }));

      const examensData = demandeExamens.map((demande) => ({
        id: crypto.randomUUID(),
        idVisite: watchedIdVisite,
        idClient: pharmacyId,
        idClinique: client?.idClinique || "",
        remiseExamen: parseInt(String(watchedRemiseExamen || "0")),
        soustraitanceExamen: Boolean(watchedSoustractionExamen),
        idUser: idUser,
        libelleExamen: renameExamen(demande.id),
        prixExamen: (!Boolean(watchedSoustractionExamen) && Number(watchedRemiseExamen))
          ? Math.round(
              demande.prixExamen * (1 - Number(watchedRemiseExamen) / 100),
            )
          : demande.prixExamen,
        idDemandeExamen: demande.id,
      }));

      const partEchographeTotal = Number(watchedPartEchographe) || 0;
      const partEchographeParEcho = demandeEchographies.length > 0
        ? Math.round(partEchographeTotal / demandeEchographies.length)
        : 0;

      const echographiesData = demandeEchographies.map((demande) => {
        const prixApresRemise = Number(watchedRemiseEchographie)
          ? Math.round(
              demande.prixEchographie *
                (1 - Number(watchedRemiseEchographie) / 100),
            )
          : demande.prixEchographie;

        return {
          id: crypto.randomUUID(),
          idVisite: watchedIdVisite,
          idClient: pharmacyId,
          idClinique: client?.idClinique || "",
          remiseEchographie: parseInt(String(watchedRemiseEchographie || "0")),
          idUser: idUser,
          libelleEchographie: renameEchographie(demande.id),
          prixEchographie: prixApresRemise - partEchographeParEcho,
          idDemandeEchographie: demande.id,
          serviceEchographieFacture:
            getServiceEchographie(demande.idTarifEchographie) ?? "",
          partEchographe: partEchographeTotal,
        };
      });

      // UN SEUL appel serveur (transaction atomique)
      await batchFacturation({
        couverture: {
          id: crypto.randomUUID(),
          couvertIdClient: pharmacyId,
          couvertType: watchedCouverture as TypeCouverture,
          couvertIdVisite: watchedIdVisite,
        },
        produits: produitsData as (FactureProduit & {
          quantiteToDecrement: number;
        })[],
        prestations: prestationsData as FacturePrestation[],
        examens: examensData as FactureExamen[],
        echographies: echographiesData as FactureEchographie[],
        recapVisite: {
          idVisite: watchedIdVisite,
          idUser: idUser,
          formulaire: "05 Fiche facturation",
        },
      });

      // Mise à jour optimiste : affichage immédiat sans refetch
      setProduitFacture((prev) => [
        ...prev,
        ...(produitsData.map(
          ({ quantiteToDecrement: _, ...p }) => p,
        ) as FactureProduit[]),
      ]);
      setPrestationFacture((prev) => [
        ...prev,
        ...(prestationsData as FacturePrestation[]),
      ]);
      setExamensFacture((prev) => [
        ...prev,
        ...(examensData as FactureExamen[]),
      ]);
      setEchographiesFacture((prev) => [
        ...prev,
        ...(echographiesData as FactureEchographie[]),
      ]);

      // Vider les brouillons
      setFactureProduit([]);
      setFacturePrestation([]);
      setDemandeExamens([]);
      setDemandeEchographies([]);

      toast.success("Client facturé avec succès!");
    } catch (error) {
      console.error("Erreur lors de la facturation", error);
      toast.error("Erreur lors de la facturation");
    } finally {
      setIsLoading(false);
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Nombre total de lignes brouillon
  const draftCount =
    factureProduit.length +
    facturePrestation.length +
    demandeExamens.length +
    demandeEchographies.length;
  const savedCount =
    produitFacture.length +
    prestationfacture.length +
    examensFacture.length +
    echographiesFacture.length;
  const hasDraft = draftCount > 0;
  const hasSaved = savedCount > 0;

  // Calcul du total brouillon
  const remiseExamenPct = Number(watchedRemiseExamen) || 0;
  const isSousTraite = Boolean(watchedSoustractionExamen);
  const partEcho = Number(watchedPartEchographe) || 0;
  // Si sous-traité, la commission labo n'est PAS appliquée sur les examens
  const examenTotal = isSousTraite
    ? montantExamen(demandeExamens)
    : montantExamen(demandeExamens) * (1 - remiseExamenPct / 100);
  const totalBrouillon = Math.round(
    montantProduits(factureProduit) +
      montantPrestations(facturePrestation) +
      examenTotal +
      montantEchographie(demandeEchographies, watchedRemiseEchographie || 0) -
      (demandeEchographies.length > 0 ? partEcho : 0),
  );

  // prixEchographie est déjà net (après remise + partEchographe), pas besoin de soustraire
  const totalSaved =
    montantProduits(produitFacture) +
    montantPrestations(prestationfacture) +
    montantFactureExamens(examensFacture) +
    montantFactureEchographies(echographiesFacture);

  // Total SANS réductions (facture réelle du client)
  const totalSansReduction = useMemo(() => {
    const totalProduits = montantProduits(produitFacture);
    const totalPrestations = montantPrestations(prestationfacture);
    // Examen : prix catalogue (TarifExamen.prixExamen)
    const totalExamens = examensFacture.reduce((sum, e) => {
      return sum + (getPrixCatalogueExamen(e.idDemandeExamen) ?? e.prixExamen);
    }, 0);
    // Echographie : prix saisi dans la dialog (reconstruit depuis net + remise + partEchographe)
    const totalEchographies = echographiesFacture.reduce((sum, e) => {
      return sum + getPrixSaisiEchographie(e, echographiesFacture);
    }, 0);
    return totalProduits + totalPrestations + totalExamens + totalEchographies;
  }, [produitFacture, prestationfacture, examensFacture, echographiesFacture, getPrixCatalogueExamen]);

  // Total affiché sur le ticket FACTURE CLIENT : uniquement les lignes cochées
  const ticketTotal = useMemo(() => {
    const totalProduits = montantProduits(ticketProduits);
    const totalPrestations = montantPrestations(ticketPrestations);
    const totalExamens = ticketExamens.reduce((sum, e) => {
      return sum + (getPrixCatalogueExamen(e.idDemandeExamen) ?? e.prixExamen);
    }, 0);
    const totalEchographies = ticketEchographies.reduce((sum, e) => {
      return sum + getPrixSaisiEchographie(e, echographiesFacture);
    }, 0);
    return totalProduits + totalPrestations + totalExamens + totalEchographies;
  }, [ticketProduits, ticketPrestations, ticketExamens, ticketEchographies, echographiesFacture, getPrixCatalogueExamen]);

  // Impression ticket de caisse via window.open (compatible imprimantes thermiques Xprinter)
  const printTicketThermal = useCallback(() => {
    const cliniqueNom = client?.cliniqueId ? nomClinique(client.cliniqueId) : "";
    const dateStr = dateVisiteSelectionnee.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const caissiere = session?.user?.name ?? "-";
    const clientNom = `${client?.nom ?? ""} ${client?.prenom ?? ""}`.trim().toUpperCase();
    const clientCode = client?.code ?? "";

    let lignesHtml = "";

    const itemRow = (nom: string, qte: number, pu: number, montant: number) =>
      `<tr>
        <td class="td-nom">${nom}</td>
        <td class="td-qte">${qte}</td>
        <td class="td-pu">${pu.toLocaleString("fr-FR")}</td>
        <td class="td-mt">${montant.toLocaleString("fr-FR")}</td>
      </tr>`;

    if (ticketProduits.length > 0) {
      lignesHtml += `<tr><td colspan="4" class="section-label">PRODUITS</td></tr>`;
      ticketProduits.forEach((p) => {
        const pu = Math.round((p.montantProduit || 0) / (p.quantite || 1));
        lignesHtml += itemRow(p.nomProduit, p.quantite, pu, p.montantProduit || 0);
      });
    }

    if (ticketPrestations.length > 0) {
      lignesHtml += `<tr><td colspan="4" class="section-label">PRESTATIONS</td></tr>`;
      ticketPrestations.forEach((p) => {
        const prix = Number(p.prixPrestation);
        lignesHtml += itemRow(nomPrestation(p.idPrestation), 1, prix, prix);
      });
    }

    if (ticketExamens.length > 0) {
      lignesHtml += `<tr><td colspan="4" class="section-label">EXAMENS</td></tr>`;
      ticketExamens.forEach((e) => {
        const prix = getPrixCatalogueExamen(e.idDemandeExamen) ?? e.prixExamen;
        lignesHtml += itemRow(e.libelleExamen, 1, prix, prix);
      });
    }

    if (ticketEchographies.length > 0) {
      lignesHtml += `<tr><td colspan="4" class="section-label">ECHOGRAPHIES</td></tr>`;
      ticketEchographies.forEach((e) => {
        const prix = getPrixSaisiEchographie(e, echographiesFacture);
        lignesHtml += itemRow("Echo. " + e.libelleEchographie, 1, prix, prix);
      });
    }

    const w = window.open("", "_blank", "width=350,height=600");
    if (!w) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Facture Client</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 11px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .header { margin-bottom: 8px; }
  .header img { width: 80%; max-width: 220px; height: auto; margin-bottom: 6px; }
  .footer { margin-top: 10px; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 1px 2px; font-size: 10px; white-space: nowrap; }
  .td-nom { max-width: 110px; overflow: hidden; text-overflow: ellipsis; font-weight: bold; }
  .td-qte { width: 24px; text-align: center; }
  .td-pu { width: 50px; text-align: right; }
  .td-mt { width: 55px; text-align: right; font-weight: bold; }
  .th-nom { text-align: left; }
  .th-qte { width: 24px; text-align: center; }
  .th-pu { width: 50px; text-align: right; }
  .th-mt { width: 55px; text-align: right; }
  .section-label { font-size: 8px; color: #666; text-transform: uppercase; padding-top: 4px; border-bottom: 1px dotted #999; }
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { width: 100%; padding: 5px; }
  }
</style></head>
<body>
  <div class="header center">
    <img src="/LOGO_AIBEF_IPPF.png" alt="Logo AIBEF IPPF" />
    <div class="bold">AIBEF - ${cliniqueNom}</div>
    <div>${dateStr}</div>
  </div>
  <div class="line"></div>
  <div class="row"><span>Client :</span><span class="bold">${clientNom}</span></div>
  ${clientCode ? `<div class="row"><span>Code :</span><span>${clientCode}</span></div>` : ""}
  <div class="row"><span>Caissiere :</span><span>${caissiere}</span></div>
  <div class="line"></div>
  <div class="center bold" style="margin: 6px 0; font-size: 13px;">FACTURE CLIENT</div>
  <div class="line"></div>
  <table>
    <thead>
      <tr style="border-bottom: 1px solid #000;">
        <th class="th-nom">Désig.</th>
        <th class="th-qte">Qté</th>
        <th class="th-pu">P.U.</th>
        <th class="th-mt">Mnt</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHtml}
    </tbody>
  </table>
  <div class="line"></div>
  <div class="row bold" style="font-size: 14px; margin: 6px 0;">
    <span>TOTAL</span>
    <span>${ticketTotal.toLocaleString("fr-FR")} CFA</span>
  </div>
  <div class="line"></div>
  <div class="footer center">
    <p>Merci pour votre visite !</p>
    <p>AIBEF - ${cliniqueNom}</p>
  </div>
</body></html>`);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
      w.onafterprint = () => w.close();
    };
  }, [client, dateVisiteSelectionnee, session, ticketProduits, ticketPrestations, ticketExamens, ticketEchographies, echographiesFacture, ticketTotal, nomClinique, nomPrestation, getPrixCatalogueExamen]);

  // État du bouton Commissions : rouge si commissions manquantes, vert si appliquées
  const hasExams = demandeExamens.length > 0 || examensFacture.length > 0;
  const hasEchos = demandeEchographies.length > 0 || echographiesFacture.length > 0;
  const examCommissionMissing =
    (demandeExamens.length > 0 && !Number(watchedRemiseExamen)) ||
    (examensFacture.length > 0 && examensFacture.some((e) => e.remiseExamen === 0));
  const echoCommissionMissing =
    (demandeEchographies.length > 0 && !Number(watchedRemiseEchographie)) ||
    (echographiesFacture.length > 0 && echographiesFacture.some((e) => e.remiseEchographie === 0));
  const commissionsMissing = examCommissionMissing || echoCommissionMissing;
  const commissionsDone = (hasExams || hasEchos) && !commissionsMissing;

  return (
    <TooltipProvider>
      <div className="w-full relative">
        <Retour />
        <div className="px-4 sm:px-6 pb-8 space-y-5">
          {/* ===== HEADER : Client info + Gradient Banner ===== */}
          <Card className="overflow-hidden border-blue-200 shadow-md shadow-blue-100/40">
            <div className="bg-linear-to-r from-blue-900 to-blue-700 px-3 sm:px-5 py-3 sm:py-4 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight">
                      Facturation
                    </h1>
                    <p className="text-xs sm:text-sm text-blue-100 truncate">
                      {client?.nom?.toUpperCase()} {client?.prenom} &mdash;{" "}
                      {nomClinique(client?.cliniqueId as string)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {visites.length} visite(s)
                  </Badge>
                  {client?.code && (
                    <Badge
                      variant="outline"
                      className="border-white/30 text-white text-[10px] sm:text-xs font-mono hidden sm:inline-flex"
                    >
                      {client.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Form fields intégrés dans le header */}
            <CardContent className="pt-4 pb-3 px-3 sm:px-6">
              <Form {...form}>
                <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <FormField
                    control={form.control}
                    name="idVisite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Visite</FormLabel>
                        <Select
                          required
                          value={field.value ?? ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedIdVisite(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {visites.map((visite, index) => (
                              <SelectItem key={index} value={visite.id}>
                                {new Date(visite.dateVisite).toLocaleDateString(
                                  "fr-FR",
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="couverture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Couverture</FormLabel>
                        <Select
                          required
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TypeCouverture).map(
                              ([key, value]) => (
                                <SelectItem key={key} value={value ?? ""}>
                                  {value}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {demandeExamens.length > 0 && (
                    <div className="bg-yellow-50/80 flex flex-col sm:flex-row gap-2 rounded-md p-2 border border-yellow-200 col-span-1 sm:col-span-2 lg:col-span-3">
                      <FormField
                        control={form.control}
                        name="typeExamen"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Type Bilan
                            </FormLabel>
                            <Select
                              required
                              value={field.value ?? ""}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Choisir..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(TypeBilan).map(
                                  ([key, value]) => (
                                    <SelectItem key={key} value={value ?? ""}>
                                      {value}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="remiseExamen"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Commission labo (%)
                            </FormLabel>
                            <Input
                              className="h-9"
                              placeholder="%"
                              {...field}
                              value={field.value ?? 0}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="soustractionExamen"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Sous-traite
                            </FormLabel>
                            <Select
                              required
                              value={String(field.value ?? false)}
                              onValueChange={(val: string) =>
                                field.onChange(val === "true")
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Sous traite" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="false">Non</SelectItem>
                                <SelectItem value="true">Oui</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {demandeEchographies.length > 0 && (
                    <div className="bg-green-50/80 flex flex-col sm:flex-row gap-2 rounded-md p-2 border border-green-200 col-span-1 sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="remiseEchographie"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              Commission Echo (%)
                            </FormLabel>
                            <Input
                              className="h-9"
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              {...field}
                              value={field.value ?? 0}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="partEchographe"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              Part Échographe (CFA)
                            </FormLabel>
                            <Input
                              className="h-9"
                              type="number"
                              min={0}
                              placeholder="0"
                              {...field}
                              value={field.value ?? 0}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </form>
              </Form>

              {/* ===== Badges récapitulatifs paramètres facturation ===== */}
              {watchedIdVisite && (() => {
                const hasExamensFacture = examensFacture.length > 0;
                const hasEchosFacture = echographiesFacture.length > 0;

                // Examens : utiliser facture si dispo, sinon valeur saisie
                const examFromFacture = hasExamensFacture ? examensFacture[0] : null;
                const remiseExamenAffichee = examFromFacture
                  ? examFromFacture.remiseExamen
                  : Number(watchedRemiseExamen) || 0;
                const isSousTraiteAffiche = examFromFacture
                  ? !!examFromFacture.soustraitanceExamen
                  : Boolean(watchedSoustractionExamen);
                const typeBilanAffiche = watchedTypeExamen || "";

                // Echographies : utiliser facture si dispo, sinon valeur saisie
                const echoFromFacture = hasEchosFacture ? echographiesFacture[0] : null;
                const remiseEchoAffichee = echoFromFacture
                  ? echoFromFacture.remiseEchographie
                  : Number(watchedRemiseEchographie) || 0;
                const partEchoAffichee = echoFromFacture
                  ? echoFromFacture.partEchographe
                  : Number(watchedPartEchographe) || 0;

                const hasAnyExam = hasExamensFacture || demandeExamens.length > 0;
                const hasAnyEcho = hasEchosFacture || demandeEchographies.length > 0;

                if (!hasAnyExam && !hasAnyEcho) return null;

                return (
                  <div className="mt-4 px-3 sm:px-6 pb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mr-1">
                      Paramètres :
                    </span>
                    {hasAnyExam && typeBilanAffiche && (
                      <Badge variant="outline" className="text-[10px] bg-yellow-50 border-yellow-300 text-yellow-800">
                        Type bilan : {typeBilanAffiche}
                      </Badge>
                    )}
                    {hasAnyExam && remiseExamenAffichee > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-yellow-50 border-yellow-300 text-yellow-800">
                        Commission examen : {remiseExamenAffichee}%
                      </Badge>
                    )}
                    {hasAnyExam && isSousTraiteAffiche && (
                      <Badge variant="outline" className="text-[10px] bg-orange-50 border-orange-300 text-orange-800">
                        Sous-traité
                      </Badge>
                    )}
                    {hasAnyEcho && (
                      <Badge variant="outline" className="text-[10px] bg-green-50 border-green-300 text-green-800">
                        Commission écho : {remiseEchoAffichee}%
                      </Badge>
                    )}
                    {hasAnyEcho && partEchoAffichee > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 border-blue-300 text-blue-800">
                        Part échographe : {partEchoAffichee.toLocaleString("fr-FR")} CFA
                      </Badge>
                    )}
                  </div>
                );
              })()}
            </CardContent>

            <Separator />

            {/* Toolbar actions */}
            <div className="px-3 sm:px-5 py-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1 w-full sm:w-auto">
                Ajouter :
              </span>
              <Button
                size="sm"
                variant={watchedIdVisite ? "default" : "outline"}
                onClick={() => setOpen(true)}
                disabled={!watchedIdVisite}
                className="h-8 text-xs"
              >
                <Package className="h-3.5 w-3.5 mr-1" /> Produits
              </Button>
              <Button
                size="sm"
                variant={watchedIdVisite ? "default" : "outline"}
                onClick={() => setOpenPrestation(true)}
                disabled={!watchedIdVisite}
                className="h-8 text-xs"
              >
                <Stethoscope className="h-3.5 w-3.5 mr-1" /> Prestations
              </Button>
              <Button
                size="sm"
                variant={watchedIdVisite ? "default" : "outline"}
                onClick={() => setOpenExamens(true)}
                disabled={!watchedIdVisite}
                className="h-8 text-xs"
              >
                <FlaskConical className="h-3.5 w-3.5 mr-1" /> Examens
              </Button>
              <Button
                size="sm"
                variant={watchedIdVisite ? "default" : "outline"}
                onClick={() => setOpenEchographies(true)}
                disabled={!watchedIdVisite}
                className="h-8 text-xs"
              >
                <ScanLine className="h-3.5 w-3.5 mr-1" /> Echographies
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpenCommissions(true)}
                disabled={!watchedIdVisite}
                className={`h-8 text-xs ${
                  commissionsMissing
                    ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    : commissionsDone
                      ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      : ""
                }`}
              >
                <Handshake className="h-3.5 w-3.5 mr-1" /> Commissions
              </Button>
            </div>
          </Card>

          {/* ===== SUMMARY STATS ===== */}
          {hasDraft && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {factureProduit.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Produits</p>
                    <p className="text-sm font-bold text-blue-900">
                      {montantProduits(factureProduit).toLocaleString("fr-FR")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        CFA
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {facturePrestation.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prestations</p>
                    <p className="text-sm font-bold text-blue-900">
                      {montantPrestations(facturePrestation).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        CFA
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {demandeExamens.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100">
                    <FlaskConical className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Examens</p>
                    <p className="text-sm font-bold text-blue-900">
                      {montantExamen(demandeExamens).toLocaleString("fr-FR")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        CFA
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {demandeEchographies.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100">
                    <ScanLine className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Echographies
                    </p>
                    <p className="text-sm font-bold text-blue-900">
                      {Math.round(
                        montantEchographie(
                          demandeEchographies,
                          watchedRemiseEchographie || 0,
                        ) - (Number(watchedPartEchographe) || 0),
                      ).toLocaleString("fr-FR")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        CFA
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== BROUILLON DE FACTURATION ===== */}
          {hasDraft && (
            <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
              <CardHeader className="pb-3 bg-blue-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Brouillon</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {draftCount} ligne(s)
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-bold">
                      <CircleDollarSign className="h-3 w-3 mr-1" />
                      {totalBrouillon.toLocaleString("fr-FR")} CFA
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader className="bg-blue-50/60">
                    <TableRow>
                      <TableHead className="text-blue-900">
                        Designation
                      </TableHead>
                      <TableHead className="text-blue-900 hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-right text-blue-900">
                        P.U.
                      </TableHead>
                      <TableHead className="text-center text-blue-900">
                        Qte
                      </TableHead>
                      <TableHead className="text-right text-blue-900">
                        Montant
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factureProduit.map((produit) => (
                      <TableRow
                        key={produit.id || `produit-${produit.idTarifProduit}`}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell
                          className={
                            selectedProduits.includes(produit.id)
                              ? "text-red-500 underline font-medium"
                              : "font-medium"
                          }
                        >
                          {renameValue(produit.idTarifProduit)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]"
                          >
                            Produit
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round(
                            (produit.montantProduit || 0) /
                              (produit.quantite || 1),
                          ).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {produit.quantite}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {produit.montantProduit?.toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(produit.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {facturePrestation.map((prestation, index) => (
                      <TableRow
                        key={
                          prestation.id && prestation.id !== ""
                            ? prestation.id
                            : `prestation-${index}`
                        }
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {nomPrestation(prestation.idPrestation)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                          >
                            Prestation
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(prestation.prixPrestation)?.toLocaleString(
                            "fr-FR",
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          1
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {Number(prestation.prixPrestation)?.toLocaleString(
                            "fr-FR",
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              handleDeleteFacturePrestation(
                                prestation.idPrestation,
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {demandeExamens.map((examen, index) => (
                      <TableRow
                        key={
                          examen.id && examen.id !== ""
                            ? examen.id
                            : `examen-${index}`
                        }
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {renameExamen(examen.id)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]"
                          >
                            Examen
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {getExamenPrix(examen.id)?.toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          1
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {(!Boolean(watchedSoustractionExamen) && Number(watchedRemiseExamen)
                            ? Math.round(
                                examen.prixExamen *
                                  (1 -
                                    Number(watchedRemiseExamen) / 100),
                              )
                            : examen.prixExamen
                          )?.toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteDemandeExamen(examen.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {demandeEchographies.map((echographie, index) => {
                      const echoType = getTypeEchographieFromDemande(
                        echographie.id,
                      );
                      return (
                        <TableRow
                          key={
                            echographie.id && echographie.id !== ""
                              ? echographie.id
                              : `echographie-${index}`
                          }
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium">
                            {renameEchographie(echographie.id)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-[11px] ${echoType ? typeEchographieColors[echoType] : "bg-purple-50 text-purple-700 border-purple-200"}`}
                            >
                              {"Échographie"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {getEchographiePrix(echographie.id)?.toLocaleString(
                              "fr-FR",
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            1
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {Math.round(
                              (Number(watchedRemiseEchographie)
                                ? echographie.prixEchographie *
                                  (1 - Number(watchedRemiseEchographie) / 100)
                                : echographie.prixEchographie) -
                              partEcho / demandeEchographies.length,
                            ).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                handleDeleteDemandeEchographie(echographie.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
              <CardFooter className="border-t border-blue-200/60 bg-blue-50/30 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-blue-700" />
                  <span className="text-sm font-semibold">Total : </span>
                  <span className="text-base sm:text-lg font-bold text-blue-800 tabular-nums">
                    {totalBrouillon.toLocaleString("fr-FR")} CFA
                  </span>
                </div>
                <Button
                  onClick={handleFacturation}
                  disabled={
                    !watchedIdVisite ||
                    !watchedCouverture ||
                    isLoading ||
                    (!watchedTypeExamen && demandeExamens.length > 0)
                  }
                  className="gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="small" /> Facturation...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4" /> Facturer
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ===== FACTURES ENREGISTREES ===== */}
          {hasSaved && (
            <div className="w-full" ref={contentRef}>
              <Card className="overflow-hidden border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardHeader className="pb-2 print:hidden px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-sm sm:text-base">
                        Factures enregistrees
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {savedCount} facture(s)
                      </Badge>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                        {totalSaved.toLocaleString("fr-FR")} CFA
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reactToPrintFn()}
                        className="gap-1.5 h-7 text-xs"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Imprimer</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="border-b-0">
                        <TableCell colSpan={7} className="text-center py-4">
                          <Image
                            src="/LOGO_AIBEF_IPPF.png"
                            alt="Logo"
                            width={400}
                            height={10}
                            style={{ margin: "auto" }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-blue-50/60">
                        <TableHead className="w-10 print:hidden">
                          <Checkbox
                            checked={allTicketChecked}
                            onCheckedChange={toggleAllTicketSelection}
                            aria-label="Tout cocher/décocher"
                          />
                        </TableHead>
                        <TableHead className="text-blue-900">
                          Designation
                        </TableHead>
                        <TableHead className="text-blue-900 hidden sm:table-cell">Type</TableHead>
                        <TableHead className="text-right text-blue-900">
                          P.U.
                        </TableHead>
                        <TableHead className="text-center text-blue-900">
                          Qte
                        </TableHead>
                        <TableHead className="text-right text-blue-900">
                          Montant
                        </TableHead>
                        <TableHead className="w-12 print:hidden"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produitFacture.map((produit, index) => (
                        <TableRow
                          key={
                            produit.id && produit.id !== ""
                              ? produit.id
                              : `produit-${index}`
                          }
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="print:hidden">
                            <Checkbox
                              checked={ticketSelectedIds.has(produit.id)}
                              onCheckedChange={() => toggleTicketSelection(produit.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {produit.nomProduit}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]"
                            >
                              Produit
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Math.round(
                              (produit.montantProduit || 0) /
                                (produit.quantite || 1),
                            ).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {produit.quantite}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {produit.montantProduit?.toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="print:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmer la suppression
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irreversible. Le produit
                                    sera definitivement supprime.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() =>
                                      handleDeleteProduitFactureInBd(
                                        produit.idTarifProduit,
                                        produit.id,
                                        produit.quantite,
                                      )
                                    }
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}

                      {prestationfacture.map((prestation, index) => (
                        <TableRow
                          key={
                            prestation.id && prestation.id !== ""
                              ? prestation.id
                              : `prestation-${index}`
                          }
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="print:hidden">
                            <Checkbox
                              checked={ticketSelectedIds.has(prestation.id)}
                              onCheckedChange={() => toggleTicketSelection(prestation.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {nomPrestation(prestation.idPrestation)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                            >
                              Prestation
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(prestation.prixPrestation)?.toLocaleString(
                              "fr-FR",
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            1
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {Number(prestation.prixPrestation)?.toLocaleString(
                              "fr-FR",
                            )}
                          </TableCell>
                          <TableCell className="print:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmer la suppression
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irreversible. La prestation
                                    sera definitivement supprimee.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() =>
                                      handleDeletePrestationFactureInBd(
                                        prestation.id,
                                      )
                                    }
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}

                      {examensFacture.map((examen, index) => (
                        <TableRow
                          key={
                            examen.id && examen.id !== ""
                              ? examen.id
                              : `examen-${index}`
                          }
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="print:hidden">
                            <Checkbox
                              checked={ticketSelectedIds.has(examen.id)}
                              onCheckedChange={() => toggleTicketSelection(examen.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {examen.libelleExamen}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]"
                            >
                              Examen
                              {examen.remiseExamen > 0
                                ? ` (-${examen.remiseExamen}%)`
                                : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {(getPrixCatalogueExamen(examen.idDemandeExamen) ?? examen.prixExamen).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            1
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {examen.prixExamen?.toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="print:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmer la suppression
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irreversible. L&apos;examen
                                    sera definitivement supprime.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() =>
                                      handleDeleteExamenFactureInBd(examen.id)
                                    }
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}

                      {echographiesFacture.map((echographie, index) => {
                        const savedEchoType = getTypeEchographieFromSaved(
                          echographie.idDemandeEchographie,
                        );
                        return (
                          <TableRow
                            key={
                              echographie.id && echographie.id !== ""
                                ? echographie.id
                                : `echographie-${index}`
                            }
                            className="group hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="print:hidden">
                              <Checkbox
                                checked={ticketSelectedIds.has(echographie.id)}
                                onCheckedChange={() => toggleTicketSelection(echographie.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {echographie.libelleEchographie}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-[11px] ${savedEchoType ? typeEchographieColors[savedEchoType] : "bg-purple-50 text-purple-700 border-purple-200"}`}
                              >
                                {"Échographie"}
                                {echographie.remiseEchographie > 0
                                  ? ` (-${echographie.remiseEchographie}%)`
                                  : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {(getPrixCatalogueEchographie(echographie.idDemandeEchographie) ?? echographie.prixEchographie).toLocaleString("fr-FR")}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              1
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {echographie.prixEchographie.toLocaleString("fr-FR")}
                            </TableCell>
                            <TableCell className="print:hidden">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Confirmer la suppression
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irreversible.
                                      L&apos;echographie sera definitivement
                                      supprimee.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() =>
                                        handleDeleteEchographieFactureInBd(
                                          echographie.id,
                                        )
                                      }
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>

                    <TableFooter>
                      <TableRow className="bg-blue-50/50 border-t-2 border-blue-300/40">
                        <TableCell
                          colSpan={5}
                          className="text-right text-sm font-bold"
                        >
                          Total :
                        </TableCell>
                        <TableCell className="text-right text-base font-bold text-blue-800 tabular-nums">
                          {totalSaved.toLocaleString("fr-FR")} CFA
                        </TableCell>
                        <TableCell className="print:hidden"></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                  </div>
                </CardContent>

                {/* Receipt footer */}
                <CardFooter className="flex flex-col gap-3 border-t pt-4 pb-5 px-3 sm:px-6">
                  <Separator className="print:hidden" />
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Clinique :</span>
                      <span className="font-medium">
                        {nomClinique(client?.cliniqueId as string)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Caissiere :</span>
                      <span className="font-medium">{session?.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Date :</span>
                      <span className="font-medium">
                        {dateVisiteSelectionnee.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Recu :</span>
                      <span className="font-medium">
                        {client?.nom
                          ? client.nom
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase(),
                              )
                              .join(" ")
                          : ""}{" "}
                        {client?.prenom
                          ? client.prenom
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase(),
                              )
                              .join(" ")
                          : ""}
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* ===== TICKET DE CAISSE — FACTURE RÉELLE (SANS RÉDUCTIONS) ===== */}
          {hasSaved && (
            <div>
              {/* Zone imprimable du ticket */}
              <div ref={ticketRef} className="max-w-[320px] mx-auto bg-white">
                <div className="px-3 py-4 font-mono text-[11px] leading-tight">
                  {/* En-tête logo */}
                  <div className="text-center mb-3">
                    <Image
                      src="/LOGO_AIBEF_IPPF.png"
                      alt="Logo"
                      width={200}
                      height={10}
                      style={{ margin: "auto" }}
                    />
                  </div>

                  {/* Infos clinique */}
                  <div className="text-center text-[10px] mb-2">
                    <p className="font-bold">AIBEF - {nomClinique(client?.cliniqueId as string)}</p>
                    <p>
                      {dateVisiteSelectionnee.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Séparateur */}
                  <div className="border-t border-dashed border-gray-400 my-2" />

                  {/* Infos client */}
                  <div className="text-[10px] mb-2 space-y-0.5">
                    <p>
                      <span className="text-gray-500">Client :</span>{" "}
                      <span className="font-bold uppercase">
                        {client?.nom} {client?.prenom}
                      </span>
                    </p>
                    {client?.code && (
                      <p>
                        <span className="text-gray-500">Code :</span> {client.code}
                      </p>
                    )}
                    <p>
                      <span className="text-gray-500">Caissiere :</span> {session?.user.name}
                    </p>
                  </div>

                  {/* Séparateur */}
                  <div className="border-t border-dashed border-gray-400 my-2" />

                  {/* Titre */}
                  <p className="text-center font-bold text-xs mb-2">FACTURE CLIENT</p>

                  {/* En-tête colonnes */}
                  <div className="flex justify-between text-[9px] font-bold border-b border-gray-300 pb-1 mb-1">
                    <span className="flex-1">Designation</span>
                    <span className="w-8 text-center">Qte</span>
                    <span className="w-14 text-right">P.U.</span>
                    <span className="w-16 text-right">Montant</span>
                  </div>

                  {/* Label Produits */}
                  {ticketProduits.length > 0 && (
                    <div className="mb-1">
                      <span className="text-[8px] text-gray-400 uppercase">Produits</span>
                    </div>
                  )}

                  {/* Lignes produits */}
                  {ticketProduits.map((produit, index) => (
                    <div
                      key={produit.id || `ticket-produit-${index}`}
                      className="flex justify-between py-0.5 text-[10px]"
                    >
                      <span className="flex-1 truncate">{produit.nomProduit}</span>
                      <span className="w-8 text-center">{produit.quantite}</span>
                      <span className="w-14 text-right tabular-nums">
                        {Math.round(
                          (produit.montantProduit || 0) / (produit.quantite || 1),
                        ).toLocaleString("fr-FR")}
                      </span>
                      <span className="w-16 text-right font-medium tabular-nums">
                        {produit.montantProduit?.toLocaleString("fr-FR")}
                      </span>
                    </div>
                  ))}

                  {/* Séparateur Produits → Prestations */}
                  {ticketProduits.length > 0 && ticketPrestations.length > 0 && (
                    <div className="border-t border-dashed border-gray-300 my-1.5 relative">
                      <span className="absolute -top-[7px] left-0 bg-white pr-1 text-[8px] text-gray-400 uppercase">Prestations</span>
                    </div>
                  )}

                  {/* Lignes prestations */}
                  {ticketPrestations.map((prestation, index) => (
                    <div
                      key={prestation.id || `ticket-prestation-${index}`}
                      className="flex justify-between py-0.5 text-[10px]"
                    >
                      <span className="flex-1 truncate">
                        {nomPrestation(prestation.idPrestation)}
                      </span>
                      <span className="w-8 text-center">1</span>
                      <span className="w-14 text-right tabular-nums">
                        {Number(prestation.prixPrestation)?.toLocaleString("fr-FR")}
                      </span>
                      <span className="w-16 text-right font-medium tabular-nums">
                        {Number(prestation.prixPrestation)?.toLocaleString("fr-FR")}
                      </span>
                    </div>
                  ))}

                  {/* Séparateur → Examens */}
                  {(ticketProduits.length > 0 || ticketPrestations.length > 0) && ticketExamens.length > 0 && (
                    <div className="border-t border-dashed border-gray-300 my-1.5 relative">
                      <span className="absolute -top-[7px] left-0 bg-white pr-1 text-[8px] text-gray-400 uppercase">Examens</span>
                    </div>
                  )}

                  {/* Lignes examens — prix catalogue */}
                  {ticketExamens.map((examen, index) => {
                    const prixCatalogue = getPrixCatalogueExamen(examen.idDemandeExamen) ?? examen.prixExamen;
                    return (
                      <div
                        key={examen.id || `ticket-examen-${index}`}
                        className="flex justify-between py-0.5 text-[10px]"
                      >
                        <span className="flex-1 truncate">{examen.libelleExamen}</span>
                        <span className="w-8 text-center">1</span>
                        <span className="w-14 text-right tabular-nums">
                          {prixCatalogue.toLocaleString("fr-FR")}
                        </span>
                        <span className="w-16 text-right font-medium tabular-nums">
                          {prixCatalogue.toLocaleString("fr-FR")}
                        </span>
                      </div>
                    );
                  })}

                  {/* Séparateur → Échographies */}
                  {(ticketProduits.length > 0 || ticketPrestations.length > 0 || ticketExamens.length > 0) && ticketEchographies.length > 0 && (
                    <div className="border-t border-dashed border-gray-300 my-1.5 relative">
                      <span className="absolute -top-[7px] left-0 bg-white pr-1 text-[8px] text-gray-400 uppercase">Echographies</span>
                    </div>
                  )}

                  {/* Lignes échographies — prix saisi dans la dialog (reconstitué) */}
                  {ticketEchographies.map((echographie, index) => {
                    const prixSaisi = getPrixSaisiEchographie(echographie, echographiesFacture);
                    return (
                      <div
                        key={echographie.id || `ticket-echo-${index}`}
                        className="flex justify-between py-0.5 text-[10px]"
                      >
                        <span className="flex-1 truncate">
                          Echo. {echographie.libelleEchographie}
                        </span>
                        <span className="w-8 text-center">1</span>
                        <span className="w-14 text-right tabular-nums">
                          {prixSaisi.toLocaleString("fr-FR")}
                        </span>
                        <span className="w-16 text-right font-medium tabular-nums">
                          {prixSaisi.toLocaleString("fr-FR")}
                        </span>
                      </div>
                    );
                  })}

                  {/* Séparateur total */}
                  <div className="border-t border-double border-gray-600 mt-2 pt-2">
                    <div className="flex justify-between font-bold text-xs">
                      <span>TOTAL</span>
                      <span className="tabular-nums">
                        {ticketTotal.toLocaleString("fr-FR")} CFA
                      </span>
                    </div>
                  </div>

                  {/* Pied de ticket */}
                  <div className="border-t border-dashed border-gray-400 mt-3 pt-2 text-center text-[9px] text-gray-500 space-y-0.5">
                    <p>Merci pour votre visite !</p>
                    <p>AIBEF - {nomClinique(client?.cliniqueId as string)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== EMPTY STATE ===== */}
          {watchedIdVisite &&
            !hasSaved &&
            !hasDraft && (
              <Card className="border-dashed border-2 border-blue-200/70">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
                    <FileWarning className="h-8 w-8 text-blue-400" />
                  </div>
                  <p className="text-base font-semibold text-muted-foreground">
                    Aucune facture pour cette visite
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                    Utilisez les boutons ci-dessus pour ajouter des produits,
                    prestations, examens ou echographies
                  </p>
                </CardContent>
              </Card>
            )}

          {/* ===== ACTION BUTTONS (Print / Return) ===== */}
          {watchedIdVisite && hasSaved && (
            <div className="flex justify-center gap-3 print:hidden">
              <Button
                variant="outline"
                size="lg"
                onClick={() => printTicketThermal()}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimer ticket de caisse
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(`/fiches/${pharmacyId}`)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au dossier
              </Button>
            </div>
          )}

          {/* ===== MODALS ===== */}
          <FactureModal
            open={open}
            idClient={pharmacyId}
            tabClinique={clinique ? [clinique] : []}
            allProduits={tabProduit}
            clientData={client}
            setOpen={setOpen}
            refreshProduits={async () => {}}
            setFactureProduit={setFactureProduit}
            tarifProduits={tabTarifProduit}
            excludedProduitIds={[
              ...factureProduit.map((p) => p.idTarifProduit),
              ...produitFacture.map((p) => p.idTarifProduit),
            ]}
          />
          <PrestationsModal
            openPrestation={openPrestation}
            idClient={pharmacyId}
            setOpenPrestation={setOpenPrestation}
            refreshProduits={async () => {}}
            setFacturePrestation={setFacturePrestation}
            tarifPrestations={serverData.tabTarifPrestations}
            excludedPrestationIds={[
              ...facturePrestation.map((p) => p.idPrestation),
              ...prestationfacture.map((p) => p.idPrestation),
            ]}
          />
          <ExamensModal
            open={openExamens}
            idClient={pharmacyId}
            idVisite={watchedIdVisite}
            setOpen={setOpenExamens}
            setExamensSelectionnes={setDemandeExamens}
            refreshExamens={async () => {
              const allDemandeExamens = await getAllDemandeExamensByIdVisite(
                watchedIdVisite,
              );
              setTabDemandeExamens(allDemandeExamens as DemandeExamen[]);
            }}
            allExamens={tabExamen}
            tarifExamens={tabTarifExamens}
            demandesExamens={tabDemandeExamens}
            excludedExamenIds={[
              ...demandeExamens.map((e) => e.id),
              ...examensFacture.map((e) => e.idDemandeExamen),
            ]}
          />
          <EchographiesModal
            open={openEchographies}
            idClient={pharmacyId}
            idVisite={watchedIdVisite}
            setOpen={setOpenEchographies}
            setEchographiesSelectionnees={setDemandeEchographies}
            refreshExamens={async () => {
              const allDemandeEchographies =
                await getAllDemandeEchographiesByIdVisite(
                  watchedIdVisite,
                );
              setTabDemandeEchographies(
                allDemandeEchographies as DemandeEchographie[],
              );
            }}
            tabClinique={clinique ? [clinique] : []}
            allEchographies={tabEchographie}
            tarifEchographies={tabTarifEchographies}
            demandesEchographies={tabDemandeEchographies}
            excludedEchographieIds={[
              ...demandeEchographies.map((e) => e.id),
              ...echographiesFacture.map((e) => e.idDemandeEchographie),
            ]}
          />
          <CommissionsDialog
            open={openCommissions}
            setOpen={setOpenCommissions}
            idClinique={client?.idClinique || ""}
            idVisite={watchedIdVisite}
            examensFacture={examensFacture}
            echographiesFacture={echographiesFacture}
            tarifExamens={tabTarifExamens}
            demandesExamens={tabDemandeExamens}
            tarifEchographies={tabTarifEchographies}
            demandesEchographies={tabDemandeEchographies}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
