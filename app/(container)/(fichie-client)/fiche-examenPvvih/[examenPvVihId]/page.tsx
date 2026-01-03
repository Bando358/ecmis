"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import {
  createExamenPvVih,
  getAllExamenPvVihByIdClient,
} from "@/lib/actions/examenPvVihActions";
import { createRecapVisite } from "@/lib/actions/recapActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { useSession } from "next-auth/react";
import {
  Visite,
  ExamenPvVih,
  TableName,
  Permission,
  Client,
  User,
} from "@prisma/client";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneUser } from "@/lib/actions/authActions";
import { ArrowBigLeftDash } from "lucide-react";

export default function ExamenPvVihPage({
  params,
}: {
  params: Promise<{ examenPvVihId: string }>;
}) {
  const { examenPvVihId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [client, setClient] = useState<Client | null>(null);

  const [selectedExamenPvVih, setSelectedExamenPvVih] = useState<ExamenPvVih[]>(
    []
  );
  const [user, setUser] = useState<User | null>(null);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  const { data: session } = useSession();
  const router = useRouter();

  const idUser = session?.user.id as string;

  useEffect(() => {
    setSelectedClientId(examenPvVihId);
  }, [examenPvVihId, setSelectedClientId]);

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setUser(user!);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    if (!user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(user.id);
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
  }, [user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const resultExamenPvVih = await getAllExamenPvVihByIdClient(
        examenPvVihId
      );
      setSelectedExamenPvVih(resultExamenPvVih as ExamenPvVih[]);
      const result = await getAllVisiteByIdClient(examenPvVihId);
      setVisites(result as Visite[]);
      const clientData = await getOneClient(examenPvVihId);
      if (clientData) {
        setClient(clientData);
      }
    };
    fetchData();
  }, [examenPvVihId]);

  const form = useForm<ExamenPvVih>({
    defaultValues: {
      examenPvVihIdClient: examenPvVihId,
      examenPvVihIdUser: idUser,
      examenPvVihDatePrelevement: new Date(),
      examenPvVihDateTraitement: new Date(),
      examenPvVihFemmeEnceinte: "",
      examenPvVihAllaitement: "",
      examenPvVihTypage: "",
      examenPvVihChargeVirale: null,
      examenPvVihChargeViraleLog: null,
      examenPvVihCd4: null,
      examenPvVihGlycemie: null,
      examenPvVihCreatinemie: null,
      examenPvVihTransaminases: null,
      examenPvVihUree: null,
      examenPvVihCholesterolHdl: null,
      examenPvVihCholesterolTotal: null,
      examenPvVihHemoglobineNfs: null,
      examenPvVihIdVisite: "",
      examenPvVihIdClinique: "",
    },
  });

  const onSubmit: SubmitHandler<ExamenPvVih> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un examen PV VIH. Contactez un administrateur."
      );
      return router.back();
    }

    const formattedData = {
      ...data,
      examenPvVihIdUser: idUser,
      examenPvVihDatePrelevement: new Date(data.examenPvVihDatePrelevement),
      examenPvVihDateTraitement: new Date(data.examenPvVihDateTraitement),
      examenPvVihChargeVirale:
        parseInt(data.examenPvVihChargeVirale as unknown as string, 10) || null,
      examenPvVihChargeViraleLog:
        parseInt(data.examenPvVihChargeViraleLog as unknown as string, 10) ||
        null,
      examenPvVihCd4:
        parseInt(data.examenPvVihCd4 as unknown as string, 10) || null,
      examenPvVihGlycemie:
        parseInt(data.examenPvVihGlycemie as unknown as string, 10) || null,
      examenPvVihCreatinemie:
        parseInt(data.examenPvVihCreatinemie as unknown as string, 10) || null,
      examenPvVihTransaminases:
        parseInt(data.examenPvVihTransaminases as unknown as string, 10) ||
        null,
      examenPvVihUree:
        parseInt(data.examenPvVihUree as unknown as string, 10) || null,
      examenPvVihCholesterolHdl:
        parseInt(data.examenPvVihCholesterolHdl as unknown as string, 10) ||
        null,
      examenPvVihCholesterolTotal:
        parseInt(data.examenPvVihCholesterolTotal as unknown as string, 10) ||
        null,
      examenPvVihHemoglobineNfs:
        parseInt(data.examenPvVihHemoglobineNfs as unknown as string, 10) ||
        null,
      examenPvVihIdClinique: client?.idClinique || "",
    };
    console.log("formattedData ", formattedData);
    try {
      await createExamenPvVih(formattedData);
      await createRecapVisite({
        idVisite: form.watch("examenPvVihIdVisite"),
        idClient: examenPvVihId,
        prescripteurs: [],
        formulaires: ["Examen PV VIH"],
      });
      toast.success("Examen PV VIH créé avec succès !");
      router.push(`/fiches/${examenPvVihId}`);
    } catch (error) {
      toast.error("La création de l'examen PV VIH a échoué.");
      console.error("Erreur lors de la création de l'examen PV VIH :", error);
    }
  };

  return (
    <div className="w-full relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="sticky top-0 left-4 ml-3"
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
      <div className="flex flex-col w-full justify-center">
        <h2 className="text-2xl text-gray-600 font-black text-center">
          Examen PV VIH -{" "}
          {client ? `${client.nom} ${client.prenom}` : "Chargement..."}
        </h2>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-w-3xl mx-auto p-4 m-4 border rounded-md bg-emerald-50/20"
          >
            {/* Sélection de la visite */}
            <div className="p-4 rounded-lg bg-teal-50/40 border border-teal-100">
              <FormField
                control={form.control}
                name="examenPvVihIdVisite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-teal-800">Visite</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Visite à sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visites.map((visite, index) => (
                          <SelectItem
                            key={index}
                            value={visite.id}
                            disabled={selectedExamenPvVih.some(
                              (p) => p.examenPvVihIdVisite === visite.id
                            )}
                          >
                            {new Date(visite.dateVisite).toLocaleDateString(
                              "fr-FR"
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="p-4 rounded-lg bg-sage-50/40 border border-sage-100">
              <h3 className="text-lg font-semibold mb-4 text-sage-800">
                Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examenPvVihDatePrelevement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sage-700">
                        Date de prélèvement
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihDateTraitement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sage-700">
                        Date de traitement
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* État de la patiente */}
            <div className="p-4 rounded-lg bg-mint-50/40 border border-mint-100">
              <h3 className="text-lg font-semibold mb-4 text-mint-800">
                État de la patiente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examenPvVihFemmeEnceinte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-mint-700">
                        Femme enceinte
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Oui">Oui</SelectItem>
                          <SelectItem value="Non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihAllaitement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-mint-700">
                        Allaitement
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Oui">Oui</SelectItem>
                          <SelectItem value="Non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Immuno-virologique */}
            <div className="p-4 rounded-lg bg-seafoam-50/40 border border-seafoam-100">
              <h3 className="text-lg font-semibold mb-4 text-seafoam-800">
                Immuno-virologique
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examenPvVihTypage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-seafoam-700">
                        Typage VIH
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Sélectionner le typage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="VIH1">VIH1</SelectItem>
                          <SelectItem value="VIH2">VIH2</SelectItem>
                          <SelectItem value="VIH1&2">VIH1 & VIH2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihChargeVirale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-seafoam-700">
                        Charge virale
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Charge virale"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihChargeViraleLog"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-seafoam-700">
                        Charge virale (log)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Charge virale log"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihCd4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-seafoam-700">CD4</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="CD4"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Biochimie */}
            <div className="p-4 rounded-lg bg-celadon-50/40 border border-celadon-100">
              <h3 className="text-lg font-semibold mb-4 text-celadon-800">
                Biochimie
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examenPvVihGlycemie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-celadon-700">
                        Glycémie
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Glycémie"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihCreatinemie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-celadon-700">
                        Créatininémie
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Créatininémie"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihTransaminases"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-celadon-700">
                        Transaminases
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Transaminases"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihUree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-celadon-700">Urée</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Urée"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihCholesterolHdl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-celadon-700">
                        Cholesterol HDL
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Cholesterol HDL"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examenPvVihCholesterolTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-celadon-700">
                        Cholesterol Total
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Cholesterol Total"
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section Hématologie */}
            <div className="p-4 rounded-lg bg-verdant-50/40 border border-verdant-100">
              <h3 className="text-lg font-semibold mb-4 text-verdant-800">
                Hématologie
              </h3>
              <FormField
                control={form.control}
                name="examenPvVihHemoglobineNfs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-verdant-700">
                      Hémoglobine NFS
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Hémoglobine NFS"
                        className="bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Champs cachés */}
            <FormField
              control={form.control}
              name="examenPvVihIdClient"
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
              name="examenPvVihIdUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} value={idUser} className="hidden" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-lg transition-colors duration-200"
              >
                {form.formState.isSubmitting
                  ? "En cours..."
                  : "Créer l'examen PV VIH"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
