"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { fetchClientsDataLaboratoire } from "@/lib/actions/rapportActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { TableName } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Building2, CalendarRange, FileText, ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getAllUserIncludedTabIdClinique,
  getAllUserTabIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import {
  ClientData,
  clientDataProps,
  ClientStatusInfo,
  fetchClientsData,
  fetchClientsStatusProtege,
} from "@/components/rapportPfActions";
import { useEffect, useState } from "react";
import { FactureExamen } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { useSession } from "next-auth/react";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import PlanningFamilial from "@/components/listings/ListePlanningFamilial";
import Obstetrique from "@/components/listings/ListeObstetrique";
import PecVih from "@/components/listings/ListePecVih";
import ListeAllData from "@/components/listings/ListeAllData";
import { getAllActiviteByTabIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";
import { Lieu } from "@prisma/client";

// ✅ Correction : import dynamique du composant react-select (client-only)
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
  rapport: z.string().nonempty("Sélectionnez le type de rapport"),
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

const tabListing = [
  { value: "planning", label: "Planification Familiale" },
  { value: "obstetrique", label: "Obstétrique" },
  { value: "pecVih", label: "PEC VIH" },
  { value: "listeAllData", label: "Liste de toutes les données" },
];

export default function Page() {
  const router = useRouter();
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [activites, setActivites] = useState<ActiviteOption[]>([]);
  const [clientData, setClientData] = useState<ClientData[]>([]);
  const [clientAllData, setClientAllData] = useState<clientDataProps[]>([]);
  const [clientDataProtege, setClientDataProtege] = useState<
    ClientStatusInfo[]
  >([]);
  const [rapportClinique, setRapportClinique] = useState<string>("");
  const [spinner, setSpinner] = useState(false);
  const [dataPrescripteur, setDataPrescripteur] = useState<
    { name: string; id: string }[]
  >([]);
  const [cliniques, setCliniques] = useState<CliniqueOption[]>([]);
  const [factureLaboratoire, setFactureLaboratoire] = useState<FactureExamen[]>(
    []
  );
  const [tabExament, setTabExament] = useState<string[]>([]);

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
      rapport: "",
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
        : allCliniques.filter((clin: { id: string }) =>
            user?.idCliniques?.some((userClin: string) =>
              userClin.includes(clin.id)
            )
          );

      const cliniqueOptions = filteredCliniques.map(
        (clinique: { id: string; nomClinique: string }) => ({
          value: clinique.id,
          label: clinique.nomClinique,
        })
      );
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

  const onSubmit: SubmitHandler<FormValuesType> = async (data) => {
    const { idCliniques, dateDebut, dateFin, rapport, idActivite } = data;
    const selectedIds = idCliniques.map((cl) => cl.value);
    const selectedActivites = idActivite?.map((cl) => cl.value) || [];
    setSpinner(true);

    try {
      const rapportLaboratoire = await fetchClientsDataLaboratoire(
        selectedIds,
        selectedActivites,
        new Date(dateDebut),
        new Date(dateFin)
      );

      setFactureLaboratoire(rapportLaboratoire[0].factureExamen);
      setTabExament(rapportLaboratoire[0].tabExamen);

      const prescripteurs = await getAllUserIncludedTabIdClinique(selectedIds);
      const allUsers = await getAllUserTabIdClinique(selectedIds);

      const dataProtege = await fetchClientsStatusProtege(
        selectedIds,
        new Date(dateDebut),
        new Date(dateFin)
      );
      setClientDataProtege(dataProtege);

      const clients = await fetchClientsData(
        selectedIds,
        new Date(dateDebut),
        new Date(dateFin)
      );

      const newAllData = clients.map((client) => ({
        ...client,
        nomPrescripteur: getPrescripteurName(
          client.recapPrescripteur,
          prescripteurs,
          allUsers
        ),
      }));

      const newAllDataIdPrescripteur = newAllData.map((client) => ({
        ...client,
        idPrescripteur: allUsers.find(
          (user: { name: string; id: string }) =>
            user.name === client.nomPrescripteur
        )?.id,
      }));

      const prescripteurNames = Array.from(
        new Set(
          newAllData.flatMap((item) =>
            item.recapPrescripteur && item.recapPrescripteur.length > 0
              ? item.recapPrescripteur
              : []
          )
        )
      );

      const prescripteurData = prescripteurNames.map((id) => {
        const prescripteur = allUsers.find(
          (user: { name: string; id: string }) => user.id === id
        );
        return prescripteur
          ? { name: prescripteur.name, id: prescripteur.id }
          : { name: "", id: "" };
      });

      setDataPrescripteur(prescripteurData.filter((p) => p.name !== ""));
      setClientAllData(newAllDataIdPrescripteur);
      setRapportClinique(rapport);
      setClients(newAllDataIdPrescripteur);
      setSpinner(false);
      setClientData(
        newAllDataIdPrescripteur.filter(
          (client) => client.consultationPf === true
        )
      );
    } catch (error) {
      console.error("Erreur lors de la récupération :", error);
      setSpinner(false);
    }
  };

  if (isLoadingPermissions) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!canRead(TableName.LISTING)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  return (
    <div className="flex flex-col p-2 sm:p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          Listings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Générez et consultez les listings par période et clinique
        </p>
      </div>

      {/* Formulaire */}
      <Card className="mx-auto w-full max-w-150">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-blue-600" />
            Paramètres du listing
          </CardTitle>
          <CardDescription>
            Renseignez les filtres puis cliquez sur Générer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* Type de Rapport */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Type de Rapport
                </label>
                <Select
                  instanceId="rapport-select"
                  options={tabListing}
                  classNamePrefix="select"
                  placeholder="Sélectionner le rapport"
                  value={
                    tabListing.find((opt) => opt.value === watch("rapport")) || null
                  }
                  onChange={(selectedOption) => {
                    setValue(
                      "rapport",
                      (selectedOption as { value: string; label: string } | null)
                        ?.value || ""
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
                {errors.rapport && (
                  <span className="text-red-500 text-xs">
                    {errors.rapport.message}
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
                    placeholder="Sélectionner une ou plusieurs cliniques"
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

              {/* Bouton */}
              <button
                type="submit"
                disabled={spinner}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 font-medium text-sm transition-colors"
              >
                {spinner ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {spinner ? "Génération en cours..." : "Générer le listing"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Affichage des résultats */}
      <div className="w-full">
        {rapportClinique === "planning" && (
          <PlanningFamilial clients={clientData} />
        )}
        {rapportClinique === "obstetrique" && <Obstetrique clients={clients} />}
        {rapportClinique === "pecVih" && <PecVih clients={clients} />}
        {rapportClinique === "listeAllData" && (
          <ListeAllData clients={clientAllData} />
        )}
      </div>
    </div>
  );
}

// ✅ Fonction utilitaire stable
const getPrescripteurName = (
  prescripteurIds: string[],
  tabPrescripteur: SafeUser[],
  tabAllUser: SafeUser[]
): string => {
  const prescripteur = tabPrescripteur.find((p) =>
    prescripteurIds.includes(p.id)
  );
  if (prescripteur && prescripteur.name) {
    return prescripteur.name;
  }
  const allUser = tabAllUser.find((u) => prescripteurIds.includes(u.id));
  return allUser && allUser.name ? allUser.name : "";
};
