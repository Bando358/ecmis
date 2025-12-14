"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { useState, useEffect, use } from "react";
import { useClientContext } from "@/components/ClientContext";
import {
  updateVisite,
  getOneVisite,
  getAllVisiteByIdClient,
  getAllLieuInVisite,
} from "@/lib/actions/visiteActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Activite, Lieu, Permission, TableName, Visite } from "@prisma/client";
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
  const [loadingLieu, setLoadingLieu] = useState(false);
  const [loadingActivite, setLoadingActivite] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const idPrestataire = session?.user.id as string;
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
  });

  // Chargement des données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
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

          const idActiviteArray = allActivite.map((a: { id: string }) => a.id);
          setLoadingLieu(true);
          const lieux = await getAllLieuByTabIdActivite(idActiviteArray);
          setLieus(lieux);
          setLoadingLieu(false);
        }
      } catch (err) {
        console.error("Erreur chargement données:", err);
        toast.error("Erreur lors du chargement des données");
        setLoadingActivite(false);
        setLoadingLieu(false);
      }
    };

    fetchData();
  }, [modifvisiteId, setSelectedClientId]);

  // Réinitialiser le formulaire quand oneVisite est chargé
  useEffect(() => {
    if (oneVisite && !formInitialized) {
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
      setFormInitialized(true);
    }
  }, [oneVisite, form, idPrestataire, formInitialized]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.VISITE
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

  const idActivite = form.watch("idActivite");

  // Chargement des lieux quand l'activité change
  useEffect(() => {
    const fetchLieus = async () => {
      if (idActivite) {
        try {
          setLoadingLieu(true);
          const allLieuByid = await getAllLieuInVisite(idActivite);
          setLieus(allLieuByid);
          setLoadingLieu(false);
        } catch (err) {
          console.error("Erreur chargement lieux:", err);
          setLoadingLieu(false);
        }
      } else {
        setLieus([]);
        // Réinitialiser idLieu si aucune activité n'est sélectionnée
        form.setValue("idLieu", null);
        setLoadingLieu(false);
      }
    };
    fetchLieus();
  }, [idActivite, form]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
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
    { id: 3, name: "motif", libelle: "CPN", value: "CPN" },
    { id: 4, name: "motif", libelle: "VIH", value: "VIH" },
    { id: 5, name: "motif", libelle: "MEDECINE GENERALE", value: "MDG" },
    { id: 6, name: "motif", libelle: "INFERTILITE", value: "INFERTILITE" },
    { id: 7, name: "motif", libelle: "VBG", value: "VBG" },
    { id: 8, name: "motif", libelle: "IST", value: "IST" },
    { id: 9, name: "motif", libelle: "SAA", value: "SAA" },
    { id: 10, name: "motif", libelle: "LABORATOIRE", value: "LABORATOIRE" },
    { id: 11, name: "motif", libelle: "ECHOGRAPHIE", value: "ECHOGRAPHIE" },
  ];

  const handleUpdateVisite = () => {
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

  return (
    <div className="flex flex-col w-full justify-center max-w-225 mx-auto px-4 py-2 rounded-md">
      {isVisible ? (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Formulaire de modification de visite
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
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
                    <select
                      {...field}
                      className="w-full p-2 border rounded-md"
                      onChange={(e) => {
                        const value = e.target.value || null;
                        field.onChange(value);
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
                      Lieu (optionnel)
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full p-2 border rounded-md"
                        disabled={!idActivite || loadingLieu}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          field.onChange(value);
                        }}
                        value={field.value || ""}
                      >
                        <option value="">
                          {loadingLieu ? "Chargement..." : "Non spécifié"}
                        </option>
                        {lieus.map((lieu) => (
                          <option key={lieu.id} value={lieu.id}>
                            {lieu.lieu}
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

              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="mt-4"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? "Modification..."
                    : "Modifier la visite"}
                </Button>
              </div>
            </form>
          </Form>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>Date de visite :</div>
            <div>
              {oneVisite &&
                new Date(oneVisite.dateVisite).toLocaleDateString("fr-FR")}
            </div>

            <div>Motif de la visite :</div>
            <div>{oneVisite?.motifVisite}</div>

            <div>{oneVisite?.idActivite && "Activité :"}</div>
            <div>
              {oneVisite?.idActivite &&
                handleReturnActivite(oneVisite.idActivite)}
            </div>

            <div>{oneVisite?.idLieu && "Lieu :"}</div>
            <div>{oneVisite?.idLieu && handleReturnLieu(oneVisite.idLieu)}</div>

            <div className="col-span-2 flex flex-row justify-center mt-4">
              <Button onClick={handleUpdateVisite}>Modifier</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
