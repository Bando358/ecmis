"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";

import { toast } from "sonner";
import { getOneGrossesse } from "@/lib/actions/grossesseActions";
import { getOneSaa, updateSaa } from "@/lib/actions/saaActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  Saa,
  Grossesse,
  User,
  Visite,
  TableName,
  Permission,
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
import ConstanteClient from "@/components/constanteClient";
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/components/ClientContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { Checkbox } from "@/components/ui/checkbox";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

type Option = {
  value: string;
  label: string;
};

const tabTypeAvortement = [
  { value: "spontanee", label: "Spontan\u00e9e" },
  { value: "provoquee", label: "Provoqu\u00e9e" },
  { value: "therapeutique", label: "Th\u00e9rapeutique" },
];

const tabMethodeAvortement = [
  { value: "medicamenteux", label: "M\u00e9dicamenteux" },
  { value: "chirurgical", label: "Chirurgical" },
];

const tabMotifDemande = [
  { value: "viol", label: "Viol" },
  { value: "inceste", label: "Inceste" },
  { value: "eleve_ecoliere", label: "\u00c9l\u00e8ve/\u00c9coli\u00e8re" },
  { value: "pere_inconnu", label: "P\u00e8re Inconnu" },
  { value: "autre", label: "Autre" },
];

const tabTypePec = [
  { value: "amiu", label: "AMIU" },
  { value: "misoprostol", label: "Misoprostol" },
];

const tabTraitementComplication = [
  {
    value: "intervention_medicamenteuse",
    label: "Intervention m\u00e9dicamenteuse",
  },
  { value: "intervention_chirurgicale", label: "Intervention chirurgicale" },
  { value: "complication_tai", label: "Complication li\u00e9e \u00e0 la TAI" },
];

// Composant pour les champs conditionnels

const ConditionalFields = ({ form }: { form: UseFormReturn<Saa> }) => {
  const showConditionalFields =
    form.watch("saaCounsellingPre") === false &&
    form.watch("saaSuiviPostAvortement") === false;

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showConditionalFields ? "max-h-250 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="saaMethodeAvortement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                {"M\u00e9thode d'avortement"}
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="M\u00e9thode d'avortement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabMethodeAvortement.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
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
          name="saaTypeAvortement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                {"Type d'avortement"}
              </FormLabel>
              <Select required onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type d'avortement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTypeAvortement.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
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
          name="saaConsultationPost"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Consultation post-avortement
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saaCounsellingPost"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Counselling post-avortement
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Separator className="my-3" />

        <FormField
          control={form.control}
          name="saaTypePec"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                Type de prise en charge (optionnel)
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type de PEC" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTypePec.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
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
          name="saaTraitementComplication"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                Traitement des complications (optionnel)
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Traitement des complications" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTraitementComplication.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
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
    </div>
  );
};

export default function ModifSaaPage({
  params,
}: {
  params: Promise<{ modifSaaId: string }>;
}) {
  const { modifSaaId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossesses, setGrossesses] = useState<Grossesse>();
  const [selectedSaa, setSelectedSaa] = useState<Saa>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setOnePrescripteur(user!);
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
          (p: { table: string }) => p.table === TableName.SAA,
        );
        setPermission(perm || null);
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
      const oneSaa = await getOneSaa(modifSaaId);
      setSelectedSaa(oneSaa as Saa);

      const oneUser = await getOneUser(oneSaa?.saaIdUser as string);
      setPrescripteur(oneUser?.name);

      if (oneSaa) {
        let oneGrossesse = null;
        if (oneSaa.saaIdGrossesse) {
          oneGrossesse = await getOneGrossesse(oneSaa.saaIdGrossesse);
        }
        setGrossesses(oneGrossesse as Grossesse);

        const result = await getAllVisiteByIdClient(oneSaa.saaIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneSaa.saaIdVisite,
        );

        const cliniqueClient = await getOneClient(oneSaa.saaIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string }) => r.id === oneSaa.saaIdVisite),
        );
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneSaa.saaIdClient);
      }
    };
    fetchData();
  }, [modifSaaId, setSelectedClientId]);

  const form = useForm<Saa>();

  const onSubmit: SubmitHandler<Saa> = async (data) => {
    const formattedData = {
      ...data,
      saaIdUser: form.getValues("saaIdUser"),
      saaIdClient: selectedSaa?.saaIdClient ?? "",
      saaCounsellingPre: form.getValues("saaCounsellingPre") ?? false,
      saaConsultationPost: form.getValues("saaConsultationPost") ?? false,
      saaCounsellingPost: form.getValues("saaCounsellingPost") ?? false,
      saaIdClinique: selectedSaa?.saaIdClinique ?? "",
    };

    console.log("Formatted Data:", formattedData);
    try {
      if (selectedSaa) {
        await updateSaa(selectedSaa.id, formattedData);
        const oneSaa = await getOneSaa(modifSaaId);
        setSelectedSaa(oneSaa as Saa);
      }
      toast.info("Formulaire modifi\u00e9 avec succ\u00e8s! \ud83c\udf89");
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
        "Vous n'avez pas la permission de modifier un SAA. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedSaa) {
      form.setValue("saaIdVisite", selectedSaa.saaIdVisite);
      form.setValue("saaIdClient", selectedSaa.saaIdClient);
      form.setValue("saaIdUser", selectedSaa.saaIdUser);
      form.setValue("saaIdGrossesse", selectedSaa.saaIdGrossesse);
      form.setValue("saaTypeAvortement", selectedSaa.saaTypeAvortement);
      form.setValue("saaMethodeAvortement", selectedSaa.saaMethodeAvortement);
      form.setValue("saaCounsellingPre", selectedSaa.saaCounsellingPre);
      form.setValue(
        "saaSuiviPostAvortement",
        selectedSaa.saaSuiviPostAvortement,
      );
      form.setValue("saaMotifDemande", selectedSaa.saaMotifDemande);
      form.setValue("saaConsultationPost", selectedSaa.saaConsultationPost);
      form.setValue("saaCounsellingPost", selectedSaa.saaCounsellingPost);
      form.setValue("saaTypePec", selectedSaa.saaTypePec);
      form.setValue(
        "saaTraitementComplication",
        selectedSaa.saaTraitementComplication,
      );

      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedSaa && <ConstanteClient idVisite={selectedSaa.saaIdVisite} />}
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
                      Modifier - SAA
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
                            name="saaIdVisite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {"S\u00e9lectionnez la visite"}
                                </FormLabel>
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
                              name="saaIdGrossesse"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-medium">
                                    {
                                      "S\u00e9lectionnez la grossesse (optionnel)"
                                    }
                                  </FormLabel>
                                  <Select onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Grossesse \u00e0 s\u00e9lectionner" />
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
                            name="saaSuiviPostAvortement"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Consultation post-Abortum suivi
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="saaCounsellingPre"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    {"Counselling pr\u00e9-avortement"}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Champs conditionnels avec transition */}
                          <ConditionalFields form={form} />

                          {/* Affichage des champs de motif si counselling pr\u00e9-avortement est coch\u00e9 */}
                          {form.watch("saaCounsellingPre") && (
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                form.watch("saaCounsellingPre")
                                  ? "max-h-25 opacity-100 mt-2"
                                  : "max-h-0 opacity-0"
                              }`}
                            >
                              <FormField
                                control={form.control}
                                name="saaMotifDemande"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="font-medium">
                                      Motif de demande
                                    </FormLabel>
                                    <Select onValueChange={field.onChange}>
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Motif de demande" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {tabMotifDemande.map(
                                          (option, index) => (
                                            <SelectItem
                                              key={index}
                                              value={option.value}
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
                          )}
                        </div>

                        <FormField
                          control={form.control}
                          name="saaIdClient"
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
                            name="saaIdUser"
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
                            name="saaIdUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium">
                                  {"S\u00e9lectionnez le prescripteur"}
                                </FormLabel>
                                <Select required onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="S\u00e9lectionner un prescripteur" />
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
                {!selectedSaa ? (
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
                            SAA
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            {"Fiche des soins apr\u00e8s avortement"}
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

                        {grossesses && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"P\u00e9riode de Grossesse"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {grossesses.grossesseDdr &&
                                new Date(
                                  grossesses.grossesseDdr,
                                ).toLocaleDateString("fr-FR")}{" "}
                              {grossesses.termePrevu && <span>-</span>}{" "}
                              {grossesses.termePrevu &&
                                new Date(
                                  grossesses.termePrevu,
                                ).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        )}

                        {selectedSaa.saaTypeAvortement && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"Type d'avortement"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedSaa.saaTypeAvortement,
                                tabTypeAvortement,
                              )}
                            </span>
                          </div>
                        )}

                        {selectedSaa.saaMethodeAvortement && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              {"M\u00e9thode d'avortement"}
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedSaa.saaMethodeAvortement,
                                tabMethodeAvortement,
                              )}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Consultation post-Abortum suivi
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedSaa.saaSuiviPostAvortement ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            {"Counselling pr\u00e9-avortement"}
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedSaa.saaCounsellingPre ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        {selectedSaa.saaCounsellingPre &&
                          selectedSaa.saaMotifDemande && (
                            <div className="grid grid-cols-3 gap-x-4 py-2.5">
                              <span className="text-sm font-medium text-blue-800">
                                Motif de demande
                              </span>
                              <span className="col-span-2 text-sm text-gray-700">
                                {renameValue(
                                  selectedSaa.saaMotifDemande,
                                  tabMotifDemande,
                                )}
                              </span>
                            </div>
                          )}

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Consultation post-avortement
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedSaa.saaConsultationPost ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling post-avortement
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedSaa.saaCounsellingPost ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        {selectedSaa.saaTypePec && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Type de prise en charge
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(selectedSaa.saaTypePec, tabTypePec)}
                            </span>
                          </div>
                        )}

                        {selectedSaa.saaTraitementComplication && (
                          <div className="grid grid-cols-3 gap-x-4 py-2.5">
                            <span className="text-sm font-medium text-blue-800">
                              Traitement des complications
                            </span>
                            <span className="col-span-2 text-sm text-gray-700">
                              {renameValue(
                                selectedSaa.saaTraitementComplication,
                                tabTraitementComplication,
                              )}
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
