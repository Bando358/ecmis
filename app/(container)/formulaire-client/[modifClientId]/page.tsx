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
  Pencil,
  ArrowLeft,
  User,
  Calendar,
  Info,
} from "lucide-react";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Client, TableName } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getOneClient, updateClient } from "@/lib/actions/clientActions";
import { useSession } from "next-auth/react";
import { getAllClinique } from "@/lib/actions/cliniqueActions";

import { Skeleton } from "@/components/ui/skeleton";
import { getOneUser } from "@/lib/actions/authActions";
import Retour from "@/components/retour";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

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
  { label: "Masculin", value: "Masculin" },
  { label: "Féminin", value: "Féminin" },
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
  { label: "HSH (Hommes ayant des rapports sexuels avec des hommes)", value: "HSH" },
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
const colorMap: Record<string, { bg: string; border: string; iconBg: string; text: string; line: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-100",    iconBg: "bg-blue-100",    text: "text-blue-700",    line: "bg-blue-100" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-100",  iconBg: "bg-violet-100",  text: "text-violet-700",  line: "bg-violet-100" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", iconBg: "bg-emerald-100", text: "text-emerald-700", line: "bg-emerald-100" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-100",   iconBg: "bg-amber-100",   text: "text-amber-700",   line: "bg-amber-100" },
  sky:     { bg: "bg-sky-50",     border: "border-sky-100",     iconBg: "bg-sky-100",     text: "text-sky-700",     line: "bg-sky-100" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-100",  iconBg: "bg-indigo-100",  text: "text-indigo-700",  line: "bg-indigo-100" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-100",    iconBg: "bg-rose-100",    text: "text-rose-700",    line: "bg-rose-100" },
};

/* ── Reusable styled components ── */
const sectionHeader = (icon: React.ReactNode, title: string, color: string) => {
  const c = colorMap[color];
  return (
    <div className="col-span-2 mt-2">
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${c.bg} border ${c.border}`}>
        <div className={`flex items-center justify-center w-7 h-7 rounded-md ${c.iconBg}`}>
          {icon}
        </div>
        <span className={`text-sm font-bold ${c.text} uppercase tracking-wider`}>{title}</span>
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
  "w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200 hover:border-gray-300";

const inputClass =
  "h-9 text-sm border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200 hover:border-gray-300";

const dateInputClass =
  "w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200 hover:border-gray-300";

const errorClass = "text-red-500 text-xs mt-1 flex items-center gap-1";

/* ── Display view helpers ── */
const displaySectionHeader = (icon: React.ReactNode, title: string, color: string) => {
  const c = colorMap[color];
  return (
    <div className="col-span-2 mt-3 first:mt-0">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className={`flex items-center justify-center w-6 h-6 rounded-md ${c.iconBg}`}>
          {icon}
        </div>
        <span className={`text-xs font-bold ${c.text} uppercase tracking-wider`}>{title}</span>
        <div className={`flex-1 h-px ${c.line}`} />
      </div>
    </div>
  );
};

const displayRow = (label: string, value: React.ReactNode) => (
  <>
    <div className="py-2 px-3">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
    <div className="py-2 px-3">
      <span className="text-sm font-semibold text-gray-800">{value || "—"}</span>
    </div>
  </>
);

export default function ModifFormulaireClient({
  params,
}: {
  params: Promise<{ modifClientId: string }>;
}) {
  const { modifClientId } = use(params);
  const [selectedClient, setSelectedClient] = useState<Client>();
  const [clinique, setClinique] = useState<CliniqueData[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<SafeUser | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();
  const { canUpdate } = usePermissionContext();
  const idPrestataire = session?.user.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [user, client, adminClinique] = await Promise.all([
          getOneUser(idPrestataire),
          getOneClient(modifClientId),
          getAllClinique(),
        ]);
        setOnePrescripteur(user);
        setSelectedClient(client as Client);
        if (!user) {
          throw new Error("Utilisateur non trouvé");
        }
        if (user.role === "ADMIN") {
          setClinique(adminClinique);
        } else {
          setClinique(
            adminClinique.filter((clin: { id: string }) =>
              user.idCliniques.some((userClin: string | string[]) =>
                userClin.includes(clin.id)
              )
            )
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [modifClientId, idPrestataire]);

  useEffect(() => {
    if (!canUpdate(TableName.CLIENT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      router.push("/dashboard");
    }
  }, [canUpdate, router]);

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

  const onSubmit: SubmitHandler<Client> = async (data) => {
    if (!canUpdate(TableName.CLIENT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }

    const formattedData = {
      ...data,
      dateEnregistrement: new Date(data.dateEnregistrement),
      dateNaissance: new Date(data.dateNaissance),
      idUser: idPrestataire,
      idClinique: data.cliniqueId,
      lieuNaissance: data.lieuNaissance,
      niveauScolaire: data.niveauScolaire,
      ethnie: data.ethnie,
      profession: data.profession,
      serologie: data.serologie,
      sourceInfo: data.sourceInfo,
      quartier: data.quartier,
      statusClient: data.statusClient,
      etatMatrimonial: data.etatMatrimonial,
      codeVih: data.codeVih,
      tel_1: data.tel_1,
      tel_2: data.tel_2,
      populationVulnerable: data.populationVulnerable,
    };
    console.log("formattedData :", formattedData);

    try {
      if (selectedClient) {
        await updateClient(selectedClient.id, formattedData);
        const updatedClient = await getOneClient(modifClientId);
        setSelectedClient(updatedClient as Client);
      }
      toast.success("Client modifié avec succès!");
    } catch (error) {
      toast.error("La modification du client a échoué");
      console.error("Erreur lors de la modification du client:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!canUpdate(TableName.CLIENT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
    if (selectedClient) {
      setValue("lieuNaissance", selectedClient.lieuNaissance);
      setValue("idClinique", selectedClient.idClinique);
      setValue("nom", selectedClient.nom);
      setValue("prenom", selectedClient.prenom);
      setValue("dateNaissance", new Date(selectedClient.dateNaissance));
      setValue("dateEnregistrement", new Date(selectedClient.dateEnregistrement));
      setValue("sexe", selectedClient.sexe);
      setValue("lieuNaissance", selectedClient.lieuNaissance || "");
      setValue("niveauScolaire", selectedClient.niveauScolaire);
      setValue("etatMatrimonial", selectedClient.etatMatrimonial);
      setValue("ethnie", selectedClient.ethnie);
      setValue("profession", selectedClient.profession);
      setValue("quartier", selectedClient.quartier || "");
      setValue("code", selectedClient.code);
      setValue("codeVih", selectedClient.codeVih || "");
      setValue("tel_1", selectedClient.tel_1);
      setValue("tel_2", selectedClient.tel_2 || "");
      setValue("populationVulnerable", selectedClient.populationVulnerable || "non");
      setValue("serologie", selectedClient.serologie);
      setValue("sourceInfo", selectedClient.sourceInfo);
      setValue("statusClient", selectedClient.statusClient);
      setValue("cliniqueId", selectedClient.idClinique);
      setValue("idUser", selectedClient.idUser);

      setIsVisible(true);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <Retour />

      {isVisible ? (
        /* ══════════════════════════════════════════════
           ═══  EDIT MODE
           ══════════════════════════════════════════════ */
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-orange-500/25">
              <Pencil className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Modifier le client</h2>
              <p className="text-sm text-gray-400">
                {selectedClient?.nom} {selectedClient?.prenom}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">

                  {/* ═══ Section: Enregistrement ═══ */}
                  {sectionHeader(
                    <Building2 className="h-4 w-4 text-blue-600" />,
                    "Enregistrement",
                    "blue"
                  )}

                  {/* 1. Clinique */}
                  <div>
                    {fieldLabel("Clinique", true)}
                    <select
                      {...register("cliniqueId", { required: "Clinique est requise" })}
                      className={selectClass}
                      name="cliniqueId"
                      value={watch("cliniqueId") || ""}
                      onChange={(e) => setValue("cliniqueId", e.target.value)}
                    >
                      <option value="" disabled>Sélectionner une clinique</option>
                      {clinique.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.nomClinique}
                        </option>
                      ))}
                    </select>
                    {errors.cliniqueId && (
                      <span className={errorClass}>{errors.cliniqueId.message}</span>
                    )}
                  </div>

                  {/* 2. Date d'enregistrement */}
                  <div>
                    {fieldLabel("Date d'enregistrement", true)}
                    <input
                      {...register("dateEnregistrement", { required: "Date est requise" })}
                      className={dateInputClass}
                      type="date"
                      name="dateEnregistrement"
                    />
                    {errors.dateEnregistrement && (
                      <span className={errorClass}>{errors.dateEnregistrement.message}</span>
                    )}
                  </div>

                  {/* ═══ Section: Identité ═══ */}
                  {sectionHeader(
                    <UserRound className="h-4 w-4 text-violet-600" />,
                    "Identité",
                    "violet"
                  )}

                  {/* 3. Nom */}
                  <div>
                    {fieldLabel("Nom", true)}
                    <Input
                      {...register("nom", { required: "Nom est requis" })}
                      placeholder="Nom du client"
                      className={`${inputClass} capitalize`}
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
                      className={`${inputClass} capitalize`}
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
                      {...register("dateNaissance", { required: "Date de naissance est requise" })}
                      className={dateInputClass}
                      type="date"
                      name="dateNaissance"
                    />
                    {errors.dateNaissance && (
                      <span className={errorClass}>{errors.dateNaissance.message}</span>
                    )}
                  </div>

                  {/* 6. Sexe */}
                  <div>
                    {fieldLabel("Sexe", true)}
                    <select
                      {...register("sexe", { required: "Sexe est requis" })}
                      className={selectClass}
                      name="sexe"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
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
                    "emerald"
                  )}

                  {/* 7. Lieu de naissance */}
                  <div>
                    {fieldLabel("Lieu de naissance")}
                    <Input
                      {...register("lieuNaissance")}
                      placeholder="Lieu de naissance"
                      className={`${inputClass} capitalize`}
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
                      defaultValue=""
                    />
                  </div>

                  {/* ═══ Section: Situation socio-démographique ═══ */}
                  {sectionHeader(
                    <GraduationCap className="h-4 w-4 text-amber-600" />,
                    "Situation socio-démographique",
                    "amber"
                  )}

                  {/* 9. Niveau scolaire */}
                  <div>
                    {fieldLabel("Niveau scolaire")}
                    <select
                      {...register("niveauScolaire", { required: "Niveau scolaire est requis" })}
                      className={selectClass}
                      name="niveauScolaire"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
                      {niveauScolaireOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.niveauScolaire && (
                      <span className={errorClass}>{errors.niveauScolaire.message}</span>
                    )}
                  </div>

                  {/* 10. État matrimonial */}
                  <div>
                    {fieldLabel("État matrimonial", true)}
                    <select
                      {...register("etatMatrimonial", { required: "État matrimonial est requis" })}
                      className={selectClass}
                      name="etatMatrimonial"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
                      {etatMatrimonialOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.etatMatrimonial && (
                      <span className={errorClass}>{errors.etatMatrimonial.message}</span>
                    )}
                  </div>

                  {/* 11. Ethnie */}
                  <div>
                    {fieldLabel("Ethnie", true)}
                    <select
                      {...register("ethnie", { required: "Ethnie est requise" })}
                      className={selectClass}
                      name="ethnie"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
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
                      {...register("profession", { required: "Profession est requise" })}
                      className={selectClass}
                      name="profession"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
                      {professionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.profession && (
                      <span className={errorClass}>{errors.profession.message}</span>
                    )}
                  </div>

                  {/* ═══ Section: Contact ═══ */}
                  {sectionHeader(
                    <Phone className="h-4 w-4 text-sky-600" />,
                    "Contact",
                    "sky"
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
                    "indigo"
                  )}

                  {/* 15. Code */}
                  <div>
                    {fieldLabel("Code", true)}
                    <div className="relative">
                      <Input
                        {...register("code", { required: "Code est requis" })}
                        placeholder="AB/CA01/2025/01/00001-XXX"
                        className={`${inputClass} uppercase pr-10`}
                        name="code"
                        readOnly
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                        <BadgePlus className="h-5 w-5" />
                      </span>
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
                    "rose"
                  )}

                  {/* 17. Sérologie */}
                  <div>
                    {fieldLabel("Sérologie", true)}
                    <select
                      {...register("serologie", { required: "Sérologie est requise" })}
                      className={selectClass}
                      name="serologie"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
                      {serologieOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.serologie && (
                      <span className={errorClass}>{errors.serologie.message}</span>
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
                      {...register("sourceInfo", { required: "Source d'information est requise" })}
                      className={selectClass}
                      name="sourceInfo"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
                      {sourceInfoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.sourceInfo && (
                      <span className={errorClass}>{errors.sourceInfo.message}</span>
                    )}
                  </div>

                  {/* 20. Statut client */}
                  <div>
                    {fieldLabel("Statut client", true)}
                    <select
                      {...register("statusClient", { required: "Statut client est requis" })}
                      className={selectClass}
                      name="statusClient"
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner</option>
                      {statusClientOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.statusClient && (
                      <span className={errorClass}>{errors.statusClient.message}</span>
                    )}
                  </div>

                  {/* Hidden fields */}
                  <Input type="hidden" name="idUser" value={idPrestataire} />
                  <Input type="hidden" name="idClinique" value={watch("cliniqueId") || ""} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Les champs marqués * sont obligatoires
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsVisible(false)}
                      disabled={isSubmitting}
                      className="h-10 px-5 rounded-lg"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
                    >
                      {isSubmitting && <SpinnerCustom className="mr-2 text-white/60" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* ══════════════════════════════════════════════
           ═══  DISPLAY MODE
           ══════════════════════════════════════════════ */
        <div className="max-w-3xl mx-auto">
          {!selectedClient ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {/* Client header card */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">
                      {selectedClient.nom} {selectedClient.prenom}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(selectedClient.dateNaissance).toLocaleDateString("fr-FR")}
                        {" "}({Math.floor((new Date().getTime() - new Date(selectedClient.dateNaissance).getTime()) / (1000 * 60 * 60 * 24 * 365))} ans)
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-xs text-white/60">{selectedClient.sexe}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white/90 border border-white/10">
                        {selectedClient.code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data grid */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-x-1 gap-y-0">

                  {displaySectionHeader(
                    <UserRound className="h-3.5 w-3.5 text-violet-600" />,
                    "Identité",
                    "violet"
                  )}
                  {displayRow("Nom", selectedClient.nom)}
                  {displayRow("Prénom", selectedClient.prenom)}
                  {displayRow("Date de naissance",
                    `${new Date(selectedClient.dateNaissance).toLocaleDateString("fr-FR")} (${Math.floor((new Date().getTime() - new Date(selectedClient.dateNaissance).getTime()) / (1000 * 60 * 60 * 24 * 365))} ans)`
                  )}
                  {displayRow("Sexe", selectedClient.sexe)}

                  {displaySectionHeader(
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />,
                    "Localisation",
                    "emerald"
                  )}
                  {displayRow("Lieu de naissance", selectedClient.lieuNaissance)}
                  {displayRow("Quartier", selectedClient.quartier)}

                  {displaySectionHeader(
                    <Phone className="h-3.5 w-3.5 text-sky-600" />,
                    "Contact",
                    "sky"
                  )}
                  {displayRow("Téléphone 1", selectedClient.tel_1)}
                  {displayRow("Téléphone 2", selectedClient.tel_2)}

                  {displaySectionHeader(
                    <Hash className="h-3.5 w-3.5 text-indigo-600" />,
                    "Identification",
                    "indigo"
                  )}
                  {displayRow("Code", selectedClient.code)}
                  {displayRow("Code VIH", selectedClient.codeVih)}

                  {displaySectionHeader(
                    <GraduationCap className="h-3.5 w-3.5 text-amber-600" />,
                    "Socio-professionnel",
                    "amber"
                  )}
                  {displayRow("Profession", selectedClient.profession)}
                  {displayRow("État matrimonial",
                    etatMatrimonialOptions.find((e) => e.value === selectedClient.etatMatrimonial)?.label
                  )}
                  {displayRow("Niveau scolaire",
                    niveauScolaireOptions.find((n) => n.value === selectedClient.niveauScolaire)?.label
                  )}
                  {displayRow("Ethnie",
                    ethnieOptions.find((e) => e.value === selectedClient.ethnie)?.label || selectedClient.ethnie
                  )}

                  {displaySectionHeader(
                    <HeartPulse className="h-3.5 w-3.5 text-rose-600" />,
                    "Santé & Statut",
                    "rose"
                  )}
                  {displayRow("Sérologie VIH", selectedClient.serologie)}
                  {displayRow("Population vulnérable",
                    populationVulnerableOptions.find((p) => p.value === selectedClient.populationVulnerable)?.label || "Non"
                  )}
                  {displayRow("Statut client", selectedClient.statusClient)}
                  {displayRow("Source d'information",
                    sourceInfoOptions.find((s) => s.value === selectedClient.sourceInfo)?.label || selectedClient.sourceInfo
                  )}
                </div>
              </div>

              {/* Action footer */}
              <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={router.back}
                  className="h-10 px-5 rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Retour
                </Button>
                <Button
                  onClick={handleUpdateClient}
                  className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
