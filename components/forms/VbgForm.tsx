"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Vbg, TableName } from "@prisma/client";
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
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { createVbg, getAllVbgByIdClient } from "@/lib/actions/vbgActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

const TabTypeVbg = [
  { value: "viol", label: "Viol" },
  { value: "agressionsSexuelles", label: "Agressions Sexuelles" },
  { value: "agressionsPhysiques", label: "Agressions Physiques" },
  { value: "mariageForce", label: "Mariage Forcé" },
  { value: "deniRessources", label: "Dénis de Ressources" },
  { value: "maltraitancePsychologique", label: "Maltraitance Psychologique" },
];

const tabPec = [
  { value: "pec", label: "PEC" },
  { value: "refere", label: "Référé" },
];

export default function VbgForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
}: SharedFormProps) {

  const [selectedVbg, setSelectedVbg] = useState<Vbg[]>([]);
  const { canCreate } = usePermissionContext();
  const [isFormLoading, setIsFormLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsFormLoading(true);
      try {
        const resultVbg = await getAllVbgByIdClient(clientId);
        setSelectedVbg(resultVbg as Vbg[]);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        setIsFormLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  const form = useForm<Vbg>();

  useEffect(() => {
    form.setValue("vbgIdClient", clientId);
    if (isPrescripteur) {
      form.setValue("vbgIdUser", idUser);
    }
  }, [clientId, isPrescripteur, idUser]);

  const onSubmit: SubmitHandler<Vbg> = async (data) => {
    if (!canCreate(TableName.VBG)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      vbgType: form.getValues("vbgType") ?? "",
      vbgDuree: Number(form.getValues("vbgDuree")) || 0,
      vbgConsultation: form.getValues("vbgConsultation") ?? "",
      vbgCounsellingRelation:
        form.getValues("vbgCounsellingRelation") ?? false,
      vbgCounsellingViolenceSexuel:
        form.getValues("vbgCounsellingViolenceSexuel") ?? false,
      vbgCounsellingViolencePhysique:
        form.getValues("vbgCounsellingViolencePhysique") ?? false,
      vbgCounsellingSexuelite:
        form.getValues("vbgCounsellingSexuelite") ?? false,
      vbgPreventionViolenceSexuelle:
        form.getValues("vbgPreventionViolenceSexuelle") ?? false,
      vbgPreventionViolencePhysique:
        form.getValues("vbgPreventionViolencePhysique") ?? false,
      vbgIdUser: form.getValues("vbgIdUser") ?? "",
      vbgIdClient: clientId ?? form.getValues("vbgIdClient") ?? "",
      vbgIdVisite: form.getValues("vbgIdVisite") ?? "",
      vbgIdClinique: client?.idClinique || "",
    };
    try {
      await createVbg(formattedData as Vbg);
      await updateRecapVisite(
        form.watch("vbgIdVisite"),
        form.watch("vbgIdUser"),
        "16 Fiche Vbg",
      );
      toast.success("Formulaire créer avec succès! 🎉");
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création:", error);
    }
  };

  const consultationValue = form.watch("vbgConsultation");

  if (isFormLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("vbgIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Vbg
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md shadow-blue-100/30 border border-blue-200/50"
        >
          <FormField
            control={form.control}
            name="vbgIdVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez la visite
                </FormLabel>
                <Select required onValueChange={field.onChange}>
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
                        disabled={selectedVbg.some(
                          (p) => p.vbgIdVisite === visite.id,
                        )}
                      >
                        {new Date(visite.dateVisite).toLocaleDateString(
                          "fr-FR",
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="my-2 p-3 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="vbgType"
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
                      {TabTypeVbg.map((option) => (
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
              name="vbgDuree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duree écoulée en (heures)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value}
                      placeholder="28"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex w-full flex-col gap-5 my-2">
            <FormField
              control={form.control}
              name="vbgConsultation"
              render={({ field }) => (
                <FormItem className="flex items-center gap-5 mt-2 w-full">
                  <FormLabel className="whitespace-nowrap">
                    Consultation :
                  </FormLabel>
                  <FormControl className="flex flex-row gap-x-5 items-center">
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      className="flex gap-x-5 items-center"
                    >
                      {tabPec.map((option) => (
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
          </div>
          <div>
            {consultationValue === "pec" && (
              <div className="my-2 shadow-sm border-blue-200/50 rounded-md">
                <FormField
                  control={form.control}
                  name="vbgCounsellingRelation"
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
                          Counselling - Relation Sexuelle
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vbgCounsellingViolenceSexuel"
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
                          Counselling - Violence Sexuelle
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vbgCounsellingViolencePhysique"
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
                          Counselling - Violence Physique
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vbgCounsellingSexuelite"
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
                          Counseling - Sexualité
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <Separator className="my-3" />
                <FormField
                  control={form.control}
                  name="vbgPreventionViolenceSexuelle"
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
                          Prévention - Violence Sexuelle
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vbgPreventionViolencePhysique"
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
                          Prévention - Violence Physique
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="vbgIdClient"
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
              name="vbgIdUser"
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
              name="vbgIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le prescripteur
                  </FormLabel>
                  <Select
                    required
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez un prescripteur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allPrescripteur.map((prescripteur) => (
                        <SelectItem
                          key={prescripteur.id}
                          value={prescripteur.id}
                        >
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

          <div className="flex flex-row justify-center py-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "En cours..." : "Soumettre"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
