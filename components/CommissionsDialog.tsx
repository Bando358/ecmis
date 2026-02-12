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
import { Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createPrescripteur,
  getAllPrescripteursByClinique,
  deletePrescripteur,
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
          defaultEchographiesCommissions[echo.id] = calculateDefaultCommission(
            echo.prixEchographie,
            echo.remiseEchographie
          );
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
      <DialogContent className="max-w-4xl! max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion des Commissions</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="examen">Examens</TabsTrigger>
            <TabsTrigger value="echographie">Echographie</TabsTrigger>
            <TabsTrigger value="prescripteur">Prescripteur</TabsTrigger>
          </TabsList>

          {/* Onglet Examens */}
          <TabsContent value="examen" className="space-y-4">
            <div className="border rounded-lg p-4">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Examen</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examensFacture.map((examen) => {
                      const commissionExistante = examensCommissionsExistantes[examen.id];
                      const hasExistingCommission = !!commissionExistante;
                      return (
                        <TableRow
                          key={examen.id}
                          className={hasExistingCommission ? "bg-green-50" : ""}
                        >
                          <TableCell>{examen.libelleExamen}</TableCell>
                          <TableCell>{examen.prixExamen} CFA</TableCell>
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
                          <TableCell>
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
                        className="text-right font-semibold"
                      >
                        Total commissions à enregistrer:
                      </TableCell>
                      <TableCell className="font-semibold">
                        {totalExamensCommissions} CFA
                      </TableCell>
                      <TableCell>
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
              )}
            </div>
          </TabsContent>

          {/* Onglet Echographie */}
          <TabsContent value="echographie" className="space-y-4">
            <div className="border rounded-lg p-4">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Echographie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {echographiesFacture.map((echo) => {
                      const commissionExistante = echographiesCommissionsExistantes[echo.id];
                      const hasExistingCommission = !!commissionExistante;
                      return (
                        <TableRow
                          key={echo.id}
                          className={hasExistingCommission ? "bg-green-50" : ""}
                        >
                          <TableCell>{echo.libelleEchographie}</TableCell>
                          <TableCell>{echo.prixEchographie} CFA</TableCell>
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
                          <TableCell>
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
                        className="text-right font-semibold"
                      >
                        Total commissions à enregistrer:
                      </TableCell>
                      <TableCell className="font-semibold">
                        {totalEchographiesCommissions} CFA
                      </TableCell>
                      <TableCell>
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
              )}
            </div>
          </TabsContent>

          {/* Onglet Prescripteur */}
          <TabsContent value="prescripteur" className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                Ajouter un prescripteur
              </h3>
              <Form {...prescripteurForm}>
                <form
                  onSubmit={prescripteurForm.handleSubmit(
                    handleCreatePrescripteur,
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
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
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Spinner /> : "Ajouter le prescripteur"}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                Liste des prescripteurs
              </h3>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : prescripteurs.length === 0 ? (
                <p className="text-center text-gray-500 italic">
                  Aucun prescripteur enregistré
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Centre</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescripteurs.map((prescripteur) => (
                      <TableRow key={prescripteur.id}>
                        <TableCell>{prescripteur.nom}</TableCell>
                        <TableCell>{prescripteur.prenom}</TableCell>
                        <TableCell>{prescripteur.centre}</TableCell>
                        <TableCell>{prescripteur.contact}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeletePrescripteur(prescripteur.id)
                            }
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
