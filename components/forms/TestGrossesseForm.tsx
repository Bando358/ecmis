"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import {
  getAllTestGrossesseByIdClient,
  createTestGrossesse,
} from "@/lib/actions/testActions";
import { TestGrossesse, TableName } from "@prisma/client";
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
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

const TabTest = [
  { value: "positif", label: "Positif" },
  { value: "negatif", label: "Negatif" },
];

export default function TestGrossesseForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
  selectedPrescripteurId,
}: SharedFormProps) {
  const [selectedTest, setSelectedTest] = useState<TestGrossesse[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { canCreate } = usePermissionContext();

  const form = useForm<TestGrossesse>({
    defaultValues: {
      testIdVisite: "",
      testIdUser: "",
      testIdClient: clientId || "",
      testIdClinique: client?.idClinique || "",
      testResultat: "",
    },
  });


  // Set idUser in form when available
  useEffect(() => {
    if (isPrescripteur && idUser) {
      form.setValue("testIdUser", idUser);
    } else if (selectedPrescripteurId) {
      form.setValue("testIdUser", selectedPrescripteurId);
    }
  }, [idUser, isPrescripteur, selectedPrescripteurId, form]);

  useEffect(() => {
    form.setValue("testIdClient", clientId);
  }, [clientId, form]);

  // Form-specific fetch: test grossesse data
  useEffect(() => {
    if (!clientId) return;
    const fetchTests = async () => {
      try {
        const resultTest = await getAllTestGrossesseByIdClient(clientId);
        setSelectedTest(resultTest as TestGrossesse[]);
      } catch (error) {
        console.error("Erreur lors du chargement des tests:", error);
      }
    };
    fetchTests();
  }, [clientId]);

  const onSubmit: SubmitHandler<TestGrossesse> = async (data) => {
    if (!canCreate(TableName.TEST_GROSSESSE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const effectiveIdUser = isPrescripteur
      ? idUser
      : selectedPrescripteurId || form.getValues("testIdUser") || idUser;
    const formattedData = {
      ...data,
      testIdUser: effectiveIdUser,
      testIdClient: form.getValues("testIdClient"),
      testIdVisite: form.getValues("testIdVisite"),
      testIdClinique: client?.idClinique || "",
    };
    console.log("formattedData : ", formattedData);
    try {
      const newRecord = await createTestGrossesse(formattedData);
      await updateRecapVisite(
        form.watch("testIdVisite"),
        effectiveIdUser,
        "07 Fiche Test TBG"
      );
      setSelectedTest((prev) => [...prev, newRecord as TestGrossesse]);
      toast.success("Formulaire creer avec succes! 🎉");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La creation de la Grossesse a echoue");
      console.error("Erreur lors de la creation de la Grossesse:", error);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("testIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        {`Formulaire de Test de Grossesse`}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="testIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selectionnez la visite</FormLabel>
                  <Select required onValueChange={(value) => { field.onChange(value); setIsSubmitted(false); }}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Visite a selectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visites.map((visite) => {
                        const dateStr = new Date(
                          visite.dateVisite
                        ).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        });
                        return (
                          <SelectItem
                            key={visite.id}
                            value={visite.id}
                            disabled={selectedTest.some(
                              (p) => p.testIdVisite === visite.id
                            )}
                          >
                            {dateStr}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="my-4" />
            <FormField
              control={form.control}
              name="testResultat"
              render={({ field }) => (
                <FormItem className="  pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Resultat test de grossesse :
                    </FormLabel>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={
                        typeof field.value === "string" ? field.value : ""
                      }
                      className="gap-x-5 items-center grid-cols-3"
                    >
                      {TabTest.map((option) => (
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
            name="testIdClient"
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
            name="testIdUser"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={(isPrescripteur ? idUser : selectedPrescripteurId) ?? ""} className="hidden" />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-4 mx-auto block"
            disabled={form.formState.isSubmitting || isSubmitted}
          >
            {form.formState.isSubmitting ? "En cours..." : isSubmitted ? "Soumis" : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
