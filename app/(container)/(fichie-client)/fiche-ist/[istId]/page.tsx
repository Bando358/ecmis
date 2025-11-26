"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";

import { useSession } from "next-auth/react";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getAllIstByIdClient, createIst } from "@/lib/actions/istActions";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";
import {
  Client,
  Ist,
  Permission,
  TableName,
  User,
  Visite,
} from "@/lib/generated/prisma";
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
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getOneClient } from "@/lib/actions/clientActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
// import { Separator } from "@/components/ui/separator";

const tabTypePec = [
  { value: "candidose", label: "Pec Etiologique - Candidose" },
  { value: "chancreMou", label: "Pec Etiologique - Chancre Mou" },
  { value: "chlamydiose", label: "Pec Etiologique - Chlamydiose" },
  { value: "herpesSimplex", label: "Pec Etiologique - Herpes Simplex" },
  { value: "syphilis", label: "Pec Etiologique - Syphilis" },
  { value: "autres", label: "Pec Etiologique - Autres" },
];

const TabTypeIst = [
  { value: "ecoulementVaginal", label: "Ecoulement Vaginal" },
  { value: "ecoulementUretral", label: "Ecoulement Urétral" },
  { value: "douleursTesticulaires", label: "Douleurs Testiculaires" },
  { value: "douleursAbdominales", label: "Douleurs Abdominales Basses" },
  { value: "ulceration", label: "Ulcération Génitale" },
  { value: "bubon", label: "Bubon Inguinal" },
  { value: "cervicite", label: "Cervicite" },
  { value: "conjonctivite", label: "Conjonctivite du nouveau-né" },
  { value: "condylome", label: "Condylome (Végétation vénérienne)" },

  { value: "brulureOuPrurit", label: "Brûlure ou Prurit" },
  { value: "malOdeurVaginal", label: "Mauvaise Odeur Vaginale" },
  { value: "autres", label: "Autres IST" },
];
const TabTypeClient = [
  { value: "cpn", label: "Femme Enceinte" },
  { value: "pvvih", label: "PVVIH" },
  { value: "autres", label: "AUTRES" },
];
const TabTypePec = [
  { value: "syndromique", label: "Syndromique" },
  { value: "etiologique", label: "Etiologique" },
];

export default function IstPage({
  params,
}: {
  params: Promise<{ istId: string }>;
}) {
  const { istId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedIst, setSelectedIst] = useState<Ist[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(istId);
  }, [istId, setSelectedClientId]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const prescripteur = session?.user.prescripteur;
    if (prescripteur != undefined) {
      setIsPrescripteur(prescripteur);
    }
  }, [session]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find((p) => p.table === TableName.IST);
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const resultIst = await getAllIstByIdClient(istId);
      setSelectedIst(resultIst as Ist[]); // Assurez-vous que result est bien de type CliniqueData[]
      const result = await getAllVisiteByIdClient(istId);
      setVisites(result as Visite[]); // Assurez-vous que result est bien de type CliniqueData[]
      const client = await getOneClient(istId);
      setClient(client);
      let allPrestataire: User[] = [];
      if (client?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(client.idClinique);
      }
      setAllPrescripteur(allPrestataire);
    };
    fetchData();
  }, [istId]);

  // console.log(visites);

  const form = useForm<Ist>({
    defaultValues: {
      istIdVisite: "",
      istIdUser: "",
      istIdClient: istId ?? "",
      istIdClinique: client?.idClinique ?? "",
    },
  });
  const onSubmit: SubmitHandler<Ist> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une IST. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      istTypeClient: form.getValues("istTypeClient") ?? "",
      istType: form.getValues("istType") ?? "",
      istIdClient: istId ?? "",
      istCounsellingAvantDepitage:
        form.getValues("istCounsellingAvantDepitage") ?? false,
      istExamenPhysique: form.getValues("istExamenPhysique") ?? false,
      istCounsellingApresDepitage:
        form.getValues("istCounsellingApresDepitage") ?? false,
      istCounselingReductionRisque:
        form.getValues("istCounselingReductionRisque") ?? false,
      istTypePec: form.getValues("istTypePec") ?? "",
      istPecEtiologique: form.getValues("istPecEtiologique") ?? "",
      istIdUser: form.getValues("istIdUser") ?? "",
      istIdVisite: form.getValues("istIdVisite") ?? "",
      istIdClinique: client?.idClinique ?? "",
    };
    console.log("formattedData", formattedData);
    // toast.success("Formulaire créer avec succès!");
    try {
      await createIst(formattedData as Ist);
      await updateRecapVisite(
        form.watch("istIdVisite"),
        form.watch("istIdUser"),
        "12 Fiche Ist"
      );
      console.log(formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${istId}`);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-[900px] mx-auto px-4 py-2 border rounded-md">
      <ConstanteClient idVisite={form.getValues("istIdVisite")} />
      <h2 className="text-2xl text-gray-600 font-black text-center">
        Formulaire de Ist
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-[900px] rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
        >
          <FormField
            control={form.control}
            name="istIdVisite"
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
                    {visites.map((visite) => (
                      <SelectItem
                        key={visite.id}
                        value={visite.id}
                        disabled={selectedIst.some(
                          (p) => p.istIdVisite === visite.id
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
          <div className="my-2 p-3 shadow-md border rounded-md ">
            <FormField
              control={form.control}
              name="istTypeClient"
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
                      {TabTypeClient.map((option) => (
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
              name="istType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le type de Ist
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type à sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TabTypeIst.map((option) => (
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
          </div>
          <div className="my-2 shadow-md border rounded-md ">
            <FormField
              control={form.control}
              name="istCounsellingAvantDepitage"
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
                      Counselling Avant dépistage ist
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="istExamenPhysique"
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
                      Exament Physique
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="istCounsellingApresDepitage"
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
                      Counselling Après dépistage ist
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* <Separator /> */}
            <FormField
              control={form.control}
              name="istCounselingReductionRisque"
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
                      Counseling Réduction du risque
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="istTypePec"
              render={({ field }) => (
                <FormItem className=" px-4 pb-4">
                  <div className="text-xl font-bold flex justify-between items-center">
                    <FormLabel className="ml-4">
                      Type de traitement IST:
                    </FormLabel>
                    <RefreshCw
                      onClick={() => {
                        form.setValue("istTypePec", "");
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
                      {TabTypePec.map((option) => (
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

            {form.watch("istTypePec") === "etiologique" && (
              <FormField
                control={form.control}
                name="istPecEtiologique"
                render={({ field }) => (
                  <FormItem className="mx-6 mb-3 outline-red-500">
                    <FormLabel className="font-medium">
                      Selectionnez le type de PEC
                    </FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Traitement à sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tabTypePec.map((option) => (
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
            )}
          </div>
          <FormField
            control={form.control}
            name="istIdClient"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} className="hidden" />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="istIdUser"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez le prescripteur
                </FormLabel>
                <Select
                  required
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={isPrescripteur ? idUser : undefined}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez un prescripteur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allPrescripteur.map((prescripteur) => (
                      <SelectItem key={prescripteur.id} value={prescripteur.id}>
                        <span>{prescripteur.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-row justify-center py-2">
            <Button type="submit">
              {form.formState.isSubmitting ? "Submitting..." : "Soumettre"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
