"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";

import {
  getOneUser,
  getAllUserIncludedIdClinique,
} from "@/lib/actions/authActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOnePlanning, updatePlanning } from "@/lib/actions/planningActions";
import { useSession } from "next-auth/react";
import { Permission, Planning, TableName, User, Visite } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

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
];
const tabRaisonEffet = [
  { value: "desire_maternite", label: "Désire de maternité" },
  { value: "effet_secondaire", label: "Effet sécondaire" },
  { value: "expire", label: "Méthode Expirée" },
  { value: "parent_conjoint", label: "Parent ou Conjoint" },
];

export default function ModifPlanningPage({
  params,
}: {
  params: Promise<{ modifPlanning: string }>;
}) {
  const { modifPlanning } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedPlanning, setSelectedPlanning] = useState<Planning>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  const { data: session } = useSession();
  const idPrestataire = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idPrestataire);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setOnePrescripteur(user!);
    };
    fetUser();
  }, [idPrestataire]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.PLANNING
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
  }, [onePrescripteur]);

  useEffect(() => {
    console.log("isPrescripteur changé : ", isPrescripteur);
  }, [isPrescripteur]);

  // const [selectedOtherValue, setSelectedOtherValue] = useState<boolean>(false);

  const implans: Implan[] = [
    { id: "insertion", value: "insertion", label: "Insertion" },
    { id: "controle", value: "controle", label: "Contrôle" },
  ];
  const tabStatut: Statut[] = [
    { id: "nu", value: "nu", label: "NU" },
    { id: "au", value: "au", label: "AU" },
  ];

  // const router = useRouter();
  useEffect(() => {
    const fetchData = async () => {
      const pf = await getOnePlanning(modifPlanning);
      setSelectedPlanning(pf as Planning);

      const cliniqueClient = await getOneClient(pf?.idClient ?? null);
      let allPrestataire: User[] = [];
      if (cliniqueClient?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(
          cliniqueClient.idClinique
        );
      }
      setAllPrescripteur(allPrestataire.filter((user) => user.prescripteur));
    };
    fetchData();
  }, [modifPlanning, idPrestataire]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedPlanning) {
        const result = await getAllVisiteByIdClient(selectedPlanning.idClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === selectedPlanning.idVisite
        );

        const nomPrescripteur = await getOneUser(selectedPlanning.idUser);
        setPrescripteur(nomPrescripteur?.username);

        setVisites(
          result.filter(
            (r: { id: string }) => r.id === selectedPlanning.idVisite
          )
        ); // Assurez-vous que result est bien de type CliniqueData[]
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(selectedPlanning.idClient);
      }
    };
    fetchData();
  }, [selectedPlanning, setSelectedClientId]);

  // console.log(visites);

  const form = useForm<Planning>({
    defaultValues: {
      statut: "au", // Exemple de valeur par défaut
    },
  });
  const onSubmit: SubmitHandler<Planning> = async (data) => {
    if (!permission?.canCreate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une fiche de planification familiale. Contactez un administrateur."
      );
      return router.back();
    }
    // Normalize rdvPf to a JS Date (Prisma DateTime expects a Date)
    const rawRdv = form.getValues("rdvPf");
    const rdvPfDate: Date | null = rawRdv
      ? typeof rawRdv === "string"
        ? // from input type=date we usually get 'YYYY-MM-DD' -> construct Date at local midnight
          new Date(rawRdv)
        : rawRdv instanceof Date
        ? rawRdv
        : new Date(String(rawRdv))
      : null;

    const formattedData = {
      ...data,
      idUser: form.getValues("idUser"),
      consultation: form.getValues("consultation"),
      idClient: form.getValues("idClient"),
      statut: form.getValues("statut"),
      courtDuree: form.getValues("courtDuree"),
      implanon: form.getValues("implanon"),
      retraitImplanon: form.getValues("retraitImplanon"),
      jadelle: form.getValues("jadelle"),
      retraitJadelle: form.getValues("retraitJadelle"),
      sterilet: form.getValues("sterilet"),
      retraitSterilet: form.getValues("retraitSterilet"),
      rdvPf: rdvPfDate,
      idClinique: selectedPlanning?.idClinique || "",
    };
    try {
      if (selectedPlanning) {
        await updatePlanning(selectedPlanning.id, formattedData);
        const pf = await getOnePlanning(modifPlanning);
        if (pf) {
          setSelectedPlanning(pf as Planning);
        }
      }
      // await updateRecapVisite(
      //   form.watch("idVisite"),
      //   idPrestataire,
      //   "03 Fiche Planification familiale"
      // );
      console.log(formattedData);
      toast.info("Formulaire modifiée avec succès! 🎉");
      // router.push(`/fiches/${params.planningId}`);
    } catch (error) {
      toast.error("La création de la Constante a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    } finally {
      setIsVisible(false);
    }
  };

  // const idclient = params.planningId
  useEffect(() => {
    if (selectedPlanning) {
      form.setValue("idClient", selectedPlanning.idClient);
    }
  }, [selectedPlanning, form]);

  const handleUpdateVisite = async () => {
    if (selectedPlanning) {
      form.setValue("idVisite", selectedPlanning.idVisite);
      form.setValue("idUser", selectedPlanning.idUser);
      form.setValue("consultation", selectedPlanning.consultation);
      form.setValue("counsellingPf", selectedPlanning.counsellingPf);
      form.setValue("courtDuree", selectedPlanning.courtDuree);
      form.setValue("idClient", selectedPlanning.idClient);
      form.setValue("implanon", selectedPlanning.implanon);
      form.setValue("jadelle", selectedPlanning.jadelle);
      form.setValue("motifVisite", selectedPlanning.motifVisite);
      form.setValue(
        "raisonEffetSecondaire",
        selectedPlanning.raisonEffetSecondaire
      );
      form.setValue("raisonRetrait", selectedPlanning.raisonRetrait);
      form.setValue("rdvPf", selectedPlanning.rdvPf);
      form.setValue("retraitImplanon", selectedPlanning.retraitImplanon);
      form.setValue("retraitJadelle", selectedPlanning.retraitJadelle);
      form.setValue("retraitSterilet", selectedPlanning.retraitSterilet);
      form.setValue("statut", selectedPlanning.statut);
      form.setValue("sterilet", selectedPlanning.sterilet);
      form.setValue("typeContraception", selectedPlanning.typeContraception);
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
      {selectedPlanning && (
        <ConstanteClient idVisite={selectedPlanning.idVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Formulaire de modification
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
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
                          <SelectItem key={index} value={visite.id}>
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
                          onCheckedChange={(checked) =>
                            field.onChange(!!checked)
                          }
                          required
                          className="w-5 h-5 border-2 rounded-full text-blue-500 border-blue-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Consultation PF</FormLabel>
                      </div>
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

              <div className="flex flex-col border rounded-md shadow-md p-2">
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

              <div className="flex flex-col border rounded-md shadow-md p-2">
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
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="La raison ....." />
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
                        <Input
                          {...field}
                          value={idPrestataire}
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
                          {allPrescripteur.map((prescripteur, index) => (
                            <SelectItem key={index} value={prescripteur.id}>
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

              <div className="flex flex-row  justify-center items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVisible(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
                </Button>
              </div>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedPlanning ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedPlanning && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>
              <div>{selectedPlanning && <span>Statut client : </span>}</div>
              <div>
                {selectedPlanning && (
                  <span>
                    {selectedPlanning.statut === "nu"
                      ? "Nouvelle Utilisatrice"
                      : "Ancienne Utilisatrice"}
                  </span>
                )}
              </div>
              <div>
                {selectedPlanning && <span>Type de Contraception : </span>}
              </div>
              <div>
                {selectedPlanning && (
                  <span>{selectedPlanning.typeContraception}</span>
                )}
              </div>
              <div>
                {selectedPlanning && <span>Motif de la Visite : </span>}
              </div>
              <div>
                {selectedPlanning && (
                  <span>{selectedPlanning.motifVisite}</span>
                )}
              </div>
              {selectedPlanning && (
                <div>
                  {selectedPlanning.courtDuree && <span>méthode : </span>}
                </div>
              )}
              {selectedPlanning && (
                <div>
                  {selectedPlanning.courtDuree && (
                    <span>{selectedPlanning.courtDuree}</span>
                  )}
                </div>
              )}

              {selectedPlanning && (
                <div>
                  {selectedPlanning.implanon && <span>Implanon : </span>}
                </div>
              )}
              {selectedPlanning && (
                <div>
                  {selectedPlanning.implanon && (
                    <span>{selectedPlanning.implanon}</span>
                  )}
                </div>
              )}

              {selectedPlanning && (
                <div>{selectedPlanning.jadelle && <span>Jadelle : </span>}</div>
              )}
              {selectedPlanning && (
                <div>
                  {selectedPlanning.jadelle && (
                    <span>{selectedPlanning.jadelle}</span>
                  )}
                </div>
              )}

              {selectedPlanning && (
                <div>
                  {selectedPlanning.sterilet && <span>Stérilet : </span>}
                </div>
              )}
              {selectedPlanning && (
                <div>
                  {selectedPlanning.sterilet && (
                    <span>{selectedPlanning.sterilet}</span>
                  )}
                </div>
              )}

              {selectedPlanning && selectedPlanning.retraitImplanon && (
                <div>Retrait Implanon :</div>
              )}
              {selectedPlanning && selectedPlanning.retraitImplanon && (
                <div>Oui</div>
              )}

              {selectedPlanning && selectedPlanning.retraitJadelle && (
                <div>Retrait Jadelle :</div>
              )}
              {selectedPlanning && selectedPlanning.retraitJadelle && (
                <div>Oui</div>
              )}

              {selectedPlanning && selectedPlanning.retraitSterilet && (
                <div>Retrait Stérilet :</div>
              )}
              {selectedPlanning && selectedPlanning.retraitSterilet && (
                <div>Oui</div>
              )}

              {selectedPlanning && (
                <div>
                  {selectedPlanning.rdvPf && <span>Rendez-Vous : </span>}
                </div>
              )}
              {selectedPlanning && (
                <div>
                  {selectedPlanning.rdvPf && (
                    <span>
                      {new Date(selectedPlanning.rdvPf).toLocaleDateString(
                        "fr-FR"
                      )}
                    </span>
                  )}
                </div>
              )}
              <div>
                {prescripteur && (
                  <small className="italic">Prescripteur :</small>
                )}
              </div>
              <div>
                {prescripteur && (
                  <small className="italic">{prescripteur}</small>
                )}
              </div>
              <div className="col-span-2 flex flex-row justify-center mt-6 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Retour
                </Button>
                <Button onClick={handleUpdateVisite}>
                  {form.formState.isSubmitting ? "Modifier..." : "Modifier"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
