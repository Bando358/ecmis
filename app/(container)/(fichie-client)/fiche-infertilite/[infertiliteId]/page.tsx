"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";

import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import {
  createInfertilite,
  getAllInfertiliteByIdClient,
} from "@/lib/actions/infertiliteActions";

import { useSession } from "next-auth/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Client,
  Infertilite,
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
import ConstanteClient from "@/components/constanteClient";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowBigLeftDash, RefreshCw } from "lucide-react";
import { getOneClient } from "@/lib/actions/clientActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
// import { Separator } from "@/components/ui/separator";

const TabTraitement = [
  { value: "medicale", label: "Médicale" },
  { value: "hormonale", label: "Hormonale / Ovulation" },
];

export default function IstPage({
  params,
}: {
  params: Promise<{ infertiliteId: string }>;
}) {
  const { infertiliteId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedInfertilite, setSelectedInfertilite] = useState<Infertilite[]>(
    []
  );
  const [prescripteur, setPrescripteur] = useState<SafeUser>();
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const { canCreate } = usePermissionContext();

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(infertiliteId);
  }, [infertiliteId, setSelectedClientId]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    if (!idUser) return;
    const fetchData = async () => {
      // Wave 1: all independent calls in parallel
      const [user, resultInfertilite, resultVisites, cliniqueClient] = await Promise.all([
        getOneUser(idUser),
        getAllInfertiliteByIdClient(infertiliteId),
        getAllVisiteByIdClient(infertiliteId),
        getOneClient(infertiliteId),
      ]);

      setPrescripteur(user!);
      setIsPrescripteur(!!user?.prescripteur);
      setSelectedInfertilite(resultInfertilite);
      setVisites(resultVisites as Visite[]);
      setClient(cliniqueClient);

      // Wave 2: depends on client
      if (cliniqueClient?.idClinique) {
        const prescripteurs = await getAllUserIncludedIdClinique(cliniqueClient.idClinique);
        setAllPrescripteur(prescripteurs as SafeUser[]);
      }
    };
    fetchData();
  }, [infertiliteId, idUser]);

  // console.log(visites);
  useEffect(() => {
    form.setValue("infertIdClient", infertiliteId);
  }, [infertiliteId]);

  const form = useForm<Infertilite>();
  const onSubmit: SubmitHandler<Infertilite> = async (data) => {
    if (!canCreate(TableName.INFERTILITE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      infertIdUser: form.getValues("infertIdUser"),
      infertIdClient: form.getValues("infertIdClient"),
      infertIdVisite: form.getValues("infertIdVisite"),
      infertIdClinique: client?.idClinique ?? "",
    };
    console.log(formattedData);
    try {
      await createInfertilite(formattedData as Infertilite);
      console.log(formattedData);
      await updateRecapVisite(
        form.watch("infertIdVisite"),
        form.watch("infertIdUser"),
        "13 Fiche Infertilité"
      );
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${infertiliteId}`);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    }
  };

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
      <div className="flex flex-col w-full justify-center max-w-2xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
        <ConstanteClient idVisite={form.watch("infertIdVisite")} />
        <h2 className="text-2xl text-blue-900 font-black text-center">
          {"Formulaire d'Infertilité"}
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-3xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md shadow-blue-100/30 border border-blue-200/50"
          >
            <FormField
              control={form.control}
              name="infertIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez la visite .....
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
                          disabled={selectedInfertilite.some(
                            (p) => p.infertIdVisite === visite.id
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

            <div className="my-2 shadow-sm border-blue-200/50 rounded-md ">
              <FormField
                control={form.control}
                name="infertConsultation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">Consulation</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="infertCounselling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md px-4 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">Counselling</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* <Separator /> */}
              <FormField
                control={form.control}
                name="infertExamenPhysique"
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
                        Investigation - Examen Physique
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="infertTraitement"
                render={({ field }) => (
                  <FormItem className=" px-4 pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">
                        Type de traitement:
                      </FormLabel>
                      <RefreshCw
                        onClick={() => {
                          form.setValue("infertTraitement", "");
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
                        {TabTraitement.map((option) => (
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
            <FormField
              control={form.control}
              name="infertIdClient"
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
                name="infertIdUser"
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
                name="infertIdUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez le precripteur .....
                    </FormLabel>
                    <Select
                      required
                      // value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Prescripteur ....." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allPrescripteur.map((prescipteur) => (
                          <SelectItem
                            key={prescipteur.id}
                            value={prescipteur.id}
                          >
                            <span>{prescipteur.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-center py-2">
              <Button
                type="submit"
                className="mx-auto"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Soumettre..." : "Soumettre"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
