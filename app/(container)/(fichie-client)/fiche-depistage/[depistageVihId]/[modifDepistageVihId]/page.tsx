"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getOneDepistageVih,
  updateDepistageVih,
} from "@/lib/actions/depistageVihActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  DepistageVih,
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
import ConstanteClient from "@/components/constanteClient";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

const tabTypeClient = [
  { value: "cdip", label: "CDIP" },
  { value: "ptme", label: "PTME" },
  { value: "ist", label: "IST" },
  { value: "enfantMerePos", label: "Enfant de mère positive" },
  { value: "conjointPos", label: "Conjoint positif" },
  { value: "autre", label: "Autre" },
];

const TabResultatVih = [
  { value: "negatif", label: "Négatif" },
  { value: "positif", label: "Positif" },
  { value: "indetermine", label: "Indéterminé" },
];

type Option = {
  value: string;
  label: string;
};

// Composant pour les champs conditionnels de résultat et counselling
const ConditionalResultFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showResultFields = form.watch("depistageVihInvestigationTestRapide");

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showResultFields ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="depistageVihResultat"
          render={({ field }) => (
            <FormItem className="pt-4 pb-2">
              <div className="text-xl font-bold flex justify-between items-center">
                <FormLabel className="ml-4">Résultat du test VIH :</FormLabel>
                <RefreshCw
                  onClick={() => {
                    form.setValue("depistageVihResultat", "");
                  }}
                  className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125 cursor-pointer"
                />
              </div>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  className="flex gap-x-5 items-center"
                >
                  {TabResultatVih.map((option) => (
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

        <FormField
          control={form.control}
          name="depistageVihCounsellingPostTest"
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
                  Counselling post-test
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

// Composant pour les champs conditionnels de counselling supplémentaire
const ConditionalCounsellingFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showCounsellingFields =
    form.watch("depistageVihCounsellingPostTest") &&
    form.watch("depistageVihResultat") === "positif";

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showCounsellingFields ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="depistageVihCounsellingReductionRisque"
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
                  Counselling de réduction des risques
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="depistageVihCounsellingSoutienPsychoSocial"
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
                  Counselling de soutien psychosocial
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default function ModifDepistageVihPage({
  params,
}: {
  params: Promise<{ modifDepistageVihId: string }>;
}) {
  const { modifDepistageVihId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedDepistageVih, setSelectedDepistageVih] =
    useState<DepistageVih>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
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
      setOnePrescripteur(user!);
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
          (p: { table: string }) => p.table === TableName.DEPISTAGE_VIH,
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error,
        );
      }
    };

    fetchPermissions();
  }, [onePrescripteur, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const oneDepistageVih = await getOneDepistageVih(modifDepistageVihId);
        setSelectedDepistageVih(oneDepistageVih as DepistageVih);

        let allPrestataire: User[] = [];

        if (oneDepistageVih?.depistageVihIdClient) {
          const cliniqueClient = await getOneClient(
            oneDepistageVih.depistageVihIdClient,
          );

          if (cliniqueClient?.idClinique) {
            allPrestataire = await getAllUserIncludedIdClinique(
              cliniqueClient.idClinique,
            );
          }
        }

        setAllPrescripteur(allPrestataire);
      } catch (err) {
        console.error("Erreur chargement prescripteurs:", err);
      }
    };

    fetchData();
  }, [modifDepistageVihId]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedDepistageVih) {
        const result = await getAllVisiteByIdClient(
          selectedDepistageVih.depistageVihIdClient,
        );
        const visiteDate = result.find(
          (r: { id: string }) =>
            r.id === selectedDepistageVih.depistageVihIdVisite,
        );

        const nomPrescripteur = await getOneUser(
          selectedDepistageVih.depistageVihIdUser,
        );
        const nomP = nomPrescripteur?.name;
        setPrescripteur(nomP);

        setVisites(
          result.filter(
            (r: { id: string }) =>
              r.id === selectedDepistageVih.depistageVihIdVisite,
          ),
        );
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(selectedDepistageVih.depistageVihIdClient);
      }
    };
    fetchData();
  }, [selectedDepistageVih, setSelectedClientId]);

  const form = useForm<DepistageVih>();

  const onSubmit: SubmitHandler<DepistageVih> = async (data) => {
    const formattedData = {
      ...data,
      depistageVihIdUser: form.getValues("depistageVihIdUser"),
      depistageVihIdClient: form.getValues("depistageVihIdClient"),
      depistageVihIdVisite: form.getValues("depistageVihIdVisite"),
      depistageVihTypeClient: form.getValues("depistageVihTypeClient"),
      depistageVihResultat: form.getValues("depistageVihResultat"),
      depistageVihIdClinique:
        selectedDepistageVih?.depistageVihIdClinique ?? "",
    };

    try {
      if (selectedDepistageVih) {
        await updateDepistageVih(selectedDepistageVih.id, formattedData);
        const oneDepistageVih = await getOneDepistageVih(modifDepistageVihId);
        if (oneDepistageVih) {
          setSelectedDepistageVih(oneDepistageVih as DepistageVih);
        }
      }
      toast.info("Formulaire modifié avec succès! 🎉");
    } catch (error) {
      toast.error("La Modification du formulaire a échoué");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameTypeClient = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const renameResultat = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un dépistage VIH. Contactez un administrateur.",
      );
      return router.back();
    }
    if (selectedDepistageVih) {
      form.setValue(
        "depistageVihIdVisite",
        selectedDepistageVih.depistageVihIdVisite,
      );
      form.setValue(
        "depistageVihIdUser",
        selectedDepistageVih.depistageVihIdUser,
      );
      form.setValue(
        "depistageVihIdClient",
        selectedDepistageVih.depistageVihIdClient,
      );
      form.setValue(
        "depistageVihTypeClient",
        selectedDepistageVih.depistageVihTypeClient,
      );
      form.setValue(
        "depistageVihConsultation",
        selectedDepistageVih.depistageVihConsultation,
      );
      form.setValue(
        "depistageVihCounsellingPreTest",
        selectedDepistageVih.depistageVihCounsellingPreTest,
      );
      form.setValue(
        "depistageVihInvestigationTestRapide",
        selectedDepistageVih.depistageVihInvestigationTestRapide,
      );
      form.setValue(
        "depistageVihResultat",
        selectedDepistageVih.depistageVihResultat,
      );
      form.setValue(
        "depistageVihCounsellingPostTest",
        selectedDepistageVih.depistageVihCounsellingPostTest,
      );
      form.setValue(
        "depistageVihCounsellingReductionRisque",
        selectedDepistageVih.depistageVihCounsellingReductionRisque,
      );
      form.setValue(
        "depistageVihCounsellingSoutienPsychoSocial",
        selectedDepistageVih.depistageVihCounsellingSoutienPsychoSocial,
      );
      setIsVisible(true);
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {selectedDepistageVih && (
          <ConstanteClient
            idVisite={selectedDepistageVih.depistageVihIdVisite}
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
                      Modifier - Dépistage VIH
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-2 max-w-4xl mx-auto px-4 py-4"
                      >
                        <FormField
                          control={form.control}
                          name="depistageVihIdVisite"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Selectionnez la visite
                              </FormLabel>
                              <Select
                                required
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Visite à sélectionner" />
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

                        <FormField
                          control={form.control}
                          name="depistageVihTypeClient"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">
                                Type de client
                              </FormLabel>
                              <Select
                                required
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sélectionnez le type de client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tabTypeClient.map((option, index) => (
                                    <SelectItem
                                      key={index}
                                      value={option.value}
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

                        <div className="my-2 shadow-sm border-blue-200/50 rounded-md p-4 transition-all duration-300">
                          <FormField
                            control={form.control}
                            name="depistageVihConsultation"
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
                                    Consultation
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="depistageVihCounsellingPreTest"
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
                                    Counselling pré-test
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="depistageVihInvestigationTestRapide"
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
                                    Investigation par test rapide
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Champs conditionnels de résultat avec transition */}
                          <ConditionalResultFields form={form} />

                          {/* Champs conditionnels de counselling supplémentaire avec transition */}
                          <ConditionalCounsellingFields form={form} />
                        </div>

                        <FormField
                          control={form.control}
                          name="depistageVihIdClient"
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
                            name="depistageVihIdUser"
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
                            name="depistageVihIdUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-medium">
                                  Selectionnez le prescripteur
                                </FormLabel>
                                <Select
                                  required
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Prescripteur ....." />
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
                {!selectedDepistageVih ? (
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
                            Dépistage VIH
                          </CardTitle>
                          <CardDescription className="text-blue-700/60">
                            Fiche de dépistage VIH
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

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Type de client
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {renameTypeClient(
                              selectedDepistageVih.depistageVihTypeClient,
                              tabTypeClient,
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Consultation
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedDepistageVih.depistageVihConsultation ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Counselling pré-test
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedDepistageVih.depistageVihCounsellingPreTest ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-x-4 py-2.5">
                          <span className="text-sm font-medium text-blue-800">
                            Test rapide
                          </span>
                          <span className="col-span-2 text-sm text-gray-700">
                            {selectedDepistageVih.depistageVihInvestigationTestRapide ? (
                              <CheckedTrue />
                            ) : (
                              <CheckedFalse />
                            )}
                          </span>
                        </div>

                        {selectedDepistageVih.depistageVihInvestigationTestRapide && (
                          <>
                            <div className="grid grid-cols-3 gap-x-4 py-2.5">
                              <span className="text-sm font-medium text-blue-800">
                                Résultat
                              </span>
                              <span className="col-span-2 text-sm text-gray-700">
                                {renameResultat(
                                  selectedDepistageVih.depistageVihResultat,
                                  TabResultatVih,
                                )}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-x-4 py-2.5">
                              <span className="text-sm font-medium text-blue-800">
                                Counselling post-test
                              </span>
                              <span className="col-span-2 text-sm text-gray-700">
                                {selectedDepistageVih.depistageVihCounsellingPostTest ? (
                                  <CheckedTrue />
                                ) : (
                                  <CheckedFalse />
                                )}
                              </span>
                            </div>

                            {selectedDepistageVih.depistageVihResultat ===
                              "positif" && (
                              <>
                                <div className="grid grid-cols-3 gap-x-4 py-2.5">
                                  <span className="text-sm font-medium text-blue-800">
                                    Réduction risques
                                  </span>
                                  <span className="col-span-2 text-sm text-gray-700">
                                    {selectedDepistageVih.depistageVihCounsellingReductionRisque ? (
                                      <CheckedTrue />
                                    ) : (
                                      <CheckedFalse />
                                    )}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-x-4 py-2.5">
                                  <span className="text-sm font-medium text-blue-800">
                                    Soutien psychosocial
                                  </span>
                                  <span className="col-span-2 text-sm text-gray-700">
                                    {selectedDepistageVih.depistageVihCounsellingSoutienPsychoSocial ? (
                                      <CheckedTrue />
                                    ) : (
                                      <CheckedFalse />
                                    )}
                                  </span>
                                </div>
                              </>
                            )}
                          </>
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
