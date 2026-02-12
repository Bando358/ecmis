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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Pencil } from "lucide-react";
import Retour from "@/components/retour";
// import { Checkbox } from "@/components/ui/checkbox";

type Option = {
  value: string;
  label: string;
};
const tabTypeEvacuation = [
  { value: "avant", label: "Avant l'accouchement" },
  { value: "pendant", label: "Pendant l'accouchement" },
  { value: "apres", label: "Apr\u00e8s l'accouchement" },
];
const tabVat = [
  { value: "non", label: "Non Vaccin\u00e9e" },
  { value: "incomplet", label: "Incompl\u00e8tement Vaccin\u00e9e" },
  { value: "complet", label: "Compl\u00e8tement Vaccin\u00e9e" },
];
const tabLieu = [
  { value: "etablissement", label: "Dans l'\u00e9tablissement" },
  { value: "domicile", label: "A domicile" },
];
const tabEvacuationEfant = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
const tabEtatNaissance = [
  { value: "terme", label: "A terme" },
  { value: "premature", label: "Pr\u00e9matur\u00e9" },
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
    // Si l'utilisateur n'est pas encore charg\u00e9, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.ACCOUCHEMENT,
        );
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'acc\u00e9der \u00e0 cette page.");
        //   router.back();
        // }
      } catch (error) {
        console.error(
          "Erreur lors de la v\u00e9rification des permissions :",
          error,
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
        oneAccouchement?.accouchementIdUser as string,
      );
      setPrescripteur(oneUser?.name);

      if (oneAccouchement) {
        const oneGrossesse = await getOneGrossesse(
          oneAccouchement.accouchementIdGrossesse,
        );
        setGrossesses(oneGrossesse as Grossesse);
        const result = await getAllVisiteByIdClient(
          oneAccouchement.accouchementIdClient,
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneAccouchement.accouchementIdVisite,
        );

        const cliniqueClient = await getOneClient(
          oneAccouchement.accouchementIdClient,
        );
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter(
            (r: { id: string }) =>
              r.id === oneAccouchement.accouchementIdVisite,
          ),
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
          10,
        ) || 0,
      accouchementNbPoidsEfantVivant:
        parseInt(
          data.accouchementNbPoidsEfantVivant as unknown as string,
          10,
        ) || 0,
    };

    try {
      if (selectedAccouchement) {
        console.log(formattedData);
        await updateAccouchement(selectedAccouchement.id, formattedData);
        const oneAccouchement = await getOneAccouchement(modifAccouchementId);
        setSelectedAccouchement(oneAccouchement as Accouchement);
      }
      toast.info("Formulaire modifi\u00e9e avec succ\u00e8s! \ud83c\udf89");
    } catch (error) {
      toast.error("La modification du formulaire a \u00e9chou\u00e9");
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
        "Vous n'avez pas la permission de modifier un accouchement. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedAccouchement) {
      form.setValue(
        "accouchementIdVisite",
        selectedAccouchement.accouchementIdVisite,
      );
      form.setValue(
        "accouchementIdClient",
        selectedAccouchement.accouchementIdClient,
      );
      form.setValue(
        "accouchementIdUser",
        selectedAccouchement.accouchementIdUser,
      );
      form.setValue(
        "accouchementIdGrossesse",
        selectedAccouchement.accouchementIdGrossesse,
      );
      form.setValue(
        "accouchementMultiple",
        selectedAccouchement.accouchementMultiple,
      );
      form.setValue(
        "accouchementComplications",
        selectedAccouchement.accouchementComplications,
      );
      form.setValue(
        "accouchementEnfantMortNeFrais",
        selectedAccouchement.accouchementEnfantMortNeFrais,
      );
      form.setValue(
        "accouchementEnfantVivant",
        selectedAccouchement.accouchementEnfantVivant,
      );
      form.setValue(
        "accouchementEnfantMortNeMacere",
        selectedAccouchement.accouchementEnfantMortNeMacere,
      );
      form.setValue(
        "accouchementEtatNaissance",
        selectedAccouchement.accouchementEtatNaissance,
      );
      form.setValue(
        "accouchementEvacuationEnfant",
        selectedAccouchement.accouchementEvacuationEnfant,
      );
      form.setValue(
        "accouchementEvacuationMere",
        selectedAccouchement.accouchementEvacuationMere,
      );
      form.setValue("accouchementLieu", selectedAccouchement.accouchementLieu);
      form.setValue(
        "accouchementNbPoidsEfantVivant",
        selectedAccouchement.accouchementNbPoidsEfantVivant,
      );
      form.setValue(
        "accouchementStatutVat",
        selectedAccouchement.accouchementStatutVat,
      );
      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedAccouchement && (
          <ConstanteClient
            idVisite={selectedAccouchement.accouchementIdVisite}
          />
        )}
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {isVisible ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
                  <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                    <CardTitle className="text-lg font-semibold text-blue-900 text-center">
                      Modifier - Accouchement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-2 max-w-4xl mx-auto px-4 py-4"
                      >
                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          <FormField
                            control={form.control}
                            name="accouchementIdVisite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selectionnez la visite</FormLabel>
                                <Select required onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Visite \u00e0 s\u00e9lectionner" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {visites.map((visite, index) => (
                                      <SelectItem key={index} value={visite.id}>
                                        {new Date(
                                          visite.dateVisite,
                                        ).toLocaleDateString("fr-FR")}
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
                                  <Select
                                    required
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Visite \u00e0 s\u00e9lectionner" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value={grossesses.id}>
                                        {grossesses.grossesseDdr &&
                                          new Date(
                                            grossesses.grossesseDdr,
                                          ).toLocaleDateString("fr-FR")}{" "}
                                        -{" "}
                                        {grossesses.termePrevu &&
                                          new Date(
                                            grossesses.termePrevu,
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

                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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
                                  <FormLabel className="ml-4">
                                    Complications:
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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
                            {form.watch("accouchementComplications") ===
                              "oui" && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  duration: 0.4,
                                  ease: "easeInOut",
                                }}
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
                                            Evacuation de la m\u00e8re:
                                          </FormLabel>
                                        </div>
                                        <FormControl>
                                          <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value ?? ""}
                                            className=" gap-x-5 items-center"
                                          >
                                            {tabEvacuationEfant.map(
                                              (option) => (
                                                <FormItem
                                                  key={option.value}
                                                  className="flex items-center space-x-3 space-y-0"
                                                >
                                                  <FormControl>
                                                    <RadioGroupItem
                                                      value={option.value}
                                                    />
                                                  </FormControl>
                                                  <FormLabel className="font-normal">
                                                    {option.label}
                                                  </FormLabel>
                                                </FormItem>
                                              ),
                                            )}
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
                            {form.watch("accouchementEvacuationMere") ===
                              "oui" && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  duration: 0.4,
                                  ease: "easeInOut",
                                }}
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
                                          {
                                            "S\u00e9lectionnez le type d'\u00e9vacuation:"
                                          }
                                        </FormLabel>
                                        <Select onValueChange={field.onChange}>
                                          <FormControl>
                                            <SelectTrigger className="w-full">
                                              <SelectValue placeholder="Type d'\u00e9vacuation \u00e0 s\u00e9lectionner" />
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
                                              ),
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
                          <Separator />
                          <FormField
                            control={form.control}
                            name="accouchementEvacuationEnfant"
                            render={({ field }) => (
                              <FormItem className="flex justify-between  pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Evacuation des nouveaux N\u00e9s :
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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

                        <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md ">
                          {/* <Separator className="my-3" /> */}
                          <FormField
                            control={form.control}
                            name="accouchementEtatNaissance"
                            render={({ field }) => (
                              <FormItem className="flex justify-between pb-4">
                                <div className="text-xl font-bold flex justify-between items-center">
                                  <FormLabel className="ml-4">
                                    Etat Naissance :
                                  </FormLabel>
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
                                          <RadioGroupItem
                                            value={option.value}
                                          />
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
                                <FormLabel className="flex-1">
                                  Vivant :
                                </FormLabel>
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
                                <FormLabel className="flex-1">
                                  Mort N\u00e9 Frais :
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
                          <FormField
                            control={form.control}
                            name="accouchementEnfantMortNeMacere"
                            render={({ field }) => (
                              <FormItem className="flex items-center ml-4">
                                <FormLabel className="flex-1">
                                  Mac\u00e9r\u00e9 :
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
                                  <Input
                                    {...field}
                                    value={idUser}
                                    className="hidden"
                                  />
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
                                    {allPrescripteur.map(
                                      (prescripteur, index) => (
                                        <SelectItem
                                          key={index}
                                          value={prescripteur.id}
                                        >
                                          <span>{prescripteur.name}</span>
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="flex justify-center gap-4 pt-4 border-t border-blue-100/60 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsVisible(false)}
                            disabled={form.formState.isSubmitting}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                          >
                            {form.formState.isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                En cours...
                              </>
                            ) : (
                              "Appliquer"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {!selectedAccouchement ? (
                  <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardContent className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                    <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-blue-900">
                            Accouchement
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            {"Fiche d'accouchement"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="divide-y divide-blue-100/60">
                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Date de visite
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {dateVisite &&
                              new Date(dateVisite).toLocaleDateString("fr-FR")}
                          </span>
                        </div>

                        {selectedAccouchement.accouchementEtatNaissance !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              P\u00e9riode de Grossesse
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementEtatNaissance,
                                tabEtatNaissance,
                              )}
                            </span>
                          </div>
                        )}

                        {dateVisite &&
                          grossesses &&
                          grossesses.grossesseDdr && (
                            <div className="grid grid-cols-3 gap-x-4 py-2.5">
                              <span className="text-sm font-medium text-blue-800">
                                DdR - Terme pr\u00e9vu
                              </span>
                              <span className="col-span-2 text-sm text-gray-700">
                                {new Date(
                                  grossesses.grossesseDdr,
                                ).toLocaleDateString("fr-FR")}
                                {grossesses.termePrevu && (
                                  <>
                                    {" "}
                                    -{" "}
                                    {new Date(
                                      grossesses.termePrevu,
                                    ).toLocaleDateString("fr-FR")}
                                  </>
                                )}
                              </span>
                            </div>
                          )}

                        {selectedAccouchement.accouchementLieu !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"Lieu d'Accouchement"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementLieu,
                                tabLieu,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementStatutVat !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Statut Vaccinal
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementStatutVat,
                                tabVat,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementComplications !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Complications
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementComplications,
                                tabEvacuationEfant,
                              )}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Evacuation de la m\u00e8re
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedAccouchement.accouchementEvacuationMere ===
                            "oui" ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        {selectedAccouchement.accouchementTypeEvacuation !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"P\u00e9riode d'Evacuation de la m\u00e8re"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementTypeEvacuation,
                                tabTypeEvacuation,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementEvacuationEnfant !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Evacuation des nouveaux N\u00e9s
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementEvacuationEnfant,
                                tabEvacuationEfant,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementMultiple !== null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Accouchement Multiple
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementMultiple,
                                tabEvacuationEfant,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementEtatNaissance !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Etat Naissance
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedAccouchement.accouchementEtatNaissance,
                                tabEtatNaissance,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementEnfantVivant !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Enfants N\u00e9s Vivant
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {selectedAccouchement.accouchementEnfantVivant}
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementEnfantMortNeFrais !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Enfants Morts N\u00e9s Frais
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {
                                selectedAccouchement.accouchementEnfantMortNeFrais
                              }
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementEnfantMortNeMacere !==
                          null && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Enfants Morts Mac\u00e9r\u00e9
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {
                                selectedAccouchement.accouchementEnfantMortNeMacere
                              }
                            </span>
                          </div>
                        )}

                        {selectedAccouchement.accouchementNbPoidsEfantVivant >=
                          0 && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"Nb Enfants vivant dont le poids < 2500g"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {
                                selectedAccouchement.accouchementNbPoidsEfantVivant
                              }
                            </span>
                          </div>
                        )}

                        {prescripteur && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Prescripteur
                            </span>
                            <span className="col-span-2 text-sm text-gray-700 italic">
                              {prescripteur}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 border-t border-blue-100/60 pt-4">
                      <Button variant="outline" onClick={() => router.back()}>
                        Retour
                      </Button>
                      <Button onClick={handleUpdateVisite}>
                        <Pencil className="h-4 w-4 mr-2" /> Modifier
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
