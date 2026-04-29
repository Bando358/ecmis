"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { getAllCponByIdClient, createCpon } from "@/lib/actions/cponActions";
import { Cpon, TableName } from "@prisma/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

const TabDuree = [
  { value: "6_72", label: "Les 6 et 72 heures" },
  { value: "4_10", label: "Les 4 jrs et 10 jours" },
  { value: "10_6", label: "Les 10 jrs et < 6 semaines " },
  { value: "6_8", label: "Les 6 semaines et  8 semaines " },
];

export default function CponForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
  selectedPrescripteurId,
}: SharedFormProps) {
  const [selectedCpon, setSelectedCpon] = useState<Cpon[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { canCreate } = usePermissionContext();


  useEffect(() => {
    const fetchData = async () => {
      const resultCpon = await getAllCponByIdClient(clientId);
      setSelectedCpon(resultCpon as Cpon[]);
    };
    fetchData();
  }, [clientId]);

  const form = useForm<Cpon>({
    defaultValues: {
      cponIdVisite: "",
      cponConsultation: true,
      cponCounselling: true,
      cponInvestigationPhysique: true,
      cponIdClient: clientId,
      cponIdClinique: client?.idClinique || "",
    },
  });

  useEffect(() => {
    if (isPrescripteur && idUser) {
      form.setValue("cponIdUser", idUser);
    } else if (selectedPrescripteurId) {
      form.setValue("cponIdUser", selectedPrescripteurId);
    }
  }, [isPrescripteur, idUser, selectedPrescripteurId, form]);

  const onSubmit: SubmitHandler<Cpon> = async (data) => {
    if (!canCreate(TableName.CPON)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const effectiveIdUser = isPrescripteur
      ? idUser
      : selectedPrescripteurId || form.getValues("cponIdUser");
    if (!effectiveIdUser) {
      toast.error(
        "Veuillez d'abord sélectionner le prestataire en haut de la page",
      );
      return;
    }
    const formattedData = {
      ...data,
      cponIdUser: effectiveIdUser,
      cponIdClient: form.getValues("cponIdClient"),
      cponIdVisite: form.getValues("cponIdVisite"),
      cponIdClinique: client?.idClinique || "",
    };
    console.log(formattedData);
    try {
      const newRecord = await createCpon(formattedData);
      await updateRecapVisite(
        form.watch("cponIdVisite"),
        effectiveIdUser,
        "10 Fiche CPoN"
      );
      setSelectedCpon((prev) => [...prev, newRecord as Cpon]);
      console.log(formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de Cpon:", error);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("cponIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        {`Formulaire de consultation CPoN`}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="cponIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selectionnez la visite</FormLabel>
                  <Select
                    required
                    onValueChange={(value) => { field.onChange(value); setIsSubmitted(false); }}
                    value={field.value ?? ""}
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
                          disabled={selectedCpon.some(
                            (p) => p.cponIdVisite === visite.id
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
              name="cponConsultation"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
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
              name="cponCounselling"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">Counselling</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cponInvestigationPhysique"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Investigation Physique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Separator className="my-4" />
            <FormField
              control={form.control}
              name="cponDuree"
              render={({ field }) => (
                <FormItem className="  pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Consultation CPon entre :
                    </FormLabel>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="gap-x-5 items-center"
                    >
                      {TabDuree.map((option) => (
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

          <FormField
            control={form.control}
            name="cponIdClient"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    className="hidden"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Prescripteur (masqué, géré au niveau de la page) */}
          <FormField
            control={form.control}
            name="cponIdUser"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    value={(isPrescripteur ? idUser : selectedPrescripteurId) ?? ""}
                    className="hidden"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-4"
            disabled={form.formState.isSubmitting || isSubmitted}
          >
            {form.formState.isSubmitting ? "En cours..." : isSubmitted ? "Soumis" : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
