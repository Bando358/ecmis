"use client";
import { useEffect, useRef, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Grossesse, TableName } from "@prisma/client";
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
import { Label } from "@/components/ui/label";
import ConstanteClient from "@/components/constanteClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  createGrossesse,
  getAllGrossesseByIdClient,
} from "@/lib/actions/grossesseActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

const TabHta = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];

export default function GrossesseForm({
  clientId,
  visites,
  allPrescripteur,
  isPrescripteur,
  client,
  idUser,
  selectedPrescripteurId,
  initialGrossesses,
  onGrossesseCreated,
}: SharedFormProps) {

  const [selectedGrossesse, setSelectedGrossesse] = useState<Grossesse[]>(initialGrossesses || []);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { canCreate } = usePermissionContext();
  const [isFormLoading, setIsFormLoading] = useState(!initialGrossesses);

  useEffect(() => {
    if (initialGrossesses) return;
    const fetchData = async () => {
      setIsFormLoading(true);
      try {
        const resultGrossesse = await getAllGrossesseByIdClient(clientId);
        setSelectedGrossesse(resultGrossesse as Grossesse[]);
      } catch (error) {
        console.error("Erreur lors du chargement des grossesses:", error);
      } finally {
        setIsFormLoading(false);
      }
    };
    fetchData();
  }, [clientId, initialGrossesses]);

  const form = useForm<Grossesse>();

  useEffect(() => {
    form.setValue("grossesseIdClient", clientId);
  }, [clientId]);

  useEffect(() => {
    if (isPrescripteur && idUser) {
      form.setValue("grossesseIdUser", idUser);
    } else if (selectedPrescripteurId) {
      form.setValue("grossesseIdUser", selectedPrescripteurId);
    }
  }, [isPrescripteur, idUser, selectedPrescripteurId, form]);

  // Calcul automatique bidirectionnel : âge ↔ DDR → terme prévu
  const watchedAge = form.watch("grossesseAge");
  const watchedVisite = form.watch("grossesseIdVisite");
  const watchedDdr = form.watch("grossesseDdr");
  const calcSource = useRef<"age" | "ddr" | null>(null);

  useEffect(() => {
    if (calcSource.current === "ddr") return;
    const ageWeeks = parseFloat(watchedAge as unknown as string);
    if (!watchedVisite || !ageWeeks || ageWeeks <= 0) return;

    const visite = visites.find((v) => v.id === watchedVisite);
    if (!visite) return;

    const dateVisite = new Date(visite.dateVisite);
    const ddr = new Date(dateVisite);
    ddr.setDate(ddr.getDate() - ageWeeks * 7);

    const terme = new Date(ddr);
    terme.setDate(terme.getDate() + 280);

    const toDateStr = (d: Date) => d.toISOString().split("T")[0];

    calcSource.current = "age";
    form.setValue("grossesseDdr", toDateStr(ddr) as unknown as Date);
    form.setValue("termePrevu", toDateStr(terme) as unknown as Date);
    calcSource.current = null;
  }, [watchedAge, watchedVisite, visites]);

  useEffect(() => {
    if (calcSource.current === "age") return;
    const ddrStr = watchedDdr as unknown as string;
    if (!watchedVisite || !ddrStr) return;

    const visite = visites.find((v) => v.id === watchedVisite);
    if (!visite) return;

    const ddr = new Date(ddrStr);
    const dateVisite = new Date(visite.dateVisite);
    if (isNaN(ddr.getTime())) return;

    const diffDays = Math.floor(
      (dateVisite.getTime() - ddr.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) return;
    const ageWeeks = parseFloat((diffDays / 7).toFixed(1));

    const terme = new Date(ddr);
    terme.setDate(terme.getDate() + 280);

    const toDateStr = (d: Date) => d.toISOString().split("T")[0];

    calcSource.current = "ddr";
    form.setValue("grossesseAge", Math.round(ageWeeks) as unknown as number);
    form.setValue("termePrevu", toDateStr(terme) as unknown as Date);
    calcSource.current = null;
  }, [watchedDdr, watchedVisite, visites]);

  const onSubmit: SubmitHandler<Grossesse> = async (data) => {
    if (!canCreate(TableName.GROSSESSE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }

    const ddrValue = data.grossesseDdr
      ? new Date(data.grossesseDdr + "T00:00:00")
      : null;
    const termeValue = data.termePrevu
      ? new Date(data.termePrevu + "T00:00:00")
      : null;

    const effectiveIdUser = isPrescripteur
      ? idUser
      : selectedPrescripteurId || form.getValues("grossesseIdUser") || idUser;
    const formattedData = {
      ...data,
      grossesseIdUser: effectiveIdUser,
      grossesseIdVisite: form.getValues("grossesseIdVisite"),
      grossesseDdr: ddrValue,
      termePrevu: termeValue,
      grossesseAge: Number(data.grossesseAge) || 0,
      grossesseParite: parseInt(data.grossesseParite as unknown as string, 10),
      grossesseGestite: parseInt(
        data.grossesseGestite as unknown as string,
        10,
      ),
      grossesseIdClinique: client?.idClinique || "",
    };
    try {
      const newGrossesse = await createGrossesse(formattedData);
      await updateRecapVisite(
        form.watch("grossesseIdVisite"),
        effectiveIdUser,
        "06 Fiche grossesse",
      );
      setSelectedGrossesse((prev) => [...prev, newGrossesse as Grossesse]);
      onGrossesseCreated?.(newGrossesse as Grossesse);
      toast.success("Formulaire créer avec succès! 🎉");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de la Grossesse:", error);
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
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
      <ConstanteClient idVisite={form.watch("grossesseIdVisite")} />
      <h2 className="text-2xl text-blue-900 font-black text-center">
        Formulaire de Création de Grossesse
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-6xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
        >
          <FormField
            control={form.control}
            name="grossesseIdVisite"
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
                        disabled={selectedGrossesse.some(
                          (p) => p.grossesseIdVisite === visite.id,
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

          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <Label>Patologies Antécédentes</Label>
            <div className="flex flex-row justify-between">
              <FormField
                control={form.control}
                name="grossesseHta"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">HTA :</FormLabel>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        className="flex gap-x-5 items-center"
                      >
                        {TabHta.map((option) => (
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
              <Separator
                orientation="vertical"
                className="mx-2 bg-gray-400"
              />
              <FormField
                control={form.control}
                name="grossesseDiabete"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">Diabète :</FormLabel>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        className="flex gap-x-5 items-center"
                      >
                        {TabHta.map((option) => (
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
          <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="grossesseGestite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center">
                  <FormLabel className="flex-1">Gestité :</FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      required
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grossesseParite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center">
                  <FormLabel className="flex-1">Parité :</FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      required
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="my-2 px-4 py-2 flex flex-col shadow-sm border-blue-200/50 rounded-md">
            <FormField
              control={form.control}
              name="grossesseAge"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center">
                  <FormLabel className="flex-1">Âge en Semaine :</FormLabel>
                  <FormControl>
                    <Input
                      className="flex-1"
                      required
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mb-3 flex flex-row items-center">
              <label className="block text-sm flex-1 font-medium">
                D.D.R :
              </label>
              <Input
                {...form.register("grossesseDdr")}
                className="mt-1 px-3 py-1 flex-1 w-full rounded-md border border-slate-200"
                type="date"
              />
            </div>
            <div className="flex flex-row items-center">
              <label className="block text-sm flex-1 font-medium">
                Terme prévu :
              </label>
              <Input
                {...form.register("termePrevu")}
                className="mt-1 px-3 py-1 flex-1 w-full rounded-md border border-slate-200"
                type="date"
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="grossesseIdClient"
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
            name="grossesseIdUser"
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
            className="mt-4"
            disabled={form.formState.isSubmitting || isSubmitted}
          >
            {form.formState.isSubmitting
              ? "En cours..."
              : isSubmitted ? "Soumis" : "Créer la Grossesse"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
