"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import {
  getAllDepistageVihByIdClient,
  createDepistageVih,
} from "@/lib/actions/depistageVihActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { DepistageVih, TableName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import type { SharedFormProps } from "./types";

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
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

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

// Composant pour les champs conditionnels de résultat et counselling
const ConditionalResultFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showResultFields = form.watch("depistageVihInvestigationTestRapide");

  return (
    <AnimatePresence>
      {showResultFields && (
        <motion.div
          key="result-fields"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
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
        </motion.div>
      )}
    </AnimatePresence>
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
    <AnimatePresence>
      {showCounsellingFields && (
        <motion.div
          key="counselling-fields"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function DepistageVihForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
  selectedPrescripteurId,
}: SharedFormProps) {
  const [selectedDepistageVih, setSelectedDepistageVih] = useState<
    DepistageVih[]
  >([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { canCreate } = usePermissionContext();


  // Fetch form-specific data: existing depistage VIH records for this client
  useEffect(() => {
    if (!clientId) return;
    getAllDepistageVihByIdClient(clientId).then((result) => {
      setSelectedDepistageVih(result as DepistageVih[]);
    });
  }, [clientId]);

  const form = useForm<DepistageVih>({
    defaultValues: {
      depistageVihResultat: "negatif",
      depistageVihConsultation: true,
      depistageVihCounsellingPreTest: true,
      depistageVihInvestigationTestRapide: false,
      depistageVihCounsellingPostTest: false,
      depistageVihCounsellingReductionRisque: false,
      depistageVihCounsellingSoutienPsychoSocial: false,
      depistageVihIdClinique: client?.idClinique ?? "",
    },
  });

  useEffect(() => {
    form.setValue("depistageVihIdClient", clientId);
  }, [clientId]);

  useEffect(() => {
    if (isPrescripteur && idUser) {
      form.setValue("depistageVihIdUser", idUser);
    } else if (selectedPrescripteurId) {
      form.setValue("depistageVihIdUser", selectedPrescripteurId);
    }
  }, [isPrescripteur, idUser, selectedPrescripteurId, form]);

  // Mettre à jour depistageVihIdClinique dès que client est chargé
  useEffect(() => {
    if (client?.idClinique) {
      form.setValue("depistageVihIdClinique", client.idClinique);
    }
  }, [client]);

  const onSubmit: SubmitHandler<DepistageVih> = async (data) => {
    if (!canCreate(TableName.DEPISTAGE_VIH)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const effectiveIdUser = isPrescripteur
      ? idUser
      : selectedPrescripteurId ||
        form.getValues("depistageVihIdUser") ||
        idUser;
    const formattedData = {
      ...data,
      depistageVihIdClient: form.getValues("depistageVihIdClient"),
      depistageVihIdUser: effectiveIdUser,
    };

    try {
      const newRecord = await createDepistageVih(formattedData as DepistageVih);
      await updateRecapVisite(
        form.watch("depistageVihIdVisite"),
        effectiveIdUser,
        "14 Fiche de dépistage VIH"
      );
      setSelectedDepistageVih((prev) => [...prev, newRecord as DepistageVih]);
      toast.success("Fiche de dépistage VIH créée avec succès! \ud83c\udf89");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error(
        "Erreur lors de la création de la fiche de dépistage VIH:",
        error
      );
    }
  };

  return (
    <div className="flex flex-col  justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("depistageVihIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Dépistage VIH
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <FormField
            control={form.control}
            name="depistageVihIdVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez la visite
                </FormLabel>
                <Select required onValueChange={(value) => { field.onChange(value); setIsSubmitted(false); }}>
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
                        disabled={selectedDepistageVih.some(
                          (p) => p.depistageVihIdVisite === visite.id
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
            name="depistageVihTypeClient"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Type de client</FormLabel>
                <Select required onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez le type de client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tabTypeClient.map((option, index) => (
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

          <div className="my-2 shadow-sm border-blue-200/50 rounded-md p-4 transition-all duration-300">
            <FormField
              control={form.control}
              name="depistageVihConsultation"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Consultation</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depistageVihCounsellingPreTest"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Counselling pré-test
                  </FormLabel>
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
                  <Input
                    {...field}
                    className="hidden"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Prescripteur (masqué, géré au niveau de la page) */}
          <FormField
            control={form.control}
            name="depistageVihIdUser"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    value={(isPrescripteur ? idUser : selectedPrescripteurId) ?? ""}
                    onChange={field.onChange}
                    className="hidden"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-4 mx-auto block"
            disabled={form.formState.isSubmitting || isSubmitted}
          >
            {form.formState.isSubmitting ? "Soumettre..." : isSubmitted ? "Soumis" : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
