"use client";

import { useState, useEffect, useRef, use, useMemo } from "react";
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
import { updateProduitByFactureProduit } from "@/lib/actions/factureProduitActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { updateQuantiteStockTarifProduit } from "@/lib/actions/tarifProduitActions";

import { FactureModal } from "@/components/factureModal";
import {
  createFactureProduit,
  deleteFactureProduit,
  getAllFactureProduitByIdVisite,
} from "@/lib/actions/factureProduitActions";
import {
  createFacturePrestation,
  deleteFacturePrestation,
  getAllFacturePrestationByIdVisite,
} from "@/lib/actions/facturePrestationActions";

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
  Permission,
  TarifPrestation,
} from "@prisma/client";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useForm, useWatch } from "react-hook-form";
import PrestationsModal from "@/components/prestationModal";
import ExamensModal from "@/components/examenModal";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
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
import {
  createFactureExamen,
  deleteFactureExamen,
  getAllFactureExamenByIdVisite,
} from "@/lib/actions/factureExamenActions";
import { useRouter } from "next/navigation";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { Input } from "@/components/ui/input";
import { getAllDemandeExamensByIdVisite } from "@/lib/actions/demandeExamenActions";
import { getAllDemandeEchographiesByIdVisite } from "@/lib/actions/demandeEchographieActions";
import EchographiesModal from "@/components/echographieModal";
import {
  createFactureEchographie,
  deleteFactureEchographie,
  getAllFactureEchographieByIdVisite,
} from "@/lib/actions/factureEchographieActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { AnimatePresence, motion } from "framer-motion";
import { createCouverture } from "@/lib/actions/couvertureActions";
import Retour from "@/components/retour";
import CommissionsDialog from "@/components/CommissionsDialog";

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
  soustractionExamen: false;
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
    tabClinique: Clinique[];
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

  // Utilisation des données du serveur
  const [visites] = useState<Visite[]>(serverData.visites);
  const [client] = useState<Client>(serverData.client);
  const [tabClinique] = useState<Clinique[]>(serverData.tabClinique);
  const [tabProduit] = useState<Produit[]>(serverData.tabProduit);
  const [tabTarifProduit] = useState<TarifProduit[]>(
    serverData.tabTarifProduit,
  );
  const [tabExamen] = useState<Examen[]>(serverData.tabExamen);
  const [tabEchographie] = useState<Echographie[]>(serverData.tabEchographie);
  const [tabTarifExamens] = useState<TarifExamen[]>(serverData.tabTarifExamens);
  const [tabTarifEchographies] = useState<TarifEchographie[]>(
    serverData.tabTarifEchographies,
  );
  const [prestations] = useState<Prestation[]>(serverData.prestations);

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
  const [isLoadingFacture, setIsLoadingFacture] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [selectedIdVisite, setSelectedIdVisite] = useState<string>("");

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  // Mémorisation des filtres par clinique pour éviter les re-calculs inutiles
  const filteredTarifProduits = useMemo(
    () => tabTarifProduit.filter((t) => t.idClinique === client?.idClinique),
    [tabTarifProduit, client?.idClinique],
  );

  const filteredTarifPrestations = useMemo(
    () =>
      serverData.tabTarifPrestations.filter(
        (p) => p.idClinique === client?.idClinique,
      ),
    [serverData.tabTarifPrestations, client?.idClinique],
  );

  const filteredTarifExamens = useMemo(
    () => tabTarifExamens.filter((t) => t.idClinique === client?.idClinique),
    [tabTarifExamens, client?.idClinique],
  );

  const filteredTarifEchographies = useMemo(
    () =>
      tabTarifEchographies.filter((t) => t.idClinique === client?.idClinique),
    [tabTarifEchographies, client?.idClinique],
  );

  // Les fonctions restent identiques...
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
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      toast.error(
        "Vous n'avez pas la permission de supprimer un produit. Contactez un administrateur.",
      );
      return;
    }
    try {
      await updateQuantiteStockTarifProduit(idProduit, quantite);
      await deleteFactureProduit(idFacture);
      toast.info("Produit supprimé avec succès !");
      setProduitFacture(produitFacture.filter((p) => p.id !== idFacture));
    } catch (error) {
      toast.error("Erreur lors de la suppression du produit");
      console.error(error);
    }
  };

  const handleDeletePrestationFactureInBd = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      toast.error(
        "Vous n'avez pas la permission de supprimer une prestation. Contactez un administrateur.",
      );
      return;
    }
    try {
      await deleteFacturePrestation(id);
      toast.info("Prestation supprimée avec succès !");
      setPrestationFacture(prestationfacture.filter((p) => p.id !== id));
    } catch (error) {
      toast.error("Erreur lors de la suppression de la prestation");
      console.error(error);
    }
  };

  const handleDeleteExamenFactureInBd = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      toast.error(
        "Vous n'avez pas la permission de supprimer un examen. Contactez un administrateur.",
      );
      return;
    }
    try {
      await deleteFactureExamen(id);
      toast.info("Examen supprimé avec succès !");
      setExamensFacture(examensFacture.filter((e) => e.id !== id));
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'examen");
      console.error(error);
    }
  };

  const handleDeleteEchographieFactureInBd = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      toast.error(
        "Vous n'avez pas la permission de supprimer une échographie. Contactez un administrateur.",
      );
      return;
    }
    try {
      await deleteFactureEchographie(id);
      toast.info("Echographie supprimée avec succès !");
      setEchographiesFacture(echographiesFacture.filter((e) => e.id !== id));
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'echographie");
      console.error(error);
    }
  };

  const refreshProduits = async () => {
    // Cette fonction peut rester si nécessaire pour les mises à jour
  };

  const nomPrestation = (idprestation: string) => {
    return (
      prestations.find((p) => p.id === idprestation)?.nomPrestation ||
      "Prestation introuvable"
    );
  };

  const nomClinique = (idClinique: string) => {
    return (
      tabClinique.find((c) => c.id === idClinique)?.nomClinique ||
      "Clinique introuvable"
    );
  };

  const renameValue = (idTarifProduit: string) => {
    const tarifProduit = tabTarifProduit.find((p) => p.id === idTarifProduit);
    return (
      tabProduit.find((p) => p.id === tarifProduit?.idProduit)?.nomProduit ||
      "Produit introuvable"
    );
  };

  const getExamenPrix = (id: string) => {
    const demand = demandeExamens.find((e) => e.id === id);
    return (
      tabTarifExamens.find((t) => t.id === demand?.idTarifExamen)?.prixExamen ||
      0
    );
  };

  const renameExamen = (idDemandeExamen: string) => {
    const demandeExamen = tabDemandeExamens.find(
      (p) => p.id === idDemandeExamen,
    );
    const tarifExamen = tabTarifExamens.find(
      (p) => p.id === demandeExamen?.idTarifExamen,
    );
    return (
      tabExamen.find((p) => p.id === tarifExamen?.idExamen)?.nomExamen ||
      "Examen introuvable"
    );
  };

  const renameEchographie = (idDemandeEchographie: string) => {
    const demandeEchographie = demandeEchographies.find(
      (p) => p.id === idDemandeEchographie,
    );
    const tarifEchographie = tabTarifEchographies.find(
      (p) => p.id === demandeEchographie?.idTarifEchographie,
    );
    return (
      tabEchographie.find((p) => p.id === tarifEchographie?.idEchographie)
        ?.nomEchographie || "Echographie introuvable"
    );
  };

  const getEchographiePrix = (id: string) => {
    const demand = demandeEchographies.find((e) => e.id === id);
    return (
      tabTarifEchographies.find((t) => t.id === demand?.idTarifEchographie)
        ?.prixEchographie || 0
    );
  };

  const getServiceEchographie = (idTarifEchographie: string) => {
    const demandeService = tabDemandeEchographies.find(
      (d) => d.idTarifEchographie === idTarifEchographie,
    );
    return demandeService?.serviceEchographie || "";
  };

  const montantProduits = (produits: FactureProduit[]) => {
    return produits.reduce((total, p) => total + (p.montantProduit || 0), 0);
  };

  const montantExamen = (produits: DemandeExamenFormValues[]) => {
    return produits.reduce((total, p) => total + (p.prixExamen || 0), 0);
  };

  const montantEchographie = (
    echographies: DemandeEchographieFormValues[],
    remise: number,
  ) => {
    const tarifs = echographies.map((e) => {
      return tabTarifEchographies.find((t) => t.id === e.idTarifEchographie);
    });
    const total = tarifs.reduce(
      (total, t) => total + (t?.prixEchographie || 0),
      0,
    );
    return total * (1 - (remise || 0) / 100);
  };

  const montantPrestations = (prestations: FacturePrestation[]) => {
    return (
      prestations?.reduce(
        (total, p) => total + (Number(p.prixPrestation) || 0),
        0,
      ) || 0
    );
  };

  const montantFactureExamens = (examens: FactureExamen[]) => {
    return examens.reduce((total, e) => total + (Number(e.prixExamen) || 0), 0);
  };

  const montantFactureEchographies = (echographies: FactureEchographie[]) => {
    return echographies.reduce(
      (total, e) => total + (Number(e.prixEchographie) || 0),
      0,
    );
  };

  const form = useForm<VisiteType>({
    defaultValues: {
      idVisite: "",
      typeExamen: "",
      couverture: "",
      remiseExamen: 0,
      remiseEchographie: 0,
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
  const watchedCouverture = useWatch({
    control: form.control,
    name: "couverture",
  });
  const watchedSoustractionExamen = useWatch({
    control: form.control,
    name: "soustractionExamen",
  });

  // Synchroniser watchedIdVisite avec selectedIdVisite
  useEffect(() => {
    if (watchedIdVisite) {
      setSelectedIdVisite(watchedIdVisite);
    }
  }, [watchedIdVisite]);

  // Chargement des permissions
  useEffect(() => {
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.FACTURE_PRODUIT,
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error,
        );
      }
    };

    fetchPermissions();
  }, [session?.user, router]);

  // Chargement des données de facturation basées sur la visite sélectionnée
  useEffect(() => {
    if (!selectedIdVisite) {
      setIsLoadingFacture(false);
      setProduitFacture([]);
      setPrestationFacture([]);
      setExamensFacture([]);
      setTabDemandeExamens([]);
      setTabDemandeEchographies([]);
      setEchographiesFacture([]);
      return;
    }

    setIsLoadingFacture(true);

    setProduitFacture(
      serverData.tabProduitFactureClient.filter(
        (tab) => tab.idVisite === selectedIdVisite,
      ) as FactureProduit[],
    );
    setPrestationFacture(
      serverData.tabPrestationFactureClient.filter(
        (tab) => tab.idVisite === selectedIdVisite,
      ) as FacturePrestation[],
    );
    setExamensFacture(
      serverData.tabExamenFactureClient.filter(
        (tab) => tab.idVisite === selectedIdVisite,
      ) as FactureExamen[],
    );
    setTabDemandeExamens(
      serverData.tabDemandeExamensClient.filter(
        (tab) => tab.idVisite === selectedIdVisite,
      ) as DemandeExamen[],
    );
    setTabDemandeEchographies(
      serverData.tabDemandeEchographiesClient.filter(
        (tab) => tab.idVisite === selectedIdVisite,
      ) as DemandeEchographie[],
    );
    setEchographiesFacture(
      serverData.tabEchographieFactureClient.filter(
        (tab) => tab.idVisite === selectedIdVisite,
      ) as FactureEchographie[],
    );

    setIsLoadingFacture(false);
  }, [selectedIdVisite, serverData]);

  const handleFacturation = async () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de facturer un client. Contactez un administrateur.",
      );
      return router.back();
    }
    if (!idUser) return;
    if (factureProduit.length > 0) {
      // Récupérer les IDs des factureProduit dont methode est égale true
      const idsToMark = factureProduit
        .filter((produit) => produit.methode === true)
        .map((produit) => produit.id);
      if (idsToMark.length > 1) {
        setSelectedProduits(idsToMark);
        // Logique de facturation
        alert("Plusieurs produit contraceptifs sélectionnés en tant  méthodes");
        return;
      }
    }

    try {
      setIsLoading(true);

      // On va vérifier si data.remiseExamen N'est pas un nombre
      if (demandeExamens.length > 0 && isNaN(Number(watchedRemiseExamen))) {
        toast.error("La remise pour les examens doit être un nombre valide");
        return;
      }
      if (
        demandeEchographies.length > 0 &&
        isNaN(Number(watchedRemiseEchographie))
      ) {
        toast.error(
          "La remise pour les échographies doit être un nombre valide",
        );
        return;
      }

      // const couverture = form.watch("couverture");
      const couvertureData = {
        id: crypto.randomUUID(),
        couvertIdClient: pharmacyId,
        couvertType: watchedCouverture as TypeCouverture,
        couvertIdVisite: watchedIdVisite,
      };
      await createCouverture(couvertureData);

      // Enregistrement parallèle de toutes les factures
      const [
        produitsResults,
        prestationsResults,
        examensResults,
        echographiesResults,
      ] = await Promise.all([
        // Enregistrement des produits (chaque produit a 2 appels séquentiels)
        Promise.allSettled(
          factureProduit.map(async (produit) => {
            const dataProduit = {
              idVisite: watchedIdVisite,
              nomProduit: renameValue(produit.idTarifProduit),
              montantProduit: produit.montantProduit || 0,
              id: crypto.randomUUID(),
              idTarifProduit: produit.idTarifProduit,
              idClient: produit.idClient,
              idClinique: produit.idClinique,
              quantite: Number(produit.quantite),
              methode: produit.methode,
              dateFacture: produit.dateFacture,
              idUser: idUser,
            };
            await createFactureProduit(dataProduit);
            await updateProduitByFactureProduit(
              produit.idTarifProduit,
              Number(produit.quantite),
            );
          }),
        ),
        // Enregistrement des prestations
        Promise.allSettled(
          facturePrestation.map(async (prestation) => {
            const dataPrestation = {
              idVisite: watchedIdVisite,
              idClient: pharmacyId,
              idClinique: client?.idClinique || "",
              prixPrestation: Number(prestation.prixPrestation),
              libellePrestation: nomPrestation(prestation.idPrestation),
              id: prestation.id,
              dateFacture: prestation.dateFacture,
              idUser: idUser,
              idPrestation: prestation.idPrestation,
            };
            await createFacturePrestation(dataPrestation);
          }),
        ),
        // Enregistrement des demandes d'examen
        Promise.allSettled(
          demandeExamens.map(async (demande) => {
            const dataDemande = {
              id: crypto.randomUUID(),
              idVisite: watchedIdVisite,
              idClient: pharmacyId,
              idClinique: client?.idClinique || "",
              remiseExamen: parseInt(String(watchedRemiseExamen || "0")),
              soustraitanceExamen: Boolean(watchedSoustractionExamen),
              idUser: idUser,
              libelleExamen: renameExamen(demande.id),
              prixExamen: Number(watchedRemiseExamen)
                ? Math.round(
                    demande.prixExamen *
                      (1 - Number(watchedRemiseExamen) / 100),
                  )
                : demande.prixExamen,
              idDemandeExamen: demande.id,
            };
            await createFactureExamen(dataDemande);
          }),
        ),
        // Enregistrement des demandes d'échographie
        Promise.allSettled(
          demandeEchographies.map(async (demande) => {
            const dataDemande = {
              id: crypto.randomUUID(),
              idVisite: watchedIdVisite,
              idClient: pharmacyId,
              idClinique: client?.idClinique || "",
              remiseEchographie: parseInt(
                String(watchedRemiseEchographie || "0"),
              ),
              idUser: idUser,
              libelleEchographie: renameEchographie(demande.id),
              prixEchographie: Number(watchedRemiseEchographie)
                ? Math.round(
                    demande.prixEchographie *
                      (1 - Number(watchedRemiseEchographie) / 100),
                  )
                : demande.prixEchographie,
              idDemandeEchographie: demande.id,
              serviceEchographieFacture:
                getServiceEchographie(demande.idTarifEchographie) ?? "",
            };
            await createFactureEchographie(dataDemande);
          }),
        ),
      ]);

      // Gestion des erreurs individuelles
      const produitErrors = produitsResults.filter(
        (r) => r.status === "rejected",
      );
      const prestationErrors = prestationsResults.filter(
        (r) => r.status === "rejected",
      );
      const examenErrors = examensResults.filter(
        (r) => r.status === "rejected",
      );
      const echographieErrors = echographiesResults.filter(
        (r) => r.status === "rejected",
      );

      if (produitErrors.length > 0) {
        console.error("Erreurs produits:", produitErrors);
        toast.error(
          `${produitErrors.length} erreur(s) lors de l'enregistrement des produits`,
        );
      }
      if (prestationErrors.length > 0) {
        console.error("Erreurs prestations:", prestationErrors);
        toast.error(
          `${prestationErrors.length} erreur(s) lors de l'enregistrement des prestations`,
        );
      }
      if (examenErrors.length > 0) {
        console.error("Erreurs examens:", examenErrors);
        toast.error(
          `${examenErrors.length} erreur(s) lors de l'enregistrement des examens`,
        );
      }
      if (echographieErrors.length > 0) {
        console.error("Erreurs échographies:", echographieErrors);
        toast.error(
          `${echographieErrors.length} erreur(s) lors de l'enregistrement des échographies`,
        );
      }

      // Réinitialisation et mise à jour des données
      setFactureProduit([]);
      setFacturePrestation([]);
      setDemandeExamens([]);
      setDemandeEchographies([]);

      const [
        updatedProduits,
        updatedPrestations,
        updatedExamens,
        updatedEchographies,
      ] = await Promise.all([
        getAllFactureProduitByIdVisite(watchedIdVisite),
        getAllFacturePrestationByIdVisite(watchedIdVisite),
        getAllFactureExamenByIdVisite(watchedIdVisite),
        getAllFactureEchographieByIdVisite(watchedIdVisite),
      ]);

      setProduitFacture(updatedProduits as FactureProduit[]);
      setPrestationFacture(updatedPrestations as FacturePrestation[]);
      setExamensFacture(updatedExamens as FactureExamen[]);
      setEchographiesFacture(updatedEchographies as FactureEchographie[]);

      await updateRecapVisite(watchedIdVisite, idUser, "05 Fiche facturation");

      toast.success("Client facturé avec succès! 🎉");
    } catch (error) {
      console.error("Erreur lors de la facturation", error);
      toast.error("Erreur lors de la facturation");
    } finally {
      setIsLoading(false);
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);
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
  const totalBrouillon = Number(watchedRemiseExamen)
    ? Math.round(
        montantPrestations(facturePrestation) +
          montantExamen(demandeExamens) -
          montantExamen(demandeExamens) * (Number(watchedRemiseExamen) / 100) +
          montantEchographie(
            demandeEchographies,
            watchedRemiseEchographie || 0,
          ),
      )
    : Math.round(
        montantProduits(factureProduit) +
          montantPrestations(facturePrestation) +
          montantExamen(demandeExamens) +
          montantEchographie(
            demandeEchographies,
            watchedRemiseEchographie || 0,
          ),
      );

  const totalSaved =
    montantProduits(produitFacture) +
    montantPrestations(prestationfacture) +
    montantFactureExamens(examensFacture) +
    montantFactureEchographies(echographiesFacture);

  return (
    <TooltipProvider>
      <div className="w-full relative">
        <Retour />
        <div className="px-4 sm:px-6 pb-8 space-y-5">
          {/* ===== HEADER : Client info + Gradient Banner ===== */}
          <Card className="overflow-hidden border-blue-200 shadow-md shadow-blue-100/40">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight">
                      Facturation
                    </h1>
                    <p className="text-sm text-blue-100">
                      {client?.nom?.toUpperCase()} {client?.prenom} &mdash;{" "}
                      {nomClinique(client?.cliniqueId as string)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {visites.length} visite(s)
                  </Badge>
                  {client?.code && (
                    <Badge
                      variant="outline"
                      className="border-white/30 text-white text-xs font-mono"
                    >
                      {client.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Form fields intégrés dans le header */}
            <CardContent className="pt-4 pb-3">
              <Form {...form}>
                <form className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                    <>
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
                              Commission labo
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
                    </>
                  )}

                  {demandeEchographies.length > 0 && (
                    <FormField
                      control={form.control}
                      name="remiseEchographie"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Commission Echo
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
                  )}
                </form>
              </Form>
            </CardContent>

            <Separator />

            {/* Toolbar actions */}
            <div className="px-5 py-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">
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
                className="h-8 text-xs"
              >
                <Handshake className="h-3.5 w-3.5 mr-1" /> Commissions
              </Button>
            </div>
          </Card>

          {/* ===== SUMMARY STATS ===== */}
          {hasDraft && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      {montantEchographie(
                        demandeEchographies,
                        watchedRemiseEchographie || 0,
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
                <Table>
                  <TableHeader className="bg-blue-50/60">
                    <TableRow>
                      <TableHead className="text-blue-900">Designation</TableHead>
                      <TableHead className="text-blue-900">Type</TableHead>
                      <TableHead className="text-right text-blue-900">P.U.</TableHead>
                      <TableHead className="text-center text-blue-900">Qte</TableHead>
                      <TableHead className="text-right text-blue-900">Montant</TableHead>
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
                          {produit.montantProduit?.toLocaleString("fr-FR")}
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
                          {(Number(form.watch("remiseExamen"))
                            ? Math.round(
                                examen.prixExamen *
                                  (1 -
                                    Number(form.watch("remiseExamen")) / 100),
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

                    {demandeEchographies.map((echographie, index) => (
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
                            className="bg-purple-50 text-purple-700 border-purple-200 text-[11px]"
                          >
                            Echo
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
                          {(Number(form.watch("remiseEchographie"))
                            ? Number(
                                (
                                  echographie.prixEchographie *
                                  (1 -
                                    Number(form.watch("remiseEchographie")) /
                                      100)
                                ).toFixed(0),
                              )
                            : echographie.prixEchographie
                          )?.toLocaleString("fr-FR")}
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
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="border-t border-blue-200/60 bg-blue-50/30 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-blue-700" />
                  <span className="text-sm font-semibold">Total : </span>
                  <span className="text-lg font-bold text-blue-800 tabular-nums">
                    {totalBrouillon.toLocaleString("fr-FR")} CFA
                  </span>
                </div>
                <Button
                  onClick={handleFacturation}
                  disabled={
                    !watchedIdVisite ||
                    !watchedCouverture ||
                    isLoading ||
                    (!form.watch("typeExamen") && demandeExamens.length > 0)
                  }
                  className="gap-1.5"
                >
                  {isLoading ? (
                    <Spinner />
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
          {isLoadingFacture && (
            <div className="flex justify-center items-center h-32">
              <SpinnerBar />
            </div>
          )}

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`facture-${produitFacture.length}-${prestationfacture.length}-${examensFacture.length}-${echographiesFacture.length}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <div className="w-full" ref={contentRef}>
                {hasSaved && (
                  <Card className="overflow-hidden border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardHeader className="pb-2 print:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                          <CardTitle className="text-base">
                            Factures enregistrees
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {savedCount} facture(s)
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                            {totalSaved.toLocaleString("fr-FR")} CFA
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-0">
                            <TableCell colSpan={6} className="text-center py-4">
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
                            <TableHead className="text-blue-900">Designation</TableHead>
                            <TableHead className="text-blue-900">Type</TableHead>
                            <TableHead className="text-right text-blue-900">P.U.</TableHead>
                            <TableHead className="text-center text-blue-900">Qte</TableHead>
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
                                {produit.montantProduit?.toLocaleString(
                                  "fr-FR",
                                )}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                {produit.quantite}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {produit.montantProduit?.toLocaleString(
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
                                        Cette action est irreversible. Le
                                        produit sera definitivement supprime.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Annuler
                                      </AlertDialogCancel>
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
                                {Number(
                                  prestation.prixPrestation,
                                )?.toLocaleString("fr-FR")}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                1
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {Number(
                                  prestation.prixPrestation,
                                )?.toLocaleString("fr-FR")}
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
                                        Cette action est irreversible. La
                                        prestation sera definitivement
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
                                {examen.remiseExamen > 0
                                  ? (
                                      examen.prixExamen /
                                      (1 - examen.remiseExamen / 100)
                                    ).toFixed(0)
                                  : examen.prixExamen}
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
                                        Cette action est irreversible.
                                        L&apos;examen sera definitivement
                                        supprime.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Annuler
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() =>
                                          handleDeleteExamenFactureInBd(
                                            examen.id,
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

                          {echographiesFacture.map((echographie, index) => (
                            <TableRow
                              key={
                                echographie.id && echographie.id !== ""
                                  ? echographie.id
                                  : `echographie-${index}`
                              }
                              className="group hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="font-medium">
                                {echographie.libelleEchographie}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-50 text-purple-700 border-purple-200 text-[11px]"
                                >
                                  Echo
                                  {echographie.remiseEchographie > 0
                                    ? ` (-${echographie.remiseEchographie}%)`
                                    : ""}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {echographie.remiseEchographie > 0
                                  ? (
                                      echographie.prixEchographie /
                                      (1 - echographie.remiseEchographie / 100)
                                    ).toFixed(0)
                                  : echographie.prixEchographie}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                1
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {echographie.prixEchographie?.toLocaleString(
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
                          ))}
                        </TableBody>

                        <TableFooter>
                          <TableRow className="bg-blue-50/50 border-t-2 border-blue-300/40">
                            <TableCell
                              colSpan={4}
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
                    </CardContent>

                    {/* Receipt footer */}
                    <CardFooter className="flex flex-col gap-3 border-t pt-4 pb-5">
                      <Separator className="print:hidden" />
                      <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">
                            Clinique :
                          </span>
                          <span className="font-medium">
                            {nomClinique(client?.cliniqueId as string)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">
                            Caissiere :
                          </span>
                          <span className="font-medium">
                            {session?.user.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Date :</span>
                          <span className="font-medium">
                            {new Date().toLocaleDateString("fr-FR", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                            &nbsp;a&nbsp;
                            {new Date().toLocaleTimeString("fr-FR")}
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
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ===== EMPTY STATE ===== */}
          {form.watch("idVisite") &&
            !isLoadingFacture &&
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
          {form.watch("idVisite") && hasSaved && (
            <div className="flex justify-center gap-3 print:hidden">
              <Button
                variant="outline"
                size="lg"
                onClick={() => reactToPrintFn()}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimer la facture
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
            tabClinique={tabClinique}
            allProduits={tabProduit}
            clientData={client}
            setOpen={setOpen}
            refreshProduits={refreshProduits}
            setFactureProduit={setFactureProduit}
            tarifProduits={filteredTarifProduits}
            excludedProduitIds={[
              ...factureProduit.map((p) => p.idTarifProduit),
              ...produitFacture.map((p) => p.idTarifProduit),
            ]}
          />
          <PrestationsModal
            openPrestation={openPrestation}
            idClient={pharmacyId}
            setOpenPrestation={setOpenPrestation}
            refreshProduits={refreshProduits}
            setFacturePrestation={setFacturePrestation}
            tarifPrestations={filteredTarifPrestations}
            excludedPrestationIds={[
              ...facturePrestation.map((p) => p.idPrestation),
              ...prestationfacture.map((p) => p.idPrestation),
            ]}
          />
          <ExamensModal
            open={openExamens}
            idClient={pharmacyId}
            idVisite={form.watch("idVisite")}
            setOpen={setOpenExamens}
            setExamensSelectionnes={setDemandeExamens}
            refreshExamens={async () => {
              const allDemandeExamens = await getAllDemandeExamensByIdVisite(
                form.watch("idVisite"),
              );
              setTabDemandeExamens(allDemandeExamens as DemandeExamen[]);
            }}
            tabClinique={tabClinique}
            allExamens={tabExamen}
            tarifExamens={filteredTarifExamens}
            demandesExamens={tabDemandeExamens}
            excludedExamenIds={[
              ...demandeExamens.map((e) => e.id),
              ...examensFacture.map((e) => e.idDemandeExamen),
            ]}
          />
          <EchographiesModal
            open={openEchographies}
            idClient={pharmacyId}
            idVisite={form.watch("idVisite")}
            setOpen={setOpenEchographies}
            setEchographiesSelectionnees={setDemandeEchographies}
            refreshExamens={async () => {
              const allDemandeEchographies =
                await getAllDemandeEchographiesByIdVisite(
                  form.watch("idVisite"),
                );
              setTabDemandeEchographies(
                allDemandeEchographies as DemandeEchographie[],
              );
            }}
            tabClinique={tabClinique}
            allEchographies={tabEchographie}
            tarifEchographies={filteredTarifEchographies}
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
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
