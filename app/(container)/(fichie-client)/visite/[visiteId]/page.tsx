"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { useState, useEffect, use } from "react";
import { useClientContext } from "@/components/ClientContext";
import {
  createVisite,
  getAllVisiteByIdClient,
} from "@/lib/actions/visiteActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Activite,
  Client,
  Lieu,
  Permission,
  TableName,
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
import { v4 as uuid } from "uuid";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllActiviteByIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";

// Type pour la création de visite
type VisiteFormValues = {
  dateVisite: string;
  motifVisite: string;
  idActivite?: string | null;
  idLieu?: string | null;
  idUser: string;
  idClient: string;
};

interface Option {
  id: number;
  name: string;
  libelle: string;
  value: string;
}

export default function FormVisite({
  params,
}: {
  params: Promise<{ visiteId: string }>;
}) {
  const { visiteId } = use(params);
  const [allVisite, setAllVisite] = useState<Visite[]>([]);
  const [activite, setActivite] = useState<Activite[]>([]);
  const [lieus, setLieus] = useState<Lieu[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const router = useRouter();

  const form = useForm<VisiteFormValues>({
    defaultValues: {
      dateVisite: format(new Date(), "yyyy-MM-dd"),
      motifVisite: "",
      idActivite: null,
      idLieu: null,
      idUser: "",
      idClient: visiteId ?? "",
    },
    mode: "onChange",
  });

  // Remplit dynamiquement idUser dès que la session est disponible
  useEffect(() => {
    if (session?.user?.id) {
      form.setValue("idUser", session.user.id);
    }
  }, [session?.user?.id, form]);

  useEffect(() => {
    if (visiteId) {
      setSelectedClientId(visiteId);
    }
  }, [visiteId, setSelectedClientId]);

  const dateVisite = form.watch("dateVisite");
  const idActivite = form.watch("idActivite");

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

  // Charger le client d'abord
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const clientData = await getOneClient(visiteId);
        setClient(clientData);
      } catch (error) {
        console.error("Erreur lors du chargement du client:", error);
        toast.error("Erreur de chargement du client");
      }
    };
    fetchClient();
  }, [visiteId]);

  // Charger les activités une fois le client chargé
  useEffect(() => {
    const fetchActivites = async () => {
      if (!client?.idClinique) return;

      try {
        const activites = await getAllActiviteByIdClinique(client.idClinique);
        setActivite(activites);
      } catch (error) {
        console.error("Erreur lors du chargement des activités:", error);
        toast.error("Erreur de chargement des activités");
      }
    };
    fetchActivites();
  }, [client?.idClinique]);

  // Charger les lieux quand l'activité change
  useEffect(() => {
    const fetchLieus = async () => {
      if (!idActivite) {
        setLieus([]);
        return;
      }

      try {
        const lieux = await getAllLieuByTabIdActivite([idActivite]);
        setLieus(lieux);
      } catch (error) {
        console.error("Erreur lors du chargement des lieux:", error);
        toast.error("Erreur de chargement des lieux");
        setLieus([]);
      }
    };
    fetchLieus();
  }, [idActivite]);

  // Charger les visites existantes
  useEffect(() => {
    const fetchVisites = async () => {
      try {
        const visites = await getAllVisiteByIdClient(visiteId);
        setAllVisite(visites);
      } catch (error) {
        console.error("Erreur lors du chargement des visites:", error);
        toast.error("Erreur de chargement des visites");
      }
    };
    fetchVisites();
  }, [visiteId, dateVisite]);

  const onSubmit: SubmitHandler<VisiteFormValues> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une visite. Contactez un administrateur."
      );
      return router.back();
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!data.idUser) {
      toast.error(
        "Impossible de créer la visite : utilisateur non authentifié."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const existing = allVisite.find(
        (v) => format(new Date(v.dateVisite), "yyyy-MM-dd") === data.dateVisite
      );

      if (existing) {
        toast.warning("Une visite existe déjà pour cette date");
        return;
      }

      if (!data.motifVisite) {
        toast.error("Le motif de la visite est obligatoire");
        return;
      }
      if (data.idActivite && !data.idLieu) {
        alert("Le lieu est obligatoire lorsque une activité est sélectionnée");
        return;
      }

      const visiteData = {
        id: uuid(),
        dateVisite: parse(data.dateVisite, "yyyy-MM-dd", new Date()),
        motifVisite: data.motifVisite,
        idUser: data.idUser,
        idClinique: client?.idClinique || "",
        idClient: data.idClient,
        idActivite: data.idActivite || null,
        idLieu: data.idLieu || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createVisite(visiteData);
      toast.success("Visite créée avec succès !");
      router.push(`/constante/${visiteId}`);
    } catch (error) {
      console.error("Erreur lors de la création de la visite:", error);
      toast.error("Erreur lors de la création de la visite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const motifsVisite: Option[] = [
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

  return (
    <div className="flex flex-col w-full justify-center p-4">
      <h2 className="text-2xl text-gray-600 font-black text-center mb-6">
        Fiche de création de visite
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col border rounded-lg p-6 gap-4 max-w-md mx-auto bg-white shadow-md"
        >
          <FormField
            control={form.control}
            name="dateVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Date de la visite</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="w-full p-2 border rounded-md"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(field.value), "PPPP", { locale: fr })}
                </p>
              </FormItem>
            )}
          />
          {/* <div className="grid grid-cols-2"></div> */}
          {/* motifVisite est obligatoire */}

          <FormField
            control={form.control}
            name="motifVisite"
            rules={{
              required: "Le motif de la visite est obligatoire",
            }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="font-medium">
                  Motif de la visite <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-2 gap-2"
                  >
                    {motifsVisite.map((motif) => (
                      <FormItem
                        key={motif.id}
                        className="flex items-center space-x-2 space-y-0"
                      >
                        <FormControl>
                          <RadioGroupItem value={motif.value} />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {motif.libelle}
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
                  Activité (optionnel)
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => {
                      const value = e.target.value || null;
                      field.onChange(value);
                      // Réinitialiser le lieu quand l'activité change
                      form.setValue("idLieu", null);
                    }}
                    value={field.value || ""}
                  >
                    <option value="">Non spécifié</option>
                    {activite.map((act) => (
                      <option key={act.id} value={act.id} className="text-sm">
                        {act.libelle}{" "}
                        {act.dateDebut.toLocaleDateString("fr-FR")} {`-`}
                        {act.dateFin.toLocaleDateString("fr-FR")}
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
                <FormLabel className="font-medium">Lieu (optionnel)</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full p-2 border rounded-md"
                    disabled={!idActivite}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      field.onChange(value);
                    }}
                    value={field.value || ""}
                  >
                    <option value="">Non spécifié</option>
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
          <input type="hidden" {...form.register("idUser")} />
          <input type="hidden" {...form.register("idClient")} />

          <Button
            type="submit"
            className="mt-4"
            disabled={isSubmitting || !form.watch("motifVisite")}
          >
            {isSubmitting ? "En cours..." : "Créer la visite"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
