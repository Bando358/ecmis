"use client";

import dynamic from "next/dynamic";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { PlanningRdvTable } from "@/components/planning-rdv-table";
import { ObstetriqueRdvTable } from "@/components/obstetrique-rdv-table";
import { PecVihRdvTable } from "@/components/pec-vih-rdv-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, EyeClosed, Building2, CalendarRange, FileText, CalendarCheck, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOneUser } from "@/lib/actions/authActions";
import { getAllActiviteByTabIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";
import { Clinique, Lieu } from "@prisma/client";

// ✅ Import dynamique de react-select
const Select = dynamic(() => import("react-select"), { ssr: false });

interface CliniqueOption {
  value: string;
  label: string;
}

interface ActiviteOption {
  value: string;
  label: string;
  idLieu?: string;
  idActivite: string;
  libelleActivite?: string;
  lieu?: string;
  dateDebutLieu?: Date;
  dateFinLieu?: Date;
}

const FormValuesSchema = z.object({
  dateDebut: z.string().nonempty("Date de début requise"),
  dateFin: z.string().nonempty("Date de fin requise"),
  typeRapport: z.string().nonempty("Sélectionnez le type de rapport"),
  idCliniques: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .min(1, "Sélectionnez au moins une clinique"),
  idActivite: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        idActivite: z.string(),
      })
    )
    .optional(),
});

type FormValuesType = z.infer<typeof FormValuesSchema>;

const typeRapportOptions = [
  { value: "planning", label: "Planification Familiale" },
  { value: "obstetrique", label: "Obstétrique" },
  { value: "pec-vih", label: "PEC VIH" },
];

// ✅ COMPOSANT SANS PROPS PROBLÉMATIQUES
export default function GestionRdv() {
  const [cliniques, setCliniques] = useState<CliniqueOption[]>([]);
  const [activites, setActivites] = useState<ActiviteOption[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("planning");
  const [filters, setFilters] = useState<{
    cliniques: CliniqueOption[];
    clinicIds: string[];
    dateDebut: Date;
    dateFin: Date;
    activites: ActiviteOption[];
  }>({
    cliniques: [],
    clinicIds: [],
    dateDebut: new Date(),
    dateFin: new Date(),
    activites: [],
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id;

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValuesType>({
    resolver: zodResolver(FormValuesSchema),
    defaultValues: {
      typeRapport: "planning",
      idCliniques: [],
      idActivite: [],
      dateDebut: new Date().toISOString().split("T")[0],
      dateFin: new Date().toISOString().split("T")[0],
    },
  });

  // ✅ Chargement des cliniques au montage (filtrées par user)
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      const [allCliniques, user] = await Promise.all([
        getAllClinique(),
        getOneUser(userId),
      ]);
      const filteredCliniques = isAdmin
        ? allCliniques
        : allCliniques.filter((clin) =>
            user?.idCliniques?.some((userClin) => userClin.includes(clin.id))
          );
      const cliniqueOptions = filteredCliniques.map((clinique: Clinique) => ({
        value: clinique.id,
        label: clinique.nomClinique,
      }));
      setCliniques(cliniqueOptions);
      // Auto-sélection pour les non-admin
      if (!isAdmin && cliniqueOptions.length > 0) {
        setValue("idCliniques", cliniqueOptions, { shouldValidate: true });
      }
    };
    fetchData();
  }, [userId, isAdmin, setValue]);

  // watch the idCliniques value for changes and use a stable variable in dependencies
  const watchedIdCliniques = watch("idCliniques");

  // Charger les activités quand les cliniques sélectionnées changent
  useEffect(() => {
    const fetchActivites = async () => {
      const selectedCliniqueIds = (watchedIdCliniques || []).map(
        (cl) => cl.value
      );

      if (selectedCliniqueIds.length === 0) {
        setActivites([]);
        return;
      }

      try {
        // Récupérer les activités pour les cliniques sélectionnées
        const activitesData = await getAllActiviteByTabIdClinique(
          selectedCliniqueIds
        );

        // Récupérer les lieux pour ces activités
        const activiteIds = activitesData.map(
          (activite: { id: string }) => activite.id
        );
        // Récupérer les lieux et normaliser les champs (dateDebut/dateFin -> dateDebutLieu/dateFinLieu)
        const rawLieuxData = await getAllLieuByTabIdActivite(activiteIds);
        const lieuxData: {
          id: string;
          idActivite: string;
          lieu: string;
          dateDebutLieu: string | Date;
          dateFinLieu: string | Date;
        }[] = rawLieuxData.map((lieu: Lieu) => ({
          id: lieu.id,
          idActivite: lieu.idActivite,
          lieu: lieu.lieu,
          dateDebutLieu: (lieu.dateDebut ?? lieu.dateDebut) as string | Date,
          dateFinLieu: (lieu.dateFin ?? lieu.dateFin) as string | Date,
        }));

        // Créer un map des lieux par activité pour un accès facile
        const lieuxParActivite = new Map<
          string,
          (typeof lieuxData)[number][]
        >();
        lieuxData.forEach((lieu) => {
          if (!lieuxParActivite.has(lieu.idActivite)) {
            lieuxParActivite.set(lieu.idActivite, []);
          }
          lieuxParActivite.get(lieu.idActivite)!.push(lieu);
        });

        // Transformer les données en options pour le Select
        const activiteOptions: ActiviteOption[] = activitesData.flatMap(
          (activite: { id: string; libelle: string }) => {
            const lieux = lieuxParActivite.get(activite.id) || [];

            // Si l'activité a des lieux, créer une option pour chaque combinaison activité-lieu
            if (lieux.length > 0) {
              return lieux.map((lieu) => ({
                value: `${activite.id}>${lieu.id}`, // Combinaison unique activité-lieu
                label: `${activite.libelle} - ${lieu.lieu} (${new Date(
                  lieu.dateDebutLieu
                ).toLocaleDateString()} - ${new Date(
                  lieu.dateFinLieu
                ).toLocaleDateString()})`,
                idLieu: lieu.id,
                idActivite: activite.id,
                libelleActivite: activite.libelle,
                lieu: lieu.lieu,
                dateDebutLieu: lieu.dateDebutLieu,
                dateFinLieu: lieu.dateFinLieu,
              }));
            }

            // Si pas de lieu, créer une option simple pour l'activité
            return [
              {
                value: activite.id,
                label: activite.libelle,
                idActivite: activite.id,
                libelleActivite: activite.libelle,
              },
            ];
          }
        );

        setActivites(activiteOptions);
      } catch (error) {
        console.error("Erreur lors du chargement des activités:", error);
        setActivites([]);
      }
    };

    fetchActivites();
  }, [watchedIdCliniques]);

  const handleHiddenForm = () => {
    if (!isVisible) {
      setIsVisible(true);
      // rafraichirPage();
    } else {
      setIsVisible(false);
    }
  };

  const onSubmit: SubmitHandler<FormValuesType> = async (data) => {
    const { idCliniques, dateDebut, dateFin, typeRapport, idActivite } = data;
    const selectedIds = idCliniques.map((cl) => cl.value);
    const selectedActivites = idActivite || [];

    setLoading(true);

    try {
      // Simuler un chargement pour démonstration
      setTimeout(() => {
        setFilters({
          cliniques: cliniques.filter((clinique) =>
            selectedIds.includes(clinique.value)
          ),
          clinicIds: selectedIds,
          dateDebut: new Date(dateDebut),
          dateFin: new Date(dateFin),
          activites: selectedActivites,
        });
        setActiveTab(typeRapport);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Erreur lors de la génération du rapport :", error);
      setLoading(false);
    } finally {
      setIsVisible(false);
    }
  };

  const currentTypeRapport = watch("typeRapport");

  return (
    <div className="flex flex-col p-2 sm:p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Gestion des Rendez-vous
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Consultez les rendez-vous par période, clinique et type de rapport
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleHiddenForm}
              >
                {isVisible ? (
                  <Eye className="h-4 w-4 text-blue-600" />
                ) : (
                  <EyeClosed className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isVisible ? "Masquer le formulaire" : "Afficher le formulaire"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Formulaire de filtres */}
      {isVisible && (
        <Card className="mx-auto w-full max-w-150">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Paramètres de consultation
            </CardTitle>
            <CardDescription>
              Renseignez les filtres puis cliquez sur Générer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dates */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                    Date début
                  </label>
                  <input
                    type="date"
                    {...register("dateDebut")}
                    className="w-full border px-3 py-2 rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                  {errors.dateDebut && (
                    <span className="text-red-500 text-xs">
                      {errors.dateDebut.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                    Date fin
                  </label>
                  <input
                    type="date"
                    {...register("dateFin")}
                    className="w-full border px-3 py-2 rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                  {errors.dateFin && (
                    <span className="text-red-500 text-xs">
                      {errors.dateFin.message}
                    </span>
                  )}
                </div>

                {/* Type de Rapport */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Type de Rapport
                  </label>
                  <Select
                    instanceId="type-rapport-select"
                    options={typeRapportOptions}
                    classNamePrefix="select"
                    placeholder="Sélectionner le rapport"
                    value={
                      typeRapportOptions.find(
                        (opt) => opt.value === watch("typeRapport")
                      ) || null
                    }
                    onChange={(selectedOption) => {
                      setValue(
                        "typeRapport",
                        (
                          selectedOption as {
                            value: string;
                            label: string;
                          } | null
                        )?.value || ""
                      );
                    }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        fontSize: "14px",
                        minHeight: "42px",
                      }),
                    }}
                  />
                  {errors.typeRapport && (
                    <span className="text-red-500 text-xs">
                      {errors.typeRapport.message}
                    </span>
                  )}
                </div>

                {/* Cliniques */}
                {(isAdmin || cliniques.length > 1) ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Cliniques
                    </label>
                    <Select
                      instanceId="clinique-select"
                      isMulti
                      options={cliniques}
                      classNamePrefix="select"
                      placeholder="Sélectionner la ou les cliniques"
                      value={watch("idCliniques")}
                      onChange={(selectedOptions) => {
                        setValue(
                          "idCliniques",
                          Array.isArray(selectedOptions) ? selectedOptions : []
                        );
                        setValue("idActivite", []);
                      }}
                      styles={{
                        control: (base) => ({
                          ...base,
                          fontSize: "14px",
                          minHeight: "42px",
                        }),
                      }}
                    />
                    {errors.idCliniques && (
                      <span className="text-red-500 text-xs">
                        {errors.idCliniques.message}
                      </span>
                    )}
                  </div>
                ) : cliniques.length === 1 ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Clinique
                    </label>
                    <div className="mt-0.5">
                      <Badge variant="secondary" className="text-sm font-medium px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        <Building2 className="h-3.5 w-3.5" />{cliniques[0].label}
                      </Badge>
                    </div>
                  </div>
                ) : null}

                {/* Activités */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Activités
                  </label>
                  <Select
                    instanceId="activite-select"
                    isMulti
                    options={activites}
                    classNamePrefix="select"
                    placeholder={
                      watch("idCliniques").length === 0
                        ? "Sélectionnez d'abord une clinique"
                        : "Sélectionner une ou plusieurs activités"
                    }
                    isDisabled={watch("idCliniques").length === 0}
                    value={watch("idActivite")}
                    onChange={(selectedOptions) => {
                      setValue(
                        "idActivite",
                        Array.isArray(selectedOptions) ? selectedOptions : []
                      );
                    }}
                    getOptionValue={(option: unknown) =>
                      (option as ActiviteOption).value
                    }
                    getOptionLabel={(option: unknown) =>
                      (option as ActiviteOption).label
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        fontSize: "14px",
                        minHeight: "42px",
                      }),
                    }}
                  />
                  {watch("idCliniques").length === 0 && (
                    <span className="text-muted-foreground text-xs">
                      Veuillez {"d'abord"} sélectionner une clinique
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                {loading ? "Chargement..." : "Générer les rendez-vous"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Affichage des résultats */}
      {filters.clinicIds.length > 0 ? (
        <Card className="max-w-240 min-w-240 mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Consultation des Rendez-vous
            </CardTitle>
            <CardDescription>
              Période du {filters.dateDebut.toLocaleDateString()} au{" "}
              {filters.dateFin.toLocaleDateString()} -{" "}
              {
                typeRapportOptions.find(
                  (opt) => opt.value === currentTypeRapport
                )?.label
              }{" "}
              {filters.activites.length > 0 && (
                <span>
                  - Activités :{" "}
                  {filters.activites.map((act) => act.label).join(", ")}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="planning">
                  Planification Familiale
                </TabsTrigger>
                <TabsTrigger value="obstetrique">Obstétrique</TabsTrigger>
                <TabsTrigger value="pec-vih">PEC VIH</TabsTrigger>
              </TabsList>

              <TabsContent value="planning">
                <PlanningRdvTable
                  cliniques={filters.cliniques}
                  clinicIds={filters.clinicIds}
                  dateDebut={filters.dateDebut}
                  dateFin={filters.dateFin}
                  activites={filters.activites}
                />
              </TabsContent>

              <TabsContent value="obstetrique">
                <ObstetriqueRdvTable
                  cliniques={filters.cliniques}
                  clinicIds={filters.clinicIds}
                  dateDebut={filters.dateDebut}
                  dateFin={filters.dateFin}
                  activites={filters.activites}
                />
              </TabsContent>

              <TabsContent value="pec-vih">
                <PecVihRdvTable
                  cliniques={filters.cliniques}
                  clinicIds={filters.clinicIds}
                  dateDebut={filters.dateDebut}
                  dateFin={filters.dateFin}
                  activites={filters.activites}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto w-full max-w-150">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <CalendarCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Veuillez sélectionner au moins une clinique et générer le rapport
                pour afficher les rendez-vous.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
