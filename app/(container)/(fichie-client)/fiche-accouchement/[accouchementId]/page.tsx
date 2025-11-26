"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

import { toast } from "sonner";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllGrossesseByIdClient,
  updateGrossesse,
} from "@/lib/actions/grossesseActions";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";
import {
  getAllAccouchementByIdClient,
  createAccouchement,
} from "@/lib/actions/accouchementActions";
import { useSession } from "next-auth/react";
import {
  Accouchement,
  Client,
  Grossesse,
  Permission,
  TableName,
  User,
  Visite,
} from "@/lib/generated/prisma";
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
import ConstanteClient from "@/components/constanteClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/components/ClientContext";
import { getOneClient } from "@/lib/actions/clientActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

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
const tabOuiNon = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
const tabEtatNaissance = [
  { value: "terme", label: "A terme" },
  { value: "premature", label: "Prématuré" },
  { value: "postTerme", label: "Post Terme" },
];

export default function AccouchementPage({
  params,
}: {
  params: Promise<{ accouchementId: string }>;
}) {
  const { accouchementId } = use(params);

  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossesses, setGrossesses] = useState<Grossesse[]>([]);
  const [selectedAccouchement, setSelectedAccouchement] = useState<
    Accouchement[]
  >([]);
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(accouchementId);
  }, [accouchementId, setSelectedClientId]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();
  useEffect(() => {
    const prescripteur = session?.user.prescripteur;
    if (prescripteur != undefined) {
      setIsPrescripteur(prescripteur);
    }
  }, [session]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p) => p.table === TableName.ACCOUCHEMENT
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
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const resultAccouchement = await getAllAccouchementByIdClient(
        accouchementId
      );

      setSelectedAccouchement(resultAccouchement as Accouchement[]);
      const result = await getAllVisiteByIdClient(accouchementId);
      setVisites(result as Visite[]);
      const resultGrossesse = await getAllGrossesseByIdClient(accouchementId);
      setGrossesses(resultGrossesse as Grossesse[]);

      const cliniqueClient = await getOneClient(accouchementId);
      setClient(cliniqueClient);
      let allPrestataire: User[] = [];
      if (cliniqueClient?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(
          cliniqueClient.idClinique
        );
      }
      setAllPrescripteur(allPrestataire as User[]);
    };
    fetchData();
  }, [accouchementId]);

  const form = useForm<Accouchement>();
  const onSubmit: SubmitHandler<Accouchement> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un accouchement. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      accouchementIdUser: form.getValues("accouchementIdUser"),
      accouchementIdClient: accouchementId,
      accouchementIdClinique: (client?.idClinique as string) || "",
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

    console.log("Formatted Data:", formattedData);
    try {
      await createAccouchement(formattedData);
      await updateRecapVisite(
        form.watch("accouchementIdVisite"),
        form.watch("accouchementIdUser"),
        "09 Fiche Accouchement"
      );
      const grossesseId = form.getValues("accouchementIdGrossesse");

      if (grossesseId) {
        // Fetch the existing grossesse data
        const existingGrossesse = grossesses.find((g) => g.id === grossesseId);
        if (existingGrossesse) {
          await updateGrossesse(grossesseId, {
            ...existingGrossesse,
            grossesseInterruption: true,
            grossesseMotifInterruption: "Accouchement",
          });
        }
      }
      toast.success("Formulaire créé avec succès! 🎉");
      router.push(`/fiches/${accouchementId}`);
    } catch (error) {
      toast.error("La création de l'accouchement a échoué");
      console.error("Erreur lors de la création de l'accouchement:", error);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-[1000px] mx-auto px-4 py-2 border rounded-md">
      <ConstanteClient idVisite={form.getValues("accouchementIdVisite")} />
      <h2 className="text-2xl text-gray-600 font-black text-center">
        {"Formulaire d'Accouchement"}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-[400px] rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
        >
          <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
            <FormField
              control={form.control}
              name="accouchementIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sélectionnez la visite</FormLabel>
                  <Select
                    required
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Visite à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visites.map((visite, index) => (
                        <SelectItem
                          key={index}
                          value={visite.id}
                          disabled={selectedAccouchement.some(
                            (p) => p.accouchementIdVisite === visite.id
                          )}
                        >
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
            <FormField
              control={form.control}
              name="accouchementIdGrossesse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Sélectionnez la grossesse
                  </FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Grossesse à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {grossesses.map((grossesse, index) => (
                        <SelectItem
                          key={index}
                          value={grossesse.id}
                          disabled={selectedAccouchement.some(
                            (p) => p.accouchementIdGrossesse === grossesse.id
                          )}
                        >
                          {grossesse.grossesseDdr &&
                            new Date(grossesse.grossesseDdr).toLocaleDateString(
                              "fr-FR"
                            )}{" "}
                          -{" "}
                          {grossesse.termePrevu &&
                            new Date(grossesse.termePrevu).toLocaleDateString(
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
          </div>

          <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
            <FormField
              control={form.control}
              name="accouchementLieu"
              render={({ field }) => (
                <FormItem className="pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      {"Lieu de l'accouchement:"}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="gap-x-5 items-center"
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
                <FormItem className="pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">Statut Vaccinal:</FormLabel>
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
                <FormItem className="flex justify-between pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">Complications:</FormLabel>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? "non"}
                      className="gap-x-5 items-center"
                    >
                      {tabOuiNon.map((option) => (
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
                  // key="details"
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
                        <FormItem className="flex justify-between pb-4">
                          <div className="text-xl font-bold flex justify-between items-center">
                            <FormLabel className="ml-4 text-red-500">
                              Évacuation de la mère:
                            </FormLabel>
                          </div>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value ?? "non"}
                              className="gap-x-5 items-center"
                            >
                              {tabOuiNon.map((option) => (
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
                      {form.watch("accouchementEvacuationMere") === "oui" && (
                        <motion.div
                          // key="details"
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
                                      {tabTypeEvacuation.map(
                                        (option, index) => (
                                          <SelectItem
                                            key={index}
                                            value={option.value}
                                            className="text-blue-600"
                                          >
                                            {option.label}
                                          </SelectItem>
                                        )
                                      )}
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* {form.watch("accouchementComplications") === "oui" && (
              <div>
                <Separator className="mb-3" />
                <FormField
                  control={form.control}
                  name="accouchementEvacuationMere"
                  render={({ field }) => (
                    <FormItem className="flex justify-between pb-4">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel className="ml-4 text-red-500">
                          Évacuation de la mère:
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? "non"}
                          className="gap-x-5 items-center"
                        >
                          {tabOuiNon.map((option) => (
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

                {form.watch("accouchementEvacuationMere") === "oui" && (
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
                )}
              </div>
            )} */}

            <Separator />
            <FormField
              control={form.control}
              name="accouchementEvacuationEnfant"
              render={({ field }) => (
                <FormItem className="flex justify-between pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Évacuation des nouveaux-nés:
                    </FormLabel>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? "non"}
                      className="gap-x-5 items-center"
                    >
                      {tabOuiNon.map((option) => (
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
                <FormItem className="flex justify-between pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Accouchement Multiple:
                    </FormLabel>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? "non"}
                      className="gap-x-5 items-center"
                    >
                      {tabOuiNon.map((option) => (
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
            <FormField
              control={form.control}
              name="accouchementEtatNaissance"
              render={({ field }) => (
                <FormItem className="flex justify-between pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">État de naissance:</FormLabel>
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
                  <FormLabel className="flex-1">Enfants Vivants:</FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      required
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
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
                  <FormLabel className="flex-1">Morts-nés Frais:</FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
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
                  <FormLabel className="flex-1">Morts-nés Macérés:</FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
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
                    {"Nombre d'enfants vivants avec poids < 2500g:"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    Sélectionnez le prescripteur
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un prescripteur" />
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

          <Button type="submit" className="mt-4 w-full">
            {form.formState.isSubmitting ? "Soumission..." : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
