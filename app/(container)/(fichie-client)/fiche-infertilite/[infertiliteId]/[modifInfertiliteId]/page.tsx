"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import {
  getOneInfertilite,
  updateInfertilite,
} from "@/lib/actions/infertiliteActions";

import { useSession } from "next-auth/react";
import {
  Infertilite,
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
import ConstanteClient from "@/components/constanteClient";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckedFalse, CheckedTrue } from "@/components/checkedTrue";
import { getOneClient } from "@/lib/actions/clientActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

type Option = {
  value: string;
  label: string;
};
const TabTraitement = [
  { value: "medicale", label: "Médicale" },
  { value: "hormonale", label: "Hormonale / Ovulation" },
];

export default function IstPage({
  params,
}: {
  params: Promise<{ modifInfertiliteId: string }>;
}) {
  const { modifInfertiliteId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedInfertilite, setSelectedInfertilite] = useState<Infertilite>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  // setSelectedClientId(params.infertiliteId);

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
          (p: { table: string }) => p.table === TableName.INFERTILITE
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
      try {
        const oneInfertilite = await getOneInfertilite(modifInfertiliteId);
        setSelectedInfertilite(oneInfertilite as Infertilite);

        let allPrestataire: User[] = [];

        if (oneInfertilite?.infertIdClient) {
          const cliniqueClient = await getOneClient(
            oneInfertilite.infertIdClient
          );

          if (cliniqueClient?.idClinique) {
            allPrestataire = await getAllUserIncludedIdClinique(
              cliniqueClient.idClinique
            );
          }
        }

        setAllPrescripteur(allPrestataire);
        console.log("allPrestataire ", allPrestataire);
      } catch (err) {
        console.error("Erreur chargement prescripteurs:", err);
      }
    };

    fetchData();
  }, [modifInfertiliteId]); // ✅ plus propre

  useEffect(() => {
    const fetchData = async () => {
      if (selectedInfertilite) {
        const result = await getAllVisiteByIdClient(
          selectedInfertilite.infertIdClient
        );
        const visiteDate = result.find(
          (r: { id: string }) => r.id === selectedInfertilite.infertIdVisite
        );

        const nomPrescripteur = await getOneUser(
          selectedInfertilite.infertIdUser
        );
        const nomP = nomPrescripteur?.name;
        setPrescripteur(nomP);

        setVisites(
          result.filter(
            (r: { id: string }) => r.id === selectedInfertilite.infertIdVisite
          )
        ); // Assurez-vous que result est bien de type CliniqueData[]
        setDateVisite(visiteDate?.dateVisite);
        // const clientData = await getOneClient(selectedGyneco.idClient);
        setSelectedClientId(selectedInfertilite.infertIdClient);
      }
    };
    fetchData();
  }, [selectedInfertilite, setSelectedClientId]);
  // console.log(visites);

  const form = useForm<Infertilite>();

  const onSubmit: SubmitHandler<Infertilite> = async (data) => {
    const formattedData = {
      ...data,
      infertIdUser: form.getValues("infertIdUser"),
      infertIdClient: selectedInfertilite?.infertIdClient ?? "",
      infertIdVisite: form.getValues("infertIdVisite"),
      infertTraitement: form.getValues("infertTraitement"),
      infertIdClinique: selectedInfertilite?.infertIdClinique ?? "",
    };
    try {
      if (selectedInfertilite) {
        console.log(formattedData);
        await updateInfertilite(selectedInfertilite.id, formattedData);
        const oneInfertilite = await getOneInfertilite(modifInfertiliteId);
        if (oneInfertilite) {
          setSelectedInfertilite(oneInfertilite as Infertilite);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La Modification du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const renameTraitement = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une infertilité. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedInfertilite) {
      form.setValue("infertIdVisite", selectedInfertilite.infertIdVisite);
      form.setValue("infertIdUser", selectedInfertilite.infertIdUser);
      form.setValue(
        "infertConsultation",
        selectedInfertilite.infertConsultation
      );
      form.setValue("infertCounselling", selectedInfertilite.infertCounselling);
      form.setValue(
        "infertExamenPhysique",
        selectedInfertilite.infertExamenPhysique
      );
      form.setValue("infertTraitement", selectedInfertilite.infertTraitement);
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-225 mx-auto px-4 py-2 border rounded-md">
      {selectedInfertilite && (
        <ConstanteClient idVisite={selectedInfertilite.infertIdVisite} />
      )}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            {"Formulaire de modification d'Infertilité"}
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <FormField
                control={form.control}
                name="infertIdVisite"
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

              <div className="my-2 shadow-md border rounded-md ">
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
                        <FormLabel className="font-normal">
                          Consulation
                        </FormLabel>
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
                        <FormLabel className="font-normal">
                          Counselling
                        </FormLabel>
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
                name="infertIdClient"
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
                  name="infertIdUser"
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
                  name="infertIdUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Selectionnez le precripteur
                      </FormLabel>
                      <Select
                        required
                        value={field.value} // ⚡ ici
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
          {!selectedInfertilite ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedInfertilite && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>

              <div>{selectedInfertilite && <span>Consultation : </span>}</div>
              <div>
                {selectedInfertilite && (
                  <span>
                    {selectedInfertilite.infertConsultation ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>
              <div>{selectedInfertilite && <span>Counselling : </span>}</div>
              <div>
                {selectedInfertilite && (
                  <span>
                    {selectedInfertilite.infertCounselling ? (
                      <CheckedTrue />
                    ) : (
                      <CheckedFalse />
                    )}
                  </span>
                )}
              </div>
              <div>
                {selectedInfertilite &&
                  selectedInfertilite.infertExamenPhysique && (
                    <span>Investigation Physique : </span>
                  )}
              </div>
              <div>
                {selectedInfertilite &&
                  selectedInfertilite.infertExamenPhysique && (
                    <span>
                      {selectedInfertilite.infertExamenPhysique ? (
                        <CheckedTrue />
                      ) : (
                        <CheckedFalse />
                      )}
                    </span>
                  )}
              </div>
              <div>
                {selectedInfertilite &&
                  selectedInfertilite.infertTraitement !== null && (
                    <span>Traitement : </span>
                  )}
              </div>
              <div>
                {selectedInfertilite &&
                  selectedInfertilite.infertTraitement !== null && (
                    <span>
                      {renameTraitement(
                        selectedInfertilite.infertTraitement,
                        TabTraitement
                      )}
                    </span>
                  )}
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
