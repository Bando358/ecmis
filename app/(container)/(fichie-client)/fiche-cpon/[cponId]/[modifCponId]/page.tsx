"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
// import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneCpon, updateCpon } from "@/lib/actions/cponActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import { Cpon, Permission, TableName, User, Visite } from "@prisma/client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getOneClient } from "@/lib/actions/clientActions";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

type Option = {
  value: string;
  label: string;
};
const TabDuree = [
  { value: "6_72", label: "Les 6 et 72 heures" },
  { value: "4_10", label: "Les 4 jrs et 10 jours" },
  { value: "10_6", label: "Les 10 jrs et < 6 semaines " },
  { value: "6_8", label: "Les 6 semaines et  8 semaines " },
];

export default function CpnPage({
  params,
}: {
  params: Promise<{ modifCponId: string }>;
}) {
  const { modifCponId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedCpon, setSelectedCpon] = useState<Cpon>();
  const [dateVisite, setDateVisite] = useState<Date>();
  const [prescripteur, setPrescripteur] = useState<string>();
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [onePrescripteur, setOnePrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
        const permissions = await getUserPermissionsById(onePrescripteur?.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.CPON
        );
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'accéder à cette page.");
        //   router.back();
        // }
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
      const oneCpon = await getOneCpon(modifCponId);
      const oneUser = await getOneUser(oneCpon?.cponIdUser as string);
      setPrescripteur(oneUser?.name);
      setSelectedCpon(oneCpon as Cpon);
      if (oneCpon) {
        const result = await getAllVisiteByIdClient(oneCpon.cponIdClient);
        const visiteDate = result.find(
          (r: { id: string }) => r.id === oneCpon.cponIdVisite
        );

        const cliniqueClient = await getOneClient(oneCpon.cponIdClient);
        let allPrestataire: User[] = [];
        if (cliniqueClient?.idClinique) {
          allPrestataire = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique
          );
        }
        setAllPrescripteur(allPrestataire as User[]);

        setVisites(
          result.filter((r: { id: any }) => r.id === oneCpon.cponIdVisite)
        ); // Use oneCpon instead of selectedCpon
        setDateVisite(visiteDate?.dateVisite);
        setSelectedClientId(oneCpon.cponIdClient); // Use oneCpon instead of selectedCpon
      }
    };
    fetchData();
  }, [modifCponId, setSelectedClientId]);

  const form = useForm<Cpon>();
  const onSubmit: SubmitHandler<Cpon> = async (data) => {
    if (!permission?.canCreate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une CPoN. Contactez un administrateur."
      );
      return router.back();
    }

    const formattedData = {
      ...data,
      cponIdUser: form.getValues("cponIdUser"),
      // idUser: form.getValues("idUser"),
      cponIdClient: form.getValues("cponIdClient"),
      cponIdVisite: form.getValues("cponIdVisite"),
      cponIdClinique: selectedCpon?.cponIdClinique || "",
    };
    console.log(formattedData);
    try {
      if (selectedCpon) {
        console.log(formattedData);
        await updateCpon(selectedCpon.id, formattedData);
        const oneCpon = await getOneCpon(modifCponId);
        if (oneCpon) {
          setSelectedCpon(oneCpon as Cpon);
        }
      }
      toast.info("Formulaire modifiée avec succès! 🎉");
    } catch (error) {
      toast.error("La modification du formulaire a échoué");
      console.error("Erreur lors de la modification du formulaire:", error);
    } finally {
      setIsVisible(false);
    }
  };

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && onePrescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une CPoN. Contactez un administrateur."
      );
      return router.back();
    }
    if (selectedCpon) {
      form.setValue("cponIdVisite", selectedCpon.cponIdVisite);
      form.setValue("cponIdClient", selectedCpon.cponIdClient);
      form.setValue("cponIdUser", selectedCpon.cponIdUser);
      form.setValue("cponDuree", selectedCpon.cponDuree);
      form.setValue("cponConsultation", selectedCpon.cponConsultation);
      form.setValue("cponCounselling", selectedCpon.cponCounselling);
      form.setValue(
        "cponInvestigationPhysique",
        selectedCpon.cponInvestigationPhysique
      );

      setIsVisible(true);
    }
  };

  const renameValue = (val: string, tab: Option[]) => {
    const newVal = tab.find((t) => t.value === val);
    return newVal?.label;
  };

  return (
    <div className="flex flex-col w-full justify-center max-w-250 mx-auto px-4 py-2 border rounded-md">
      {selectedCpon && <ConstanteClient idVisite={selectedCpon.cponIdVisite} />}
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            {`Formulaire de modification de la consultation CPoN`}
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-4xl rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
            >
              <div className="my-2 px-4 py-2 shadow-md border rounded-md ">
                <FormField
                  control={form.control}
                  name="cponIdVisite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selectionnez la visite</FormLabel>
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
                        <FormLabel className="font-normal">
                          Counselling
                        </FormLabel>
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
                      <Input {...field} className="hidden" />
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
                        <Input {...field} value={idUser} className="hidden" />
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
                <Button
                  type="submit"
                  className="mt-4"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
                </Button>
              </div>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {!selectedCpon ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-62.5" />
                <Skeleton className="h-4 w-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>{selectedCpon && <span>Date de visite : </span>}</div>
              <div>
                {dateVisite && new Date(dateVisite).toLocaleDateString("fr-FR")}
              </div>

              <div>
                {selectedCpon && selectedCpon.cponDuree !== null && (
                  <span>{"Consultation CPoN entre : "}</span>
                )}
              </div>
              <div>
                {selectedCpon && selectedCpon.cponDuree !== null && (
                  <span>{renameValue(selectedCpon.cponDuree, TabDuree)}</span>
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
