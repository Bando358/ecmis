"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import { getAllIstByIdClient, createIst } from "@/lib/actions/istActions";
import { Ist, TableName } from "@prisma/client";
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
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import type { SharedFormProps } from "./types";

const tabTypePec = [
  { value: "candidose", label: "Pec Etiologique - Candidose" },
  { value: "chancreMou", label: "Pec Etiologique - Chancre Mou" },
  { value: "chlamydiose", label: "Pec Etiologique - Chlamydiose" },
  { value: "herpesSimplex", label: "Pec Etiologique - Herpes Simplex" },
  { value: "syphilis", label: "Pec Etiologique - Syphilis" },
  { value: "autres", label: "Pec Etiologique - Autres" },
];

const TabTypeIst = [
  { value: "ecoulementVaginal", label: "Ecoulement Vaginal" },
  { value: "ecoulementUretral", label: "Ecoulement Urétral" },
  { value: "douleursTesticulaires", label: "Douleurs Testiculaires" },
  { value: "douleursAbdominales", label: "Douleurs Abdominales Basses" },
  { value: "ulceration", label: "Ulcération Génitale" },
  { value: "bubon", label: "Bubon Inguinal" },
  { value: "cervicite", label: "Cervicite" },
  { value: "conjonctivite", label: "Conjonctivite du nouveau-né" },
  { value: "condylome", label: "Condylome (Végétation vénérienne)" },

  { value: "brulureOuPrurit", label: "Brûlure ou Prurit" },
  { value: "malOdeurVaginal", label: "Mauvaise Odeur Vaginale" },
  { value: "autres", label: "Autres IST" },
];
const TabTypeClient = [
  { value: "cpn", label: "Femme Enceinte" },
  { value: "pvvih", label: "PVVIH" },
  { value: "autres", label: "AUTRES" },
];
const TabTypePec = [
  { value: "syndromique", label: "Syndromique" },
  { value: "etiologique", label: "Etiologique" },
];

export default function IstForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
  selectedPrescripteurId,
}: SharedFormProps) {
  const [selectedIst, setSelectedIst] = useState<Ist[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { canCreate } = usePermissionContext();



  const form = useForm<Ist>({
    defaultValues: {
      istIdVisite: "",
      istIdUser: "",
      istIdClient: clientId ?? "",
      istIdClinique: client?.idClinique ?? "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const resultIst = await getAllIstByIdClient(clientId);
      setSelectedIst(resultIst as Ist[]);
    };
    fetchData();
  }, [clientId]);

  useEffect(() => {
    if (isPrescripteur && idUser) {
      form.setValue("istIdUser", idUser);
    } else if (selectedPrescripteurId) {
      form.setValue("istIdUser", selectedPrescripteurId);
    }
  }, [isPrescripteur, idUser, selectedPrescripteurId, form]);

  const onSubmit: SubmitHandler<Ist> = async (data) => {
    if (!canCreate(TableName.IST)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const effectiveIdUser = isPrescripteur
      ? idUser
      : selectedPrescripteurId || form.getValues("istIdUser") || idUser;
    const formattedData = {
      ...data,
      istTypeClient: form.getValues("istTypeClient") ?? "",
      istType: form.getValues("istType") ?? "",
      istIdClient: clientId ?? "",
      istCounsellingAvantDepitage:
        form.getValues("istCounsellingAvantDepitage") ?? false,
      istExamenPhysique: form.getValues("istExamenPhysique") ?? false,
      istCounsellingApresDepitage:
        form.getValues("istCounsellingApresDepitage") ?? false,
      istCounselingReductionRisque:
        form.getValues("istCounselingReductionRisque") ?? false,
      istTypePec: form.getValues("istTypePec") ?? "",
      istPecEtiologique: form.getValues("istPecEtiologique") ?? "",
      istIdUser: effectiveIdUser,
      istIdVisite: form.getValues("istIdVisite") ?? "",
      istIdClinique: client?.idClinique ?? "",
    };
    console.log("formattedData", formattedData);
    try {
      const newRecord = await createIst(formattedData as Ist);
      await updateRecapVisite(
        form.watch("istIdVisite"),
        effectiveIdUser,
        "12 Fiche Ist"
      );
      setSelectedIst((prev) => [...prev, newRecord as Ist]);
      console.log(formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    }
  };

  return (
    <div className="flex flex-col  justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("istIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Ist
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <FormField
            control={form.control}
            name="istIdVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez la visite
                </FormLabel>
                <Select
                  required
                  // value={field.value}
                  onValueChange={(value) => { field.onChange(value); setIsSubmitted(false); }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Visite à sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {visites.map((visite) => (
                      <SelectItem
                        key={visite.id}
                        value={visite.id}
                        disabled={selectedIst.some(
                          (p) => p.istIdVisite === visite.id
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

          {/* ************************* */}
          <div className="my-2 p-3 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="istTypeClient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le type de client
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TabTypeClient.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value ?? ""}
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
            <Separator className="my-3" />
            <FormField
              control={form.control}
              name="istType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le type de Ist
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TabTypeIst.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value ?? ""}
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
          <div className="my-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="istCounsellingAvantDepitage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Counselling Avant dépistage ist
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="istExamenPhysique"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Exament Physique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="istCounsellingApresDepitage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Counselling Après dépistage ist
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* <Separator /> */}
            <FormField
              control={form.control}
              name="istCounselingReductionRisque"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Counseling Réduction du risque
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="istTypePec"
              render={({ field }) => (
                <FormItem className=" px-4 pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Type de traitement IST:
                    </FormLabel>
                    <RefreshCw
                      onClick={() => {
                        form.setValue("istTypePec", "");
                      }}
                      className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                    />
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="flex gap-x-5 items-center"
                    >
                      {TabTypePec.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value ?? ""} />
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
              {form.watch("istTypePec") === "etiologique" && (
                <motion.div
                  key="ist-pec-etiologique"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <FormField
                    control={form.control}
                    name="istPecEtiologique"
                    render={({ field }) => (
                      <FormItem className="mx-6 mb-3 outline-red-500">
                        <FormLabel className="font-medium">
                          Selectionnez le type de PEC
                        </FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Traitement à sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tabTypePec.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value ?? ""}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <FormField
            control={form.control}
            name="istIdClient"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} className="hidden" />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Prescripteur (masqué, géré au niveau de la page) */}
          <FormField
            control={form.control}
            name="istIdUser"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={(isPrescripteur ? idUser : selectedPrescripteurId) ?? ""} className="hidden" />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex flex-row justify-center py-2">
            <Button type="submit" disabled={form.formState.isSubmitting || isSubmitted}>
              {form.formState.isSubmitting ? "Submitting..." : isSubmitted ? "Soumis" : "Soumettre"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
