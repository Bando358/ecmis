"use client";
// rapports/page.tsx
import React, { useState, useEffect } from "react";
import Select from "react-select";
import { Spinner, SpinnerCustom } from "@/components/ui/spinner";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  ClientStatusInfo,
  fetchClientsData,
  fetchClientsStatusProtege,
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
import TableRapportLabo from "@/components/tableRapport/tableRapportLabo";
import TableRapportPecVih from "@/components/tableRapport/tableRapportPecVih";
import TableRapportSigMedecine from "@/components/tableRapport/tableRapportSigMedecine";
import TableRapportSigObstetrique from "@/components/tableRapport/tableRapportSigObtetrique";
import {
  getAllUserIncludedTabIdClinique,
  getAllUserTabIdClinique,
} from "@/lib/actions/authActions";
import { FactureExamen, Lieu, ResultatExamen, User } from "@prisma/client";
import TableRapportValidation from "@/components/tableRapport/tableRapportValidation";
import TableRapportSigAccouchement from "@/components/tableRapport/tableRapportSigAccouchement";

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

const tabRapport = [
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
  { value: "sigMedecine", label: "SIG : Médecine Générale" },
  { value: "sigObstetrique", label: "SIG : Obstétrique" },
  { value: "sigAccouchement", label: "SIG : Accouchement" },
  { value: "validation", label: "Rapport de Validation" },
];

const AnalyseReportPlanning = () => {
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
    []
  );
  const [resultatLaboratoire, setResultatLaboratoire] = useState<
    (ResultatExamen & { libelleExamen?: string })[]
  >([]);
  const [tabExament, setTabExament] = useState<string[]>([]);

  const { data: session, status } = useSession();
  console.log("session", session);

  if (clientAllData) {
    console.log("clientData rapport page.tsx ", clientAllData);
  }

  useEffect(() => {
    const fetchData = async () => {
      const allCliniques = await getAllClinique();
      const cliniqueOptions = allCliniques.map(
        (clinique: { id: string; nomClinique: string }) => ({
          value: clinique.id,
          label: clinique.nomClinique,
        })
      );
      setCliniques(cliniqueOptions);
    };
    fetchData();
  }, []);

  // Charger les activités quand les cliniques sélectionnées changent
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
    },
  });

  // watch the idCliniques value for changes and use a stable variable in dependencies
  const watchedIdCliniques = watch("idCliniques");

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

  const getAllClinicNameByIds = (
    clinique: CliniqueOption[],
    tabId: string[]
  ): string[] => {
    return clinique
      .filter((clinic) => tabId.includes(clinic.value))
      .map((clinic) => clinic.label);
  };

  const onSubmit: SubmitHandler<FormValuesType> = async (data) => {
    const { idCliniques, dateDebut, dateFin, rapport, idActivite } = data;
    const selectedIds = idCliniques.map((cl) => cl.value);
    const selectedActivites = idActivite?.map((act) => act.value) || [];
    console.log("FormData : ", data);
    setSpinner(true);

    try {
      const rapportLaboratoire = await fetchClientsDataLaboratoire(
        selectedIds,
        selectedActivites,
        new Date(dateDebut),
        new Date(dateFin)
      );

      setFactureLaboratoire(rapportLaboratoire[0].factureExamen);
      setResultatLaboratoire(rapportLaboratoire[0].resultatExamen);
      setTabExament(rapportLaboratoire[0].tabExamen);

      const clientDataLabo = await fetchLaboData(
        selectedIds,
        new Date(dateDebut),
        new Date(dateFin)
      );
      const prescripteurs = await getAllUserIncludedTabIdClinique(selectedIds);
      const allUsers = await getAllUserTabIdClinique(selectedIds);

      setClientLaboData(clientDataLabo);
      console.log("clientDataLabo : ", clientDataLabo);
      const data = await fetchClientsStatusProtege(
        selectedIds,
        selectedActivites,
        new Date(dateDebut),
        new Date(dateFin)
      );
      setClientDataProtege(data);
      const clients = await fetchClientsData(
        selectedIds,
        selectedActivites,
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

      console.log("clientAllData :", newAllDataIdPrescripteur);
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

  if (status === "loading" || cliniques.length === 0) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner show={true} size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 w-full">
      <h1 className="text-xl font-bold mb-4 text-center">
        Générer les Rapport
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto p-4 border rounded-md max-w-125"
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label>Date début :</label>
              <input
                type="date"
                {...register("dateDebut")}
                className="w-full border px-3 py-2 rounded-md"
              />
              {errors.dateDebut && (
                <span className="text-red-500 text-sm">
                  {errors.dateDebut.message}
                </span>
              )}
            </div>

            <div className="flex-1">
              <label>Date fin :</label>
              <input
                type="date"
                {...register("dateFin")}
                className="w-full border px-3 py-2 rounded-md"
              />
              {errors.dateFin && (
                <span className="text-red-500 text-sm">
                  {errors.dateFin.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label>Type de Rapport :</label>
            <Select
              options={tabRapport}
              classNamePrefix="select"
              placeholder="Sélectionner le rapport"
              value={
                tabRapport.find((opt) => opt.value === watch("rapport")) || null
              }
              onChange={(selectedOption) => {
                setValue("rapport", selectedOption?.value || "");
              }}
            />
            {errors.rapport && (
              <span className="text-red-500 text-sm">
                {errors.rapport.message}
              </span>
            )}
          </div>

          <div>
            <label>Cliniques :</label>
            <Select
              isMulti
              options={cliniques}
              classNamePrefix="select"
              placeholder="Sélectionner une ou plusieurs cliniques"
              value={watch("idCliniques")}
              onChange={(selectedOptions) => {
                setValue(
                  "idCliniques",
                  selectedOptions ? [...selectedOptions] : []
                );
                // Réinitialiser les activités quand les cliniques changent
                setValue("idActivite", []);
              }}
            />
            {errors.idCliniques && (
              <span className="text-red-500 text-sm">
                {errors.idCliniques.message}
              </span>
            )}
          </div>

          <div>
            <label>Activités :</label>
            <Select
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
                  selectedOptions ? [...selectedOptions] : []
                );
              }}
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
            />
            {watch("idCliniques").length === 0 && (
              <span className="text-gray-500 text-sm">
                Veuillez {"d'abord"} sélectionner une clinique
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex justify-center gap-2"
          >
            {spinner && (
              <SpinnerCustom className="text-green-900 dark:text-slate-400" />
            )}
            <div>Générer</div>
          </button>
        </div>
      </form>

      {clients.length > 0 && (
        <div className="mt-6 mx-auto max-w-240 w-full">
          {(() => {
            switch (rapportClinique) {
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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
                      watch("idCliniques").map((item) => item.value)
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

// Fonction qui prend en paramètre une liste d'id prescripteur, tabPrescripteur et tabAllUser et retourne le name du premier correspondant
const getPrescripteurName = (
  prescripteurIds: string[],
  tabPrescripteur: User[],
  tabAllUser: User[]
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
