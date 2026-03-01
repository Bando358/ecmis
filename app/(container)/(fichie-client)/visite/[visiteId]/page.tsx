"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { useState, useEffect, use } from "react";
import { useClientContext } from "@/components/ClientContext";
import {
  createVisite,
  getVisitePageData,
} from "@/lib/actions/visiteActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Activite, Lieu, TableName } from "@prisma/client";
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
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";
import { ArrowBigLeftDash } from "lucide-react";

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
  const [allVisite, setAllVisite] = useState<{ id: string; dateVisite: Date; motifVisite: string }[]>([]);
  const [activite, setActivite] = useState<Activite[]>([]);
  const [lieus, setLieus] = useState<Lieu[]>([]);
  const [clientClinique, setClientClinique] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { canCreate } = usePermissionContext();
  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();
  const router = useRouter();
  const idUser = session?.user?.id || "";

  // Chargement initial optimisé : 1 seul appel réseau
  useEffect(() => {
    if (!idUser || !visiteId) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const data = await getVisitePageData(visiteId);
        setClientClinique(data.idClinique);
        setAllVisite(data.visites);
        setActivite(data.activites);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [idUser, visiteId]);

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
    if (idUser) {
      form.setValue("idUser", idUser);
    }
  }, [idUser, form]);

  useEffect(() => {
    if (visiteId) {
      setSelectedClientId(visiteId);
    }
  }, [visiteId, setSelectedClientId]);

  const dateVisite = form.watch("dateVisite");
  const idActivite = form.watch("idActivite");

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

  const onSubmit: SubmitHandler<VisiteFormValues> = async (data) => {
    if (!canCreate(TableName.VISITE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
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
        toast.error("Le lieu est obligatoire lorsqu'une activité est sélectionnée");
        return;
      }

      const visiteData = {
        id: uuid(),
        dateVisite: parse(data.dateVisite, "yyyy-MM-dd", new Date()),
        motifVisite: data.motifVisite,
        idUser: data.idUser,
        idClinique: clientClinique,
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

  // Affichage du loader pendant le chargement
  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full justify-center p-4 relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 left-4"
              onClick={() => router.back()}
            >
              <ArrowBigLeftDash className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Retour à la page précédente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <h2 className="text-2xl text-blue-900 font-black text-center mb-6">
        Fiche de création de visite
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col border border-blue-200/50 rounded-lg p-6 gap-4 max-w-md mx-auto bg-white shadow-md shadow-blue-100/30"
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
                        {new Date(act.dateDebut).toLocaleDateString("fr-FR")} -{" "}
                        {new Date(act.dateFin).toLocaleDateString("fr-FR")}
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
