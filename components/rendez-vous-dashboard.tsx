"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";
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
import { Eye, EyeClosed } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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

  // ✅ Chargement des cliniques au montage
  useEffect(() => {
    const fetchData = async () => {
      const allCliniques = await getAllClinique();
      const cliniqueOptions = allCliniques.map((clinique: Clinique) => ({
        value: clinique.id,
        label: clinique.nomClinique,
      }));
      setCliniques(cliniqueOptions);
    };
    fetchData();
  }, []);

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
    <div className="flex flex-col p-6 w-full">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2 justify-between">
        <span></span>
        <span>Gestion des Rendez-vous</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"ghost"}
                onClick={handleHiddenForm}
                // className="absolute right-2 -top-1"
              >
                {isVisible ? (
                  <Eye className="text-blue-600 font-extrabold text-3xl" />
                ) : (
                  <EyeClosed className="text-red-600 font-extrabold text-3xl" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ouvrir le formulaire</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h1>

      {/* Formulaire de filtres */}
      {isVisible && (
        <Card className="mb-6 bg-transparent border-none">
          <CardContent className=" ">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mx-auto max-w-150"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dates */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date début :</label>
                  <input
                    type="date"
                    {...register("dateDebut")}
                    className="w-full border px-3 py-2 rounded-md text-sm"
                  />
                  {errors.dateDebut && (
                    <span className="text-red-500 text-sm">
                      {errors.dateDebut.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date fin :</label>
                  <input
                    type="date"
                    {...register("dateFin")}
                    className="w-full border px-3 py-2 rounded-md text-sm"
                  />
                  {errors.dateFin && (
                    <span className="text-red-500 text-sm">
                      {errors.dateFin.message}
                    </span>
                  )}
                </div>

                {/* Type de Rapport */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type de Rapport :
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
                    <span className="text-red-500 text-sm">
                      {errors.typeRapport.message}
                    </span>
                  )}
                </div>

                {/* Cliniques */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliniques :</label>
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
                      // Réinitialiser les activités quand les cliniques changent
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
                    <span className="text-red-500 text-sm">
                      {errors.idCliniques.message}
                    </span>
                  )}
                </div>

                {/* Activités - Nouveau champ ajouté */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Activités :</label>
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
                    <span className="text-gray-500 text-sm">
                      Veuillez {"d'abord"} sélectionner une clinique
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton de soumission */}
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 flex items-center gap-2 min-w-30 justify-center"
                >
                  <Spinner
                    show={loading}
                    size={"small"}
                    className="text-white"
                  />
                  <div>{loading ? "Chargement..." : "Générer"}</div>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Affichage des résultats */}
      {filters.clinicIds.length > 0 ? (
        <Card className="max-w-240 min-w-240 mx-auto bg-transparent border-none">
          <CardHeader>
            <CardTitle>Consultation des Rendez-vous</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
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
              <TabsList className="grid w-full grid-cols-3 bg-gray-200">
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
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Veuillez sélectionner au moins une clinique et générer le rapport
              pour afficher les rendez-vous.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
