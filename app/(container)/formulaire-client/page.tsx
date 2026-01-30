// formulaire-client
"use client";
import { BadgePlus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Client, Permission, TableName, User } from "@prisma/client";

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
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneUser } from "@/lib/actions/authActions";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import Retour from "@/components/retour";

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

export default function FormulaireClient() {
  const { data: session, status } = useSession();
  const [clinique, setClinique] = useState<CliniqueData[]>([]);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [region, setRegion] = useState<RegionData[]>([]);
  const [newCode, setNewCode] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const idPrestataire = session?.user.id as string;
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return format(today, "yyyy-MM-dd");
  });

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = await getOneUser(idPrestataire);
      setOneUser(user);
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }
      const adminClinique = await getAllClinique();

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

      const allRegion = await getAllRegion();
      setRegion(allRegion);
    };
    fetchData();
  }, [idPrestataire]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: Permission) => p.table === TableName.CLIENT,
        );
        setPermission(perm || null);

        if (perm?.canRead || oneUser.role === "ADMIN") {
        } else {
          alert("Vous n'avez pas la permission d'accéder à cette page.");
          router.back();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error,
        );
      }
    };

    fetchPermissions();
  }, [oneUser]);

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Client>({
    defaultValues: {
      cliniqueId: "", // Initialisez avec une valeur vide
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
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un client. Contactez un administrateur.",
      );
      return router.back();
    }
    if (!prenom || !selectedRegion || !selectedClinique) {
      alert(
        "Veuillez remplir la région, la clinique et le prénom avant de générer un code.",
      );
      return;
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    // Nettoyage du prénom : suppression des accents et des caractères spéciaux
    const cleanPrenom = prenom
      .normalize("NFD") // transforme les caractères accentués en lettres + accents séparés
      .replace(/[\u0300-\u036f]/g, "") // supprime les accents
      .replace(/[^a-zA-Z]/g, ""); // supprime tout sauf les lettres

    const initials = cleanPrenom.slice(0, 3).toUpperCase();

    try {
      const { counter } = await fetchIncrementCounter(clinic, year);
      const increment = String(counter).padStart(5, "0");
      const codes = `${selectedRegion.codeRegion}/${selectedClinique.codeClinique}${selectedClinique.numClinique}/${year}/${month}/${increment}-${initials}`;

      setValue("code", codes);
      toast.success(codes);
      setNewCode(true);
    } catch (error) {
      toast.error("Erreur lors de la génération du code :");
      console.error("Erreur lors de la génération du code :", error);
    }
  };

  const onSubmit: SubmitHandler<Client> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un client. Contactez un administrateur.",
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      dateEnregistrement: new Date(data.dateEnregistrement),
      dateNaissance: new Date(data.dateNaissance),
      idUser: idPrestataire,
      idClinique: clinic,
    };

    console.log("formattedData : ", formattedData);
    try {
      await createClient(formattedData as Client);
      // setBtnSubmit(true);
    } catch (error) {
      console.error("Erreur lors de la création du client:", error);
    } finally {
      // setBtnSubmit(false);
      // router.refresh();
      router.push("/client");
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }
  if (status === "authenticated") {
    return (
      <React.Fragment>
        <div className="w-full relative">
          <Retour />
          <div>
            <h2 className="text-center text-xl font-bold uppercase">
              Formulaire de création d un client
            </h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 max-w-225 mx-auto p-4 border rounded-md bg-white"
            >
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="w-full flex gap-4 justify-between items-center">
                  <div className="w-full">
                    <label className="block text-sm font-medium">
                      Clinique<sup className="text-red-600 font-black">*</sup>
                    </label>
                    <select
                      {...register("cliniqueId", {
                        required: "Clinique est requise",
                      })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {clinique.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.nomClinique}
                        </option>
                      ))}
                    </select>
                    {errors.cliniqueId && (
                      <span className="text-red-500 text-sm">
                        {errors.cliniqueId.message}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Date d enregistrement
                    <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <input
                    {...register("dateEnregistrement", {
                      required: "Date est requise",
                    })}
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="mt-1 p-1 w-full rounded-md border border-slate-200"
                    type="date"
                    name="dateEnregistrement"
                  />
                  {errors.dateEnregistrement && (
                    <span className="text-red-500 text-sm">
                      {errors.dateEnregistrement.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Nom<sup className="text-red-600 font-black">*</sup>
                  </label>
                  <Input
                    {...register("nom", { required: "Nom est requis" })}
                    placeholder="Nom"
                    className="mt-1 capitalize"
                    name="nom"
                  />
                  {errors.nom && (
                    <span className="text-red-500 text-sm">
                      {errors.nom.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Prénom<sup className="text-red-600 font-black">*</sup>
                  </label>
                  <Input
                    {...register("prenom", { required: "Prénom est requis" })}
                    placeholder="Prénom"
                    className="mt-1 capitalize"
                    name="prenom"
                  />
                  {errors.prenom && (
                    <span className="text-red-500 text-sm">
                      {errors.prenom.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Date de naissance
                    <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <input
                    {...register("dateNaissance", {
                      required: "Date de naissance est requise",
                    })}
                    className="mt-1 p-1 w-full rounded-md border border-slate-200"
                    type="date"
                    name="dateNaissance"
                  />
                  {errors.dateNaissance && (
                    <span className="text-red-500 text-sm">
                      {errors.dateNaissance.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Sexe<sup className="text-red-600 font-black">*</sup>
                  </label>
                  <select
                    {...register("sexe", { required: "Sexe est requis" })}
                    className="w-full p-2 border rounded-md"
                    name="sexe"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {sexeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.sexe && (
                    <span className="text-red-500 text-sm">
                      {errors.sexe.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Lieu de naissance
                  </label>
                  <Input
                    {...register("lieuNaissance")}
                    placeholder="Lieu de naissance"
                    className="mt-1 capitalize"
                    name="lieuNaissance"
                    defaultValue={""}
                  />
                  {/* {errors.lieuNaissance && (
                  <span className="text-red-500 text-sm">
                    {errors.lieuNaissance.message}
                  </span>
                )} */}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Niveau scolaire
                  </label>
                  <select
                    {...register("niveauScolaire", {
                      required: "Niveau scolaire est requis",
                    })}
                    className="w-full p-2 border rounded-md"
                    name="niveauScolaire"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {niveauScolaireOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.niveauScolaire && (
                    <span className="text-red-500 text-sm">
                      {errors.niveauScolaire.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    État matrimonial
                    <sup className="text-red-600 font-black"> *</sup>
                  </label>
                  <select
                    {...register("etatMatrimonial", {
                      required: "État matrimonial est requis",
                    })}
                    className="w-full p-2 border rounded-md"
                    name="etatMatrimonial"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {etatMatrimonialOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.etatMatrimonial && (
                    <span className="text-red-500 text-sm">
                      {errors.etatMatrimonial.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Ethnie <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <select
                    {...register("ethnie", { required: "Ethnie est requise" })}
                    className="w-full p-2 border rounded-md"
                    name="ethnie"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {ethnieOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.ethnie && (
                    <span className="text-red-500 text-sm">
                      {errors.ethnie.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Profession <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <select
                    {...register("profession", {
                      required: "Profession est requise",
                    })}
                    className="w-full p-2 border rounded-md"
                    name="profession"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {professionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.profession && (
                    <span className="text-red-500 text-sm">
                      {errors.profession.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Quartier</label>
                  {/* quartier n'est pas obligatoire */}
                  <Input
                    {...register("quartier")}
                    placeholder="Quartier"
                    className="mt-1 capitalize"
                    name="quartier"
                    defaultValue={""}
                  />
                  {/* {errors.quartier && (
                  <span className="text-red-500 text-sm">
                    {errors.quartier.message}
                  </span>
                )} */}
                </div>
                <div>
                  <label className="block text-sm font-medium ">
                    Code<sup className="text-red-600 font-black">*</sup>
                  </label>
                  <div className="flex relative -m-1.25">
                    <Input
                      {...register("code", { required: "Code est requis" })}
                      placeholder="AB/CA01/2025/01/00001-XXX"
                      className="mt-1 uppercase"
                      name="code"
                    />
                    <span className="absolute right-1 top-2.5">
                      {!newCode ? (
                        <BadgePlus
                          onClick={() => handleGenerateCode()}
                          className="text-slate-800   font-bold text-3xl  cursor-pointer transition-all duration-300 scale-110 active:text-blue-900"
                        />
                      ) : (
                        <BadgePlus className="text-blue-800   font-bold text-3xl" />
                      )}
                    </span>
                  </div>
                  {errors.code && (
                    <span className="text-red-500 text-sm">
                      {errors.code.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">Code VIH</label>
                  <Input
                    {...register("codeVih")}
                    placeholder="07060/01/25/00001"
                    className="mt-1"
                    name="codeVih"
                  />
                  {errors.codeVih && (
                    <span className="text-red-500 text-sm">
                      {errors.codeVih.message}
                    </span>
                  )}
                </div>
                <div className="hidden">
                  <label className="block text-sm font-medium">
                    Téléphone 2
                  </label>
                  <Input
                    {...register("tel_2")}
                    placeholder="Téléphone 2"
                    className="mt-1"
                    name="tel_2"
                  />
                  {errors.tel_2?.message && (
                    <span className="text-red-500 text-sm">
                      {errors.tel_2.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Sérologie <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <select
                    {...register("serologie", {
                      required: "Sérologie est requise",
                    })}
                    className="w-full p-2 border rounded-md"
                    name="serologie"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {serologieOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.serologie && (
                    <span className="text-red-500 text-sm">
                      {errors.serologie.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Source d information{" "}
                    <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <select
                    {...register("sourceInfo", {
                      required: "Source d'information est requise",
                    })}
                    className="w-full p-2 border rounded-md"
                    name="sourceInfo"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {sourceInfoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.sourceInfo && (
                    <span className="text-red-500 text-sm">
                      {errors.sourceInfo.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Status client
                    <sup className="text-red-600 font-black">*</sup>
                  </label>
                  <select
                    {...register("statusClient", {
                      required: "Status client est requis",
                    })}
                    className="w-full p-2 border rounded-md"
                    name="statusClient"
                    defaultValue={""}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {statusClientOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.statusClient && (
                    <span className="text-red-500 text-sm">
                      {errors.statusClient.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Téléphone 1<sup className="text-red-600 font-black">*</sup>
                  </label>
                  <Input
                    {...register("tel_1")}
                    placeholder="Téléphone 1"
                    className="mt-1"
                    name="tel_1"
                  />
                  {errors.tel_1 && (
                    <span className="text-red-500 text-sm">
                      {errors.tel_1.message}
                    </span>
                  )}
                </div>

                <div>
                  <Input
                    // className="mt-1 hidden"
                    type="hidden"
                    name="idUser"
                    value={idPrestataire}
                  />
                </div>

                <div>
                  <Input
                    // className="mt-1 hidden"
                    type="hidden"
                    name="idClinique"
                    value={clinic}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isSubmitting}
              >
                <span className="flex flex-row items-center">
                  {isSubmitting && (
                    <SpinnerCustom className="mr-2 text-gray-300" />
                  )}
                  Créer le client
                </span>
              </Button>
            </form>
          </div>
        </div>
      </React.Fragment>
    );
  }
}
