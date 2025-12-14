"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getOneGrossesse } from "@/lib/actions/grossesseActions";
import {
  getOneAccouchement,
  updateAccouchement,
} from "@/lib/actions/accouchementActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  Accouchement,
  Grossesse,
  Permission,
  TableName,
  User,
  Visite,
} from "@prisma/client";
import { Button } from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import ConstanteClient from "@/components/constanteClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/components/ClientContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
// import { Checkbox } from "@/components/ui/checkbox";

type Option = {
  value: string;
  label: string;
};
const tabTypeEvacuation = [
  { value: "avant", label: "Avant l'accouchement" },
  { value: "pendant", label: "Pendant l'accouchement" },
  { value: "apres", label: "Après l'accouchement" },
];
const tabVat = [
  { value: "non", label: "Non Vaccinée" },
  { value: "incomplet", label: "Incomplètement Vaccinée" },
  { value: "complet", label: "Complètement Vaccinée" },
];
const tabLieu = [
  { value: "etablissement", label: "Dans l'établissement" },
  { value: "domicile", label: "A domicile" },
];
const tabEvacuationEfant = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
const tabEtatNaissance = [
  { value: "terme", label: "A terme" },
  { value: "premature", label: "Prématuré" },
  { value: "postTerme", label: "Post Terme" },
];
// modifAccouchementId
export default function ModifAccouchemtPage({
  params,
}: {
  params: Promise<{ modifAccouchementId: string }>;
}) {
  const { modifAccouchementId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossesses, setGrossesses] = useState<Grossesse>();
  const [selectedAccouchement, setSelectedAccouchement] =
    useState<Accouchement>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOneAllPrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setOneAllPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);
  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string; }) => p.table === TableName.ACCOUCHEMENT
        );
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'accéder à cette page.");
        //   router.back();
        // }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [onePrescripteur]);

  useEffect(() => {
    const fetchData = async () => {
      const oneAccouchement = await getOneAccouchement(modifAccouchementId);
      setSelectedAccouchement(oneAccouchement as Accouchement);

      const oneUser = await getOneUser(
        oneAccouchement?.accouchementIdUser as string
      );
      setPrescripteur(oneUser?.name);

      if (oneAccouchement) {
        const oneGrossesse = await getOneGrossesse(
          oneAccouchement.accouchementIdGrossesse
        );
        setGrossesses(oneGrossesse as Grossesse);
        const result = await getAllVisiteByIdClient(
          oneAccouchement.accouchementIdClient
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneAccouchement.accouchementIdVisite
        );

        const cliniqueClient = await getOneClient(
          oneAccouchement.accouchementIdClient
        );
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string; }) => r.id === oneAccouchement.accouchementIdVisite)
        ); // Use oneAccouchement instead of selectedAccouchement
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneAccouchement.accouchementIdClient); // Use oneAccouchement instead of selectedAccouchement
      }
    };
    fetchData();
  }, [modifAccouchementId, setSelectedClientId]);

  const form = useForm<Accouchement>();
  const onSubmit: SubmitHandler<Accouchement> = async (data) => {
    const formattedData = {
      ...data,
      accouchementIdUser: form.getValues("accouchementIdUser"),
      accouchementIdClinique:
        (selectedAccouchement?.accouchementIdClinique as string) || "",
      //   selectedAccouchement?.accouchementIdGrossesse ?? "",
      accouchementIdClient: selectedAccouchement?.accouchementIdClient ?? "",
      accouchementConsultation: true,
      accouchementMultiple: form.getValues("accouchementMultiple") ?? "non",
      accouchementComplications:
        form.getValues("accouchementComplications") ?? "non",
      accouchementEvacuationMere:
        form.getValues("accouchementEvacuationMere") ?? "non",
      accouchementEvacuationEnfant:
        form.getValues("accouchementEvacuationEnfant") ?? "non",
      accouchementEnfantVivant:
        parseInt(data.accouchementEnfantVivant as unknown as string, 10) || 0,
      accouchementEnfantMortNeFrais:
        parseInt(data.accouchementEnfantMortNeFrais as unknown as string, 10) ||
        0,
      accouchementEnfantMortNeMacere:
        parseInt(
          data.accouchementEnfantMortNeMacere as unknown as string,
          10
        ) || 0,
      accouchementNbPoidsEfantVivant:
        parseInt(
          data.accouchementNbPoidsEfantVivant as unknown as string,
          10
        ) || 0,
    };

    try {
      if (selectedAccouchement) {
        console.log(formattedData);
        await updateAccouchement(selectedAccouchement.id, formattedData);
        const oneAccouchement = await getOneAccouchement(modifAccouchementId);
        setSelectedAccouchement(oneAccouchement as Accouchement);
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La modification du formulaire a échoué");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameValue = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un accouchement. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedAccouchement) {
      form.setValue(
        "accouchementIdVisite",
        selectedAccouchement.accouchementIdVisite
      );
      form.setValue(
        "accouchementIdClient",
        selectedAccouchement.accouchementIdClient
      );
      form.setValue(
        "accouchementIdUser",
        selectedAccouchement.accouchementIdUser
      );
      form.setValue(
        "accouchementIdGrossesse",
        selectedAccouchement.accouchementIdGrossesse
      );
      form.setValue(
        "accouchementMultiple",
        selectedAccouchement.accouchementMultiple
      );
      form.setValue(
        "accouchementComplications",
        selectedAccouchement.accouchementComplications
      );
      form.setValue(
        "accouchementEnfantMortNeFrais",
        selectedAccouchement.accouchementEnfantMortNeFrais
      );
      form.setValue(
        "accouchementEnfantVivant",
        selectedAccouchement.accouchementEnfantVivant
      );
      form.setValue(
        "accouchementEnfantMortNeMacere",
        selectedAccouchement.accouchementEnfantMortNeMacere
      );
      form.setValue(
        "accouchementEtatNaissance",
        selectedAccouchement.accouchementEtatNaissance
      );
      form.setValue(
        "accouchementEvacuationEnfant",
        selectedAccouchement.accouchementEvacuationEnfant
      );
      form.setValue(
        "accouchementEvacuationMere",
        selectedAccouchement.accouchementEvacuationMere
      );
      form.setValue("accouchementLieu", selectedAccouchement.accouchementLieu);
      form.setValue(
        "accouchementNbPoidsEfantVivant",
        selectedAccouchement.accouchementNbPoidsEfantVivant
      );
      form.setValue(
        "accouchementStatutVat",
        selectedAccouchement.accouchementStatutVat
      );
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-6xl mx-auto px-4 py-2 border rounded-md">
      {selectedAccouchement && (
        <ConstanteClient idVisite={selectedAccouchement.accouchementIdVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            {`Formulaire de modification de Consultation Obstétricale`}
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-100 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="accouchementIdVisite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selectionnez la visite</FormLabel>
                      <Select required onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Visite à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {visites.map((visite, index) => (
                            <SelectItem key={index} value={visite.id}>
                              {new Date(visite.dateVisite).toLocaleDateString(
                                "fr-FR"
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {grossesses && (
                  <FormField
                    control={form.control}
                    name="accouchementIdGrossesse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">
                          Selectionnez la grossesse
                        </FormLabel>
                        <Select required onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Visite à sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={grossesses.id}>
                              {grossesses.grossesseDdr &&
                                new Date(
                                  grossesses.grossesseDdr
                                ).toLocaleDateString("fr-FR")}{" "}
                              -{" "}
                              {grossesses.termePrevu &&
                                new Date(
                                  grossesses.termePrevu
                                ).toLocaleDateString("fr-FR")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="accouchementLieu"
                  render={({ field }) => (
                    <FormItem className="  pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">{`Lieu de l'accouchement :`}</FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className=" gap-x-5 items-center"
                        >
                          {tabLieu.map((option) => (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="mb-3" />
                <FormField
                  control={form.control}
                  name="accouchementStatutVat"
                  render={({ field }) => (
                    <FormItem className="  pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">
                          Statut Vaccinal :
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="grid grid-cols-1 items-center"
                        >
                          {tabVat.map((option) => (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="mb-3" />
                <FormField
                  control={form.control}
                  name="accouchementComplications"
                  render={({ field }) => (
                    <FormItem className=" flex justify-between pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">Complications:</FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? "non"}
                          className=" gap-x-5 items-center"
                        >
                          {tabEvacuationEfant.map((option) => (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <AnimatePresence>
                  {form.watch("accouchementComplications") === "oui" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div>
                        <Separator className="mb-3" />
                        <FormField
                          control={form.control}
                          name="accouchementEvacuationMere"
                          render={({ field }) => (
                            <FormItem className=" flex justify-between pb-4">
                              <div className="text-xl font-bold flex justify-between items-center">
                                <FormLabel className="ml-4 text-red-500">
                                  Evacuation de la mère:
                                </FormLabel>
                              </div>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                  className=" gap-x-5 items-center"
                                >
                                  {tabEvacuationEfant.map((option) => (
                                    <FormItem
                                      key={option.value}
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <RadioGroupItem value={option.value} />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {option.label}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {form.watch("accouchementEvacuationMere") === "oui" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mb-4">
                        <Separator />
                        <FormField
                          control={form.control}
                          name="accouchementTypeEvacuation"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel className="font-medium text-red-500">
                                {"Sélectionnez le type d'évacuation:"}
                              </FormLabel>
                              <Select onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Type d'évacuation à sélectionner" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tabTypeEvacuation.map((option, index) => (
                                    <SelectItem
                                      key={index}
                                      value={option.value}
                                      className="text-blue-600"
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Separator />
                <FormField
                  control={form.control}
                  name="accouchementEvacuationEnfant"
                  render={({ field }) => (
                    <FormItem className="flex justify-between  pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">
                          Evacuation des nouveaux Nés :
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? "non"}
                          className=" gap-x-5 items-center"
                        >
                          {tabEvacuationEfant.map((option) => (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <FormField
                  control={form.control}
                  name="accouchementMultiple"
                  render={({ field }) => (
                    <FormItem className=" flex justify-between pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">
                          Accouchement Multiple:
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? "non"}
                          className=" gap-x-5 items-center"
                        >
                          {tabEvacuationEfant.map((option) => (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                {/* <Separator className="my-3" /> */}
                <FormField
                  control={form.control}
                  name="accouchementEtatNaissance"
                  render={({ field }) => (
                    <FormItem className="flex justify-between pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4">Etat Naissance :</FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="gap-x-5 grid grid-cols-1"
                        >
                          {tabEtatNaissance.map((option) => (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="mb-2" />
                <FormField
                  control={form.control}
                  name="accouchementEnfantVivant"
                  render={({ field }) => (
                    <FormItem className="flex items-center ml-4">
                      <FormLabel className="flex-1">Vivant :</FormLabel>
                      <FormControl>
                        <Input
                          className="flex-1"
                          required
                          type="number"
                          {...field}
                          value={field.value ?? 1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accouchementEnfantMortNeFrais"
                  render={({ field }) => (
                    <FormItem className="flex items-center ml-4">
                      <FormLabel className="flex-1">Mort Né Frais :</FormLabel>
                      <FormControl>
                        <Input
                          className="flex-1"
                          type="number"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accouchementEnfantMortNeMacere"
                  render={({ field }) => (
                    <FormItem className="flex items-center ml-4">
                      <FormLabel className="flex-1">Macéré :</FormLabel>
                      <FormControl>
                        <Input
                          className="flex-1"
                          type="number"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accouchementNbPoidsEfantVivant"
                  render={({ field }) => (
                    <FormItem className="flex items-center ml-4">
                      <FormLabel className="flex-1">
                        nb enfant vivant dont
                        <br /> {`le poids < 2500g :`}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="flex-1"
                          type="number"
                          {...field}
                          value={field.value ?? 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accouchementIdClient"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} className="hidden" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isPrescripteur === true ? (
                <FormField
                  control={form.control}
                  name="accouchementIdUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={idUser} className="hidden" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="accouchementIdUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Selectionnez le precripteur
                      </FormLabel>
                      <Select
                        required
                        // value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Prescripteur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allPrescripteur.map((prescripteur, index) => (
                            <SelectItem key={index} value={prescripteur.id}>
                              <span>{prescripteur.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="mt-4">
                {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedAccouchement ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                {selectedAccouchement && <span>Date de visite : </span>}
              </div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>
              <div>
                {selectedAccouchement && <span>Période de Grossesse : </span>}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEtatNaissance !== null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementEtatNaissance,
                        tabEtatNaissance
                      )}
                    </span>
                  )}
              </div>
              <div>
                {dateVisite && grossesses && grossesses.grossesseDdr && (
                  <span>DdR - Terme prévu : </span>
                )}
              </div>
              <div>
                {dateVisite &&
                  grossesses &&
                  grossesses.grossesseDdr &&
                  new Date(grossesses.grossesseDdr).toLocaleDateString(
                    "fr-FR"
                  )}{" "}
                {grossesses && grossesses.grossesseDdr && <span>-</span>}{" "}
                {dateVisite &&
                  grossesses &&
                  grossesses.termePrevu &&
                  new Date(grossesses.termePrevu).toLocaleDateString("fr-FR")}
              </div>
              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementLieu !== null && (
                    <span>{"Lieu d'Accouchement : "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementLieu !== null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementLieu,
                        tabLieu
                      )}
                    </span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementStatutVat !== null && (
                    <span>{"Statut Vaccinal : "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementStatutVat !== null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementStatutVat,
                        tabVat
                      )}
                    </span>
                  )}
              </div>
              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementComplications !== null && (
                    <span>{"Complications : "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementComplications !== null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementComplications,
                        tabEvacuationEfant
                      )}
                    </span>
                  )}
              </div>
              <div>
                <span>{"Evacuation de la mère : "}</span>
              </div>
              <div>
                {selectedAccouchement &&
                // selectedAccouchement.complications !== "oui" &&
                selectedAccouchement.accouchementEvacuationMere === "oui" ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementTypeEvacuation !== null && (
                    <span>{"Période d'Evacuation de la mère : "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement && (
                  <span>
                    {selectedAccouchement.accouchementTypeEvacuation !==
                      null && (
                      <span>
                        {renameValue(
                          selectedAccouchement.accouchementTypeEvacuation,
                          tabTypeEvacuation
                        )}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* <div>
                <span>Evacuation des nouveaux Nés : </span>
              </div> */}
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEvacuationEnfant !==
                    null && <span>{"Evacuation des nouveaux Nés "}</span>}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEvacuationEnfant !==
                    null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementEvacuationEnfant,
                        tabEvacuationEfant
                      )}
                    </span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementMultiple !== null && (
                    <span>{"Accouchement Multiple: "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementMultiple !== null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementMultiple,
                        tabEvacuationEfant
                      )}
                    </span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEtatNaissance !== null && (
                    <span>{"Etat Naissance : "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEtatNaissance !== null && (
                    <span>
                      {renameValue(
                        selectedAccouchement.accouchementEtatNaissance,
                        tabEtatNaissance
                      )}
                    </span>
                  )}
              </div>
              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEtatNaissance !== null && (
                    <span>{"Enfants Nés Vivant : "}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEnfantVivant !== null && (
                    <span>{selectedAccouchement.accouchementEnfantVivant}</span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEnfantMortNeFrais !==
                    null && <span>{"Enfants Morts Nés Frais : "}</span>}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEnfantMortNeFrais !==
                    null && (
                    <span>
                      {selectedAccouchement.accouchementEnfantMortNeFrais}
                    </span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEnfantMortNeMacere !==
                    null && <span>{"Enfants Morts Macéré : "}</span>}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementEnfantMortNeMacere !==
                    null && (
                    <span>
                      {selectedAccouchement.accouchementEnfantMortNeMacere}
                    </span>
                  )}
              </div>
              <div>
                {selectedAccouchement &&
                  selectedAccouchement.accouchementNbPoidsEfantVivant >= 0 && (
                    <span>{"Nb Enfants vivant dont le poids < 2500g: "}</span>
                  )}
              </div>
              <div>{selectedAccouchement.accouchementNbPoidsEfantVivant}</div>

              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>
              <div>
                {prescripteur && (
                  <small className="italic">Prescripteur :</small>
                )}
              </div>
              <div>
                {prescripteur && (
                  <small className="italic">{prescripteur}</small>
                )}
              </div>
              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>
              <div className="col-span-2 flex flex-row justify-center">
                <Button onClick={handleUpdateVisite}>Modifier</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
