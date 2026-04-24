"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowBigLeftDash, Stethoscope } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { TableName, Client, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ConstanteClient from "@/components/constanteClient";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClientContext } from "@/components/ClientContext";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { getOneClient } from "@/lib/actions/clientActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  getAllUserIncludedIdClinique,
  getOneUser,
} from "@/lib/actions/authActions";
import {
  createTraitementIva,
  getAllGynecoPositifByIdClient,
  getAllTraitementIvaByIdClient,
} from "@/lib/actions/traitementIvaActions";

const TYPE_TRAITEMENT = [
  { value: "thermocoagulation", label: "Thermocoagulation" },
  { value: "chryotherapie", label: "Chryothérapie" },
];

type GynecoPositif = {
  id: string;
  createdAt: Date;
  Visite: { dateVisite: Date } | null;
  TraitementIva: { id: string; dateTraitement: Date }[];
};

type TraitementItem = {
  id: string;
  dateTraitement: Date;
  typeTraitement: string;
  observations: string | null;
  idGynecologie: string | null;
  idVisite: string;
  User: { name: string | null } | null;
  Clinique: { nomClinique: string } | null;
};

type FormValues = {
  idVisite: string;
  typeTraitement: string;
  observations: string;
  idGynecologie: string;
  idUser: string;
};

export default function TraitementIvaPage({
  params,
}: {
  params: Promise<{ traitementIvaId: string }>;
}) {
  const { traitementIvaId: clientId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const { canCreate } = usePermissionContext();
  const { setSelectedClientId } = useClientContext();

  const [client, setClient] = useState<Client | null>(null);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [isPrescripteur, setIsPrescripteur] = useState(false);
  const [allPrescripteur, setAllPrescripteur] = useState<SafeUser[]>([]);
  const [gynecos, setGynecos] = useState<GynecoPositif[]>([]);
  const [traitements, setTraitements] = useState<TraitementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      idVisite: "",
      typeTraitement: "",
      observations: "",
      idGynecologie: "",
      idUser: "",
    },
  });

  useEffect(() => {
    setSelectedClientId(clientId);
  }, [clientId, setSelectedClientId]);

  useEffect(() => {
    if (!idUser || !clientId) return;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [user, cliniqueClient, gynecoList, traitementList, visiteList] =
          await Promise.all([
            getOneUser(idUser),
            getOneClient(clientId),
            getAllGynecoPositifByIdClient(clientId),
            getAllTraitementIvaByIdClient(clientId),
            getAllVisiteByIdClient(clientId),
          ]);
        setIsPrescripteur(!!user?.prescripteur);
        setClient(cliniqueClient);
        setGynecos(gynecoList as GynecoPositif[]);
        setTraitements(traitementList as TraitementItem[]);
        setVisites(visiteList as Visite[]);

        if (cliniqueClient?.idClinique) {
          const users = await getAllUserIncludedIdClinique(
            cliniqueClient.idClinique,
          );
          setAllPrescripteur(
            users.filter((u) => u.prescripteur) as SafeUser[],
          );
        }

        if (user?.prescripteur) {
          form.setValue("idUser", idUser);
        }
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [idUser, clientId, form]);

  const sansTraitement = useMemo(
    () => gynecos.filter((g) => g.TraitementIva.length === 0),
    [gynecos],
  );

  // Visites déjà utilisées pour un traitement IVA : à exclure du sélecteur
  const visitesDejaTraitees = useMemo(
    () => new Set(traitements.map((t) => t.idVisite).filter(Boolean)),
    [traitements],
  );

  const visitesOrdered = useMemo(
    () =>
      [...visites].sort(
        (a, b) =>
          new Date(b.dateVisite).getTime() - new Date(a.dateVisite).getTime(),
      ),
    [visites],
  );

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!canCreate(TableName.TRAITEMENT_IVA)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    if (!client?.idClinique) {
      toast.error("Clinique du client introuvable");
      return;
    }
    if (!data.idVisite) {
      toast.error("Sélectionnez une visite");
      return;
    }
    const effectiveUser = isPrescripteur ? idUser : data.idUser || idUser;
    try {
      await createTraitementIva({
        idVisite: data.idVisite,
        typeTraitement: data.typeTraitement,
        observations: data.observations || null,
        idGynecologie: data.idGynecologie || null,
        idClient: clientId,
        idClinique: client.idClinique,
        idUser: effectiveUser,
      });
      toast.success("Traitement IVA enregistré 🎉");
      setIsSubmitted(true);
      router.push(`/fiches/${clientId}`);
    } catch (err) {
      console.error(err);
      toast.error("La création du traitement a échoué");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-500">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-0 left-4 z-10"
        onClick={() => router.push(`/fiches/${clientId}`)}
        title="Retour à la fiche"
      >
        <ArrowBigLeftDash className="h-5 w-5" />
      </Button>

      <div className="pt-8">
        {sansTraitement.length > 0 && (
          <div className="max-w-4xl mx-auto mb-3 px-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900">
                {sansTraitement.length} diagnostic(s) IVA positif en attente de
                traitement.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center max-w-4xl mx-auto px-4 py-2 border border-blue-200/60 rounded-md relative">
          <ConstanteClient idVisite={form.watch("idVisite")} />
          <h2 className="text-2xl text-blue-900 font-black text-center flex items-center justify-center gap-2">
            <Stethoscope className="h-6 w-6 text-blue-600" />
            Formulaire de Traitement IVA positif
          </h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 max-w-225 rounded-sm mx-auto px-4 py-2 bg-white border border-blue-200/50 shadow-md shadow-blue-100/30"
            >
              {/* Sélection visite */}
              <FormField
                control={form.control}
                name="idVisite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez la visite
                    </FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setIsSubmitted(false);
                      }}
                      required
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Visite à sélectionner ....." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visitesOrdered.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Aucune visite disponible
                          </div>
                        ) : (
                          visitesOrdered.map((v) => (
                            <SelectItem
                              key={v.id}
                              value={v.id}
                              disabled={visitesDejaTraitees.has(v.id)}
                            >
                              {new Date(v.dateVisite).toLocaleDateString(
                                "fr-FR",
                              )}
                              {visitesDejaTraitees.has(v.id)
                                ? " (déjà traitée)"
                                : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Diagnostic à rattacher (facultatif) */}
              <FormField
                control={form.control}
                name="idGynecologie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Diagnostic IVA positif à traiter (optionnel)
                    </FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner le diagnostic (facultatif)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gynecos.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Aucun IVA positif enregistré
                          </div>
                        ) : (
                          gynecos.map((g) => {
                            const d = g.Visite?.dateVisite ?? g.createdAt;
                            const traite = g.TraitementIva.length > 0;
                            return (
                              <SelectItem
                                key={g.id}
                                value={g.id}
                                disabled={traite}
                              >
                                {new Date(d).toLocaleDateString("fr-FR")}
                                {traite ? " (déjà traité)" : ""}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type de traitement */}
              <FormField
                control={form.control}
                name="typeTraitement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Selectionnez le type de traitement
                    </FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      required
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Traitement à sélectionner ....." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_TRAITEMENT.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observations */}
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">
                      Observations (optionnel)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Remarques, suivi, complications..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prescripteur : caché si l'utilisateur est prescripteur */}
              {isPrescripteur ? (
                <FormField
                  control={form.control}
                  name="idUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          value={idUser ?? ""}
                          className="hidden"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="idUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Selectionnez le precripteur
                      </FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        required
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Prescripteur ....." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allPrescripteur.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span>{p.name}</span>
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
                className="my-2 mx-auto block"
                disabled={form.formState.isSubmitting || isSubmitted}
              >
                {form.formState.isSubmitting
                  ? "En cours..."
                  : isSubmitted
                    ? "Soumis"
                    : "Soumettre"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Historique des traitements */}
        <div className="max-w-4xl mx-auto px-4 mt-6">
          <h2 className="text-lg font-bold mb-2">
            Historique des traitements ({traitements.length})
          </h2>
          {traitements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun traitement enregistré pour ce client.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Prestataire</TableHead>
                    <TableHead>Observations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traitements.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(t.dateTraitement).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {TYPE_TRAITEMENT.find(
                            (x) => x.value === t.typeTraitement,
                          )?.label ?? t.typeTraitement}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.User?.name ?? "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.observations ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
