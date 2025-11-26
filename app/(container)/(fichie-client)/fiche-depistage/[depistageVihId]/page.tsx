"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllDepistageVihByIdClient,
  createDepistageVih,
} from "@/lib/actions/depistageVihActions";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { useSession } from "next-auth/react";
import {
  Client,
  DepistageVih,
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
import { getOneClient } from "@/lib/actions/clientActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const tabTypeClient = [
  { value: "cdip", label: "CDIP" },
  { value: "ptme", label: "PTME" },
  { value: "ist", label: "IST" },
  { value: "enfantMerePos", label: "Enfant de mère positive" },
  { value: "conjointPos", label: "Conjoint positif" },
  { value: "autre", label: "Autre" },
];

const TabResultatVih = [
  { value: "negatif", label: "Négatif" },
  { value: "positif", label: "Positif" },
  { value: "indetermine", label: "Indéterminé" },
];

// Composant pour les champs conditionnels de résultat et counselling
const ConditionalResultFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showResultFields = form.watch("depistageVihInvestigationTestRapide");

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showResultFields ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="depistageVihResultat"
          render={({ field }) => (
            <FormItem className="pt-4 pb-2">
              <div className="text-xl font-bold flex justify-between items-center">
                <FormLabel className="ml-4">Résultat du test VIH :</FormLabel>
                <RefreshCw
                  onClick={() => {
                    form.setValue("depistageVihResultat", "");
                  }}
                  className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125 cursor-pointer"
                />
              </div>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  className="flex gap-x-5 items-center"
                >
                  {TabResultatVih.map((option) => (
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

        <FormField
          control={form.control}
          name="depistageVihCounsellingPostTest"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Counselling post-test
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

// Composant pour les champs conditionnels de counselling supplémentaire
const ConditionalCounsellingFields = ({
  form,
}: {
  form: UseFormReturn<DepistageVih>;
}) => {
  const showCounsellingFields =
    form.watch("depistageVihCounsellingPostTest") &&
    form.watch("depistageVihResultat") === "positif";

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showCounsellingFields
          ? "max-h-[200px] opacity-100"
          : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="depistageVihCounsellingReductionRisque"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Counselling de réduction des risques
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="depistageVihCounsellingSoutienPsychoSocial"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">
                  Counselling de soutien psychosocial
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default function DepistageVihPage({
  params,
}: {
  params: Promise<{ depistageVihId: string }>;
}) {
  const { depistageVihId } = use(params);

  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedDepistageVih, setSelectedDepistageVih] = useState<
    DepistageVih[]
  >([]);
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(depistageVihId);
  }, [depistageVihId, setSelectedClientId]);

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
        const perm = permissions.find(
          (p) => p.table === TableName.DEPISTAGE_VIH
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
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const resultDepistageVih = await getAllDepistageVihByIdClient(
        depistageVihId
      );
      setSelectedDepistageVih(resultDepistageVih as DepistageVih[]);

      const result = await getAllVisiteByIdClient(depistageVihId);
      setVisites(result as Visite[]);

      const cliniqueClient = await getOneClient(depistageVihId);
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
  }, [depistageVihId]);

  useEffect(() => {
    form.setValue("depistageVihIdClient", depistageVihId);
  }, [depistageVihId]);

  // Correction : mettre à jour depistageVihIdClinique dès que client est chargé
  useEffect(() => {
    if (client?.idClinique) {
      form.setValue("depistageVihIdClinique", client.idClinique);
    }
  }, [client]);

  const form = useForm<DepistageVih>({
    defaultValues: {
      depistageVihResultat: "negatif",
      depistageVihConsultation: true,
      depistageVihCounsellingPreTest: true,
      depistageVihInvestigationTestRapide: false,
      depistageVihCounsellingPostTest: false,
      depistageVihCounsellingReductionRisque: false,
      depistageVihCounsellingSoutienPsychoSocial: false,
      depistageVihIdClinique: client?.idClinique ?? "",
    },
  });

  const onSubmit: SubmitHandler<DepistageVih> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un dépistage VIH. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      depistageVihIdClient: form.getValues("depistageVihIdClient"),
    };

    try {
      await createDepistageVih(formattedData as DepistageVih);
      await updateRecapVisite(
        form.watch("depistageVihIdVisite"),
        form.watch("depistageVihIdUser"),
        "14 Fiche de dépistage VIH"
      );
      toast.success("Fiche de dépistage VIH créée avec succès! 🎉");
      router.push(`/fiches/${depistageVihId}`);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error(
        "Erreur lors de la création de la fiche de dépistage VIH:",
        error
      );
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-[900px] mx-auto px-4 py-2 border rounded-md">
      <ConstanteClient idVisite={form.getValues("depistageVihIdVisite")} />
      <h2 className="text-2xl text-gray-600 font-black text-center">
        Formulaire de Dépistage VIH
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-[900px] rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
        >
          <FormField
            control={form.control}
            name="depistageVihIdVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">
                  Selectionnez la visite
                </FormLabel>
                <Select required onValueChange={field.onChange}>
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
                        disabled={selectedDepistageVih.some(
                          (p) => p.depistageVihIdVisite === visite.id
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
            name="depistageVihTypeClient"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Type de client</FormLabel>
                <Select required onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez le type de client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tabTypeClient.map((option, index) => (
                      <SelectItem key={index} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="my-2 shadow-md border rounded-md p-4 transition-all duration-300">
            <FormField
              control={form.control}
              name="depistageVihConsultation"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Consultation</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depistageVihCounsellingPreTest"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Counselling pré-test
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depistageVihInvestigationTestRapide"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Investigation par test rapide
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Champs conditionnels de résultat avec transition */}
            <ConditionalResultFields form={form} />

            {/* Champs conditionnels de counselling supplémentaire avec transition */}
            <ConditionalCounsellingFields form={form} />
          </div>

          <FormField
            control={form.control}
            name="depistageVihIdClient"
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
              name="depistageVihIdUser"
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
              name="depistageVihIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Selectionnez le prescripteur
                  </FormLabel>
                  <Select
                    required
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Prescripteur ....." />
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

          <Button type="submit" className="mt-4">
            {form.formState.isSubmitting ? "Soumettre..." : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
