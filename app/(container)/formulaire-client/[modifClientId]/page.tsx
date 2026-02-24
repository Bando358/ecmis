"use client";
import { BadgePlus } from "lucide-react";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Client, TableName, User } from "@prisma/client";
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

export default function ModifFormulaireClient({
  params,
}: {
  params: Promise<{ modifClientId: string }>;
}) {
  const { modifClientId } = use(params);
  const [selectedClient, setSelectedClient] = useState<Client>();
  const [clinique, setClinique] = useState<CliniqueData[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();
  const { canUpdate } = usePermissionContext();
  const idPrestataire = session?.user.id as string;

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idPrestataire);
      setOnePrescripteur(user);
    };
    fetUser();
  }, [idPrestataire]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const client = await getOneClient(modifClientId);
        setSelectedClient(client as Client);

        if (!onePrescripteur) {
          throw new Error("Utilisateur non trouvé");
        }
        const adminClinique = await getAllClinique();

        if (onePrescripteur && onePrescripteur?.role === "ADMIN") {
          setClinique(adminClinique);
        } else {
          // Récupérer les cliniques associées à l'utilisateur en vérifiant user.idCliniques[] dans adminClinique
          setClinique(
            adminClinique.filter((clin: { id: string }) =>
              onePrescripteur.idCliniques.some((userClin: string | string[]) =>
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

    if (onePrescripteur) {
      fetchData();
    }
  }, [modifClientId, idPrestataire, onePrescripteur]);

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
      cliniqueId: "", // Initialisez avec une valeur vide
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
    };
    console.log("formattedData :", formattedData);

    try {
      if (selectedClient) {
        await updateClient(selectedClient.id, formattedData);
        const updatedClient = await getOneClient(modifClientId);
        setSelectedClient(updatedClient as Client);
      }

      toast.success("Client modifié avec succès! 🎉");
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
      setValue(
        "dateEnregistrement",
        new Date(selectedClient.dateEnregistrement)
      );
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
      <div className="flex flex-col w-full justify-center max-w-225 mx-auto px-4 py-2 border rounded-md">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <Retour />
      <div className="flex flex-col  justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
        {isVisible ? (
          <>
            <h2 className="text-2xl text-gray-600 font-black text-center mb-6">
              Formulaire de modification du client
            </h2>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 max-w-225 mx-auto p-4 border rounded-md bg-stone-50 opacity-90"
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
                      name="cliniqueId"
                      value={watch("cliniqueId") || ""} // ✅ pas defaultValue
                      onChange={(e) => setValue("cliniqueId", e.target.value)} // force la synchro
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
                    defaultValue={""}
                  />
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
                  <Input
                    {...register("quartier")}
                    placeholder="Quartier"
                    className="mt-1 capitalize"
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
                      readOnly
                    />
                    <span className="absolute right-1 top-2.5">
                      <BadgePlus className="text-slate-800   font-bold text-3xl" />
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
                    value={watch("cliniqueId") || ""}
                  />
                </div>
              </div>

              <div className="flex flex-row  justify-center items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVisible(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  // className="w-full mt-6"
                  disabled={isSubmitting}
                >
                  <span className="flex flex-row items-center gap-2">
                    {isSubmitting && (
                      <SpinnerCustom className="mr-2 text-gray-300" />
                    )}
                    Modifier le client
                  </span>
                </Button>
              </div>
            </form>
            {/* </Form> */}
          </>
        ) : (
          <div className="flex flex-col gap-4 max-w-150 mx-auto p-6 bg-white/40 shadow-md rounded-lg">
            {!selectedClient ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-62.5" />
                  <Skeleton className="h-4 w-50" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span>Nom : </span>
                </div>
                <div>
                  <span>{selectedClient.nom}</span>
                </div>

                <div>
                  <span>Prénom : </span>
                </div>
                <div>
                  <span>{selectedClient.prenom}</span>
                </div>

                <div>
                  <span>Date de naissance : </span>
                </div>
                <div>
                  <span>
                    {`${new Date(
                      selectedClient.dateNaissance
                    ).toLocaleDateString("fr-FR")} (${Math.floor(
                      (new Date().getTime() -
                        new Date(selectedClient.dateNaissance).getTime()) /
                        (1000 * 60 * 60 * 24 * 365)
                    )} ans)`}
                  </span>
                </div>

                <div>
                  <span>Sexe : </span>
                </div>
                <div>
                  <span>{selectedClient.sexe}</span>
                </div>
                <div>
                  <span>Lieu de naissance : </span>
                </div>
                <div>
                  <span>
                    {selectedClient.lieuNaissance
                      ? selectedClient.lieuNaissance
                      : "Inconnu"}
                  </span>
                </div>
                <div>
                  <span>Quartier : </span>
                </div>
                <div>
                  <span>
                    {selectedClient.quartier
                      ? selectedClient.quartier
                      : "Inconnu"}
                  </span>
                </div>

                <div>
                  <span>Code : </span>
                </div>
                <div>
                  <span>{selectedClient.code}</span>
                </div>

                <div>
                  <span>Téléphone : </span>
                </div>
                <div>
                  <span>{selectedClient.tel_1}</span>
                </div>

                <div>
                  <span>Profession : </span>
                </div>
                <div>
                  <span>{selectedClient.profession}</span>
                </div>

                <div>
                  <span>État matrimonial : </span>
                </div>
                <div>
                  <span>
                    {
                      etatMatrimonialOptions.find(
                        (e) => e.value === selectedClient.etatMatrimonial
                      )?.label
                    }
                  </span>
                </div>
                <div>
                  <span>Sérologie VIH : </span>
                </div>
                <div>
                  <span>
                    {selectedClient.serologie
                      ? selectedClient.serologie
                      : "Inconnu"}
                  </span>
                </div>
                <div>
                  <span>Statut client : </span>
                </div>
                <div>
                  <span>
                    {selectedClient.statusClient
                      ? selectedClient.statusClient
                      : "Inconnu"}
                  </span>
                </div>
                <div>
                  <span>{"Source d'information"} : </span>
                </div>
                <div>
                  <span>
                    {selectedClient.sourceInfo
                      ? selectedClient.sourceInfo
                      : "Inconnu"}
                  </span>
                </div>

                <div className="col-span-2  flex flex-row justify-center gap-2 mt-4">
                  <Button onClick={handleUpdateClient}>Modifier</Button>
                  <Button onClick={router.back}>Retour</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
