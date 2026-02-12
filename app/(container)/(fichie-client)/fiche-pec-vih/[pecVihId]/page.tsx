"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllPecVihByIdClient,
  createPecVih,
} from "@/lib/actions/pecVihActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import { updateRecapVisite } from "@/lib/actions/recapActions";
import { useSession } from "next-auth/react";
import {
  Client,
  PecVih,
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
import { getOneClient } from "@/lib/actions/clientActions";
// 🚀 Import Framer Motion
import { motion, AnimatePresence } from "framer-motion";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import Retour from "@/components/retour";

const tabTypeClientPec = [
  { value: "initiale", label: "Consultation Initiale" },
  { value: "suivi", label: "Consultation Suivi" },
  { value: "autre", label: "Consultation Autre" },
];
const tabTypeMoleculeArv = [
  { value: "ABC 3TC DTG", label: "ABC 3TC DTG" },
  { value: "TDF 3TC DTG", label: "TDF 3TC DTG" },
  { value: "autre", label: "Autre" },
];

export default function PecVihPage({
  params,
}: {
  params: Promise<{ pecVihId: string }>;
}) {
  const { pecVihId } = use(params);

  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedPecVih, setSelectedPecVih] = useState<PecVih[]>([]);
  const [allPrescripteur, setAllPrescripteur] = useState<User[]>([]);
  const [prescripteur, setPrescripteur] = useState<User>();
  const [client, setClient] = useState<Client | null>(null);
  const [isPrescripteur, setIsPrescripteur] = useState<boolean>();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  useEffect(() => {
    setSelectedClientId(pecVihId);
  }, [pecVihId, setSelectedClientId]);

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
          (p: { table: string }) => p.table === TableName.PEC_VIH
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
      const resultPecVih = await getAllPecVihByIdClient(pecVihId);
      setSelectedPecVih(resultPecVih as PecVih[]);

      const result = await getAllVisiteByIdClient(pecVihId);
      setVisites(result as Visite[]);

      const cliniqueClient = await getOneClient(pecVihId);
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
  }, [pecVihId]);

  useEffect(() => {
    form.setValue("pecVihIdClient", pecVihId);
  }, [pecVihId]);

  const form = useForm<PecVih>({
    defaultValues: {
      pecVihCounselling: true,
      pecVihSpdp: true,
      pecVihMoleculeArv: "",
      pecVihAesArv: false,
      pecVihCotrimo: false,
      pecVihIoPaludisme: false,
      pecVihIoTuberculose: false,
      pecVihIoAutre: false,
      pecVihSoutienPsychoSocial: false,
      pecVihIdClient: pecVihId,
      pecVihIdUser: isPrescripteur === true ? (idUser as string) : "",
      pecVihIdVisite: "",
      pecDateRdvSuivi: new Date(),
      pecVihIdClinique: client?.idClinique || "",
    },
  });

  const onSubmit: SubmitHandler<PecVih> = async (data) => {
    if (!permission?.canCreate && prescripteur?.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une PEC VIH. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      pecVihIdClient: form.getValues("pecVihIdClient"),
      pecDateRdvSuivi: new Date(data.pecDateRdvSuivi),
      pecVihCreatedAt: new Date(),
      pecVihUpdatedAt: new Date(),
      pecVihIdClinique: client?.idClinique || "",
    };
    console.log("formattedData", formattedData);
    try {
      await createPecVih(formattedData as PecVih);
      await updateRecapVisite(
        form.watch("pecVihIdVisite"),
        form.watch("pecVihIdUser"),
        "15 Fiche de prise en charge VIH"
      );
      toast.success("Fiche de prise en charge VIH créée avec succès! 🎉");
      router.push(`/fiches/${pecVihId}`);
    } catch (error) {
      toast.error("La création du formulaire a échoué");
      console.error(
        "Erreur lors de la création de la fiche de prise en charge VIH:",
        error
      );
    }
  };

  // Vérifier si ARV est coché pour afficher les champs conditionnels

  return (
    <div className="w-full relative">
      <Retour />
      <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md transition-width duration-300">
        <ConstanteClient idVisite={form.watch("pecVihIdVisite")} />
        {/* On va créer un bouton qui va afficher soit la partie upload soit le formulaire */}
        <AnimatePresence mode="wait">
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl text-blue-900 font-black text-center">
              Formulaire de Prise en Charge VIH
            </h2>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 rounded-sm mx-auto px-4 py-2 bg-white shadow-md shadow-blue-100/30 border border-blue-200/50 max-w-sm"
              >
                <FormField
                  control={form.control}
                  name="pecVihIdVisite"
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
                              disabled={selectedPecVih.some(
                                (p) => p.pecVihIdVisite === visite.id
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
                  name="pecVihTypeclient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Type de consultation
                      </FormLabel>
                      <Select required onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionnez le type de consultation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tabTypeClientPec.map((option, index) => (
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

                <div className="my-2 shadow-sm border-blue-200/50 rounded-md p-4 transition-all duration-300">
                  <FormField
                    control={form.control}
                    name="pecVihCounselling"
                    render={({ field }) => (
                      // <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
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
                    name="pecVihMoleculeArv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">
                          Type de Molécule ARV
                        </FormLabel>
                        <Select required onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sélectionnez la Molécule ARV" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tabTypeMoleculeArv.map((option, index) => (
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
                    name="pecVihAesArv"
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
                            ARV / AES
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pecVihCotrimo"
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
                            Prophylaxie au Cotrimoxazole
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pecVihSpdp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">SPDP</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <h3 className="font-medium mb-2">
                      Infections opportunistes:
                    </h3>

                    <FormField
                      control={form.control}
                      name="pecVihIoPaludisme"
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
                              Paludisme
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pecVihIoTuberculose"
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
                              Tuberculose
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pecVihIoAutre"
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
                              Autre infection opportuniste
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pecVihSoutienPsychoSocial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2 pt-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Soutien psychosocial
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pecVihTypeclient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row justify-center items-center">
                      <FormLabel className="font-normal flex-1">
                        Date de RDV
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="flex-1"
                          type="date"
                          required
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)} // string "2025-09-11"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pecVihIdClient"
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
                    name="pecVihIdUser"
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
                    name="pecVihIdUser"
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

                <Button
                  type="submit"
                  className="mt-4 mx-auto block"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Soumettre..." : "Soumettre"}
                </Button>
              </form>
            </Form>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
