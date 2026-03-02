// formulaire-client
"use client";
import {
  BadgePlus,
  Building2,
  UserRound,
  MapPin,
  GraduationCap,
  Phone,
  Hash,
  HeartPulse,
  UserPlus,
  Info,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Client, TableName } from "@prisma/client";
import { SafeUser } from "@/types/prisma";

import {
  createClient,
  fetchIncrementCounter,
} from "@/lib/actions/clientActions";
import { useSession } from "next-auth/react";
import {
  getAllClinique,
  // getAllCliniquesByUser,
} from "@/lib/actions/cliniqueActions";
import { getAllRegion } from "@/lib/actions/regionActions";
import { getOneUser } from "@/lib/actions/authActions";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import Retour from "@/components/retour";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

interface RegionData {
  id: string;
  nomRegion: string;
  codeRegion: string;
}

interface CliniqueData {
  id: string;
  nomClinique: string;
  codeClinique: string;
  numClinique: string;
  idRegion: string;
}

const ethnieOptions = [
  { label: "01 Dioula / Malinké", value: "Dioula ou Malinke" },
  { label: "02 Bété", value: "Bete" },
  { label: "03 Baoulé", value: "Baoule" },
  { label: "04 Agni", value: "Agni" },
  { label: "05 Sénoufo", value: "Sénoufo" },
  { label: "06 Koulango", value: "Koulango" },
  { label: "07 Lobi", value: "Lobi" },
  { label: "08 Ebrié", value: "Ebrié" },
  { label: "09 Yacouba", value: "Yacouba" },
  { label: "10 Gouro", value: "Gouro" },
  { label: "11 Guéré", value: "Guéré" },
  { label: "12 Wobé", value: "Wobé" },
  { label: "13 Attié", value: "Attié" },
  { label: "14 Dida", value: "Dida" },
  { label: "15 Abbey", value: "Abbey" },
  { label: "16 Abron", value: "Abron" },
  { label: "17 Kroumen", value: "Kroumen" },
  { label: "18 Gnamboua", value: "Gnamboua" },
  { label: "19 Mossi", value: "Mossi ou Burkinabé" },
  { label: "20 Autres", value: "Autres" },
];
const niveauScolaireOptions = [
  { label: "Non Scolarisé", value: "non_scolarise" },
  { label: "Ecole coranique", value: "ecole_coranique" },
  { label: "Primaire", value: "primaire" },
  { label: "Collège", value: "college" },
  { label: "Lycée", value: "lycee" },
  { label: "Supérieur", value: "superieur" },
];
const professionOptions = [
  { label: "Travailleur Indépendant", value: "Travailleur Indépendant" },
  { label: "Salarié du Privé", value: "Salarié du Privé" },
  { label: "Salarié du Public", value: "Salarié du Public" },
  { label: "Etudiant / Élève", value: "Etudiant ou Élève" },
  { label: "Personnel de maison", value: "Personnel de maison" },
  { label: "Chômeur", value: "Chomeur" },
];
const etatMatrimonialOptions = [
  { label: "Célibataire", value: "celibataire" },
  { label: "Concubinage", value: "concubinage" },
  { label: "Marié(e)", value: "marie" },
  { label: "Veuf(ve)", value: "veuve" },
];
const sourceInfoOptions = [
  { label: "Pair Educateur", value: "pe" },
  { label: "ASC", value: "asc" },
  { label: "Télévision", value: "television" },
  { label: "Radio", value: "radio" },
  { label: "Campagne de Sensibilisation", value: "campagne" },
  { label: "Bouche à oreille / Client satisfait / Parent", value: "bouche" },
  { label: "Prestataire de santé", value: "prestataire" },
  { label: "Affiche/Prospect", value: "affiche" },
];
const sexeOptions = [
  { label: "Féminin", value: "Féminin" },
  { label: "Masculin", value: "Masculin" },
];
const serologieOptions = [
  { label: "Inconnu", value: "inconnu" },
  { label: "Négatif", value: "negatif" },
  { label: "Positif", value: "positif" },
];
const statusClientOptions = [
  { label: "Nouveau", value: "nouveau" },
  { label: "Ancien", value: "ancien" },
];
const populationVulnerableOptions = [
  { label: "Non", value: "non" },
  { label: "Population carcérale", value: "population_carcerale" },
  { label: "Professionnel(le) du sexe", value: "professionnel_du_sexe" },
  {
    label: "HSH (Hommes ayant des rapports sexuels avec des hommes)",
    value: "HSH",
  },
  { label: "UDI (Usagers de drogues injectables)", value: "UDI" },
  { label: "Personnes transgenres", value: "personnes_transgenres" },
  { label: "Migrants / Réfugiés", value: "migrants_refugies" },
  { label: "Personnes handicapées", value: "personnes_handicapees" },
  { label: "Adolescents / Jeunes vulnérables", value: "adolescents_jeunes" },
  { label: "Femmes victimes de violences", value: "femmes_victimes_violences" },
  { label: "Orphelins et enfants vulnérables (OEV)", value: "OEV" },
  { label: "Populations autochtones", value: "populations_autochtones" },
  { label: "Autres", value: "autres" },
];

/* ── Color map (Tailwind needs full class names, not dynamic interpolation) ── */
const colorMap: Record<
  string,
  { bg: string; border: string; iconBg: string; text: string }
> = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconBg: "bg-blue-100",
    text: "text-blue-700",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-100",
    iconBg: "bg-violet-100",
    text: "text-violet-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100",
    text: "text-amber-700",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-100",
    iconBg: "bg-sky-100",
    text: "text-sky-700",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    iconBg: "bg-indigo-100",
    text: "text-indigo-700",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconBg: "bg-rose-100",
    text: "text-rose-700",
  },
};

/* ── Reusable styled components ── */
const sectionHeader = (icon: React.ReactNode, title: string, color: string) => {
  const c = colorMap[color];
  return (
    <div className="col-span-2 mt-2">
      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${c.bg} border ${c.border}`}
      >
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-md ${c.iconBg}`}
        >
          {icon}
        </div>
        <span
          className={`text-sm font-bold ${c.text} uppercase tracking-wider`}
        >
          {title}
        </span>
      </div>
    </div>
  );
};

const fieldLabel = (label: string, required?: boolean) => (
  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
    {label}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const selectClass =
  "w-full h-9 px-3 text-sm border border-blue-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 hover:border-blue-400";
const selectRequiredClass =
  "w-full h-9 px-3 text-sm border border-red-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all duration-200 hover:border-red-400";

const inputClass =
  "h-9 text-sm border-blue-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 hover:border-blue-400";
const inputRequiredClass =
  "h-9 text-sm border-red-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all duration-200 hover:border-red-400";

const dateInputRequiredClass =
  "w-full h-9 px-3 text-sm border border-red-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all duration-200 hover:border-red-400";

const errorClass = "text-red-500 text-xs mt-1 flex items-center gap-1";

export default function FormulaireClient() {
  const { data: session, status } = useSession();
  const [clinique, setClinique] = useState<CliniqueData[]>([]);
  const [oneUser, setOneUser] = useState<SafeUser | null>(null);
  const [region, setRegion] = useState<RegionData[]>([]);
  const [newCode, setNewCode] = useState(false);
  const idPrestataire = session?.user.id as string;
  const router = useRouter();
  const { canCreate } = usePermissionContext();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return format(today, "yyyy-MM-dd");
  });

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  useEffect(() => {
    const fetchData = async () => {
      const [user, adminClinique, allRegion] = await Promise.all([
        getOneUser(idPrestataire),
        getAllClinique(),
        getAllRegion(),
      ]);
      setOneUser(user);
      setRegion(allRegion);
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }
      if (user.role === "ADMIN") {
        setClinique(adminClinique);
      } else {
        setClinique(
          adminClinique.filter((clin: CliniqueData) =>
            user.idCliniques.some((userClin: string | string[]) =>
              userClin.includes(clin.id),
            ),
          ),
        );
      }
    };
    fetchData();
  }, [idPrestataire]);

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Client>({
    defaultValues: {
      cliniqueId: "",
      sourceInfo: "",
      statusClient: "",
      lieuNaissance: "",
      quartier: "",
    },
  });

  const prenom = watch("nom");
  const clinic = watch("cliniqueId");
  const idRegion = clinique.find((c) => c.id === clinic)?.idRegion || null;
  const selectedRegion = region.find((r) => r.id === idRegion);
  const selectedClinique = clinique.find((c) => c.id === clinic);

  const handleGenerateCode = async () => {
    if (!canCreate(TableName.CLIENT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return router.back();
    }
    if (
      !watch("prenom") ||
      !watch("nom") ||
      !selectedRegion ||
      !selectedClinique
    ) {
      toast.error(
        "Veuillez remplir la région, la clinique, le nom et le prénom avant de générer un code.",
      );
      return;
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const cleanPrenom = prenom
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "");

    const initials = cleanPrenom.slice(0, 3).toUpperCase();

    try {
      const { counter } = await fetchIncrementCounter(clinic, year);
      const increment = String(counter).padStart(5, "0");
      const codes = `${selectedRegion.codeRegion}/${selectedClinique.codeClinique}${selectedClinique.numClinique}/${year}/${month}/${increment}-${initials}`;

      setValue("code", codes);
      toast.success(codes);
      setNewCode(true);
    } catch (error) {
      toast.error("Erreur lors de la génération du code");
      console.error("Erreur lors de la génération du code :", error);
    }
  };

  const onSubmit: SubmitHandler<Client> = async (data) => {
    if (!canCreate(TableName.CLIENT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return router.back();
    }
    const formattedData = {
      ...data,
      dateEnregistrement: new Date(data.dateEnregistrement),
      dateNaissance: new Date(data.dateNaissance),
      idUser: idPrestataire,
      idClinique: clinic,
    };

    try {
      await createClient(formattedData as Client);
      toast.success("Client créé avec succès !");
      router.push("/client");
    } catch (error) {
      console.error("Erreur lors de la création du client:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création du client",
      );
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SpinnerBar />
      </div>
    );
  }
  if (status === "authenticated") {
    return (
      <div className="w-full relative">
        <Retour />

        {/* ── Header ── */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Nouveau client
              </h2>
              <p className="text-sm text-gray-400">
                Remplissez les informations ci-dessous pour enregistrer un
                nouveau client
              </p>
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                {/* ═══ Section: Enregistrement ═══ */}
                {sectionHeader(
                  <Building2 className="h-4 w-4 text-blue-600" />,
                  "Enregistrement",
                  "blue",
                )}

                {/* 1. Clinique */}
                <div>
                  {fieldLabel("Clinique", true)}
                  <select
                    {...register("cliniqueId", {
                      required: "Clinique est requise",
                    })}
                    className={selectRequiredClass}
                  >
                    <option value="" disabled>
                      Sélectionner une clinique
                    </option>
                    {clinique.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nomClinique}
                      </option>
                    ))}
                  </select>
                  {errors.cliniqueId && (
                    <span className={errorClass}>
                      {errors.cliniqueId.message}
                    </span>
                  )}
                </div>

                {/* 2. Date d'enregistrement */}
                <div>
                  {fieldLabel("Date d'enregistrement", true)}
                  <input
                    {...register("dateEnregistrement", {
                      required: "Date est requise",
                    })}
                    value={selectedDate}
                    onChange={handleDateChange}
                    className={dateInputRequiredClass}
                    type="date"
                    name="dateEnregistrement"
                  />
                  {errors.dateEnregistrement && (
                    <span className={errorClass}>
                      {errors.dateEnregistrement.message}
                    </span>
                  )}
                </div>

                {/* ═══ Section: Identité ═══ */}
                {sectionHeader(
                  <UserRound className="h-4 w-4 text-violet-600" />,
                  "Identité",
                  "violet",
                )}

                {/* 3. Nom */}
                <div>
                  {fieldLabel("Nom", true)}
                  <Input
                    {...register("nom", { required: "Nom est requis" })}
                    placeholder="Nom du client"
                    className={`${inputRequiredClass} capitalize`}
                    name="nom"
                  />
                  {errors.nom && (
                    <span className={errorClass}>{errors.nom.message}</span>
                  )}
                </div>

                {/* 4. Prénom */}
                <div>
                  {fieldLabel("Prénom", true)}
                  <Input
                    {...register("prenom", { required: "Prénom est requis" })}
                    placeholder="Prénom du client"
                    className={`${inputRequiredClass} capitalize`}
                    name="prenom"
                  />
                  {errors.prenom && (
                    <span className={errorClass}>{errors.prenom.message}</span>
                  )}
                </div>

                {/* 5. Date de naissance */}
                <div>
                  {fieldLabel("Date de naissance", true)}
                  <input
                    {...register("dateNaissance", {
                      required: "Date de naissance est requise",
                    })}
                    className={dateInputRequiredClass}
                    type="date"
                    name="dateNaissance"
                  />
                  {errors.dateNaissance && (
                    <span className={errorClass}>
                      {errors.dateNaissance.message}
                    </span>
                  )}
                </div>

                {/* 6. Sexe */}
                <div>
                  {fieldLabel("Sexe", true)}
                  <select
                    {...register("sexe", { required: "Sexe est requis" })}
                    className={selectRequiredClass}
                    name="sexe"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {sexeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.sexe && (
                    <span className={errorClass}>{errors.sexe.message}</span>
                  )}
                </div>

                {/* ═══ Section: Localisation ═══ */}
                {sectionHeader(
                  <MapPin className="h-4 w-4 text-emerald-600" />,
                  "Localisation",
                  "emerald",
                )}

                {/* 7. Lieu de naissance */}
                <div>
                  {fieldLabel("Lieu de naissance")}
                  <Input
                    {...register("lieuNaissance")}
                    placeholder="Lieu de naissance"
                    className={`${inputClass} capitalize`}
                    name="lieuNaissance"
                    defaultValue=""
                  />
                </div>

                {/* 8. Quartier */}
                <div>
                  {fieldLabel("Quartier")}
                  <Input
                    {...register("quartier")}
                    placeholder="Quartier de résidence"
                    className={`${inputClass} capitalize`}
                    name="quartier"
                    defaultValue=""
                  />
                </div>

                {/* ═══ Section: Situation socio-démographique ═══ */}
                {sectionHeader(
                  <GraduationCap className="h-4 w-4 text-amber-600" />,
                  "Situation socio-démographique",
                  "amber",
                )}

                {/* 9. Niveau scolaire */}
                <div>
                  {fieldLabel("Niveau scolaire", true)}
                  <select
                    {...register("niveauScolaire", {
                      required: "Niveau scolaire est requis",
                    })}
                    className={selectRequiredClass}
                    name="niveauScolaire"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {niveauScolaireOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.niveauScolaire && (
                    <span className={errorClass}>
                      {errors.niveauScolaire.message}
                    </span>
                  )}
                </div>

                {/* 10. État matrimonial */}
                <div>
                  {fieldLabel("État matrimonial", true)}
                  <select
                    {...register("etatMatrimonial", {
                      required: "État matrimonial est requis",
                    })}
                    className={selectRequiredClass}
                    name="etatMatrimonial"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {etatMatrimonialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.etatMatrimonial && (
                    <span className={errorClass}>
                      {errors.etatMatrimonial.message}
                    </span>
                  )}
                </div>

                {/* 11. Ethnie */}
                <div>
                  {fieldLabel("Ethnie", true)}
                  <select
                    {...register("ethnie", { required: "Ethnie est requise" })}
                    className={selectRequiredClass}
                    name="ethnie"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {ethnieOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.ethnie && (
                    <span className={errorClass}>{errors.ethnie.message}</span>
                  )}
                </div>

                {/* 12. Profession */}
                <div>
                  {fieldLabel("Profession", true)}
                  <select
                    {...register("profession", {
                      required: "Profession est requise",
                    })}
                    className={selectRequiredClass}
                    name="profession"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {professionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.profession && (
                    <span className={errorClass}>
                      {errors.profession.message}
                    </span>
                  )}
                </div>

                {/* ═══ Section: Contact ═══ */}
                {sectionHeader(
                  <Phone className="h-4 w-4 text-sky-600" />,
                  "Contact",
                  "sky",
                )}

                {/* 13. Téléphone 1 */}
                <div>
                  {fieldLabel("Téléphone 1", true)}
                  <Input
                    {...register("tel_1")}
                    placeholder="0X XX XX XX XX"
                    className={inputClass}
                    name="tel_1"
                  />
                  {errors.tel_1 && (
                    <span className={errorClass}>{errors.tel_1.message}</span>
                  )}
                </div>

                {/* 14. Téléphone 2 */}
                <div>
                  {fieldLabel("Téléphone 2")}
                  <Input
                    {...register("tel_2")}
                    placeholder="0X XX XX XX XX"
                    className={inputClass}
                    name="tel_2"
                  />
                </div>

                {/* ═══ Section: Codes & Identifiants ═══ */}
                {sectionHeader(
                  <Hash className="h-4 w-4 text-indigo-600" />,
                  "Codes & Identifiants",
                  "indigo",
                )}

                {/* 15. Code */}
                <div>
                  {fieldLabel("Code", true)}
                  <div className="relative">
                    <Input
                      {...register("code", { required: "Code est requis" })}
                      placeholder="AB/CA01/2025/01/00001-XXX"
                      className={`${inputRequiredClass} uppercase pr-10`}
                      name="code"
                    />
                    <button
                      type="button"
                      onClick={() => !newCode && handleGenerateCode()}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200 ${
                        newCode
                          ? "text-blue-600 cursor-default"
                          : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer active:scale-95"
                      }`}
                    >
                      <BadgePlus className="h-5 w-5" />
                    </button>
                  </div>
                  {errors.code && (
                    <span className={errorClass}>{errors.code.message}</span>
                  )}
                </div>

                {/* 16. Code VIH */}
                <div>
                  {fieldLabel("Code VIH")}
                  <Input
                    {...register("codeVih")}
                    placeholder="07060/01/25/00001"
                    className={inputClass}
                    name="codeVih"
                  />
                </div>

                {/* ═══ Section: Santé & Statut ═══ */}
                {sectionHeader(
                  <HeartPulse className="h-4 w-4 text-rose-600" />,
                  "Santé & Statut",
                  "rose",
                )}

                {/* 17. Sérologie */}
                <div>
                  {fieldLabel("Sérologie", true)}
                  <select
                    {...register("serologie", {
                      required: "Sérologie est requise",
                    })}
                    className={selectRequiredClass}
                    name="serologie"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {serologieOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.serologie && (
                    <span className={errorClass}>
                      {errors.serologie.message}
                    </span>
                  )}
                </div>

                {/* 18. Population vulnérable */}
                <div>
                  {fieldLabel("Population vulnérable")}
                  <select
                    {...register("populationVulnerable")}
                    className={selectClass}
                    name="populationVulnerable"
                    defaultValue="non"
                  >
                    {populationVulnerableOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 19. Source d'information */}
                <div>
                  {fieldLabel("Source d'information", true)}
                  <select
                    {...register("sourceInfo", {
                      required: "Source d'information est requise",
                    })}
                    className={selectRequiredClass}
                    name="sourceInfo"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {sourceInfoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.sourceInfo && (
                    <span className={errorClass}>
                      {errors.sourceInfo.message}
                    </span>
                  )}
                </div>

                {/* 20. Statut client */}
                <div>
                  {fieldLabel("Statut client", true)}
                  <select
                    {...register("statusClient", {
                      required: "Statut client est requis",
                    })}
                    className={selectRequiredClass}
                    name="statusClient"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {statusClientOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.statusClient && (
                    <span className={errorClass}>
                      {errors.statusClient.message}
                    </span>
                  )}
                </div>

                {/* Hidden fields */}
                <Input type="hidden" name="idUser" value={idPrestataire} />
                <Input type="hidden" name="idClinique" value={clinic} />
              </div>
            </div>

            {/* ── Footer / Submit ── */}
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  Les champs marqués * sont obligatoires
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 h-10 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  {isSubmitting && (
                    <SpinnerCustom className="mr-2 text-white/60" />
                  )}
                  Créer le client
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
