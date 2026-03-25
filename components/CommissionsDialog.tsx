"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableFooter,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { FactureExamen, FactureEchographie } from "@prisma/client";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";
import { Trash2, Check, ChevronsUpDown, Pencil, Search, X, Merge, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createPrescripteur,
  getAllPrescripteursByClinique,
  deletePrescripteur,
  updatePrescripteur,
  mergePrescripteurs,
  getPrescripteursWithCount,
} from "@/lib/actions/prescripteurActions";
import {
  createCommissionExamen,
  createCommissionEchographie,
  getCommissionByFactureExamen,
  getCommissionByFactureEchographie,
  updateCommissionExamen,
  updateCommissionEchographie,
} from "@/lib/actions/commissionActions";

type Prescripteur = {
  id: string;
  nom: string;
  prenom: string;
  centre: string;
  contact: string;
  idClinique: string;
};

type PrescripteurWithCount = Prescripteur & {
  _count: {
    CommissionExamen: number;
    CommissionEchographie: number;
  };
};

type DoublonGroup = {
  key: string;
  prescripteurs: PrescripteurWithCount[];
};

type PrescripteurFormValues = {
  nom: string;
  prenom: string;
  centre: string;
  contact: string;
};

interface CommissionsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  idClinique: string;
  idVisite: string;
  examensFacture: FactureExamen[];
  echographiesFacture: FactureEchographie[];
  onRefresh?: () => void;
}

export default function CommissionsDialog({
  open,
  setOpen,
  idClinique,
  idVisite,
  examensFacture,
  echographiesFacture,
  onRefresh,
}: CommissionsDialogProps) {
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([]);
  const [selectedPrescripteur, setSelectedPrescripteur] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("examen");
  const [openExamenCombobox, setOpenExamenCombobox] = useState(false);
  const [openEchoCombobox, setOpenEchoCombobox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [prescripteurSearchQuery, setPrescripteurSearchQuery] = useState("");
  const [editingPrescripteur, setEditingPrescripteur] = useState<Prescripteur | null>(null);
  const [doublonGroups, setDoublonGroups] = useState<DoublonGroup[]>([]);
  const [selectedKeepIds, setSelectedKeepIds] = useState<Record<string, string>>({});
  const [isMerging, setIsMerging] = useState(false);
  const [isLoadingDoublons, setIsLoadingDoublons] = useState(false);

  // Type pour stocker les détails d'une commission existante
  type CommissionExistante = {
    id: string;
    montant: number;
    idPrescripteur: string;
  };

  // State pour les commissions d'examens
  const [examensCommissions, setExamensCommissions] = useState<
    Record<string, number>
  >({});
  const [examensCommissionsExistantes, setExamensCommissionsExistantes] = useState<
    Record<string, CommissionExistante>
  >({});

  // State pour les commissions d'echographies
  const [echographiesCommissions, setEchographiesCommissions] = useState<
    Record<string, number>
  >({});
  const [echographiesCommissionsExistantes, setEchographiesCommissionsExistantes] =
    useState<Record<string, CommissionExistante>>({});

  // Calculer le montant de commission par défaut à partir de la remise
  const calculateDefaultCommission = (
    prixApresRemise: number,
    remisePourcentage: number
  ): number => {
    if (remisePourcentage <= 0 || remisePourcentage >= 100) return 0;
    // Prix original = prixApresRemise / (1 - remise/100)
    // Commission = Prix original - prixApresRemise
    const prixOriginal = prixApresRemise / (1 - remisePourcentage / 100);
    return Math.round(prixOriginal - prixApresRemise);
  };

  // Initialiser les commissions par défaut quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      // Initialiser les commissions d'examens avec les remises appliquées
      const defaultExamensCommissions: Record<string, number> = {};
      examensFacture.forEach((examen) => {
        if (examen.remiseExamen > 0) {
          defaultExamensCommissions[examen.id] = calculateDefaultCommission(
            examen.prixExamen,
            examen.remiseExamen
          );
        }
      });
      setExamensCommissions(defaultExamensCommissions);

      // Initialiser les commissions d'échographies avec les remises appliquées
      const defaultEchographiesCommissions: Record<string, number> = {};
      echographiesFacture.forEach((echo) => {
        if (echo.remiseEchographie > 0) {
          // Récupérer le PU original (prix tarif) à partir du prix net
          const partParEcho = echographiesFacture.length > 0
            ? (echographiesFacture[0].partEchographe ?? 0) / echographiesFacture.length
            : 0;
          const prixAvantPartEcho = echo.prixEchographie + partParEcho;
          const prixOriginal = echo.remiseEchographie > 0 && echo.remiseEchographie < 100
            ? Math.round(prixAvantPartEcho / (1 - echo.remiseEchographie / 100))
            : Math.round(prixAvantPartEcho);
          // Commission = remise% × PU original
          defaultEchographiesCommissions[echo.id] = Math.round(prixOriginal * echo.remiseEchographie / 100);
        }
      });
      setEchographiesCommissions(defaultEchographiesCommissions);
    }
  }, [open, examensFacture, echographiesFacture]);

  const prescripteurForm = useForm<PrescripteurFormValues>({
    defaultValues: {
      nom: "",
      prenom: "",
      centre: "",
      contact: "",
    },
  });

  // Charger les prescripteurs
  const loadPrescripteurs = async () => {
    if (!idClinique) return;
    setIsLoading(true);
    try {
      const data = await getAllPrescripteursByClinique(idClinique);
      setPrescripteurs(data as Prescripteur[]);
    } catch (error) {
      console.error("Erreur lors du chargement des prescripteurs:", error);
      toast.error("Erreur lors du chargement des prescripteurs");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les commissions existantes pour les examens
  const loadExamensCommissionsExistantes = async () => {
    const existantes: Record<string, CommissionExistante> = {};
    const montants: Record<string, number> = {};
    for (const examen of examensFacture) {
      const commission = await getCommissionByFactureExamen(examen.id);
      if (commission) {
        existantes[examen.id] = {
          id: commission.id,
          montant: commission.montantCommission,
          idPrescripteur: commission.idPrescripteur,
        };
        montants[examen.id] = commission.montantCommission;
      }
    }
    setExamensCommissionsExistantes(existantes);
    // Initialiser les montants avec les valeurs existantes
    setExamensCommissions((prev) => ({ ...prev, ...montants }));
  };

  // Charger les commissions existantes pour les échographies
  const loadEchographiesCommissionsExistantes = async () => {
    const existantes: Record<string, CommissionExistante> = {};
    const montants: Record<string, number> = {};
    for (const echo of echographiesFacture) {
      const commission = await getCommissionByFactureEchographie(echo.id);
      if (commission) {
        existantes[echo.id] = {
          id: commission.id,
          montant: commission.montantCommission,
          idPrescripteur: commission.idPrescripteur,
        };
        montants[echo.id] = commission.montantCommission;
      }
    }
    setEchographiesCommissionsExistantes(existantes);
    // Initialiser les montants avec les valeurs existantes
    setEchographiesCommissions((prev) => ({ ...prev, ...montants }));
  };

  useEffect(() => {
    if (open) {
      loadPrescripteurs();
      loadExamensCommissionsExistantes();
      loadEchographiesCommissionsExistantes();
    }
  }, [open, idClinique]);

  // Créer un nouveau prescripteur
  const handleCreatePrescripteur = async (data: PrescripteurFormValues) => {
    setIsSaving(true);
    try {
      await createPrescripteur({
        id: crypto.randomUUID(),
        nom: data.nom,
        prenom: data.prenom,
        centre: data.centre,
        contact: data.contact,
        idClinique: idClinique,
      });
      toast.success("Prescripteur ajouté avec succès");
      prescripteurForm.reset();
      await loadPrescripteurs();
    } catch (error) {
      console.error("Erreur lors de la création du prescripteur:", error);
      toast.error("Erreur lors de la création du prescripteur");
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer un prescripteur
  const handleDeletePrescripteur = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce prescripteur ?"))
      return;
    try {
      await deletePrescripteur(id);
      toast.success("Prescripteur supprimé avec succès");
      await loadPrescripteurs();
      if (selectedPrescripteur === id) {
        setSelectedPrescripteur("");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression du prescripteur");
    }
  };

  // Modifier un prescripteur
  const handleEditPrescripteur = (prescripteur: Prescripteur) => {
    setEditingPrescripteur(prescripteur);
    prescripteurForm.setValue("nom", prescripteur.nom);
    prescripteurForm.setValue("prenom", prescripteur.prenom);
    prescripteurForm.setValue("centre", prescripteur.centre);
    prescripteurForm.setValue("contact", prescripteur.contact);
  };

  const handleCancelEdit = () => {
    setEditingPrescripteur(null);
    prescripteurForm.reset();
  };

  const handleUpdatePrescripteur = async (data: PrescripteurFormValues) => {
    if (!editingPrescripteur) return;
    setIsSaving(true);
    try {
      await updatePrescripteur(editingPrescripteur.id, {
        nom: data.nom,
        prenom: data.prenom,
        centre: data.centre,
        contact: data.contact,
      });
      toast.success("Prescripteur modifié avec succès");
      setEditingPrescripteur(null);
      prescripteurForm.reset();
      await loadPrescripteurs();
    } catch (error) {
      console.error("Erreur lors de la modification du prescripteur:", error);
      toast.error("Erreur lors de la modification du prescripteur");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrer les prescripteurs dans la liste
  const filteredPrescripteursListe = useMemo(() => {
    if (!prescripteurSearchQuery) return prescripteurs;
    const query = prescripteurSearchQuery.toLowerCase();
    return prescripteurs.filter(
      (p) =>
        p.nom.toLowerCase().includes(query) ||
        p.prenom.toLowerCase().includes(query) ||
        p.centre.toLowerCase().includes(query) ||
        p.contact.toLowerCase().includes(query),
    );
  }, [prescripteurs, prescripteurSearchQuery]);

  // Charger et détecter les doublons
  const loadDoublons = async () => {
    if (!idClinique) return;
    setIsLoadingDoublons(true);
    try {
      const data = await getPrescripteursWithCount(idClinique) as PrescripteurWithCount[];
      // Regrouper par nom+prénom normalisés
      const groups: Record<string, PrescripteurWithCount[]> = {};
      data.forEach((p) => {
        const key = `${p.nom.trim().toLowerCase()}_${p.prenom.trim().toLowerCase()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });
      // Garder uniquement les groupes avec plus d'un prescripteur
      const doublons = Object.entries(groups)
        .filter(([, list]) => list.length > 1)
        .map(([key, list]) => ({ key, prescripteurs: list }));
      setDoublonGroups(doublons);
      // Par défaut, sélectionner celui avec le plus de commissions
      const defaults: Record<string, string> = {};
      doublons.forEach((group) => {
        const best = group.prescripteurs.reduce((a, b) =>
          (a._count.CommissionExamen + a._count.CommissionEchographie) >=
          (b._count.CommissionExamen + b._count.CommissionEchographie)
            ? a : b
        );
        defaults[group.key] = best.id;
      });
      setSelectedKeepIds(defaults);
    } catch (error) {
      console.error("Erreur lors du chargement des doublons:", error);
      toast.error("Erreur lors du chargement des doublons");
    } finally {
      setIsLoadingDoublons(false);
    }
  };

  // Fusionner un groupe de doublons
  const handleMergeGroup = async (group: DoublonGroup) => {
    const keepId = selectedKeepIds[group.key];
    if (!keepId) {
      toast.error("Veuillez sélectionner le prescripteur à conserver");
      return;
    }
    const mergeIds = group.prescripteurs
      .filter((p) => p.id !== keepId)
      .map((p) => p.id);

    if (mergeIds.length === 0) return;

    const kept = group.prescripteurs.find((p) => p.id === keepId);
    if (!confirm(
      `Fusionner ${mergeIds.length} doublon(s) vers "${kept?.nom} ${kept?.prenom}" ?\n\nToutes les commissions seront transférées et les doublons supprimés.`
    )) return;

    setIsMerging(true);
    try {
      await mergePrescripteurs(keepId, mergeIds);
      toast.success(`${mergeIds.length} doublon(s) fusionné(s) avec succès`);
      await loadDoublons();
      await loadPrescripteurs();
    } catch (error) {
      console.error("Erreur lors de la fusion:", error);
      toast.error("Erreur lors de la fusion des prescripteurs");
    } finally {
      setIsMerging(false);
    }
  };

  // Fusionner tous les groupes d'un coup
  const handleMergeAll = async () => {
    if (doublonGroups.length === 0) return;
    if (!confirm(
      `Fusionner tous les ${doublonGroups.length} groupe(s) de doublons ?\n\nLes commissions seront transférées vers les prescripteurs sélectionnés (en gras).`
    )) return;

    setIsMerging(true);
    try {
      for (const group of doublonGroups) {
        const keepId = selectedKeepIds[group.key];
        if (!keepId) continue;
        const mergeIds = group.prescripteurs
          .filter((p) => p.id !== keepId)
          .map((p) => p.id);
        if (mergeIds.length > 0) {
          await mergePrescripteurs(keepId, mergeIds);
        }
      }
      toast.success("Tous les doublons ont été fusionnés avec succès");
      await loadDoublons();
      await loadPrescripteurs();
    } catch (error) {
      console.error("Erreur lors de la fusion:", error);
      toast.error("Erreur lors de la fusion des prescripteurs");
    } finally {
      setIsMerging(false);
    }
  };

  // Enregistrer les commissions d'examens (création et mise à jour)
  const handleSaveExamensCommissions = async () => {
    if (!selectedPrescripteur) {
      toast.error("Veuillez sélectionner un prescripteur");
      return;
    }

    // Séparer les nouvelles commissions des mises à jour
    const commissionsToCreate: [string, number][] = [];
    const commissionsToUpdate: [string, number, string][] = []; // [idFacture, montant, idCommission]

    Object.entries(examensCommissions).forEach(([idFacture, montant]) => {
      if (montant > 0) {
        const existante = examensCommissionsExistantes[idFacture];
        if (existante) {
          // Commission existante - vérifier si le montant a changé
          if (existante.montant !== montant) {
            commissionsToUpdate.push([idFacture, montant, existante.id]);
          }
        } else {
          // Nouvelle commission
          commissionsToCreate.push([idFacture, montant]);
        }
      }
    });

    if (commissionsToCreate.length === 0 && commissionsToUpdate.length === 0) {
      toast.error("Aucune commission à enregistrer ou modifier");
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        // Créer les nouvelles commissions
        ...commissionsToCreate.map(([idFactureExamen, montantCommission]) =>
          createCommissionExamen({
            id: crypto.randomUUID(),
            idFactureExamen,
            idPrescripteur: selectedPrescripteur,
            idVisite,
            montantCommission,
            paye: false,
            datePaiement: null,
          }),
        ),
        // Mettre à jour les commissions existantes
        ...commissionsToUpdate.map(([, montantCommission, idCommission]) =>
          updateCommissionExamen(idCommission, { montantCommission }),
        ),
      ]);

      const totalActions = commissionsToCreate.length + commissionsToUpdate.length;
      toast.success(
        `${totalActions} commission(s) enregistrée(s)/modifiée(s) avec succès`,
      );
      await loadExamensCommissionsExistantes();
      onRefresh?.();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des commissions:", error);
      toast.error("Erreur lors de l'enregistrement des commissions");
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistrer les commissions d'échographies (création et mise à jour)
  const handleSaveEchographiesCommissions = async () => {
    if (!selectedPrescripteur) {
      toast.error("Veuillez sélectionner un prescripteur");
      return;
    }

    // Séparer les nouvelles commissions des mises à jour
    const commissionsToCreate: [string, number][] = [];
    const commissionsToUpdate: [string, number, string][] = []; // [idFacture, montant, idCommission]

    Object.entries(echographiesCommissions).forEach(([idFacture, montant]) => {
      if (montant > 0) {
        const existante = echographiesCommissionsExistantes[idFacture];
        if (existante) {
          // Commission existante - vérifier si le montant a changé
          if (existante.montant !== montant) {
            commissionsToUpdate.push([idFacture, montant, existante.id]);
          }
        } else {
          // Nouvelle commission
          commissionsToCreate.push([idFacture, montant]);
        }
      }
    });

    if (commissionsToCreate.length === 0 && commissionsToUpdate.length === 0) {
      toast.error("Aucune commission à enregistrer ou modifier");
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        // Créer les nouvelles commissions
        ...commissionsToCreate.map(([idFactureEchographie, montantCommission]) =>
          createCommissionEchographie({
            id: crypto.randomUUID(),
            idFactureEchographie,
            idPrescripteur: selectedPrescripteur,
            idVisite,
            montantCommission,
            paye: false,
            datePaiement: null,
          }),
        ),
        // Mettre à jour les commissions existantes
        ...commissionsToUpdate.map(([, montantCommission, idCommission]) =>
          updateCommissionEchographie(idCommission, { montantCommission }),
        ),
      ]);

      const totalActions = commissionsToCreate.length + commissionsToUpdate.length;
      toast.success(
        `${totalActions} commission(s) enregistrée(s)/modifiée(s) avec succès`,
      );
      await loadEchographiesCommissionsExistantes();
      onRefresh?.();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des commissions:", error);
      toast.error("Erreur lors de l'enregistrement des commissions");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrer les prescripteurs par recherche
  const filteredPrescripteurs = useMemo(() => {
    if (!searchQuery) return prescripteurs;
    const query = searchQuery.toLowerCase();
    return prescripteurs.filter(
      (p) =>
        p.nom.toLowerCase().includes(query) ||
        p.prenom.toLowerCase().includes(query) ||
        p.centre.toLowerCase().includes(query),
    );
  }, [prescripteurs, searchQuery]);

  // Obtenir le prescripteur sélectionné
  const selectedPrescripteurData = useMemo(() => {
    return prescripteurs.find((p) => p.id === selectedPrescripteur);
  }, [prescripteurs, selectedPrescripteur]);

  // Calculer le total des commissions
  const totalExamensCommissions = Object.values(examensCommissions)
    .reduce((sum, montant) => sum + montant, 0);

  const totalEchographiesCommissions = Object.values(echographiesCommissions)
    .reduce((sum, montant) => sum + montant, 0);

  // Vérifier s'il y a des modifications à enregistrer
  const hasExamensChanges = useMemo(() => {
    return Object.entries(examensCommissions).some(([id, montant]) => {
      const existante = examensCommissionsExistantes[id];
      if (existante) {
        return existante.montant !== montant;
      }
      return montant > 0;
    });
  }, [examensCommissions, examensCommissionsExistantes]);

  const hasEchographiesChanges = useMemo(() => {
    return Object.entries(echographiesCommissions).some(([id, montant]) => {
      const existante = echographiesCommissionsExistantes[id];
      if (existante) {
        return existante.montant !== montant;
      }
      return montant > 0;
    });
  }, [echographiesCommissions, echographiesCommissionsExistantes]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Gestion des Commissions</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="examen" className="text-xs sm:text-sm">Examens</TabsTrigger>
            <TabsTrigger value="echographie" className="text-xs sm:text-sm">Echographie</TabsTrigger>
            <TabsTrigger value="prescripteur" className="text-xs sm:text-sm">Prescripteur</TabsTrigger>
            <TabsTrigger value="doublons" onClick={() => loadDoublons()} className="text-xs sm:text-sm">
              Doublons
              {doublonGroups.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {doublonGroups.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Onglet Examens */}
          <TabsContent value="examen" className="space-y-4">
            <div className="border rounded-lg p-2 sm:p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Sélectionner un prescripteur
                </label>
                <Popover
                  open={openExamenCombobox}
                  onOpenChange={setOpenExamenCombobox}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openExamenCombobox}
                      className="w-full justify-between"
                    >
                      {selectedPrescripteurData
                        ? `${selectedPrescripteurData.nom} ${selectedPrescripteurData.prenom} - ${selectedPrescripteurData.centre}`
                        : "Rechercher un prescripteur..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Rechercher par nom, prénom ou centre..."
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun prescripteur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {filteredPrescripteurs.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.nom} ${p.prenom} ${p.centre}`}
                              onSelect={() => {
                                setSelectedPrescripteur(p.id);
                                setOpenExamenCombobox(false);
                                setSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPrescripteur === p.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {p.nom} {p.prenom} - {p.centre}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {examensFacture.length === 0 ? (
                <p className="text-center text-gray-500 italic py-4">
                  Aucun examen facturé pour cette visite
                </p>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-112.5">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Examen</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead className="hidden sm:table-cell">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examensFacture.map((examen) => {
                      const commissionExistante = examensCommissionsExistantes[examen.id];
                      const hasExistingCommission = !!commissionExistante;
                      // Récupérer le PU original (prix tarif) avant remise
                      const prixUnitaire = examen.remiseExamen > 0 && examen.remiseExamen < 100
                        ? Math.round(examen.prixExamen / (1 - examen.remiseExamen / 100))
                        : examen.prixExamen;
                      return (
                        <TableRow
                          key={examen.id}
                          className={hasExistingCommission ? "bg-green-50" : ""}
                        >
                          <TableCell>{examen.libelleExamen}</TableCell>
                          <TableCell>{prixUnitaire.toLocaleString("fr-FR")} CFA</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Montant"
                                className={cn(
                                  "w-24",
                                  hasExistingCommission && "border-green-500 text-green-600 font-medium"
                                )}
                                value={examensCommissions[examen.id] || ""}
                                onChange={(e) =>
                                  setExamensCommissions((prev) => ({
                                    ...prev,
                                    [examen.id]:
                                      parseInt(e.target.value) || 0,
                                  }))
                                }
                                disabled={!selectedPrescripteur && !hasExistingCommission}
                              />
                              <span className={hasExistingCommission ? "text-green-600" : ""}>CFA</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {hasExistingCommission && (
                              <Check className="text-green-600" size={20} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-right font-semibold text-xs sm:text-sm"
                      >
                        Total :
                      </TableCell>
                      <TableCell className="font-semibold">
                        {totalExamensCommissions} CFA
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Button
                          onClick={handleSaveExamensCommissions}
                          disabled={
                            isSaving ||
                            !selectedPrescripteur ||
                            !hasExamensChanges
                          }
                        >
                          {isSaving ? <Spinner /> : "Enregistrer"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
                <Button
                  onClick={handleSaveExamensCommissions}
                  disabled={isSaving || !selectedPrescripteur || !hasExamensChanges}
                  className="w-full sm:hidden mt-2"
                >
                  {isSaving ? <Spinner /> : "Enregistrer"}
                </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Onglet Echographie */}
          <TabsContent value="echographie" className="space-y-4">
            <div className="border rounded-lg p-2 sm:p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Sélectionner un prescripteur
                </label>
                <Popover
                  open={openEchoCombobox}
                  onOpenChange={setOpenEchoCombobox}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openEchoCombobox}
                      className="w-full justify-between"
                    >
                      {selectedPrescripteurData
                        ? `${selectedPrescripteurData.nom} ${selectedPrescripteurData.prenom} - ${selectedPrescripteurData.centre}`
                        : "Rechercher un prescripteur..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Rechercher par nom, prénom ou centre..."
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun prescripteur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {filteredPrescripteurs.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.nom} ${p.prenom} ${p.centre}`}
                              onSelect={() => {
                                setSelectedPrescripteur(p.id);
                                setOpenEchoCombobox(false);
                                setSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPrescripteur === p.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {p.nom} {p.prenom} - {p.centre}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {echographiesFacture.length === 0 ? (
                <p className="text-center text-gray-500 italic py-4">
                  Aucune échographie facturée pour cette visite
                </p>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-112.5">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Echographie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead className="hidden sm:table-cell">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {echographiesFacture.map((echo) => {
                      const commissionExistante = echographiesCommissionsExistantes[echo.id];
                      const hasExistingCommission = !!commissionExistante;
                      // Récupérer le PU original (prix tarif)
                      const partParEcho = echographiesFacture.length > 0
                        ? (echographiesFacture[0].partEchographe ?? 0) / echographiesFacture.length
                        : 0;
                      const prixAvantPartEcho = echo.prixEchographie + partParEcho;
                      const prixUnitaire = echo.remiseEchographie > 0 && echo.remiseEchographie < 100
                        ? Math.round(prixAvantPartEcho / (1 - echo.remiseEchographie / 100))
                        : Math.round(prixAvantPartEcho);
                      return (
                        <TableRow
                          key={echo.id}
                          className={hasExistingCommission ? "bg-green-50" : ""}
                        >
                          <TableCell>{echo.libelleEchographie}</TableCell>
                          <TableCell>{prixUnitaire.toLocaleString("fr-FR")} CFA</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Montant"
                                className={cn(
                                  "w-24",
                                  hasExistingCommission && "border-green-500 text-green-600 font-medium"
                                )}
                                value={echographiesCommissions[echo.id] || ""}
                                onChange={(e) =>
                                  setEchographiesCommissions((prev) => ({
                                    ...prev,
                                    [echo.id]: parseInt(e.target.value) || 0,
                                  }))
                                }
                                disabled={!selectedPrescripteur && !hasExistingCommission}
                              />
                              <span className={hasExistingCommission ? "text-green-600" : ""}>CFA</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {hasExistingCommission && (
                              <Check className="text-green-600" size={20} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-right font-semibold text-xs sm:text-sm"
                      >
                        Total :
                      </TableCell>
                      <TableCell className="font-semibold">
                        {totalEchographiesCommissions} CFA
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Button
                          onClick={handleSaveEchographiesCommissions}
                          disabled={
                            isSaving ||
                            !selectedPrescripteur ||
                            !hasEchographiesChanges
                          }
                        >
                          {isSaving ? <Spinner /> : "Enregistrer"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
                <Button
                  onClick={handleSaveEchographiesCommissions}
                  disabled={isSaving || !selectedPrescripteur || !hasEchographiesChanges}
                  className="w-full sm:hidden mt-2"
                >
                  {isSaving ? <Spinner /> : "Enregistrer"}
                </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Onglet Prescripteur */}
          <TabsContent value="prescripteur" className="space-y-4">
            <div className="border rounded-lg p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  {editingPrescripteur ? "Modifier le prescripteur" : "Ajouter un prescripteur"}
                </h3>
                {editingPrescripteur && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} className="mr-1" />
                    Annuler
                  </Button>
                )}
              </div>
              <Form {...prescripteurForm}>
                <form
                  onSubmit={prescripteurForm.handleSubmit(
                    editingPrescripteur ? handleUpdatePrescripteur : handleCreatePrescripteur,
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={prescripteurForm.control}
                      name="nom"
                      rules={{ required: "Le nom est requis" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescripteurForm.control}
                      name="prenom"
                      rules={{ required: "Le prénom est requis" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input placeholder="Prénom" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescripteurForm.control}
                      name="centre"
                      rules={{ required: "Le centre est requis" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Centre</FormLabel>
                          <FormControl>
                            <Input placeholder="Centre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescripteurForm.control}
                      name="contact"
                      rules={{ required: "Le contact est requis" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className={editingPrescripteur ? "bg-amber-600 hover:bg-amber-700" : ""}
                  >
                    {isSaving ? <Spinner /> : editingPrescripteur ? "Modifier le prescripteur" : "Ajouter le prescripteur"}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="border rounded-lg p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Liste des prescripteurs
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher un prescripteur..."
                    value={prescripteurSearchQuery}
                    onChange={(e) => setPrescripteurSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {prescripteurSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPrescripteurSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : prescripteurs.length === 0 ? (
                <p className="text-center text-gray-500 italic">
                  Aucun prescripteur enregistré
                </p>
              ) : filteredPrescripteursListe.length === 0 ? (
                <p className="text-center text-gray-500 italic">
                  Aucun prescripteur trouvé pour &quot;{prescripteurSearchQuery}&quot;
                </p>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-112.5">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead className="hidden sm:table-cell">Centre</TableHead>
                      <TableHead className="hidden sm:table-cell">Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescripteursListe.map((prescripteur) => (
                      <TableRow
                        key={prescripteur.id}
                        className={editingPrescripteur?.id === prescripteur.id ? "bg-amber-50" : ""}
                      >
                        <TableCell>{prescripteur.nom}</TableCell>
                        <TableCell>{prescripteur.prenom}</TableCell>
                        <TableCell className="hidden sm:table-cell">{prescripteur.centre}</TableCell>
                        <TableCell className="hidden sm:table-cell">{prescripteur.contact}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPrescripteur(prescripteur)}
                              title="Modifier"
                            >
                              <Pencil size={16} className="text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDeletePrescripteur(prescripteur.id)
                              }
                              title="Supprimer"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Onglet Doublons */}
          <TabsContent value="doublons" className="space-y-4">
            <div className="border rounded-lg p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Merge size={20} className="text-orange-500" />
                    Fusion des doublons
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Les prescripteurs avec le même nom et prénom sont regroupés. Sélectionnez celui à conserver, les commissions des autres seront transférées.
                  </p>
                </div>
                {doublonGroups.length > 0 && (
                  <Button
                    onClick={handleMergeAll}
                    disabled={isMerging}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isMerging ? <Spinner /> : "Fusionner tout"}
                  </Button>
                )}
              </div>

              {isLoadingDoublons ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : doublonGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Check size={40} className="mx-auto text-green-500 mb-2" />
                  <p className="text-gray-500 font-medium">Aucun doublon détecté</p>
                  <p className="text-sm text-gray-400 mt-1">Tous les prescripteurs sont uniques</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {doublonGroups.map((group) => (
                    <div key={group.key} className="border border-orange-200 rounded-lg bg-orange-50/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-orange-700">
                          {group.prescripteurs.length} prescripteurs identiques
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleMergeGroup(group)}
                          disabled={isMerging || !selectedKeepIds[group.key]}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {isMerging ? <Spinner /> : (
                            <>
                              <Merge size={14} className="mr-1" />
                              Fusionner
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                      <Table className="min-w-112.5">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Garder</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Prénom</TableHead>
                            <TableHead className="hidden sm:table-cell">Centre</TableHead>
                            <TableHead className="hidden sm:table-cell">Contact</TableHead>
                            <TableHead className="text-center">Com.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.prescripteurs.map((p) => {
                            const isKept = selectedKeepIds[group.key] === p.id;
                            const totalCommissions = p._count.CommissionExamen + p._count.CommissionEchographie;
                            return (
                              <TableRow
                                key={p.id}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  isKept ? "bg-green-50 border-green-200" : "hover:bg-orange-100/50",
                                )}
                                onClick={() => setSelectedKeepIds((prev) => ({ ...prev, [group.key]: p.id }))}
                              >
                                <TableCell className="text-center">
                                  <input
                                    type="radio"
                                    name={`keep-${group.key}`}
                                    checked={isKept}
                                    onChange={() => setSelectedKeepIds((prev) => ({ ...prev, [group.key]: p.id }))}
                                    className="w-4 h-4 accent-green-600"
                                  />
                                </TableCell>
                                <TableCell className={isKept ? "font-bold text-green-700" : ""}>
                                  {p.nom}
                                  {isKept && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">conservé</span>}
                                </TableCell>
                                <TableCell className={isKept ? "font-bold text-green-700" : ""}>{p.prenom}</TableCell>
                                <TableCell className="hidden sm:table-cell">{p.centre}</TableCell>
                                <TableCell className="hidden sm:table-cell">{p.contact}</TableCell>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                    totalCommissions > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500",
                                  )}>
                                    {totalCommissions}
                                    {!isKept && totalCommissions > 0 && (
                                      <ArrowRight size={12} className="text-orange-500" />
                                    )}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
