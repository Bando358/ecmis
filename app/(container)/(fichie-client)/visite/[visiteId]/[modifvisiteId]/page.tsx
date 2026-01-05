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
import {
  Activite,
  Lieu,
  Permission,
  TableName,
  User,
  Visite,
} from "@prisma/client";
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
import { RefreshCw } from "lucide-react";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getAllActiviteByIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";
import { getOneUser } from "@/lib/actions/authActions";

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
  const [permission, setPermission] = useState<Permission | null>(null);
  const [prescripteur, setPrescripteur] = useState<User | null>(null);
  const [loadingLieu, setLoadingLieu] = useState(false);
  const [loadingActivite, setLoadingActivite] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [
    hasLoadedLieusForCurrentActivite,
    setHasLoadedLieusForCurrentActivite,
  ] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { setSelectedClientId } = useClientContext();

  const { data: session, status } = useSession();
  const idPrestataire = session?.user.id as string;
  const router = useRouter();
  const idUser = session?.user?.id || "";

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      // setIsPrescripteur(user?.prescripteur ? true : false);
      setPrescripteur(user!);
    };
    fetUser();
  }, [idUser]);

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
    // Si une activité est sélectionnée, le lieu est obligatoire
    if (idActivite && !value) {
      return "Le lieu est obligatoire lorsque une activité est sélectionnée";
    }
    return true;
  };

  // Chargement des données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingInitialData(true);
        const oneVisiteData = await getOneVisite(modifvisiteId);
        setOneVisite(oneVisiteData as Visite);

        if (oneVisiteData?.idClient) {
          setSelectedClientId(oneVisiteData.idClient);
          const allVisiteByClient = await getAllVisiteByIdClient(
            oneVisiteData.idClient
          );
          setAllVisite(allVisiteByClient);

          setLoadingActivite(true);
          const allActivite = await getAllActiviteByIdClinique(
            oneVisiteData.idClinique
          );
          setActivite(allActivite as Activite[]);
          setLoadingActivite(false);
        }
      } catch (err) {
        console.error("Erreur chargement données:", err);
        toast.error("Erreur lors du chargement des données");
        setLoadingActivite(false);
        setLoadingLieu(false);
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchData();
  }, [modifvisiteId, setSelectedClientId]);

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
      // Réinitialiser le flag pour permettre le rechargement des lieux
      setHasLoadedLieusForCurrentActivite(false);
    }
  }, [oneVisite, form, idPrestataire, isLoadingInitialData]);

  // Vérification des permissions avec gestion d'erreur NextAuth
  useEffect(() => {
    // Attendre que la session soit complètement chargée
    if (status === "loading" || !prescripteur) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(prescripteur.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.VISITE
        );
        setPermission(perm || null);
      } catch (error: any) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );

        // Vérifier si c'est une erreur d'authentification
        if (
          error.message?.includes("JSON") ||
          error.message?.includes("DOCTYPE")
        ) {
          setAuthError("Erreur d'authentification. Veuillez vous reconnecter.");
          toast.error("Session expirée. Veuillez vous reconnecter.");

          // Rediriger vers la page de connexion après un délai
          setTimeout(() => {
            router.push("/api/auth/signin");
          }, 2000);
        }
      }
    };

    fetchPermissions();
  }, [prescripteur, status, router]);

  // Charger les lieux quand l'activité change
  useEffect(() => {
    const fetchLieus = async () => {
      if (!idActivite) {
        setLieus([]);
        setHasLoadedLieusForCurrentActivite(true);
        // Réinitialiser le champ lieu quand l'activité est désélectionnée
        form.setValue("idLieu", null);
        form.clearErrors("idLieu");
        return;
      }

      // Éviter de recharger si on a déjà chargé les lieux pour cette activité
      if (hasLoadedLieusForCurrentActivite && lieus.length > 0) {
        return;
      }

      try {
        setLoadingLieu(true);
        const lieux = await getAllLieuByTabIdActivite([idActivite]);
        setLieus(lieux);
        setHasLoadedLieusForCurrentActivite(true);

        // Si un lieu était déjà sélectionné mais n'est plus dans la liste, le réinitialiser
        if (idLieu && !lieux.some((l) => l.id === idLieu)) {
          form.setValue("idLieu", null);
          // Déclencher la validation après avoir changé la valeur
          setTimeout(() => {
            form.trigger("idLieu");
          }, 0);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
        toast.error("Erreur de chargement des lieux");
        setLieus([]);
      } finally {
        setLoadingLieu(false);
      }
    };

    fetchLieus();
  }, [idActivite, hasLoadedLieusForCurrentActivite, form, idLieu]);

  // Effet spécifique pour charger les lieux lors de l'initialisation si une activité est déjà sélectionnée
  useEffect(() => {
    const loadInitialLieus = async () => {
      if (
        oneVisite?.idActivite &&
        !hasLoadedLieusForCurrentActivite &&
        !isLoadingInitialData
      ) {
        try {
          setLoadingLieu(true);
          const lieux = await getAllLieuByTabIdActivite([oneVisite.idActivite]);
          setLieus(lieux);
          setHasLoadedLieusForCurrentActivite(true);
        } catch (error) {
          console.error("Erreur lors du chargement initial des lieux:", error);
          setLieus([]);
        } finally {
          setLoadingLieu(false);
        }
      }
    };

    loadInitialLieus();
  }, [oneVisite, hasLoadedLieusForCurrentActivite, isLoadingInitialData]);

  // Effet pour déclencher la validation du lieu quand l'activité change
  useEffect(() => {
    if (idActivite) {
      // Déclencher la validation du lieu après un court délai
      const timer = setTimeout(() => {
        form.trigger("idLieu");
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Si pas d'activité, effacer les erreurs sur le lieu
      form.clearErrors("idLieu");
    }
  }, [idActivite, form]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      // Validation supplémentaire avant soumission
      if (data.idActivite && !data.idLieu) {
        form.setError("idLieu", {
          type: "manual",
          message:
            "Le lieu est obligatoire lorsque une activité est sélectionnée",
        });
        toast.error("Veuillez sélectionner un lieu");
        return;
      }

      // Vérification de la date existante
      const isDateExist = allVisite.some(
        (v) =>
          v.id !== modifvisiteId && // Exclure la visite actuelle
          format(new Date(v.dateVisite), "yyyy-MM-dd") === data.dateVisite
      );

      if (isDateExist) {
        toast.error("Une visite existe déjà à cette date");
        return;
      }

      const formattedData = {
        id: modifvisiteId,
        dateVisite: new Date(data.dateVisite),
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
        console.log("modifvisiteId:", modifvisiteId);
        console.log("formattedData:", formattedData);
        const updatedVisite = await updateVisite(modifvisiteId, formattedData);
        setOneVisite(updatedVisite);
        setIsVisible(false);
        // Réinitialiser le flag pour permettre le rechargement des lieux si nécessaire
        setHasLoadedLieusForCurrentActivite(false);
        toast.success("Visite modifiée avec succès! 🎉");
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

    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une visite. Contactez un administrateur."
      );
      return router.back();
    }

    if (oneVisite) {
      form.setValue(
        "dateVisite",
        format(new Date(oneVisite.dateVisite), "yyyy-MM-dd")
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
      // Réinitialiser le flag pour permettre le rechargement des lieux
      setHasLoadedLieusForCurrentActivite(false);
    }
  };

  const handleReturnActivite = (idActivite: string) => {
    if (loadingActivite) {
      return <Skeleton className="h-4 w-32" />;
    }
    const oneActivite = activite.find((a) => a.id === idActivite);
    return (
      <span>
        {oneActivite?.libelle}{" "}
        <span className="text-sm italic">
          {oneActivite?.dateDebut.toLocaleDateString("fr-FR")} {"-"}{" "}
          {oneActivite?.dateFin.toLocaleDateString("fr-FR")}
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
          {oneLieu?.dateDebut.toLocaleDateString("fr-FR")} {"-"}{" "}
          {oneLieu?.dateFin.toLocaleDateString("fr-FR")}
        </span>
      </span>
    );
  };

  // Gérer le changement d'activité manuellement pour réinitialiser le flag
  const handleActiviteChange = (value: string | null) => {
    form.setValue("idActivite", value);
    form.setValue("idLieu", null); // Réinitialiser le lieu
    setHasLoadedLieusForCurrentActivite(false); // Autoriser le rechargement

    // Déclencher la validation après un court délai
    setTimeout(() => {
      form.trigger("idLieu");
    }, 100);
  };

  // Vérifier si le formulaire est valide pour l'affichage du bouton
  const isFormValid = () => {
    if (idActivite && !idLieu) {
      return false;
    }
    return form.formState.isValid;
  };

  // Si la session est en cours de chargement
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si erreur d'authentification
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Erreur d'authentification
          </h2>
          <p className="text-red-600 mb-4">{authError}</p>
          <Button onClick={() => router.push("/api/auth/signin")}>
            Se reconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center max-w-120 mx-auto px-4 py-2 rounded-md">
      {isLoadingInitialData ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center mb-6">
            Formulaire de modification de visite
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 w-full rounded-sm mx-auto px-4 py-6 bg-white shadow-md"
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
                      <Input type="date" {...field} className="w-full" />
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
                              <RadioGroupItem value={prestation.value} />
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
                    <FormLabel className="font-medium">Activité</FormLabel>
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
                        <option value="">Sélectionnez une activité</option>
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
                      {idActivite && <span className="text-red-500">*</span>}
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
                          form.formState.errors.idLieu ? "border-red-500" : ""
                        }`}
                        disabled={!idActivite || loadingLieu}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          field.onChange(value);
                          // Déclencher la validation immédiatement
                          setTimeout(() => {
                            form.trigger("idLieu");
                          }, 0);
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
                    {idActivite && lieus.length === 0 && !loadingLieu && (
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
                  disabled={form.formState.isSubmitting || !isFormValid()}
                >
                  {form.formState.isSubmitting
                    ? "Modification..."
                    : "Modifier la visite"}
                </Button>
              </div>

              {idActivite && !idLieu && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    ⚠️ <strong>Note :</strong> Le champ "Lieu" est obligatoire
                    lorsque vous sélectionnez une activité.
                  </p>
                </div>
              )}
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-white shadow-md rounded-lg">
          <h2 className="text-xl font-bold text-gray-700 text-center mb-4">
            Détails de la visite
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="font-medium text-gray-600">Date de visite :</div>
            <div className="text-gray-800">
              {oneVisite &&
                new Date(oneVisite.dateVisite).toLocaleDateString("fr-FR")}
            </div>

            <div className="font-medium text-gray-600">
              Motif de la visite :
            </div>
            <div className="text-gray-800">{oneVisite?.motifVisite}</div>

            {oneVisite?.idActivite && (
              <>
                <div className="font-medium text-gray-600">Activité :</div>
                <div className="text-gray-800">
                  {handleReturnActivite(oneVisite.idActivite)}
                </div>
              </>
            )}

            {oneVisite?.idLieu && (
              <>
                <div className="font-medium text-gray-600">Lieu :</div>
                <div className="text-gray-800">
                  {handleReturnLieu(oneVisite.idLieu)}
                </div>
              </>
            )}

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
        </div>
      )}
    </div>
  );
}
