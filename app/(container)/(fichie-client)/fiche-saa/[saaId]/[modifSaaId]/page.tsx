"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler, UseFormReturn } from "react-hook-form";

import { toast } from "sonner";
import { getOneGrossesse } from "@/lib/actions/grossesseActions";
import { getOneSaa, updateSaa } from "@/lib/actions/saaActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import {
  Saa,
  Grossesse,
  User,
  Visite,
  TableName,
  Permission,
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
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/components/ClientContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { Checkbox } from "@/components/ui/checkbox";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { useRouter } from "next/navigation";

type Option = {
  value: string;
  label: string;
};

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
        showConditionalFields ? "max-h-250 opacity-100" : "max-h-0 opacity-0"
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

export default function ModifSaaPage({
  params,
}: {
  params: Promise<{ modifSaaId: string }>;
}) {
  const { modifSaaId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [grossesses, setGrossesses] = useState<Grossesse>();
  const [selectedSaa, setSelectedSaa] = useState<Saa>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setIsPrescripteur(user?.prescripteur ? true : false);
      setOnePrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!onePrescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(onePrescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.SAA
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
    const fetchData = async () => {
      const oneSaa = await getOneSaa(modifSaaId);
      setSelectedSaa(oneSaa as Saa);

      const oneUser = await getOneUser(oneSaa?.saaIdUser as string);
      setPrescripteur(oneUser?.name);

      if (oneSaa) {
        let oneGrossesse = null;
        if (oneSaa.saaIdGrossesse) {
          oneGrossesse = await getOneGrossesse(oneSaa.saaIdGrossesse);
        }
        setGrossesses(oneGrossesse as Grossesse);

        const result = await getAllVisiteByIdClient(oneSaa.saaIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneSaa.saaIdVisite
        );

        const cliniqueClient = await getOneClient(oneSaa.saaIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: string }) => r.id === oneSaa.saaIdVisite)
        );
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneSaa.saaIdClient);
      }
    };
    fetchData();
  }, [modifSaaId, setSelectedClientId]);

  const form = useForm<Saa>();

  const onSubmit: SubmitHandler<Saa> = async (data) => {
    const formattedData = {
      ...data,
      saaIdUser: form.getValues("saaIdUser"),
      saaIdClient: selectedSaa?.saaIdClient ?? "",
      saaCounsellingPre: form.getValues("saaCounsellingPre") ?? false,
      saaConsultationPost: form.getValues("saaConsultationPost") ?? false,
      saaCounsellingPost: form.getValues("saaCounsellingPost") ?? false,
      saaIdClinique: selectedSaa?.saaIdClinique ?? "",
    };

    console.log("Formatted Data:", formattedData);
    try {
      if (selectedSaa) {
        await updateSaa(selectedSaa.id, formattedData);
        const oneSaa = await getOneSaa(modifSaaId);
        setSelectedSaa(oneSaa as Saa);
      }
      toast.info("Formulaire modifié avec succès! 🎉");
    } catch (error) {
      toast.error("La modification du formulaire a échoué");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameValue = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier un SAA. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedSaa) {
      form.setValue("saaIdVisite", selectedSaa.saaIdVisite);
      form.setValue("saaIdClient", selectedSaa.saaIdClient);
      form.setValue("saaIdUser", selectedSaa.saaIdUser);
      form.setValue("saaIdGrossesse", selectedSaa.saaIdGrossesse);
      form.setValue("saaTypeAvortement", selectedSaa.saaTypeAvortement);
      form.setValue("saaMethodeAvortement", selectedSaa.saaMethodeAvortement);
      form.setValue("saaCounsellingPre", selectedSaa.saaCounsellingPre);
      form.setValue(
        "saaSuiviPostAvortement",
        selectedSaa.saaSuiviPostAvortement
      );
      form.setValue("saaMotifDemande", selectedSaa.saaMotifDemande);
      form.setValue("saaConsultationPost", selectedSaa.saaConsultationPost);
      form.setValue("saaCounsellingPost", selectedSaa.saaCounsellingPost);
      form.setValue("saaTypePec", selectedSaa.saaTypePec);
      form.setValue(
        "saaTraitementComplication",
        selectedSaa.saaTraitementComplication
      );

      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
      {selectedSaa && <ConstanteClient idVisite={selectedSaa.saaIdVisite} />}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Formulaire de modification des Soins Après Avortement (SAA)
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-100 rounded-sm mx-auto px-4 py-2 bg-white shadow-md transition-all duration-300"
            >
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="saaIdVisite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sélectionnez la visite</FormLabel>
                      <Select required onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Visite à sélectionner" />
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

                {grossesses && (
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
                            <SelectItem value={grossesses.id}>
                              {grossesses.grossesseDdr &&
                                new Date(
                                  grossesses.grossesseDdr
                                ).toLocaleDateString("fr-FR")}{" "}
                              -{" "}
                              {grossesses.termePrevu &&
                                new Date(
                                  grossesses.termePrevu
                                ).toLocaleDateString("fr-FR")}
                            </SelectItem>
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

                {/* Champs conditionnels avec transition */}
                <ConditionalFields form={form} />

                {/* Affichage des champs de motif si counselling pré-avortement est coché */}
                {form.watch("saaCounsellingPre") && (
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      form.watch("saaCounsellingPre")
                        ? "max-h-25 opacity-100 mt-2"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <FormField
                      control={form.control}
                      name="saaMotifDemande"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">
                            Motif de demande
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
                )}
              </div>

              <FormField
                control={form.control}
                name="saaIdClient"
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
          {!selectedSaa ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedSaa && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>

              {grossesses && (
                <>
                  <div>
                    <span>Période de Grossesse : </span>
                  </div>
                  <div>
                    {grossesses.grossesseDdr &&
                      new Date(grossesses.grossesseDdr).toLocaleDateString(
                        "fr-FR"
                      )}{" "}
                    {grossesses.termePrevu && <span>-</span>}{" "}
                    {grossesses.termePrevu &&
                      new Date(grossesses.termePrevu).toLocaleDateString(
                        "fr-FR"
                      )}
                  </div>
                </>
              )}

              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>

              <div>
                {selectedSaa.saaTypeAvortement && (
                  <span>{"Type d'avortement : "}</span>
                )}
              </div>
              <div>
                {selectedSaa.saaTypeAvortement && (
                  <span>
                    {renameValue(
                      selectedSaa.saaTypeAvortement,
                      tabTypeAvortement
                    )}
                  </span>
                )}
              </div>

              <div>
                {selectedSaa.saaMethodeAvortement && (
                  <span>{"Méthode d'avortement : "}</span>
                )}
              </div>
              <div>
                {selectedSaa.saaMethodeAvortement && (
                  <span>
                    {renameValue(
                      selectedSaa.saaMethodeAvortement,
                      tabMethodeAvortement
                    )}
                  </span>
                )}
              </div>

              <div>
                <span>Consultation post-Abortum suivi: </span>
              </div>
              <div>
                {selectedSaa.saaSuiviPostAvortement ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>
              <div>
                <span>Counselling pré-avortement : </span>
              </div>
              <div>
                {selectedSaa.saaCounsellingPre ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>

              {selectedSaa.saaCounsellingPre && (
                <>
                  <div>
                    {selectedSaa.saaMotifDemande && (
                      <span>Motif de demande : </span>
                    )}
                  </div>
                  <div>
                    {selectedSaa.saaMotifDemande && (
                      <span>
                        {renameValue(
                          selectedSaa.saaMotifDemande,
                          tabMotifDemande
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}

              <div>
                <span>Consultation post-avortement: </span>
              </div>
              <div>
                {selectedSaa.saaConsultationPost ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>

              <div>
                <span>Counselling post-avortement : </span>
              </div>
              <div>
                {selectedSaa.saaCounsellingPost ? (
                  <CheckedTrue />
                ) : (
                  <CheckedFalse />
                )}
              </div>

              {selectedSaa.saaTypePec && (
                <>
                  <div>
                    <span>Type de prise en charge : </span>
                  </div>
                  <div>
                    <span>
                      {renameValue(selectedSaa.saaTypePec, tabTypePec)}
                    </span>
                  </div>
                </>
              )}

              {selectedSaa.saaTraitementComplication && (
                <>
                  <div>
                    <span>Traitement des complications : </span>
                  </div>
                  <div>
                    <span>
                      {renameValue(
                        selectedSaa.saaTraitementComplication,
                        tabTraitementComplication
                      )}
                    </span>
                  </div>
                </>
              )}

              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>

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

              <div className="col-span-2 flex flex-col justify-center">
                <Separator className="my-2" />
              </div>

              <div className="col-span-2 flex flex-row justify-center mt-6 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Retour
                </Button>
                <Button onClick={handleUpdateVisite}>Modifier</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
