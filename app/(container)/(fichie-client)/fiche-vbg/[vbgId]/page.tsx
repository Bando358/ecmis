"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";

import { useSession } from "next-auth/react";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import {
  Vbg,
  User,
  Visite,
  Permission,
  TableName,
  Client,
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
import { Separator } from "@/components/ui/separator";
import { getOneClient } from "@/lib/actions/clientActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { createVbg, getAllVbgByIdClient } from "@/lib/actions/vbgActions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import Retour from "@/components/retour";

const TabTypeVbg = [
  { value: "viol", label: "Viol" },
  { value: "agressionsSexuelles", label: "Agressions Sexuelles" },
  { value: "agressionsPhysiques", label: "Agressions Physiques" },
  { value: "mariageForce", label: "Mariage Forcé" },
  { value: "deniRessources", label: "Dénis de Ressources" },
  { value: "maltraitancePsychologique", label: "Maltraitance Psychologique" },
];
type Option = {
  value: string;
  label: string;
};
const tabPec: Option[] = [
  { value: "pec", label: "PEC" },
  { value: "refere", label: "Référé" },
];

export default function VbgPage({
  params,
}: {
  params: Promise<{ vbgId: string }>;
}) {
  const { vbgId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedVbg, setSelectedVbg] = useState<Vbg[]>([]);

  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(vbgId);
  }, [vbgId, setSelectedClientId]);

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
          (p: { table: string }) => p.table === TableName.VBG
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
      const resultVbg = await getAllVbgByIdClient(vbgId);
      setSelectedVbg(resultVbg as Vbg[]); // Assurez-vous que result est bien de type CliniqueData[]
      const result = await getAllVisiteByIdClient(vbgId);
      setVisites(result as Visite[]); // Assurez-vous que result est bien de type CliniqueData[]
      const client = await getOneClient(vbgId);
      setClient(client);
      let allPrestataire: User[] = [];
      if (client?.idClinique) {
        allPrestataire = await getAllUserIncludedIdClinique(client.idClinique);
      }
      setAllPrescripteur(allPrestataire);
      console.log("allPrestataire", allPrestataire);
    };
    // console.log("resultVbg Vbg", selectedVbg);
    fetchData();
  }, [vbgId]);

  // console.log(visites);

  const form = useForm<Vbg>();
  const onSubmit: SubmitHandler<Vbg> = async (data) => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une fiche VBG. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      vbgType: form.getValues("vbgType") ?? "",
      vbgDuree: Number(form.getValues("vbgDuree")) || 0,
      vbgConsultation: form.getValues("vbgConsultation") ?? "",
      vbgCounsellingRelation: form.getValues("vbgCounsellingRelation") ?? false,
      vbgCounsellingViolenceSexuel:
        form.getValues("vbgCounsellingViolenceSexuel") ?? false,
      vbgCounsellingViolencePhysique:
        form.getValues("vbgCounsellingViolencePhysique") ?? false,
      vbgCounsellingSexuelite:
        form.getValues("vbgCounsellingSexuelite") ?? false,
      vbgPreventionViolenceSexuelle:
        form.getValues("vbgPreventionViolenceSexuelle") ?? false,
      vbgPreventionViolencePhysique:
        form.getValues("vbgPreventionViolencePhysique") ?? false,
      vbgIdUser: form.getValues("vbgIdUser") ?? "",
      vbgIdClient: vbgId ?? form.getValues("vbgIdClient") ?? "",
      vbgIdVisite: form.getValues("vbgIdVisite") ?? "",
      vbgIdClinique: client?.idClinique || "",
    };
    console.log("formattedData", formattedData);
    // toast.success("Formulaire créer avec succès!");
    try {
      await createVbg(formattedData as Vbg);
      await updateRecapVisite(
        form.watch("vbgIdVisite"),
        form.watch("vbgIdUser"),
        "16 Fiche Vbg"
      );
      console.log(formattedData);
      toast.success("Formulaire créer avec succès! 🎉");
      router.push(`/fiches/${vbgId}`);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error("Erreur lors de la création de la Constante:", error);
    }
  };
  const consultationValue = form.watch("vbgConsultation");

  return (
    <div className="w-full relative">
      <Retour />
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border rounded-md">
        <ConstanteClient idVisite={form.getValues("vbgIdVisite")} />
        <h2 className="text-2xl text-gray-600 font-black text-center">
          Formulaire de Vbg
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
          >
            <FormField
              control={form.control}
              name="vbgIdVisite"
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
                          disabled={selectedVbg.some(
                            (p) => p.vbgIdVisite === visite.id
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
                name="vbgType"
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
                        {TabTypeVbg.map((option) => (
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
                name="vbgDuree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duree écoulée en (heures)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value}
                        placeholder="28"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex w-full flex-col gap-5 my-2">
              <FormField
                control={form.control}
                name="vbgConsultation"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-5 mt-2 w-full">
                    {/* Label aligné avec les options */}
                    <FormLabel className="whitespace-nowrap">
                      Consultation :
                    </FormLabel>
                    <FormControl className="flex flex-row gap-x-5 items-center">
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        className="flex gap-x-5 items-center"
                      >
                        {tabPec.map((option) => (
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
            </div>
            <div>
              {/* S'affiche uniquement si la consultation est PEC */}
              {consultationValue === "pec" && (
                <div className="my-2  shadow-md border rounded-md ">
                  <FormField
                    control={form.control}
                    name="vbgCounsellingRelation"
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
                            Counselling - Relation Sexuelle
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vbgCounsellingViolenceSexuel"
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
                            Counselling - Violence Sexuelle
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vbgCounsellingViolencePhysique"
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
                            Counselling - Violence Physique
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* <Separator /> */}
                  <FormField
                    control={form.control}
                    name="vbgCounsellingSexuelite"
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
                            Counseling - Sexualité
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Separator className="my-3" />
                  <FormField
                    control={form.control}
                    name="vbgPreventionViolenceSexuelle"
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
                            Prévention - Violence Sexuelle
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vbgPreventionViolencePhysique"
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
                            Prévention - Violence Physique
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="vbgIdClient"
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
              name="vbgIdUser"
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

            <div className="flex flex-row justify-center py-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Submitting..." : "Soumettre"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
