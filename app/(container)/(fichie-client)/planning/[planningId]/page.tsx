"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, SubmitHandler } from "react-hook-form";
import { ArrowBigLeftDash, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllPlanningByIdClient,
  createPlanning,
} from "@/lib/actions/planningActions";
import { useSession } from "next-auth/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Client, Planning, TableName, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { Checkbox } from "@/components/ui/checkbox";
import { getOneClient } from "@/lib/actions/clientActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

interface Implan {
  id: string;
  value: string;
  label: string;
}
interface Statut {
  id: string;
  value: string;
  label: string;
}
const TypeContraception = [
  { value: "ordinaire", label: "Ordinaire" },
  { value: "post_abortum", label: "Post Abortum" },
  { value: "post_partum_immediat", label: "Post Partum Immédiat" },
  { value: "post_partum", label: "Post Partum" },
];
const motifs = [
  { value: "premiere", label: "1ème Prise" },
  { value: "reapprovisionnement", label: "Reapprovisionnement" },
  { value: "controle", label: "Contrôle" },
  { value: "changement", label: "Changement" },
  { value: "arret", label: "Arrêt" },
];
const Mcd = [
  { value: "noristera", label: "Injectable 2 mois" },
  { value: "injectable", label: "Injectable 3 mois" },
  { value: "pilule", label: "Pilule" },
  { value: "spotting", label: "Spotting pilule" },
  { value: "preservatif", label: "Préservatif" },
  { value: "spermicide", label: "Spermicide" },
  { value: "urgence", label: "Méthode d'urgence" },
];
const tabRaisonEffet = [
  { value: "desire_maternite", label: "Désire de maternité" },
  { value: "effet_secondaire", label: "Effet sécondaire" },
  { value: "expire", label: "Méthode Expirée" },
  { value: "parent_conjoint", label: "Parent ou Conjoint" },
];

export default function PlanningPage({
  params,
}: {
  params: Promise<{ planningId: string }>;
}) {
  const { planningId } = use(params);

  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedPlanning, setSelectedPlanning] = useState<Planning[]>([]);
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [prescripteur, setPrescripteur] = useState<SafeUser>();
  const [clients, setAllClients] = useState<Client | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();

  const { canCreate } = usePermissionContext();

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(planningId);
  }, [planningId, setSelectedClientId]);

  const implans: Implan[] = [
    { id: "insertion", value: "insertion", label: "Insertion" },
    { id: "controle", value: "controle", label: "Contrôle" },
  ];
  const tabStatut: Statut[] = [
    { id: "nu", value: "nu", label: "NU" },
    { id: "au", value: "au", label: "AU" },
  ];

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  // const tabIdClinique = session?.user.idCliniques as string[];
  const router = useRouter();

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idUser || !planningId) return;

    const fetchAllData = async () => {
      try {
        // Wave 1: toutes les requêtes indépendantes en parallèle
        const [user, resultPlanning, resultVisites, cliniqueClient] = await Promise.all([
          getOneUser(idUser),
          getAllPlanningByIdClient(planningId),
          getAllVisiteByIdClient(planningId),
          getOneClient(planningId),
        ]);

        setIsPrescripteur(user?.prescripteur ? true : false);
        setPrescripteur(user!);
        setSelectedPlanning(resultPlanning as Planning[]);
        setVisites(resultVisites as Visite[]);
        setAllClients(cliniqueClient);

        // Wave 2: requête dépendante du client
        let allPrestataire: SafeUser[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire.filter((user) => user.prescripteur));
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      }
    };
    fetchAllData();
  }, [idUser, planningId]);

  // console.log(visites);

  const form = useForm<Planning>({
    defaultValues: {
      statut: "au",
      idClient: "",
      idVisite: "",
      typeContraception: "",
      motifVisite: "",
      consultation: true,
      counsellingPf: false,
      courtDuree: "",
      implanon: "",
      retraitImplanon: false,
      jadelle: "",
      retraitJadelle: false,
      sterilet: "",
      retraitSterilet: false,
      raisonRetrait: "",
      raisonEffetSecondaire: "",
      rdvPf: null,
      idUser: "",
      idClinique: clients?.idClinique || "",
    },
  });

  // Surveillance des champs pour la date de fin de protection
  const watchImplanon = useWatch({ control: form.control, name: "implanon" });
  const watchJadelle = useWatch({ control: form.control, name: "jadelle" });
  const watchSterilet = useWatch({ control: form.control, name: "sterilet" });
  const watchIdVisite = useWatch({ control: form.control, name: "idVisite" });

  const dateFinProtection = (() => {
    const isInsertion =
      watchImplanon === "insertion" ||
      watchJadelle === "insertion" ||
      watchSterilet === "insertion";
    if (!isInsertion || !watchIdVisite) return null;

    const visite = visites.find((v) => v.id === watchIdVisite);
    if (!visite) return null;

    let duree = 0;
    let methode = "";
    if (watchImplanon === "insertion") { duree = 3; methode = "Implanon"; }
    else if (watchJadelle === "insertion") { duree = 5; methode = "Jadelle"; }
    else if (watchSterilet === "insertion") { duree = 10; methode = "DIU"; }

    const dateFin = new Date(visite.dateVisite);
    dateFin.setFullYear(dateFin.getFullYear() + duree);

    const joursSemaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const moisNoms = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const dateFormatee = `${joursSemaine[dateFin.getDay()]} ${String(dateFin.getDate()).padStart(2, "0")} ${moisNoms[dateFin.getMonth()]} ${dateFin.getFullYear()}`;

    return { methode, duree, dateFormatee };
  })();

  const onSubmit: SubmitHandler<Planning> = async (data) => {
    // Déterminer methodePrise en fonction des données actuelles
    if (!canCreate(TableName.PLANNING)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const isMethodePrise =
      (data.courtDuree && data.courtDuree !== "spotting") ||
      data.implanon === "insertion" ||
      data.jadelle === "insertion" ||
      data.sterilet === "insertion";

    if (isMethodePrise && !data.rdvPf) {
      alert(
        "Veuillez renseigner la date de rendez-vous de rénouvellement ou du retrait du produit 🗓️"
      );
      return;
    }
    // Normalize rdvPf to a JS Date (Prisma DateTime expects a Date)
    const rawRdv = form.getValues("rdvPf");
    const rdvPfDate: Date | null = rawRdv
      ? typeof rawRdv === "string"
        ? // input type=date typically returns 'YYYY-MM-DD' -> create a Date at local midnight
          new Date(rawRdv)
        : rawRdv instanceof Date
        ? rawRdv
        : new Date(String(rawRdv))
      : null;

    const formattedData = {
      ...data,
      idUser,
      consultation: form.getValues("consultation"),
      idClient: form.getValues("idClient"),
      statut: form.getValues("statut"),
      methodePrise: isMethodePrise,
      courtDuree: form.getValues("courtDuree"),
      implanon: form.getValues("implanon"),
      retraitImplanon: form.getValues("retraitImplanon"),
      jadelle: form.getValues("jadelle"),
      retraitJadelle: form.getValues("retraitJadelle"),
      sterilet: form.getValues("sterilet"),
      retraitSterilet: form.getValues("retraitSterilet"),
      rdvPf: rdvPfDate,
      idClinique: clients?.idClinique || "",
    };
    try {
      console.log(formattedData);
      await createPlanning(formattedData);

      await updateRecapVisite(
        form.watch("idVisite"),
        idUser,
        "03 Fiche Planification familiale"
      );
      console.log(formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${planningId}`);
    } catch (error) {
      toast.error("La création de la Constante a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    }
  };

  // const idclient = params.planningId
  useEffect(() => {
    form.setValue("idClient", planningId);
  }, [planningId, form]);

  return (
    <div className="w-full relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 left-4"
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
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md relative">
        <ConstanteClient idVisite={form.watch("idVisite")} />
        <h2 className="text-2xl text-blue-900 font-black text-center">
          Formulaire de planification familiale
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
          >
            <FormField
              control={form.control}
              name="idVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez la visite
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Visite à sélectionner ....." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visites.map((visite, index) => (
                        <SelectItem
                          key={index}
                          value={visite.id}
                          disabled={selectedPlanning.some(
                            (p) => p.idVisite === visite.id
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
            <div className="flex w-full flex-col gap-5">
              <FormField
                control={form.control}
                name="statut"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-5 w-full">
                    {/* Label aligné avec les options */}
                    <FormLabel className="whitespace-nowrap">
                      Statut client :
                    </FormLabel>
                    <FormControl className="flex flex-row gap-x-5 items-center">
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        className="flex gap-x-5 items-center"
                      >
                        {tabStatut.map((option) => (
                          <FormItem
                            key={option.id}
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
            {/* ************************* */}
            <FormField
              control={form.control}
              name="typeContraception"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le type de contraception
                  </FormLabel>
                  <Select
                    required
                    // value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="le type de contraception ....." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TypeContraception.map((contraception, index) => (
                        <SelectItem key={index} value={contraception.value}>
                          {contraception.label}
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
              name="motifVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le motif de la visite
                  </FormLabel>
                  <Select
                    required
                    // value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="le motif ....." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motifs.map((motif, index) => (
                        <SelectItem key={index} value={motif.value}>
                          {motif.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row justify-between">
              <FormField
                control={form.control}
                name="consultation"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                        required
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="counsellingPf"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0 ">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Counselling PF</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col shadow-sm border-blue-200/50 rounded-md p-2">
              <div className="font-sans">
                <div className="text-xl font-bold mb-4 flex justify-between items-center">
                  <Label>Méthode de courte durée</Label>
                  <RefreshCw
                    onClick={() => {
                      form.setValue("courtDuree", "");
                    }}
                    className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                  />
                </div>
                <div className="px-5 pb-4 font-sans relative">
                  <FormField
                    control={form.control}
                    name="courtDuree"
                    render={({ field }) => (
                      <FormItem className="">
                        <div className="text-xl font-bold flex justify-between items-center">
                          <FormLabel></FormLabel>
                        </div>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                            className="grid grid-cols-2 space-y-1 gap-2 items-center"
                          >
                            {Mcd.map((option) => (
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
            </div>
            <div className="flex flex-col shadow-sm border-blue-200/50 rounded-md p-2">
              <div className="flex justify-between">
                <Label className="font-sans">Méthode de longue durée</Label>
                <RefreshCw
                  onClick={() => {
                    form.setValue("implanon", "");
                    form.setValue("jadelle", "");
                    form.setValue("sterilet", "");
                  }}
                  className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                />
              </div>
              <div className="px-5 pb-4 font-sans relative">
                <FormField
                  control={form.control}
                  name="implanon"
                  render={({ field }) => (
                    <FormItem className="">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel>Implanon</FormLabel>
                        <div></div>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex gap-x-5 items-center"
                        >
                          {implans.map((option) => (
                            <FormItem
                              key={option.id}
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
                  name="retraitImplanon"
                  render={({ field }) => (
                    <FormItem className="absolute right-8 bottom-4 flex flex-row items-start space-x-2 space-y-0 mt-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          // className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Retrait</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              {/* jadelle */}
              <div className="px-5 pb-4 font-sans relative">
                <FormField
                  control={form.control}
                  name="jadelle"
                  render={({ field }) => (
                    <FormItem className="">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel>Jadelle</FormLabel>
                        {/* <RefreshCw
                        onClick={() => {
                          form.setValue("jadelle", "");
                          // form.setValue("retraitJadelle", false);
                        }}
                        className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125"
                      /> */}
                        <div></div>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex gap-x-5 items-center"
                        >
                          {implans.map((option) => (
                            <FormItem
                              key={option.id}
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
                  name="retraitJadelle"
                  render={({ field }) => (
                    <FormItem className="absolute right-8 bottom-4 flex flex-row items-start space-x-2 space-y-0 mt-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Retrait</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              {/* Stérilet */}
              <div className="px-5 pb-2 font-sans relative">
                <FormField
                  control={form.control}
                  name="sterilet"
                  render={({ field }) => (
                    <FormItem className="">
                      <div className="text-xl font-bold flex justify-between items-center">
                        <FormLabel>Stérilet</FormLabel>
                        <div></div>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex gap-x-5 items-center"
                        >
                          {implans.map((option) => (
                            <FormItem
                              key={option.id}
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
                  name="retraitSterilet"
                  render={({ field }) => (
                    <FormItem className="absolute right-8 bottom-2 flex flex-row items-start space-x-2 space-y-0 mt-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          // className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Retrait</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <Separator className="my-2" />
              {form.watch("retraitImplanon") === true ||
              form.watch("retraitJadelle") === true ||
              form.watch("retraitSterilet") === true ? (
                <div className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name="raisonRetrait"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-red-400">
                          Quel est la raison du retraire
                        </FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="La raison ..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tabRaisonEffet.map((raison, index) => (
                              <SelectItem key={index} value={raison.value}>
                                {raison.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("raisonRetrait") === "effet_secondaire" && (
                    <Input
                      {...form.register("raisonEffetSecondaire")}
                      placeholder="Quel est l'effet secondaire..."
                      className="border border-red-400"
                    />
                  )}
                </div>
              ) : (
                ""
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">
                Date de Rendez-vous
              </label>
              <input
                {...form.register("rdvPf")}
                className="mt-1 px-3 py-1 w-full rounded-md border border-slate-200"
                type="date"
                name="rdvPf"
              />
              {dateFinProtection && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-800">
                    Fin de protection ({dateFinProtection.methode} - {dateFinProtection.duree} ans)
                  </p>
                  <p className="text-sm font-bold text-blue-900">{dateFinProtection.dateFormatee}</p>
                </div>
              )}
            </div>
            <FormField
              control={form.control}
              name="idClient"
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
                name="idUser"
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
                name="idUser"
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
                          <SelectValue placeholder="Select Prescripteur ....." />
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
              className="my-2 mx-auto block"
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
