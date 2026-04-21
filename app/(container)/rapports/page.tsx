"use client";
// rapports/page.tsx
import { useState, useEffect } from "react";
import Select from "react-select";
import { Spinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CalendarRange,
  FileText,
  Building2,
  Activity,
  Loader2,
} from "lucide-react";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { TableName } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  ClientStatusInfo,
  fetchClientsData,
  fetchClientsStatusProteges,
  fetchClientsDataLaboratoire,
} from "@/lib/actions/rapportActions";
import { ClientData } from "@/components/rapportPfActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getAllActiviteByTabIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";

import { useSession } from "next-auth/react";

import { useForm, SubmitHandler } from "react-hook-form";
import TableRapportPf from "@/components/tableRapport/tableRapportPf";
import TableRapportIst from "@/components/tableRapport/tableRapportIst";
import TableRapportGyneco from "@/components/tableRapport/tableRapportGyneco";
import TableRapportAutreSsr from "@/components/tableRapport/tableRapportInfertAndVbg";
import { clientDataProps } from "@/components/rapportPfActions";
import TableRapportMedecine from "@/components/tableRapport/tableRapportMedecine";
import TableRapportPediatrie from "@/components/tableRapport/tableRapportPediatrie";
import TableRapportObstetrique from "@/components/tableRapport/tableRapportObstetrique";
import TableRapportSaa from "@/components/tableRapport/tableRapportSaa";
import TableRapportDepistageVih from "@/components/tableRapport/tableRapportDepistageVih";
import {
  ClientLaboType,
  fetchLaboData,
} from "@/lib/actions/rapportLaboActions";
import {
  EchoServiceItem,
  fetchEchoData,
} from "@/lib/actions/rapportEchoActions";
import TableRapportLabo from "@/components/tableRapport/tableRapportLabo";
import TableRapportEchographie from "@/components/tableRapport/tableRapportEchographie";
import TableRapportPecVih from "@/components/tableRapport/tableRapportPecVih";
import TableRapportSigMedecine from "@/components/tableRapport/tableRapportSigMedecine";
import TableRapportSigObstetrique from "@/components/tableRapport/tableRapportSigObtetrique";
import {
  getAllUserIncludedTabIdClinique,
  getAllUserTabIdClinique,
  getUsersByIds,
  getOneUser,
} from "@/lib/actions/authActions";
import { FactureExamen, Lieu, ResultatExamen } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import TableRapportValidation from "@/components/tableRapport/tableRapportValidation";
import TableRapportSigAccouchement from "@/components/tableRapport/tableRapportSigAccouchement";
import TableRapportConsultation from "@/components/tableRapport/tableRapportConsultation";
import TableRapportNutrition from "@/components/tableRapport/tableRapportNutrition";

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
      }),
    )
    .min(1, "Sélectionnez au moins une clinique"),
  idActivite: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        idActivite: z.string(),
      }),
    )
    .optional(),
  activitesUniquement: z.boolean(),
});

type FormValuesType = z.infer<typeof FormValuesSchema>;

const tabRapport = [
  { value: "consultation", label: "Consultation" },
  { value: "nutrition", label: "Etat Nutritionnel" },
  { value: "planning", label: "Planification Familiale" },
  { value: "gynecologique", label: "Gynecologique" },
  { value: "obstetrique", label: "Obtétrique" },
  { value: "ist", label: "IST" },
  { value: "autre", label: "Autre SSR" },
  { value: "medecine", label: "Médecine Générale" },
  { value: "pediatrie", label: "Pédiatrie" },
  { value: "saa", label: "SAA" },
  { value: "depistageVih", label: "Dépistage VIH" },
  { value: "pecVih", label: "PEC VIH" },
  { value: "laboratoire", label: "Laboratoire" },
  { value: "echographie", label: "Echographie" },
  { value: "sigMedecine", label: "SIG : Médecine Générale" },
  { value: "sigObstetrique", label: "SIG : Obstétrique" },
  { value: "sigAccouchement", label: "SIG : Accouchement" },
  { value: "validation", label: "Rapport de Validation" },
];

const AnalyseReportPlanning = () => {
  const router = useRouter();
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [clientData, setClientData] = useState<ClientData[]>([]);
  const [clientLaboData, setClientLaboData] = useState<
    Record<string, ClientLaboType[]>
  >({});
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
  const [activites, setActivites] = useState<ActiviteOption[]>([]);
  const [factureLaboratoire, setFactureLaboratoire] = useState<FactureExamen[]>(
    [],
  );
  const [resultatLaboratoire, setResultatLaboratoire] = useState<
    (ResultatExamen & { libelleExamen?: string })[]
  >([]);
  const [tabExament, setTabExament] = useState<string[]>([]);
  const [clientEchoData, setClientEchoData] = useState<EchoServiceItem[]>([]);

  const { data: session, status } = useSession();
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
      activitesUniquement: true,
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
        }),
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

  useEffect(() => {
    const fetchActivites = async () => {
      const selectedCliniqueIds = (watchedIdCliniques || []).map(
        (cl) => cl.value,
      );

      if (selectedCliniqueIds.length === 0) {
        setActivites([]);
        return;
      }

      try {
        // Récupérer les activités pour les cliniques sélectionnées
        const activitesData =
          await getAllActiviteByTabIdClinique(selectedCliniqueIds);

        // Récupérer les lieux pour ces activités
        const activiteIds = activitesData.map(
          (activite: { id: string }) => activite.id,
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
                  lieu.dateDebutLieu,
                ).toLocaleDateString()} - ${new Date(
                  lieu.dateFinLieu,
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
          },
        );

        setActivites(activiteOptions);
      } catch (error) {
        console.error("Erreur lors du chargement des activités:", error);
        setActivites([]);
      }
    };

    fetchActivites();
  }, [watchedIdCliniques]);

  const getAllClinicNameByIds = (
    clinique: CliniqueOption[],
    tabId: string[],
  ): string[] => {
    return clinique
      .filter((clinic) => tabId.includes(clinic.value))
      .map((clinic) => clinic.label);
  };

  const onSubmit: SubmitHandler<FormValuesType> = async (data) => {
    const { idCliniques, dateDebut, dateFin, rapport, idActivite, activitesUniquement } = data;
    const selectedIds = idCliniques.map((cl) => cl.value);

    // Logique activité :
    //   - Activités sélectionnées + checkbox coché → filtrer par ces activités
    //   - Activités sélectionnées + checkbox décoché → "*" = toutes les visites
    //   - Aucune activité sélectionnée → [] = routine uniquement (sans activité)
    let selectedActivites: string[];
    if (idActivite?.length) {
      selectedActivites = activitesUniquement
        ? idActivite.map((act) => act.value)
        : ["*"];
    } else {
      selectedActivites = [];
    }
    setSpinner(true);

    // Ajuster dateFin à 23:59:59.999 pour inclure toute la journée
    const dateDebutObj = new Date(dateDebut);
    dateDebutObj.setHours(0, 0, 0, 0);
    const dateFinObj = new Date(dateFin);
    dateFinObj.setHours(23, 59, 59, 999);

    try {
      const rapportLaboratoire = await fetchClientsDataLaboratoire(
        selectedIds,
        selectedActivites,
        dateDebutObj,
        dateFinObj,
      );

      if (rapportLaboratoire.length > 0) {
        setFactureLaboratoire(rapportLaboratoire[0].factureExamen);
        setResultatLaboratoire(rapportLaboratoire[0].resultatExamen);
        setTabExament(rapportLaboratoire[0].tabExamen);
      } else {
        setFactureLaboratoire([]);
        setResultatLaboratoire([]);
        setTabExament([]);
      }

      const [clientDataLabo, echoDataResult] = await Promise.all([
        fetchLaboData(
          selectedIds,
          selectedActivites,
          dateDebutObj,
          dateFinObj,
        ),
        fetchEchoData(
          selectedIds,
          selectedActivites,
          dateDebutObj,
          dateFinObj,
        ),
      ]);
      const prescripteurs = await getAllUserIncludedTabIdClinique(selectedIds);
      const allUsers = await getAllUserTabIdClinique(selectedIds);

      const protegeData = await fetchClientsStatusProteges(
        selectedIds,
        selectedActivites,
        dateDebutObj,
        dateFinObj,
      );
      setClientDataProtege(protegeData);
      const clients = await fetchClientsData(
        selectedIds,
        selectedActivites,
        dateDebutObj,
        dateFinObj,
      );

      // Charger les prescripteurs manquants (users non associés à une clinique)
      const allKnownIds = new Set(allUsers.map((u: { id: string }) => u.id));
      const missingIds = [
        ...new Set(
          clients.flatMap((c) => c.recapPrescripteur || []).filter((id: string) => !allKnownIds.has(id)),
        ),
      ];
      let enrichedUsers = allUsers;
      if (missingIds.length > 0) {
        const missingUsers = await getUsersByIds(missingIds);
        enrichedUsers = [...allUsers, ...missingUsers];
      }

      const newAllData = clients.map((client) => ({
        ...client,
        nomPrescripteur: getPrescripteurName(
          client.recapPrescripteur,
          prescripteurs,
          enrichedUsers,
        ),
      }));
      const newAllDataIdPrescripteur = newAllData.map((client) => ({
        ...client,
        idPrescripteur: allUsers.find(
          (user: { name: string; id: string }) =>
            user.name === client.nomPrescripteur,
        )?.id,
      }));

      const prescripteurNames = Array.from(
        new Set(
          newAllData.flatMap((item) =>
            item.recapPrescripteur && item.recapPrescripteur.length > 0
              ? item.recapPrescripteur
              : [],
          ),
        ),
      );

      const prescripteurData = prescripteurNames.map((id) => {
        const prescripteur = allUsers.find(
          (user: { name: string; id: string }) => user.id === id,
        );
        return prescripteur
          ? { name: prescripteur.name, id: prescripteur.id }
          : { name: "", id: "" };
      });
      setDataPrescripteur(prescripteurData.filter((p) => p.name !== ""));

      setClientLaboData(clientDataLabo);
      setClientEchoData(echoDataResult);
      setClientAllData(newAllDataIdPrescripteur);
      setRapportClinique(rapport);
      setClients(newAllDataIdPrescripteur);
      setSpinner(false);
      setClientData(
        newAllDataIdPrescripteur.filter((client) => client.consultationPf === true),
      );
    } catch (error) {
      console.error("Erreur lors de la récupération :", error);
      setSpinner(false);
    }
  };

  const ageRanges = [
    { min: 0, max: 9 },
    { min: 10, max: 14 },
    { min: 15, max: 19 },
    { min: 20, max: 24 },
    { min: 25, max: 120 },
  ];
  const ageRangesMedecine = [
    { min: 10, max: 14 },
    { min: 15, max: 19 },
    { min: 20, max: 24 },
    { min: 25, max: 120 },
  ];
  const ageRangesPediatrie = [
    { min: 0, max: 4 },
    { min: 5, max: 9 },
  ];
  const ageRangesSig = [
    { min: 0, max: 4 },
    { min: 5, max: 9 },
    { min: 10, max: 14 },
    { min: 15, max: 19 },
    { min: 20, max: 24 },
    { min: 25, max: 49 },
    { min: 50, max: 120 },
  ];

  if (isLoadingPermissions) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!canRead(TableName.RAPPORT)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  if (status === "loading" || cliniques.length === 0) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner show={true} size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 w-full">
      <div className="mx-auto w-full max-w-lg mb-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-900">
            Générer les Rapports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez les paramètres pour générer votre rapport
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 p-6 border border-blue-200/60 rounded-lg bg-white shadow-sm"
        >
          {/* Période */}
          <fieldset>
            <legend className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4" />
              Période du rapport
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Début <span className="text-red-500">*</span>
                </label>
                <Input type="date" {...register("dateDebut")} />
                {errors.dateDebut && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.dateDebut.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Fin <span className="text-red-500">*</span>
                </label>
                <Input type="date" {...register("dateFin")} />
                {errors.dateFin && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.dateFin.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Type de rapport */}
          <div>
            <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Type de Rapport <span className="text-red-500">*</span>
            </label>
            <Select
              options={tabRapport}
              classNamePrefix="select"
              placeholder="Sélectionner le rapport"
              noOptionsMessage={() => "Aucun rapport disponible"}
              value={
                tabRapport.find((opt) => opt.value === watch("rapport")) || null
              }
              onChange={(selectedOption) => {
                setValue("rapport", selectedOption?.value || "");
              }}
            />
            {errors.rapport && (
              <p className="text-red-500 text-xs mt-1">
                {errors.rapport.message}
              </p>
            )}
          </div>

          <Separator />

          {/* Cliniques */}
          {(isAdmin || cliniques.length > 1) ? (
            <div>
              <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Cliniques <span className="text-red-500">*</span>
              </label>
              <Select
                isMulti
                options={cliniques}
                classNamePrefix="select"
                placeholder="Sélectionner une ou plusieurs cliniques"
                noOptionsMessage={() => "Aucune clinique disponible"}
                value={watch("idCliniques")}
                onChange={(selectedOptions) => {
                  setValue(
                    "idCliniques",
                    selectedOptions ? [...selectedOptions] : [],
                  );
                  setValue("idActivite", []);
                }}
              />
              {errors.idCliniques && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.idCliniques.message}
                </p>
              )}
            </div>
          ) : cliniques.length === 1 ? (
            <div>
              <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Clinique
              </label>
              <Badge variant="secondary" className="text-sm font-medium px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"><Building2 className="h-3.5 w-3.5" />{cliniques[0].label}</Badge>
            </div>
          ) : null}

          {/* Activités */}
          <div>
            <label className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Activités{" "}
              <span className="text-gray-400 font-normal text-xs">
                (optionnel)
              </span>
            </label>
            <Select
              isMulti
              options={activites}
              classNamePrefix="select"
              placeholder={
                watch("idCliniques").length === 0
                  ? "Sélectionnez d'abord une clinique"
                  : "Sélectionner une ou plusieurs activités"
              }
              noOptionsMessage={() => "Aucune activité disponible"}
              isDisabled={watch("idCliniques").length === 0}
              value={watch("idActivite")}
              onChange={(selectedOptions) => {
                setValue(
                  "idActivite",
                  selectedOptions ? [...selectedOptions] : [],
                );
              }}
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
            />
            {watch("idCliniques").length === 0 && (
              <p className="text-gray-400 text-xs mt-1">
                Veuillez d&#39;abord sélectionner une clinique
              </p>
            )}
          </div>

          {/* Checkbox activités uniquement */}
          <AnimatePresence>
            {watch("idActivite") && watch("idActivite")!.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3">
                  <FieldGroup>
                    <Field orientation="horizontal">
                      <Checkbox
                        id="activites-uniquement"
                        checked={watch("activitesUniquement") ?? true}
                        onCheckedChange={(checked) =>
                          setValue("activitesUniquement", !!checked)
                        }
                      />
                      <FieldContent>
                        <FieldLabel htmlFor="activites-uniquement">
                          Rapport des activités uniquement
                        </FieldLabel>
                        <FieldDescription>
                          Cochez pour générer un rapport basé uniquement sur les
                          activités sélectionnées, sans les données de routine.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={spinner}
          >
            {spinner ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              "Générer le rapport"
            )}
          </Button>
        </form>
      </div>

      {(clients.length > 0 || clientDataProtege.length > 0 || clientEchoData.length > 0) && (
        <div className="mt-6 mx-auto max-w-240 w-full">
          {(() => {
            switch (rapportClinique) {
              case "consultation":
                return (
                  <TableRapportConsultation
                    ageRanges={ageRangesSig}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "nutrition":
                return (
                  <TableRapportNutrition
                    ageRanges={ageRangesSig}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "planning":
                return (
                  <TableRapportPf
                    ageRanges={ageRanges}
                    clientData={clientData}
                    clientDataProtege={clientDataProtege}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                    clinicIds={watch("idCliniques").map((item) => item.value)}
                  />
                );
              case "gynecologique":
                return (
                  <TableRapportGyneco
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "ist":
                return (
                  <TableRapportIst
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "autre":
                return (
                  <TableRapportAutreSsr
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "medecine":
                return (
                  <TableRapportMedecine
                    ageRanges={ageRangesMedecine}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "pediatrie":
                return (
                  <TableRapportPediatrie
                    ageRanges={ageRangesPediatrie}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "obstetrique":
                return (
                  <TableRapportObstetrique
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "saa":
                return (
                  <TableRapportSaa
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "depistageVih":
                return (
                  <TableRapportDepistageVih
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "pecVih":
                return (
                  <TableRapportPecVih
                    ageRanges={ageRanges}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "laboratoire":
                return (
                  <TableRapportLabo
                    ageRanges={ageRanges}
                    clientAllData={clientAllData}
                    clientData={clientLaboData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "echographie":
                return (
                  <TableRapportEchographie
                    ageRanges={ageRanges}
                    echoData={clientEchoData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "sigMedecine":
                return (
                  <TableRapportSigMedecine
                    ageRanges={ageRangesSig}
                    clientData={clientAllData}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                  />
                );
              case "sigObstetrique":
                return (
                  <TableRapportSigObstetrique clientData={clientAllData} />
                );
              case "sigAccouchement":
                return (
                  <TableRapportSigAccouchement clientData={clientAllData} />
                );
              case "validation":
                return (
                  <TableRapportValidation
                    tabExament={tabExament}
                    factureLaboratoire={factureLaboratoire}
                    resultatLaboratoire={resultatLaboratoire}
                    clientData={clientAllData}
                    dataPrescripteur={dataPrescripteur}
                    clinic={getAllClinicNameByIds(
                      cliniques,
                      watch("idCliniques").map((item) => item.value),
                    ).join(", ")}
                    dateDebut={watch("dateDebut")}
                    dateFin={watch("dateFin")}
                  />
                );
              default:
                return (
                  <p className="text-red-500">Type de rapport non reconnu</p>
                );
            }
          })()}
        </div>
      )}
    </div>
  );
};

export default AnalyseReportPlanning;

// Postes prioritaires pour l'affichage du prescripteur (ordre de priorité)
const POSTES_PRIORITE_ORDRE = ["MEDECIN", "SAGE_FEMME", "INFIRMIER", "LABORANTIN", "AIDE_SOIGNANT"];
const POSTES_PRIORITAIRES = new Set(POSTES_PRIORITE_ORDRE);

type UserWithPost = SafeUser & { post?: { title: string }[] };

const getPostePriorite = (user: UserWithPost): number => {
  const posts = user.post || [];
  let meilleur = POSTES_PRIORITE_ORDRE.length;
  for (const p of posts) {
    const idx = POSTES_PRIORITE_ORDRE.indexOf(p.title);
    if (idx !== -1 && idx < meilleur) meilleur = idx;
  }
  return meilleur;
};

// Privilégie : médecin > sage-femme > infirmier > laborantin > aide-soignant
// Si plusieurs intervenants prioritaires, les sépare par ", " triés par priorité
const getPrescripteurName = (
  prescripteurIds: string[],
  tabPrescripteur: SafeUser[],
  tabAllUser: SafeUser[],
): string => {
  if (!prescripteurIds || prescripteurIds.length === 0) return "";

  const allMatching = tabAllUser.filter((u) => prescripteurIds.includes(u.id));
  if (allMatching.length === 0) {
    const prescripteur = tabPrescripteur.find((p) => prescripteurIds.includes(p.id));
    return prescripteur?.name || "";
  }

  const prioritaires = (allMatching as UserWithPost[]).filter((u) =>
    u.post?.some((p) => POSTES_PRIORITAIRES.has(p.title)),
  );

  if (prioritaires.length > 0) {
    const tries = prioritaires.sort((a, b) => getPostePriorite(a) - getPostePriorite(b));
    return [...new Set(tries.map((p) => p.name).filter(Boolean))].join(", ");
  }

  const noms = [...new Set(allMatching.map((u) => u.name).filter(Boolean))];
  return noms.join(", ");
};
