"use client";
import { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import {
  createSoinsInfirmier,
  getAllSoinsInfirmierByIdClient,
} from "@/lib/actions/soinsInfirmierActions";
import { SoinsInfirmier, TableName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw } from "lucide-react";
import ConstanteClient from "@/components/constanteClient";
import PrescripteurFieldBlock from "@/components/ui/PrescripteurFieldBlock";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

// Liste alignée sur le tableau 2 du rapport SIG : Médecine Générale.
// Les valeurs sont identiques aux clés détectées dans Medecine.mdgSoins,
// afin d'unifier les sources (Médecine + Soins Infirmiers).
export const TAB_SOINS_INFIRMIER = [
  { value: "pansements", label: "Pansements" },
  { value: "injections", label: "Injections" },
  { value: "perfusions", label: "Perfusion" },
  { value: "autresSoins", label: "Autres Soins" },
  { value: "circoncision", label: "Circoncision Masculine" },
  { value: "suture", label: "Suture de plaie traumatique" },
  { value: "incision", label: "Incision d'abcès" },
  { value: "autresPetiteChirurgie", label: "Autres petites chirurgies" },
] as const;

export default function SoinsInfirmierForm({
  clientId,
  visites,
  isPrescripteur,
  client,
  idUser,
  allPrescripteur,
  selectedPrescripteurId,
}: SharedFormProps) {
  // Mode embarqué (onglet d'une page parent) : si la page parent gère déjà
  // un prescripteur partagé (selectedPrescripteurId fourni), on n'affiche
  // pas notre propre sélecteur pour éviter le doublon. Sinon, on affiche
  // le bloc PrescripteurFieldBlock dans le formulaire (mode standalone).
  const usePageLevelPrescripteur = selectedPrescripteurId !== undefined;
  const [selectedSoins, setSelectedSoins] = useState<SoinsInfirmier[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const { canCreate } = usePermissionContext();

  useEffect(() => {
    if (!clientId) return;
    const fetchData = async () => {
      setIsFormLoading(true);
      try {
        const result = await getAllSoinsInfirmierByIdClient(clientId);
        setSelectedSoins(result as SoinsInfirmier[]);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        setIsFormLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  const form = useForm<SoinsInfirmier>({
    defaultValues: {
      typeSoin: "",
      observations: "",
      idVisite: "",
      idClient: clientId,
      idClinique: client?.idClinique || "",
      idUser: "",
    },
  });

  useEffect(() => {
    form.setValue("idClient", clientId);
    form.setValue("idClinique", client?.idClinique || "");
    if (isPrescripteur) {
      form.setValue("idUser", idUser);
    } else if (usePageLevelPrescripteur && selectedPrescripteurId) {
      form.setValue("idUser", selectedPrescripteurId);
    }
  }, [
    clientId,
    isPrescripteur,
    idUser,
    selectedPrescripteurId,
    usePageLevelPrescripteur,
    client,
    form,
  ]);

  const onSubmit: SubmitHandler<SoinsInfirmier> = async (data) => {
    if (!canCreate(TableName.SOINS_INFIRMIER)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const effectiveIdUser = isPrescripteur
      ? idUser
      : usePageLevelPrescripteur
        ? selectedPrescripteurId || form.getValues("idUser")
        : form.getValues("idUser");
    if (!effectiveIdUser) {
      toast.error(
        usePageLevelPrescripteur
          ? "Veuillez d'abord sélectionner le prestataire en haut de la page"
          : "Veuillez sélectionner le prestataire",
      );
      return;
    }
    if (!data.typeSoin) {
      toast.error("Veuillez sélectionner un type de soin");
      return;
    }
    const formattedData: SoinsInfirmier = {
      ...data,
      idUser: effectiveIdUser,
      idClient: clientId,
      idClinique: client?.idClinique || "",
    };
    try {
      const newRecord = await createSoinsInfirmier(formattedData);
      await updateRecapVisite(
        form.watch("idVisite"),
        effectiveIdUser,
        "18 Fiche Soins Infirmiers",
      );
      setSelectedSoins((prev) => [...prev, newRecord as SoinsInfirmier]);
      toast.success("Formulaire créé avec succès!");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création a échoué");
      console.error("Erreur:", error);
    }
  };

  if (isFormLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full justify-center p-4">
      <ConstanteClient idVisite={form.watch("idVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center mb-6">
        Formulaire de Soins Infirmiers
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col border border-blue-200/50 rounded-lg p-6 gap-4 max-w-md mx-auto bg-white shadow-md shadow-blue-100/30 w-full"
        >
          {/* Sélection visite */}
          <FormField
            control={form.control}
            name="idVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Sélectionnez la visite
                </FormLabel>
                <Select
                  required
                  onValueChange={(value) => {
                    field.onChange(value);
                    setIsSubmitted(false);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Visite à sélectionner ....." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {visites.map((visite) => (
                      <SelectItem
                        key={visite.id}
                        value={visite.id}
                        disabled={selectedSoins.some(
                          (s) => s.idVisite === visite.id,
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

          {/* Type de soin */}
          <div className="flex flex-col shadow-sm border border-blue-200/50 rounded-md p-3">
            <div className="font-sans">
              <div className="text-base font-bold mb-3 flex justify-between items-center">
                <FormLabel className="text-blue-900">Type de soin</FormLabel>
                <RefreshCw
                  onClick={() => form.setValue("typeSoin", "")}
                  className="hover:text-blue-600 cursor-pointer transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                />
              </div>
              <FormField
                control={form.control}
                name="typeSoin"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        className="grid grid-cols-1 gap-y-2"
                      >
                        {TAB_SOINS_INFIRMIER.map((option) => (
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
          </div>

          {/* Observations */}
          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Observations / Remarques
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Détails complémentaires (zone, matériel utilisé, suivi attendu, etc.)"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Prestataire :
              - User est prescripteur OU page parent gère le prescripteur
                → champ caché, valeur injectée par la page/session
              - Sinon (mode standalone) → bloc PrescripteurFieldBlock visible */}
          {isPrescripteur || usePageLevelPrescripteur ? (
            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      value={
                        (isPrescripteur ? idUser : selectedPrescripteurId) ?? ""
                      }
                      className="hidden"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PrescripteurFieldBlock
                      instanceId="soins-infirmier-prescripteur"
                      prescripteurs={allPrescripteur}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Champ caché : idClient */}
          <FormField
            control={form.control}
            name="idClient"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={clientId} className="hidden" />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="my-2 mx-auto block"
            disabled={form.formState.isSubmitting || isSubmitted}
          >
            {form.formState.isSubmitting
              ? "En cours..."
              : isSubmitted
                ? "Soumis"
                : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
