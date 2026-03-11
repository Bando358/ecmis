"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { useSession } from "next-auth/react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Client,
  Grossesse,
  TableName,
  Visite,
} from "@prisma/client";
import { SafeUser } from "@/types/prisma";
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
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { ArrowBigLeftDash } from "lucide-react";

const TabHta = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
];
// grossesseId
export default function GrossessePage({
  params,
}: {
  params: Promise<{ grossesseId: string }>;
}) {
  const { grossesseId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedGrossesse, setSelectedGrossesse] = useState<Grossesse[]>([]);
  const [client, setClient] = useState<Client | null>(null);

  const [prescripteur, setPrescripteur] = useState<SafeUser>();
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const { canCreate } = usePermissionContext();
  const [isLoading, setIsLoading] = useState(true);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idUser || !grossesseId) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Étape 1: Requêtes indépendantes en parallèle
        const [user, resultGrossesse, resultVisites, cliniqueClient] = await Promise.all([
          getOneUser(idUser),
          getAllGrossesseByIdClient(grossesseId),
          getAllVisiteByIdClient(grossesseId),
          getOneClient(grossesseId),
        ]);

        setIsPrescripteur(user?.prescripteur ? true : false);
        setPrescripteur(user!);
        setSelectedGrossesse(resultGrossesse as Grossesse[]);
        setVisites(resultVisites as Visite[]);
        setClient(cliniqueClient);

        // Étape 2: Requêtes dépendantes en parallèle
        const allPrestataire = cliniqueClient?.idClinique
          ? await getAllUserIncludedIdClinique(cliniqueClient.idClinique)
          : [];

        setAllPrescripteur(allPrestataire as SafeUser[]);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [idUser, grossesseId]);

  // console.log(visites);

  useEffect(() => {
    form.setValue("grossesseIdClient", grossesseId);
  }, [grossesseId]);

  const form = useForm<Grossesse>();

  // Calcul automatique bidirectionnel : âge ↔ DDR → terme prévu
  const watchedAge = form.watch("grossesseAge");
  const watchedVisite = form.watch("grossesseIdVisite");
  const watchedDdr = form.watch("grossesseDdr");
  const calcSource = useRef<"age" | "ddr" | null>(null);

  // Quand grossesseAge change → calculer DDR et terme prévu
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

  // Quand grossesseDdr change → calculer âge et terme prévu
  useEffect(() => {
    if (calcSource.current === "age") return;
    const ddrStr = watchedDdr as unknown as string;
    if (!watchedVisite || !ddrStr) return;

    const visite = visites.find((v) => v.id === watchedVisite);
    if (!visite) return;

    const ddr = new Date(ddrStr);
    const dateVisite = new Date(visite.dateVisite);
    if (isNaN(ddr.getTime())) return;

    const diffDays = Math.floor((dateVisite.getTime() - ddr.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return;
    const ageWeeks = parseFloat((diffDays / 7).toFixed(1));

    const terme = new Date(ddr);
    terme.setDate(terme.getDate() + 280);

    const toDateStr = (d: Date) => d.toISOString().split("T")[0];

    calcSource.current = "ddr";
    form.setValue("grossesseAge", ageWeeks as unknown as number);
    form.setValue("termePrevu", toDateStr(terme) as unknown as Date);
    calcSource.current = null;
  }, [watchedDdr, watchedVisite, visites]);

  const onSubmit: SubmitHandler<Grossesse> = async (data) => {
    if (!canCreate(TableName.GROSSESSE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      grossesseIdUser: idUser,
      grossesseIdVisite: form.getValues("grossesseIdVisite"),
      // idClient: form.getValues("idClient"),
      grossesseDdr: data.grossesseDdr ? new Date(data.grossesseDdr) : null,
      termePrevu: data.termePrevu ? new Date(data.termePrevu) : null,
      grossesseAge: parseFloat(data.grossesseAge as unknown as string) || 0,
      grossesseParite: parseInt(data.grossesseParite as unknown as string, 10),
      grossesseGestite: parseInt(
        data.grossesseGestite as unknown as string,
        10
      ),
      grossesseIdClinique: client?.idClinique || "",
    };
    try {
      await createGrossesse(formattedData);
      await updateRecapVisite(
        form.watch("grossesseIdVisite"),
        form.watch("grossesseIdUser"),
        "06 Fiche grossesse"
      );
      toast.success("Formulaire créer avec succès! 🎉");
      console.log("formattedData : ", formattedData);
      router.push(`/fiches/${grossesseId}`);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de la Grossesse:", error);
    }
  };

  // Affichage du loader pendant le chargement
  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sticky top-0 left-4 ml-3"
              onClick={() => router.back()}
            >
              <ArrowBigLeftDash className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Retour à la page précédente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
        <ConstanteClient idVisite={form.watch("grossesseIdVisite")} />
        <h2 className="text-2xl text-blue-900 font-black text-center">
          {`Formulaire de Création de Grossesse`}
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-3xl rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
          >
            <FormField
              control={form.control}
              name="grossesseIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez la visite
                  </FormLabel>
                  <Select
                    required
                    // value={field.value}
                    onValueChange={field.onChange}
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
                          disabled={selectedGrossesse.some(
                            (p) => p.grossesseIdVisite === visite.id
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
            <div className="my-2 px-4 py-2 shadow-sm border-blue-200/50 rounded-md">
              <Label>Patologies Antécédentes</Label>
              <div className="flex flex-row justify-between">
                <FormField
                  control={form.control}
                  name="grossesseHta"
                  render={({ field }) => (
                    <FormItem className="  pb-4">
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
                    <FormItem className="  pb-4">
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

            {isPrescripteur === true ? (
              <FormField
                control={form.control}
                name="grossesseIdUser"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        value={idUser ?? ""}
                        onChange={field.onChange}
                        className="hidden"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="grossesseIdUser"
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
                        {allPrescripteur.map((prescripteur) => (
                          <SelectItem
                            key={prescripteur.id}
                            value={prescripteur.id ?? ""}
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

            <Button
              type="submit"
              className="mt-4"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "En cours..."
                : "Créer la Grossesse"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
