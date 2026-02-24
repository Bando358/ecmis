"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllCponByIdClient, createCpon } from "@/lib/actions/cponActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { useSession } from "next-auth/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Client,
  Cpon,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/components/ClientContext";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { ArrowBigLeftDash } from "lucide-react";

const TabDuree = [
  { value: "6_72", label: "Les 6 et 72 heures" },
  { value: "4_10", label: "Les 4 jrs et 10 jours" },
  { value: "10_6", label: "Les 10 jrs et < 6 semaines " },
  { value: "6_8", label: "Les 6 semaines et  8 semaines " },
];
// cponId
export default function CponPage({
  params,
}: {
  params: Promise<{ cponId: string }>;
}) {
  const { cponId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedCpon, setSelectedCpon] = useState<Cpon[]>([]);

  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const { canCreate } = usePermissionContext();

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(cponId);
  }, [cponId, setSelectedClientId]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();
  useEffect(() => {
    if (!idUser) return;
    const fetchData = async () => {
      // Wave 1: all independent calls in parallel
      const [user, resultCpon, resultVisites, cliniqueClient] = await Promise.all([
        getOneUser(idUser),
        getAllCponByIdClient(cponId),
        getAllVisiteByIdClient(cponId),
        getOneClient(cponId),
      ]);

      setPrescripteur(user!);
      setIsPrescripteur(!!user?.prescripteur);
      setSelectedCpon(resultCpon as Cpon[]);
      setVisites(resultVisites as Visite[]);
      setClient(cliniqueClient);

      // Wave 2: depends on client
      if (cliniqueClient?.idClinique) {
        const prescripteurs = await getAllUserIncludedIdClinique(cliniqueClient.idClinique);
        setAllPrescripteur(prescripteurs as User[]);
      }
    };
    fetchData();
  }, [cponId, idUser]);

  // Fonction pour récupérer et définir l'état IMC

  const form = useForm<Cpon>({
    defaultValues: {
      cponIdVisite: "",
      cponConsultation: true,
      cponCounselling: true,
      cponInvestigationPhysique: true,
      cponIdClient: cponId,
      cponIdClinique: client?.idClinique || "",
    },
  });
  const onSubmit: SubmitHandler<Cpon> = async (data) => {
    if (!canCreate(TableName.CPON)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      cponIdUser: form.getValues("cponIdUser"),
      cponIdClient: form.getValues("cponIdClient"),
      cponIdVisite: form.getValues("cponIdVisite"),
      cponIdClinique: client?.idClinique || "",
    };
    console.log(formattedData);
    try {
      await createCpon(formattedData);
      await updateRecapVisite(
        form.watch("cponIdVisite"),
        form.watch("cponIdUser"),
        "10 Fiche CPoN"
      );
      console.log(formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${cponId}`);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de Cpon:", error);
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
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md">
        <ConstanteClient idVisite={form.watch("cponIdVisite")} />
        <h2 className="text-2xl text-blue-900 font-black text-center">
          {`Formulaire de consultation CPoN`}
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
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
                      onValueChange={field.onChange}
                      value={field.value ?? ""} // <-- IMPORTANT
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

            {isPrescripteur === true ? (
              <FormField
                control={form.control}
                name="cponIdUser"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        value={idUser ?? ""}
                        className="hidden"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="cponIdUser"
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
                          <SelectValue placeholder="Select Prescripteur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allPrescripteur.map((prescipteur, index) => (
                          <SelectItem key={index} value={prescipteur.id}>
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

            <Button
              type="submit"
              className="mt-4"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "En cours..." : "Soumettre"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
