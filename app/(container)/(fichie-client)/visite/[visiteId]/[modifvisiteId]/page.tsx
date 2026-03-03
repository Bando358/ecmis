"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { useState, useEffect, use } from "react";
import { useClientContext } from "@/components/ClientContext";
import {
  updateVisite,
  getOneVisite,
  getAllVisiteByIdClient,
} from "@/lib/actions/visiteActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Activite, Lieu, TableName, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2, Pencil } from "lucide-react";
import { getActiveActivitesByIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";
import { getOneUser } from "@/lib/actions/authActions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Retour from "@/components/retour";

type FormValues = {
  dateVisite: string;
  motifVisite: string;
  idActivite: string | null;
  idLieu: string | null;
  idPrestataire: string;
  idClient: string;
};

interface Option {
  id: number;
  name: string;
  libelle: string;
  value: string;
}

export default function FormVisiteModification({
  params,
}: {
  params: Promise<{ modifvisiteId: string }>;
}) {
  const { modifvisiteId } = use(params);
  const [allVisite, setAllVisite] = useState<Visite[]>([]);
  const [activite, setActivite] = useState<Activite[]>([]);
  const [lieus, setLieus] = useState<Lieu[]>([]);
  const [oneVisite, setOneVisite] = useState<Visite>();
  const [isVisible, setIsVisible] = useState(false);
  const [prescripteur, setPrescripteur] = useState<SafeUser | null>(null);
  const [loadingLieu, setLoadingLieu] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const { setSelectedClientId } = useClientContext();
  const { canUpdate } = usePermissionContext();

  const { data: session, status } = useSession();
  const idPrestataire = session?.user?.id || "";
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      idPrestataire,
      idClient: "",
      dateVisite: format(new Date(), "yyyy-MM-dd"),
      motifVisite: "",
      idActivite: null,
      idLieu: null,
    },
    mode: "onChange",
  });

  const idActivite = form.watch("idActivite");
  const idLieu = form.watch("idLieu");

  // Validation personnalisée pour le champ lieu
  const validateLieu = (value: string | null) => {
    if (idActivite && !value) {
      return "Le lieu est obligatoire lorsque une activité est sélectionnée";
    }
    return true;
  };

  // Chargement initial optimisé : requêtes en parallèle
  useEffect(() => {
    if (!idPrestataire || !modifvisiteId) return;

    const fetchData = async () => {
      try {
        setIsLoadingInitialData(true);

        // Étape 1: Requêtes indépendantes en parallèle
        const [user, oneVisiteData] = await Promise.all([
          getOneUser(idPrestataire),
          getOneVisite(modifvisiteId),
        ]);

        setPrescripteur(user);
        setOneVisite(oneVisiteData as Visite);

        if (oneVisiteData?.idClient) {
          setSelectedClientId(oneVisiteData.idClient);

          // Étape 2: Requêtes dépendantes en parallèle
          const [allVisiteByClient, allActivite] =
            await Promise.all([
              getAllVisiteByIdClient(oneVisiteData.idClient),
              getActiveActivitesByIdClinique(oneVisiteData.idClinique),
            ]);

          setAllVisite(allVisiteByClient);
          setActivite(allActivite);

          // Charger les lieux si une activité est déjà sélectionnée
          if (oneVisiteData.idActivite) {
            try {
              setLoadingLieu(true);
              const lieux = await getAllLieuByTabIdActivite([
                oneVisiteData.idActivite,
              ]);
              setLieus(lieux);
            } catch {
              setLieus([]);
            } finally {
              setLoadingLieu(false);
            }
          }
        }
      } catch (err) {
        console.error("Erreur chargement données:", err);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchData();
  }, [idPrestataire, modifvisiteId, setSelectedClientId]);

  // Réinitialiser le formulaire quand oneVisite est chargé
  useEffect(() => {
    if (oneVisite && !isLoadingInitialData) {
      form.reset({
        idPrestataire,
        idClient: oneVisite.idClient,
        dateVisite: oneVisite.dateVisite
          ? format(new Date(oneVisite.dateVisite), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        motifVisite: oneVisite.motifVisite || "",
        idActivite: oneVisite.idActivite || null,
        idLieu: oneVisite.idLieu || null,
      });
    }
  }, [oneVisite, form, idPrestataire, isLoadingInitialData]);

  // Charger les lieux quand l'activité change (seulement en mode édition)
  useEffect(() => {
    if (isLoadingInitialData) return;

    const fetchLieus = async () => {
      if (!idActivite) {
        setLieus([]);
        form.setValue("idLieu", null);
        form.clearErrors("idLieu");
        return;
      }

      try {
        setLoadingLieu(true);
        const lieux = await getAllLieuByTabIdActivite([idActivite]);
        setLieus(lieux);

        // Si un lieu était sélectionné mais n'est plus dans la liste, le réinitialiser
        if (idLieu && !lieux.some((l) => l.id === idLieu)) {
          form.setValue("idLieu", null);
        }
      } catch {
        toast.error("Erreur de chargement des lieux");
        setLieus([]);
      } finally {
        setLoadingLieu(false);
      }
    };

    fetchLieus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idActivite]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      if (data.idActivite && !data.idLieu) {
        form.setError("idLieu", {
          type: "manual",
          message:
            "Le lieu est obligatoire lorsque une activité est sélectionnée",
        });
        toast.error("Veuillez sélectionner un lieu");
        return;
      }

      const isDateExist = allVisite.some(
        (v) =>
          v.id !== modifvisiteId &&
          format(new Date(v.dateVisite), "yyyy-MM-dd") === data.dateVisite,
      );

      if (isDateExist) {
        toast.error("Une visite existe déjà à cette date");
        return;
      }

      const formattedData = {
        id: modifvisiteId,
        dateVisite: new Date(data.dateVisite + "T12:00:00"),
        motifVisite: data.motifVisite,
        idActivite: data.idActivite?.trim() !== "" ? data.idActivite : null,
        idLieu: data.idLieu?.trim() !== "" ? data.idLieu : null,
        idClient: oneVisite?.idClient ?? "",
        idClinique: oneVisite?.idClinique ?? "",
        idUser: oneVisite?.idUser || idPrestataire,
        createdAt: oneVisite?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };

      if (oneVisite) {
        const updatedVisite = await updateVisite(modifvisiteId, formattedData);
        setOneVisite(updatedVisite);
        setIsVisible(false);
        toast.success("Visite modifiée avec succès !");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la modification de la visite");
    }
  };

  const tabPrestation: Option[] = [
    { id: 1, name: "motif", libelle: "CONTRACEPTION", value: "CONTRACEPTION" },
    { id: 2, name: "motif", libelle: "GYNECOLOGIE", value: "GYNECOLOGIE" },
    {
      id: 3,
      name: "motif",
      libelle: "TEST GROSSESSE",
      value: "TEST GROSSESSE",
    },
    { id: 4, name: "motif", libelle: "CPN", value: "CPN" },
    { id: 5, name: "motif", libelle: "VIH", value: "VIH" },
    { id: 6, name: "motif", libelle: "MEDECINE GENERALE", value: "MDG" },
    { id: 7, name: "motif", libelle: "INFERTILITE", value: "INFERTILITE" },
    { id: 8, name: "motif", libelle: "VBG", value: "VBG" },
    { id: 9, name: "motif", libelle: "IST", value: "IST" },
    { id: 10, name: "motif", libelle: "SAA", value: "SAA" },
    { id: 11, name: "motif", libelle: "LABORATOIRE", value: "LABORATOIRE" },
    { id: 12, name: "motif", libelle: "ECHOGRAPHIE", value: "ECHOGRAPHIE" },
  ];

  const handleUpdateVisite = () => {
    if (authError) {
      toast.error("Erreur d'authentification. Veuillez vous reconnecter.");
      router.push("/api/auth/signin");
      return;
    }

    if (!canUpdate(TableName.VISITE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return router.back();
    }

    if (oneVisite) {
      form.setValue(
        "dateVisite",
        format(new Date(oneVisite.dateVisite), "yyyy-MM-dd"),
      );
      form.setValue("motifVisite", oneVisite.motifVisite);
      form.setValue("idActivite", oneVisite.idActivite);
      form.setValue("idLieu", oneVisite.idLieu);
      setIsVisible(true);
    }
  };

  const handleReset = () => {
    if (oneVisite) {
      form.setValue("motifVisite", "");
      form.setValue("idActivite", null);
      form.setValue("idLieu", null);
      form.clearErrors("idLieu");
    }
  };

  const handleReturnActivite = (idActivite: string) => {
    const oneActivite = activite.find((a) => a.id === idActivite);
    return (
      <span>
        {oneActivite?.libelle}{" "}
        <span className="text-sm italic">
          {new Date(oneActivite?.dateDebut ?? "").toLocaleDateString("fr-FR")}{" "}
          {"-"}{" "}
          {new Date(oneActivite?.dateFin ?? "").toLocaleDateString("fr-FR")}
        </span>
      </span>
    );
  };

  const handleReturnLieu = (idLieu: string) => {
    if (loadingLieu) {
      return <Skeleton className="h-4 w-32" />;
    }
    const oneLieu = lieus.find((l) => l.id === idLieu);
    return (
      <span>
        {oneLieu?.lieu}{" "}
        <span className="text-sm italic">
          {new Date(oneLieu?.dateDebut ?? "").toLocaleDateString("fr-FR")}{" "}
          {"-"}{" "}
          {new Date(oneLieu?.dateFin ?? "").toLocaleDateString("fr-FR")}
        </span>
      </span>
    );
  };

  // Gérer le changement d'activité
  const handleActiviteChange = (value: string | null) => {
    form.setValue("idActivite", value);
    form.setValue("idLieu", null);
  };

  const isFormValid = () => {
    if (idActivite && !idLieu) {
      return false;
    }
    return form.formState.isValid;
  };

  // Si la session est en cours de chargement
  if (status === "loading") {
    return (
      <div className="w-full relative">
        <Retour />
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
          <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Si erreur d'authentification
  if (authError) {
    return (
      <div className="w-full relative">
        <Retour />
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
          <Card className="border-red-200/60 shadow-sm shadow-red-100/30">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <h2 className="text-xl font-bold text-red-700 mb-2">
                Erreur d&apos;authentification
              </h2>
              <p className="text-red-600 mb-4">{authError}</p>
              <Button onClick={() => router.push("/api/auth/signin")}>
                Se reconnecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <Retour />
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {isLoadingInitialData ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardContent className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </CardContent>
              </Card>
            </motion.div>
          ) : isVisible ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                  <CardTitle className="text-lg font-semibold text-blue-900 text-center">
                    Modifier - Visite
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4 max-w-4xl mx-auto px-4 py-4"
                    >
                      <FormField
                        control={form.control}
                        name="dateVisite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">
                              Date de visite
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="motifVisite"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <div className="text-xl font-bold flex justify-between items-center">
                              <FormLabel className="ml-4">
                                Motif de la visite:
                              </FormLabel>
                              <RefreshCw
                                onClick={handleReset}
                                className="hover:text-blue-600 transition-all duration-200 hover:bg-slate-300 rounded-full p-1 active:scale-125 cursor-pointer"
                              />
                            </div>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="grid grid-cols-2 gap-2"
                              >
                                {tabPrestation.map((prestation) => (
                                  <FormItem
                                    key={prestation.id}
                                    className="flex items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <RadioGroupItem
                                        value={prestation.value}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {prestation.libelle}
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
                        name="idActivite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">
                              Activité
                            </FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="w-full p-2 border rounded-md"
                                onChange={(e) => {
                                  const value = e.target.value || null;
                                  handleActiviteChange(value);
                                }}
                                value={field.value || ""}
                              >
                                <option value="">
                                  Sélectionnez une activité
                                </option>
                                {activite.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.libelle}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="idLieu"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">
                              Lieu{" "}
                              {idActivite && (
                                <span className="text-red-500">*</span>
                              )}
                              {!idActivite && (
                                <span className="text-gray-500 text-sm">
                                  {" "}
                                  (optionnel)
                                </span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className={`w-full p-2 border rounded-md ${
                                  form.formState.errors.idLieu
                                    ? "border-red-500"
                                    : ""
                                }`}
                                disabled={!idActivite || loadingLieu}
                                onChange={(e) => {
                                  const value = e.target.value || null;
                                  field.onChange(value);
                                }}
                                value={field.value || ""}
                              >
                                <option value="">
                                  {loadingLieu
                                    ? "Chargement des lieux..."
                                    : idActivite
                                      ? "Sélectionnez un lieu"
                                      : "Non spécifié"}
                                </option>
                                {!loadingLieu &&
                                  lieus.map((lieu) => (
                                    <option key={lieu.id} value={lieu.id}>
                                      {lieu.lieu}
                                    </option>
                                  ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                            {idActivite &&
                              lieus.length === 0 &&
                              !loadingLieu && (
                                <p className="text-sm text-amber-600">
                                  Aucun lieu disponible pour cette activité
                                </p>
                              )}
                          </FormItem>
                        )}
                        rules={{ validate: validateLieu }}
                      />

                      <FormField
                        control={form.control}
                        name="idPrestataire"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} type="hidden" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="idClient"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} type="hidden" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-center gap-4 pt-4 border-t border-blue-100/60 mt-4">
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
                          disabled={
                            form.formState.isSubmitting || !isFormValid()
                          }
                        >
                          {form.formState.isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              En cours...
                            </>
                          ) : (
                            "Modifier la visite"
                          )}
                        </Button>
                      </div>

                      {idActivite && !idLieu && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-sm text-amber-800">
                            <strong>Note :</strong> Le champ &quot;Lieu&quot;
                            est obligatoire lorsque vous sélectionnez une
                            activité.
                          </p>
                        </div>
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className=" mx-auto border-blue-200/60 shadow-sm shadow-blue-100/30">
                <CardHeader className="bg-blue-50/40 rounded-t-xl border-b border-blue-100/60 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-blue-900">
                        Visite
                      </CardTitle>
                      <CardDescription className="text-blue-700/60">
                        Détails de la visite
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="divide-y divide-blue-100/60">
                    <div className="grid grid-cols-3 gap-x-4 py-2.5">
                      <span className="text-sm font-medium text-blue-800">
                        Date de visite
                      </span>
                      <span className="col-span-2 text-sm text-gray-700">
                        {oneVisite &&
                          new Date(oneVisite.dateVisite).toLocaleDateString(
                            "fr-FR",
                          )}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-x-4 py-2.5">
                      <span className="text-sm font-medium text-blue-800">
                        Motif de la visite
                      </span>
                      <span className="col-span-2 text-sm text-gray-700">
                        {oneVisite?.motifVisite}
                      </span>
                    </div>

                    {oneVisite?.idActivite && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Activité
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {handleReturnActivite(oneVisite.idActivite)}
                        </span>
                      </div>
                    )}

                    {oneVisite?.idLieu && (
                      <div className="grid grid-cols-3 gap-x-4 py-2.5">
                        <span className="text-sm font-medium text-blue-800">
                          Lieu
                        </span>
                        <span className="col-span-2 text-sm text-gray-700">
                          {handleReturnLieu(oneVisite.idLieu)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center gap-4 border-t border-blue-100/60 pt-4">
                  <Button variant="outline" onClick={() => router.back()}>
                    Retour
                  </Button>
                  <Button onClick={handleUpdateVisite}>
                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
