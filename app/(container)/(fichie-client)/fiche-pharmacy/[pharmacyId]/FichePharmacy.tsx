"use client";

import { useState, useEffect, useRef, use } from "react";
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
import { Trash2, Plus } from "lucide-react";
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
} from "@prisma/client";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useForm } from "react-hook-form";
import PrestationsModal from "@/components/prestationModal";
import ExamensModal from "@/components/examenModal";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
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
    tabProduitFactureClient: FactureProduit[];
    tabPrestationFactureClient: FacturePrestation[];
    tabEchographieFactureClient: FactureEchographie[];
    tabExamenFactureClient: FactureExamen[];
    tabDemandeExamensClient: DemandeExamen[];
    tabDemandeEchographiesClient: DemandeEchographie[];
  };
}) {
  const { pharmacyId } = use(params);
  const [isHidden, setIsHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [openPrestation, setOpenPrestation] = useState(false);
  const [openExamens, setOpenExamens] = useState(false);
  const [openEchographies, setOpenEchographies] = useState(false);

  // Utilisation des données du serveur
  const [visites] = useState<Visite[]>(serverData.visites);
  const [client] = useState<Client>(serverData.client);
  const [tabClinique] = useState<Clinique[]>(serverData.tabClinique);
  const [tabProduit] = useState<Produit[]>(serverData.tabProduit);
  const [tabTarifProduit] = useState<TarifProduit[]>(
    serverData.tabTarifProduit
  );
  const [tabExamen] = useState<Examen[]>(serverData.tabExamen);
  const [tabEchographie] = useState<Echographie[]>(serverData.tabEchographie);
  const [tabTarifExamens] = useState<TarifExamen[]>(serverData.tabTarifExamens);
  const [tabTarifEchographies] = useState<TarifEchographie[]>(
    serverData.tabTarifEchographies
  );
  const [prestations] = useState<Prestation[]>(serverData.prestations);

  const [echographiesFacture, setEchographiesFacture] = useState<
    FactureEchographie[]
  >([]);
  const [tabDemandeExamens, setTabDemandeExamens] = useState<DemandeExamen[]>(
    []
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

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  // Les fonctions restent identiques...
  const handleDelete = (idProduit: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      setFactureProduit(
        factureProduit.filter((produit) => produit.id !== idProduit)
      );
    }
  };

  const handleDeleteFacturePrestation = (id: string) => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer cette facture de prestation ?"
      )
    ) {
      setFacturePrestation(
        facturePrestation.filter((prestation) => prestation.idPrestation !== id)
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
        demandeEchographies.filter((echographie) => echographie.id !== id)
      );
    }
  };

  const handleDeleteProduitFactureInBd = async (
    idProduit: string,
    idFacture: string,
    quantite: number
  ) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un produit. Contactez un administrateur."
      );
      return router.back();
    } else {
      if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
        try {
          await updateQuantiteStockTarifProduit(idProduit, quantite);
          await deleteFactureProduit(idFacture);
          toast.info("Produit supprimé avec succès !");
          setProduitFacture(produitFacture.filter((p) => p.id !== idFacture));
        } catch (error) {
          toast.error("Erreur lors de la suppression du produit");
          console.error(error);
        }
      }
    }
  };

  const handleDeletePrestationFactureInBd = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une prestation. Contactez un administrateur."
      );
      return router.back();
    } else {
      if (confirm("Êtes-vous sûr de vouloir supprimer cette prestation ?")) {
        try {
          await deleteFacturePrestation(id);
          toast.info("Prestation supprimée avec succès !");
          setPrestationFacture(prestationfacture.filter((p) => p.id !== id));
        } catch (error) {
          toast.error("Erreur lors de la suppression de la prestation");
          console.error(error);
        }
      }
    }
  };

  const handleDeleteExamenFactureInBd = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une examen. Contactez un administrateur."
      );
      return router.back();
    } else {
      if (confirm("Êtes-vous sûr de vouloir supprimer cet examen ?")) {
        try {
          await deleteFactureExamen(id);
          toast.info("Examen supprimé avec succès !");
          setExamensFacture(examensFacture.filter((e) => e.id !== id));
        } catch (error) {
          toast.error("Erreur lors de la suppression de l'examen");
          console.error(error);
        }
      }
    }
  };

  const handleDeleteEchographieFactureInBd = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une échographie. Contactez un administrateur."
      );
      return router.back();
    } else {
      if (confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
        try {
          await deleteFactureEchographie(id);
          toast.info("Echographie supprimée avec succès !");
          setEchographiesFacture(
            echographiesFacture.filter((e) => e.id !== id)
          );
        } catch (error) {
          toast.error("Erreur lors de la suppression de l'echographie");
          console.error(error);
        }
      }
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
      (p) => p.id === idDemandeExamen
    );
    const tarifExamen = tabTarifExamens.find(
      (p) => p.id === demandeExamen?.idTarifExamen
    );
    return (
      tabExamen.find((p) => p.id === tarifExamen?.idExamen)?.nomExamen ||
      "Examen introuvable"
    );
  };

  const renameEchographie = (idDemandeEchographie: string) => {
    const demandeEchographie = demandeEchographies.find(
      (p) => p.id === idDemandeEchographie
    );
    const tarifEchographie = tabTarifEchographies.find(
      (p) => p.id === demandeEchographie?.idTarifEchographie
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
      (d) => d.idTarifEchographie === idTarifEchographie
    );
    return demandeService?.serviceEchographie || "";
  };

  const montantProduits = (produits: FactureProduit[]) => {
    return produits.reduce((total, p) => total + (p.montantProduit || 0), 0);
  };

  const montantExamen = (produits: DemandeExamenFormValues[]) => {
    return produits.reduce((total, p) => total + (p.prixExamen || 0), 0);
  };

  const montantEchographie = (echographies: DemandeEchographieFormValues[]) => {
    const tarifs = echographies.map((e) => {
      return tabTarifEchographies.find((t) => t.id === e.idTarifEchographie);
    });
    const total = tarifs.reduce(
      (total, t) => total + (t?.prixEchographie || 0),
      0
    );
    return total * (1 - (form.watch("remiseEchographie") || 0) / 100);
  };

  const montantPrestations = (prestations: FacturePrestation[]) => {
    return (
      prestations?.reduce(
        (total, p) => total + (Number(p.prixPrestation) || 0),
        0
      ) || 0
    );
  };

  const montantFactureExamens = (examens: FactureExamen[]) => {
    return examens.reduce((total, e) => total + (Number(e.prixExamen) || 0), 0);
  };

  const montantFactureEchographies = (echographies: FactureEchographie[]) => {
    return echographies.reduce(
      (total, e) => total + (Number(e.prixEchographie) || 0),
      0
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

  // Chargement des permissions
  useEffect(() => {
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.FACTURE_PRODUIT
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
  }, [session?.user, router]);

  // Chargement des données de facturation basées sur la visite sélectionnée
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingFacture(true);

      const idVisite = form.watch("idVisite");
      if (idVisite) {
        setProduitFacture(
          serverData.tabProduitFactureClient.filter(
            (tab) => tab.idVisite === idVisite
          ) as FactureProduit[]
        );
        setPrestationFacture(
          serverData.tabPrestationFactureClient.filter(
            (tab) => tab.idVisite === idVisite
          ) as FacturePrestation[]
        );
        setExamensFacture(
          serverData.tabExamenFactureClient.filter(
            (tab) => tab.idVisite === idVisite
          ) as FactureExamen[]
        );
        setTabDemandeExamens(
          serverData.tabDemandeExamensClient.filter(
            (tab) => tab.idVisite === idVisite
          ) as DemandeExamen[]
        );
        setTabDemandeEchographies(
          serverData.tabDemandeEchographiesClient.filter(
            (tab) => tab.idVisite === idVisite
          ) as DemandeEchographie[]
        );
        setEchographiesFacture(
          serverData.tabEchographieFactureClient.filter(
            (tab) => tab.idVisite === idVisite
          ) as FactureEchographie[]
        );
      }

      setIsLoadingFacture(false);
    };

    fetchData();
  }, [form.watch("idVisite")]);

  const handleFacturation = async () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de facturer un client. Contactez un administrateur."
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
      if (
        demandeExamens.length > 0 &&
        isNaN(Number(form.watch("remiseExamen")))
      ) {
        toast.error("La remise pour les examens doit être un nombre valide");
        return;
      }
      if (
        demandeEchographies.length > 0 &&
        isNaN(Number(form.watch("remiseEchographie")))
      ) {
        toast.error(
          "La remise pour les échographies doit être un nombre valide"
        );
        return;
      }

      // const couverture = form.watch("couverture");
      const couvertureData = {
        id: crypto.randomUUID(),
        couvertIdClient: pharmacyId,
        couvertType: form.watch("couverture") as TypeCouverture,
        couvertIdVisite: form.watch("idVisite"),
      };
      await createCouverture(couvertureData);

      // Enregistrement des produits
      for (const produit of factureProduit) {
        const dataProduit = {
          // ...produit,
          idVisite: form.watch("idVisite"),
          nomProduit: renameValue(produit.idTarifProduit),
          montantProduit: produit.montantProduit || 0,
          id: crypto.randomUUID(), // Génère un nouvel id unique à chaque création
          idTarifProduit: produit.idTarifProduit,
          idClient: produit.idClient,
          idClinique: produit.idClinique,
          quantite: Number(produit.quantite),
          methode: produit.methode,
          dateFacture: produit.dateFacture,
          idUser: idUser,
        };
        try {
          await createFactureProduit(dataProduit);
          await updateProduitByFactureProduit(
            produit.idTarifProduit,
            Number(produit.quantite)
          );
        } catch (error) {
          console.error("Erreur lors de l'enregistrement du produit:", error);
          toast.error("Erreur lors de l'enregistrement du produit");
          continue; // Passer au produit suivant en cas d'erreur
        }
      }

      // Enregistrement des prestations
      for (const prestation of facturePrestation) {
        const dataPrestation = {
          // ...prestation,
          idVisite: form.watch("idVisite"),
          idClient: pharmacyId,
          idClinique: client?.idClinique || "",
          prixPrestation: Number(prestation.prixPrestation),
          libellePrestation: nomPrestation(prestation.idPrestation),
          id: prestation.id,
          dateFacture: prestation.dateFacture,
          idUser: idUser,
          idPrestation: prestation.idPrestation,
        };
        try {
          await createFacturePrestation(dataPrestation);
        } catch (error) {
          console.error(
            "Erreur lors de l'enregistrement de la prestation:",
            error
          );
          toast.error("Erreur lors de l'enregistrement de la prestation");
          continue; // Passer à la prestation suivante en cas d'erreur
        }
      }
      // Enregistrement des demandes d'examen
      for (const demande of demandeExamens) {
        const dataDemande = {
          id: crypto.randomUUID(),
          idVisite: form.watch("idVisite"),
          idClient: pharmacyId,
          idClinique: client?.idClinique || "",
          remiseExamen: parseInt(String(form.watch("remiseExamen") || "0")),
          soustraitanceExamen: Boolean(form.watch("soustractionExamen")),
          idUser: idUser,
          libelleExamen: renameExamen(demande.id),
          // prixExamen: Number(form.watch("remiseExamen"))
          //   ? demande.prixExamen *
          //     (1 - Number(form.watch("remiseExamen")) / 100)
          //   : demande.prixExamen,
          prixExamen: Number(form.watch("remiseExamen"))
            ? Math.round(
                demande.prixExamen *
                  (1 - Number(form.watch("remiseExamen")) / 100)
              )
            : demande.prixExamen,
          idDemandeExamen: demande.id,
        };
        try {
          await createFactureExamen(dataDemande);
        } catch (error) {
          console.error(
            "Erreur lors de l'enregistrement de la demande d'examen:",
            error
          );
          toast.error("Erreur lors de l'enregistrement de l'examen");
          continue; // Passer à la prestation suivante en cas d'erreur
        }
      }
      // Enregistrement des demandes d'échographie
      for (const demande of demandeEchographies) {
        const dataDemande = {
          id: crypto.randomUUID(),
          idVisite: form.watch("idVisite"),
          idClient: pharmacyId,
          idClinique: client?.idClinique || "",
          remiseEchographie: parseInt(
            String(form.watch("remiseEchographie") || "0")
          ),
          idUser: idUser,
          libelleEchographie: renameEchographie(demande.id),
          prixEchographie: Number(form.watch("remiseEchographie"))
            ? Math.round(
                demande.prixEchographie *
                  (1 - Number(form.watch("remiseEchographie")) / 100)
              )
            : demande.prixEchographie,
          idDemandeEchographie: demande.id,
          serviceEchographieFacture:
            getServiceEchographie(demande.idTarifEchographie) ?? "",
        };
        try {
          await createFactureEchographie(dataDemande);
        } catch (error) {
          console.error(
            "Erreur lors de l'enregistrement de la demande d'échographie:",
            error
          );
          toast.error("Erreur lors de l'enregistrement de l'échographie");
          continue; // Passer à la prestation suivante en cas d'erreur
        }
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
        getAllFactureProduitByIdVisite(form.watch("idVisite")),
        getAllFacturePrestationByIdVisite(form.watch("idVisite")),
        getAllFactureExamenByIdVisite(form.watch("idVisite")),
        getAllFactureEchographieByIdVisite(form.watch("idVisite")),
      ]);

      setProduitFacture(updatedProduits as FactureProduit[]);
      setPrestationFacture(updatedPrestations as FacturePrestation[]);
      setExamensFacture(updatedExamens as FactureExamen[]);
      setEchographiesFacture(updatedEchographies as FactureEchographie[]);

      await updateRecapVisite(
        form.watch("idVisite"),
        idUser,
        "05 Fiche facturation"
      );

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

  return (
    <div className="w-full relative">
      <Retour />
      <div className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex-1">Liste des Produits</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setOpen(true)}
              disabled={!form.watch("idVisite")}
            >
              <Plus className="mr-2" size={16} /> Facturer le Produit
            </Button>
            <Button
              onClick={() => setOpenPrestation(true)}
              disabled={!form.watch("idVisite")}
            >
              <Plus className="mr-2" size={16} /> Facturer la Prestation
            </Button>
            <Button
              onClick={() => setOpenExamens(true)}
              disabled={!form.watch("idVisite")}
            >
              <Plus className="mr-2" size={16} /> {"Facturer l'Examen"}
            </Button>
            <Button
              onClick={() => setOpenEchographies(true)}
              disabled={!form.watch("idVisite")}
            >
              <Plus className="mr-2" size={16} /> {"Facturer l'Echographie"}
            </Button>
          </div>
        </div>

        <div>
          <Form {...form}>
            <form className="flex flex-wrap gap-5">
              <FormField
                control={form.control}
                name="idVisite"
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormLabel>Visite</FormLabel>
                    <Select
                      required
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Visite" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visites.map((visite, index) => (
                          <SelectItem key={index} value={visite.id}>
                            {new Date(visite.dateVisite).toLocaleDateString(
                              "fr-FR"
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
                  <FormItem className="w-40">
                    <FormLabel>Type Couverture</FormLabel>
                    <Select
                      required
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type Couverture" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TypeCouverture).map(([key, value]) => (
                          <SelectItem key={key} value={value ?? ""}>
                            {value}
                          </SelectItem>
                        ))}
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
                      <FormItem className="w-40">
                        <FormLabel>Type Bilan</FormLabel>
                        <Select
                          required
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Type Bilan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TypeBilan).map(([key, value]) => (
                              <SelectItem key={key} value={value ?? ""}>
                                {value}
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
                    name="remiseExamen"
                    render={({ field }) => (
                      <FormItem className="w-40">
                        <FormLabel>Commission labo</FormLabel>
                        <Input
                          placeholder="Commission"
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
                      <FormItem className="w-40">
                        <FormLabel> Sous-traité</FormLabel>
                        <Select
                          required
                          value={String(field.value ?? false)}
                          onValueChange={(val: string) =>
                            field.onChange(val === "true")
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sous traité" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={"false"}>Non</SelectItem>
                            <SelectItem value={"true"}>Oui</SelectItem>
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
                    <FormItem className="w-40">
                      <FormLabel>Commission Echo</FormLabel>
                      <Input
                        placeholder="Commission"
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

          <Separator className="my-3" />

          {/* Tableau des facturations */}
          <div className="w-full  px-10 ">
            {(factureProduit.length > 0 ||
              facturePrestation.length > 0 ||
              demandeEchographies.length > 0 ||
              demandeExamens.length > 0) && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Prix Unitaire</TableCell>
                    <TableCell>Quantité</TableCell>
                    <TableCell>Montant</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factureProduit.map((produit) => (
                    <TableRow
                      key={produit.id || `produit-${produit.idTarifProduit}`}
                    >
                      <TableCell
                        className={
                          selectedProduits.includes(produit.id)
                            ? "text-red-500 underline"
                            : ""
                        }
                      >
                        {renameValue(produit.idTarifProduit)}
                      </TableCell>
                      <TableCell>{"Produit"}</TableCell>
                      <TableCell>{produit.montantProduit} CFA</TableCell>
                      <TableCell>{produit.quantite}</TableCell>
                      <TableCell>{produit.montantProduit} CFA</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(produit.id)}
                        >
                          <Trash2 size={16} />
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
                    >
                      <TableCell>
                        {nomPrestation(prestation.idPrestation)}
                      </TableCell>
                      <TableCell>Prestation</TableCell>
                      <TableCell>{prestation.prixPrestation} CFA</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>{prestation.prixPrestation} CFA</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDeleteFacturePrestation(
                              prestation.idPrestation
                            )
                          }
                        >
                          <Trash2 size={16} />
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
                    >
                      <TableCell>{renameExamen(examen.id)}</TableCell>
                      <TableCell>Examen</TableCell>
                      <TableCell>{getExamenPrix(examen.id)} CFA</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>
                        {Number(form.watch("remiseExamen"))
                          ? Math.round(
                              examen.prixExamen *
                                (1 - Number(form.watch("remiseExamen")) / 100)
                            )
                          : examen.prixExamen}{" "}
                        CFA
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDemandeExamen(examen.id)}
                        >
                          <Trash2 size={16} />
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
                    >
                      <TableCell>{renameEchographie(echographie.id)}</TableCell>
                      <TableCell>Echographie</TableCell>
                      <TableCell>
                        {getEchographiePrix(echographie.id)} CFA
                      </TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>
                        {Number(form.watch("remiseEchographie"))
                          ? (
                              echographie.prixEchographie *
                              (1 -
                                Number(form.watch("remiseEchographie")) / 100)
                            ).toFixed(0)
                          : echographie.prixEchographie}{" "}
                        CFA
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDeleteDemandeEchographie(echographie.id)
                          }
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">
                      Total:
                    </TableCell>
                    <TableCell className="font-semibold">
                      {Number(form.watch("remiseExamen"))
                        ? Math.round(
                            montantPrestations(facturePrestation) +
                              montantExamen(demandeExamens) -
                              montantExamen(demandeExamens) *
                                (Number(form.watch("remiseExamen")) / 100) +
                              montantEchographie(demandeEchographies)
                          )
                        : Math.round(
                            montantProduits(factureProduit) +
                              montantPrestations(facturePrestation) +
                              montantExamen(demandeExamens) +
                              montantEchographie(demandeEchographies)
                          ).toFixed(0)}{" "}
                      CFA
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={handleFacturation}
                        disabled={
                          !form.watch("idVisite") ||
                          !form.watch("couverture") ||
                          isLoading ||
                          (!form.watch("typeExamen") &&
                            demandeExamens.length > 0)
                        }
                      >
                        {isLoading ? <Spinner /> : "Facturer"}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>

          <Separator className="my-3" />

          {/* Tableau des produits */}
          {isLoadingFacture && (
            <div className="flex justify-center items-center h-32">
              <SpinnerBar />
            </div>
          )}
          {/* Animer l'apparition du tableau avec framer-motion - CORRECTION APPLIQUÉE */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`facture-${produitFacture.length}-${prestationfacture.length}-${examensFacture.length}-${echographiesFacture.length}`}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              style={{ originY: 0 }}
              className="will-change-transform overflow-hidden"
            >
              <div className="w-full p-8" ref={contentRef}>
                {(produitFacture.length > 0 ||
                  prestationfacture.length > 0 ||
                  echographiesFacture.length > 0 ||
                  examensFacture.length > 0) && (
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center px-auto"
                          >
                            <Image
                              src="/logo/LOGO_AIBEF_IPPF.png"
                              alt="Logo"
                              width={400}
                              height={10}
                              style={{ margin: "auto" }}
                            />
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>Nom</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Prix Unitaire</TableCell>
                          <TableCell>Quantité</TableCell>
                          <TableCell>Montant</TableCell>
                          <TableCell>Actions</TableCell>
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
                          >
                            <TableCell>{produit.nomProduit}</TableCell>
                            <TableCell>{"Produit"}</TableCell>
                            <TableCell>{produit.montantProduit} CFA</TableCell>
                            <TableCell>{produit.quantite}</TableCell>
                            <TableCell>{produit.montantProduit} CFA</TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    🗑
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Es-tu sûr ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Le produit
                                      sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                      onClick={() =>
                                        handleDeleteProduitFactureInBd(
                                          produit.idTarifProduit,
                                          produit.id,
                                          produit.quantite
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
                          >
                            <TableCell>
                              {nomPrestation(prestation.idPrestation)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              Prestation
                            </TableCell>
                            <TableCell>
                              {prestation.prixPrestation} CFA
                            </TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>
                              {prestation.prixPrestation} CFA
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    🗑
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Es-tu sûr ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. La
                                      prestation sera définitivement supprimée.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                      onClick={() =>
                                        handleDeletePrestationFactureInBd(
                                          prestation.id
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
                          >
                            <TableCell>{examen.libelleExamen}</TableCell>
                            <TableCell>
                              Examen
                              {examen.remiseExamen > 0
                                ? ` (comission de ${examen.remiseExamen}%)`
                                : ""}{" "}
                            </TableCell>
                            <TableCell>
                              {examen.remiseExamen > 0
                                ? (
                                    examen.prixExamen /
                                    (1 - examen.remiseExamen / 100)
                                  ).toFixed(0)
                                : examen.prixExamen}{" "}
                              CFA
                            </TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>{examen.prixExamen} CFA</TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    className={isHidden ? "hidden" : ""}
                                    variant="ghost"
                                    size="icon"
                                  >
                                    🗑
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Es-tu sûr ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible.{" "}
                                      {"L'examen"} sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
                        {echographiesFacture.map((echographie, index) => (
                          <TableRow
                            key={
                              echographie.id && echographie.id !== ""
                                ? echographie.id
                                : `echographie-${index}`
                            }
                          >
                            <TableCell>
                              {echographie.libelleEchographie}
                            </TableCell>
                            <TableCell>
                              Echographie
                              {echographie.remiseEchographie > 0
                                ? ` (comission de ${echographie.remiseEchographie}%)`
                                : ""}{" "}
                            </TableCell>
                            <TableCell>
                              {echographie.remiseEchographie > 0
                                ? (
                                    echographie.prixEchographie /
                                    (1 - echographie.remiseEchographie / 100)
                                  ).toFixed(0)
                                : echographie.prixEchographie}{" "}
                              CFA
                            </TableCell>
                            <TableCell>1</TableCell>
                            <TableCell>
                              {echographie.prixEchographie} CFA
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    className={isHidden ? "hidden" : ""}
                                    variant="ghost"
                                    size="icon"
                                  >
                                    🗑
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Es-tu sûr ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible.{" "}
                                      {"L'examen"} sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                      onClick={() =>
                                        handleDeleteEchographieFactureInBd(
                                          echographie.id
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
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-right font-semibold"
                          >
                            Total:
                          </TableCell>
                          <TableCell className="font-semibold">
                            {montantProduits(produitFacture) +
                              montantPrestations(prestationfacture) +
                              montantFactureExamens(examensFacture) +
                              montantFactureEchographies(
                                echographiesFacture
                              )}{" "}
                            CFA
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                    <div>
                      <p className="pl-2">
                        Clinique: {nomClinique(client?.cliniqueId as string)}{" "}
                      </p>
                      <p className="pl-2">Caissière : {session?.user.name} </p>
                      <p className="pl-2">
                        Date :{" "}
                        {new Date().toLocaleDateString("fr-FR", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        &nbsp;à&nbsp;{new Date().toLocaleTimeString("fr-FR")}
                      </p>
                      <p className="pl-2">
                        Reçu Caisse:{" "}
                        {client?.nom
                          ? client.nom
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase()
                              )
                              .join(" ")
                          : ""}{" "}
                        {client?.prenom
                          ? client.prenom
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase()
                              )
                              .join(" ")
                          : ""}{" "}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Section d'impression et modals */}
        {form.watch("idVisite") &&
          isLoadingFacture === false &&
          produitFacture.length === 0 &&
          prestationfacture.length === 0 &&
          examensFacture.length === 0 &&
          facturePrestation.length === 0 &&
          factureProduit.length === 0 &&
          echographiesFacture.length === 0 &&
          demandeExamens.length === 0 && (
            <div className="text-center font-light italic">
              Zéro Facture pour cette visite séléctionnée
            </div>
          )}

        {form.watch("idVisite") &&
          (produitFacture.length > 0 ||
            prestationfacture.length > 0 ||
            echographiesFacture.length > 0 ||
            examensFacture.length > 0) && (
            <div className="flex justify-center -mt-4 gap-4">
              <Button
                onClick={() => {
                  setIsHidden(true);
                  reactToPrintFn();
                }}
              >
                Imprimer la facture
              </Button>
              <Button onClick={() => router.push(`/fiches/${pharmacyId}`)}>
                Retour
              </Button>
            </div>
          )}

        {/* Modals */}
        <FactureModal
          open={open}
          idClient={pharmacyId}
          tabClinique={tabClinique}
          allProduits={tabProduit}
          clientData={client}
          setOpen={setOpen}
          refreshProduits={refreshProduits}
          setFactureProduit={setFactureProduit}
        />

        <PrestationsModal
          openPrestation={openPrestation}
          idClient={pharmacyId}
          setOpenPrestation={setOpenPrestation}
          refreshProduits={refreshProduits}
          setFacturePrestation={setFacturePrestation}
        />
        <ExamensModal
          open={openExamens}
          idClient={pharmacyId}
          idVisite={form.watch("idVisite")}
          setOpen={setOpenExamens}
          setExamensSelectionnes={setDemandeExamens}
          refreshExamens={async () => {
            const allDemandeExamens = await getAllDemandeExamensByIdVisite(
              form.watch("idVisite")
            );
            setTabDemandeExamens(allDemandeExamens as DemandeExamen[]);
          }}
        />
        <EchographiesModal
          open={openEchographies}
          idClient={pharmacyId}
          idVisite={form.watch("idVisite")}
          setOpen={setOpenEchographies}
          setEchographiesSelectionnees={setDemandeEchographies}
          refreshExamens={async () => {
            const allDemandeEchographies =
              await getAllDemandeEchographiesByIdVisite(form.watch("idVisite"));
            setTabDemandeEchographies(
              allDemandeEchographies as DemandeEchographie[]
            );
          }}
        />
      </div>
    </div>
  );
}
