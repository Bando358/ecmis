"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { ArrowBigLeftDash, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getAllGrossesseByIdClient } from "@/lib/actions/grossesseActions";
import {
  getAllObstetriqueByIdClient,
  createObstetrique,
  getEtatImcByIdVisite,
} from "@/lib/actions/obstetriqueActions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Client,
  Grossesse,
  Obstetrique,
  Permission,
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
import { Label } from "@/components/ui/label";
import ConstanteClient from "@/components/constanteClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/components/ClientContext";
import { useSession } from "next-auth/react";
import { getOneClient } from "@/lib/actions/clientActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const TabEtatGrossesse = [
  { value: "normal", label: "Normal" },
  { value: "risque", label: "A risque" },
];
const TabVat = [
  { value: "vat1", label: "VAT 1" },
  { value: "vat2", label: "VAT 2" },
  { value: "vat3", label: "VAT 3" },
  { value: "vat4", label: "VAT 4" },
  { value: "vat5", label: "VAT 5+" },
];
const TabSp = [
  { value: "sp1", label: "SP 1" },
  { value: "sp2", label: "SP 2" },
  { value: "sp3", label: "SP 3" },
  { value: "sp4", label: "SP 4" },
  { value: "sp5", label: "SP 5+" },
];
const TabCpn = [
  { value: "cpn1", label: "CPN 1" },
  { value: "cpn2", label: "CPN 2" },
  { value: "cpn3", label: "CPN 3" },
  { value: "cpn4", label: "CPN 4" },
  { value: "cpn5", label: "CPN 5+" },
];

export default function ObstetriquePage({
  params,
}: {
  params: Promise<{ obstetriqueId: string }>;
}) {
  const { obstetriqueId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossesses, setGrossesses] = useState<Grossesse[]>([]);
  const [styleImc, setStyleImc] = useState<string>("");
  const [selectedObstetrique, setSelectedObstetrique] = useState<Obstetrique[]>(
    []
  );
  const [prescripteur, setPrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(obstetriqueId);
  }, [obstetriqueId, setSelectedClientId]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!prescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(prescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.OBSTETRIQUE
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [prescripteur]);

  useEffect(() => {
    const fetchData = async () => {
      const resultObstetrique = await getAllObstetriqueByIdClient(
        obstetriqueId
      );
      setSelectedObstetrique(resultObstetrique as Obstetrique[]);
      const result = await getAllVisiteByIdClient(obstetriqueId);
      setVisites(result as Visite[]);

      const resultGrossesse = await getAllGrossesseByIdClient(obstetriqueId);
      setGrossesses(resultGrossesse as Grossesse[]);
      const cliniqueClient = await getOneClient(obstetriqueId);
      setClient(cliniqueClient);
      let allPrestataire: User[] = [];
      if (cliniqueClient?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(
          cliniqueClient.idClinique
        );
      }
      setAllPrescripteur(allPrestataire as User[]);
    };
    fetchData();
  }, [obstetriqueId]);

  const handleVisiteChange = async (idVisite: string) => {
    try {
      form.setValue("obstIdVisite", idVisite);
      const etatImc = await getEtatImcByIdVisite(idVisite);
      form.setValue("obstEtatNutritionnel", etatImc || "");
      if (etatImc && etatImc === "Maigreur") {
        setStyleImc("text-yellow-500 font-black");
      } else if (etatImc && etatImc === "Poids normal") {
        setStyleImc("text-green-500 font-black");
      } else if (etatImc && etatImc === "Surpoids") {
        setStyleImc("text-orange-500 font-black");
      } else {
        setStyleImc("text-red-600 font-black");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'état IMC :", error);
      toast.error("Impossible de récupérer l'état IMC.");
    }
  };

  useEffect(() => {
    form.setValue("obstIdClient", obstetriqueId);
  }, [obstetriqueId]);

  const form = useForm<Obstetrique>({
    defaultValues: {
      obstRdv: null,
      obstIdVisite: "",
      obstIdGrossesse: "",
      obstTypeVisite: "",
      obstSp: "",
      obstVat: "",
      obstFer: false,
      obstFolate: false,
      obstDeparasitant: false,
      obstMilda: false,
      obstConsultation: true,
      obstCounselling: true,
      obstInvestigations: false,
      obstEtatNutritionnel: "",
      obstEtatGrossesse: "",
      obstPfppi: false,
      obstAlbuminieSucre: false,
      obstAnemie: false,
      obstSyphilis: false,
      obstAghbs: false,
      obstIdClient: obstetriqueId,
      obstIdUser: isPrescripteur === true ? idUser || "" : "",
      obstIdClinique: client?.idClinique || "",
    },
  });

  const onSubmit: SubmitHandler<Obstetrique> = async (data) => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une CPN. Contactez un administrateur."
      );
      return router.back();
    }
    // Ensure obstRdv is a Date (Prisma DateTime maps to JS Date in generated types)
    const rawRdv = form.getValues("obstRdv");
    const obstRdvDate: Date | null = rawRdv
      ? typeof rawRdv === "string"
        ? // if it's a date-only string like '2025-11-10', create a Date at start of day
          new Date(rawRdv)
        : rawRdv instanceof Date
        ? rawRdv
        : // fallback: coerce to Date
          new Date(String(rawRdv))
      : null;

    const formattedData = {
      ...data,
      obstIdVisite: form.getValues("obstIdVisite"),
      obstIdUser: form.getValues("obstIdUser"),
      obstIdClient: form.getValues("obstIdClient"),
      obstRdv: obstRdvDate,
      obstIdClinique: client?.idClinique || "",
    };
    console.log("formattedData : ", formattedData);
    try {
      await createObstetrique(formattedData);
      await updateRecapVisite(
        form.watch("obstIdVisite"),
        form.watch("obstIdUser"),
        "08 Fiche CPN"
      );
      console.log("formattedData : ", formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${obstetriqueId}`);
    } catch (error) {
      toast.error("La création de la Grossesse a échoué");
      console.error("Erreur lors de la création de la Grossesse:", error);
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
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
        <ConstanteClient idVisite={form.getValues("obstIdVisite")} />
        <h2 className="text-2xl text-gray-600 font-black text-center">
          {`Formulaire de Consultation Obstétricale`}
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-4xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
          >
            <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
              <FormField
                control={form.control}
                name="obstIdVisite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez la visite
                    </FormLabel>
                    <Select
                      required
                      value={field.value || ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleVisiteChange(value);
                      }}
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
                            disabled={selectedObstetrique.some(
                              (p) => p.obstIdVisite === visite.id
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
                name="obstIdGrossesse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez la grossesse
                    </FormLabel>
                    <Select
                      required
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Visite à sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grossesses.map((grossesse) => (
                          <SelectItem key={grossesse.id} value={grossesse.id}>
                            {grossesse.grossesseDdr &&
                              new Date(
                                grossesse.grossesseDdr
                              ).toLocaleDateString("fr-FR")}{" "}
                            -{" "}
                            {grossesse.termePrevu &&
                              new Date(grossesse.termePrevu).toLocaleDateString(
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
            </div>

            <FormField
              control={form.control}
              name="obstConsultation"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">Consultation</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="obstCounselling"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">Counselling</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
              <FormField
                control={form.control}
                name="obstTypeVisite"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">Num CPN :</FormLabel>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="gap-x-5 items-center grid grid-cols-3"
                      >
                        {TabCpn.map((option) => (
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
              <Separator className="mb-3" />
              <FormField
                control={form.control}
                name="obstSp"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">SP :</FormLabel>
                      <RefreshCw
                        onClick={() => {
                          form.setValue("obstSp", "");
                        }}
                        className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                      />
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="gap-x-5 items-center grid-cols-3"
                      >
                        {TabSp.map((option) => (
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
              <Separator className="mb-3" />
              <FormField
                control={form.control}
                name="obstVat"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">Vaccination :</FormLabel>
                      <RefreshCw
                        onClick={() => {
                          form.setValue("obstVat", "");
                        }}
                        className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                      />
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="gap-x-5 items-center grid-cols-3"
                      >
                        {TabVat.map((option) => (
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
            <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
              <Label className="flex justify-center">Prescriptions</Label>
              <div className="grid grid-cols-2">
                <FormField
                  control={form.control}
                  name="obstFer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Fer</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="obstFolate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Folate</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="obstDeparasitant"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Déparasitant
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="obstMilda"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">MILDA</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
              <FormField
                control={form.control}
                name="obstInvestigations"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
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
              <FormField
                control={form.control}
                name="obstEtatNutritionnel"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center">
                    <FormLabel className="flex-1">
                      Etat Nutritionnel :
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={`flex-1 ${styleImc}`}
                        required
                        disabled
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator className="my-3" />
              <FormField
                control={form.control}
                name="obstEtatGrossesse"
                render={({ field }) => (
                  <FormItem className="pb-4">
                    <div className="text-xl font-bold flex justify-between items-center">
                      <FormLabel className="ml-4">
                        Etat de la grossesse :
                      </FormLabel>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="flex gap-x-5 items-center"
                        required
                      >
                        {TabEtatGrossesse.map((option) => (
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
              <Separator />
              <FormField
                control={form.control}
                name="obstPfppi"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">
                        Counselling PF ppi
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <Separator className="mb-3" />
              <Label className="flex justify-center mt-2">Dépistages</Label>
              <div className="grid grid-cols-2">
                <FormField
                  control={form.control}
                  name="obstAlbuminieSucre"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Dépistage sucre
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="obstAnemie"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Dépistage Anémie
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="obstSyphilis"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Dépistage Syphilis
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="obstAghbs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          Dépistage AgHbs
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="my-2 px-4 py-2 flex flex-col shadow-md border rounded-md ">
              <div className="mb-3 flex flex-row items-center">
                <label className="block text-sm flex-1 font-medium">
                  Rendez-Vous :
                </label>
                <Input
                  className="mt-1 px-3 py-1 flex-1 w-full rounded-md border border-slate-200"
                  type="date"
                  value={(() => {
                    const v = form.watch("obstRdv");
                    if (!v) return "";
                    const dateObj = typeof v === "string" ? new Date(v) : v;
                    return dateObj.toISOString().split("T")[0];
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    form.setValue("obstRdv", val ? new Date(val) : null);
                  }}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="obstIdClient"
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
                name="obstIdUser"
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
                name="obstIdUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez le precripteur .....
                    </FormLabel>
                    <Select
                      required
                      value={field.value || ""}
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
