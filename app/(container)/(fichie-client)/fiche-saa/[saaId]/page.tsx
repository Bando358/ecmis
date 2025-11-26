"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllGrossesseByIdClient,
  updateGrossesse,
} from "@/lib/actions/grossesseActions";
import { getAllUserIncludedIdClinique } from "@/lib/actions/authActions";
import { getAllSaaByIdClient, createSaa } from "@/lib/actions/saaActions";
import { useSession } from "next-auth/react";
import {
  Saa,
  Grossesse,
  User,
  Visite,
  TableName,
  Permission,
  Client,
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
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/components/ClientContext";
import { getOneClient } from "@/lib/actions/clientActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { Checkbox } from "@/components/ui/checkbox";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

const tabTypeAvortement = [
  { value: "spontanee", label: "Spontanée" },
  { value: "provoquee", label: "Provoquée" },
  { value: "therapeutique", label: "Thérapeutique" },
];

const tabMethodeAvortement = [
  { value: "medicamenteux", label: "Médicamenteux" },
  { value: "chirurgical", label: "Chirurgical" },
];

const tabMotifDemande = [
  { value: "viol", label: "Viol" },
  { value: "inceste", label: "Inceste" },
  { value: "eleve_ecoliere", label: "Élève/Écolière" },
  { value: "pere_inconnu", label: "Père Inconnu" },
  { value: "autre", label: "Autre" },
];

const tabTypePec = [
  { value: "amiu", label: "AMIU" },
  { value: "misoprostol", label: "Misoprostol" },
];

const tabTraitementComplication = [
  {
    value: "intervention_medicamenteuse",
    label: "Intervention médicamenteuse",
  },
  { value: "intervention_chirurgicale", label: "Intervention chirurgicale" },
  { value: "complication_tai", label: "Complication liée à la TAI" },
];

// Composant pour les champs conditionnels
const ConditionalFields = ({ form }: { form: UseFormReturn<Saa> }) => {
  const showConditionalFields =
    form.watch("saaCounsellingPre") === false &&
    form.watch("saaSuiviPostAvortement") === false;

  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showConditionalFields
          ? "max-h-[1000px] opacity-100"
          : "max-h-0 opacity-0"
      }`}
    >
      <div className="pt-2">
        <FormField
          control={form.control}
          name="saaMethodeAvortement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                {"Méthode d'avortement"}
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Méthode d'avortement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabMethodeAvortement.map((option, index) => (
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

        <FormField
          control={form.control}
          name="saaTypeAvortement"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                {"Type d'avortement"}
              </FormLabel>
              <Select required onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type d'avortement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTypeAvortement.map((option, index) => (
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

        <FormField
          control={form.control}
          name="saaConsultationPost"
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
                  Consultation post-avortement
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saaCounsellingPost"
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
                  Counselling post-avortement
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Separator className="my-3" />

        <FormField
          control={form.control}
          name="saaTypePec"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                Type de prise en charge (optionnel)
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type de PEC" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTypePec.map((option, index) => (
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

        <FormField
          control={form.control}
          name="saaTraitementComplication"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">
                Traitement des complications (optionnel)
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Traitement des complications" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tabTraitementComplication.map((option, index) => (
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
      </div>
    </div>
  );
};

export default function SaaPage({
  params,
}: {
  params: Promise<{ saaId: string }>;
}) {
  const { saaId } = use(params);

  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossesses, setGrossesses] = useState<Grossesse[]>([]);
  const [selectedSaa, setSelectedSaa] = useState<Saa[]>([]);
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(saaId);
  }, [saaId, setSelectedClientId]);

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
        const perm = permissions.find((p) => p.table === TableName.SAA);
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
      const resultSaa = await getAllSaaByIdClient(saaId);
      setSelectedSaa(resultSaa as Saa[]);
      const result = await getAllVisiteByIdClient(saaId);
      setVisites(result as Visite[]);
      const resultGrossesse = await getAllGrossesseByIdClient(saaId);
      setGrossesses(
        Array.isArray(resultGrossesse)
          ? resultGrossesse.filter((g) => g.grossesseInterruption !== true)
          : []
      );

      const cliniqueClient = await getOneClient(saaId);
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
  }, [saaId]);

  const form = useForm<Saa>({
    defaultValues: {
      saaCounsellingPre: false,
      saaSuiviPostAvortement: false,
    },
  });

  const onSubmit: SubmitHandler<Saa> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un SAA. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      saaIdUser: form.getValues("saaIdUser"),
      saaIdClient: saaId,
      saaIdClinique: client?.idClinique || "",
      saaCounsellingPre: form.getValues("saaCounsellingPre") ?? false,
      saaConsultationPost: form.getValues("saaConsultationPost") ?? false,
      saaCounsellingPost: form.getValues("saaCounsellingPost") ?? false,
    };

    console.log("Formatted Data:", formattedData);
    try {
      await createSaa(formattedData);
      await updateRecapVisite(
        form.watch("saaIdVisite"),
        form.watch("saaIdUser"),
        "11 Fiche SAA"
      );

      const grossesseId = form.getValues("saaIdGrossesse");
      if (grossesseId) {
        // Fetch the existing grossesse data
        const existingGrossesse = grossesses.find(
          (g) => g && g.id === grossesseId
        );
        if (
          existingGrossesse &&
          existingGrossesse.grossesseInterruption !== true
        ) {
          await updateGrossesse(grossesseId, {
            ...existingGrossesse,
            grossesseInterruption: true,
            grossesseMotifInterruption: "Avortement",
          });
        }
      }

      toast.success("Formulaire SAA créé avec succès! 🎉");
      router.push(`/fiches/${saaId}`);
    } catch (error) {
      toast.error("La création du formulaire SAA a échoué");
      console.error("Erreur lors de la création du formulaire SAA:", error);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-[1000px] mx-auto px-4 py-2 border rounded-md">
      <ConstanteClient idVisite={form.getValues("saaIdVisite")} />
      <h2 className="text-2xl text-gray-600 font-black text-center">
        Formulaire de Soins Après Avortement (SAA)
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 max-w-[400px] rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
        >
          <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
            <FormField
              control={form.control}
              name="saaIdVisite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sélectionnez la visite</FormLabel>
                  <Select
                    required
                    value={field.value}
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
                          disabled={selectedSaa.some(
                            (p) => p.saaIdVisite === visite.id
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
            {grossesses.length > 0 &&
              grossesses[0].grossesseInterruption === false && (
                <FormField
                  control={form.control}
                  name="saaIdGrossesse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Sélectionnez la grossesse (optionnel)
                      </FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Grossesse à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grossesses.map((grossesse, index) => (
                            <SelectItem
                              key={index}
                              value={grossesse.id}
                              disabled={selectedSaa.some(
                                (p) => p.saaIdGrossesse === grossesse.id
                              )}
                            >
                              {grossesse.grossesseDdr &&
                                new Date(
                                  grossesse.grossesseDdr
                                ).toLocaleDateString("fr-FR")}{" "}
                              -{" "}
                              {grossesse.termePrevu &&
                                new Date(
                                  grossesse.termePrevu
                                ).toLocaleDateString("fr-FR")}
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

          <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
            <FormField
              control={form.control}
              name="saaSuiviPostAvortement"
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
                      Consultation post-Abortum suivi
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="saaCounsellingPre"
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
                      Counselling pré-avortement
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Champ de motif avec transition */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                form.watch("saaCounsellingPre")
                  ? "max-h-[100px] opacity-100 mt-2"
                  : "max-h-0 opacity-0"
              }`}
            >
              <FormField
                control={form.control}
                name="saaMotifDemande"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Motif de demande (optionnel)
                    </FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Motif de demande" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tabMotifDemande.map((option, index) => (
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
            </div>

            <Separator className="my-3" />

            {/* Champs conditionnels avec transition */}
            <ConditionalFields form={form} />
          </div>

          {isPrescripteur === true ? (
            <FormField
              control={form.control}
              name="saaIdUser"
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
              name="saaIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    Sélectionnez le prescripteur
                  </FormLabel>
                  <Select required onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un prescripteur" />
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

          <Button type="submit" className="mt-4 w-full">
            {form.formState.isSubmitting ? "Soumission..." : "Soumettre"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
