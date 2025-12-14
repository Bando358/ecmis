"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";
import {
  createContante,
  getAllContanteByIdClient,
} from "@/lib/actions/constanteActions";
import { createRecapVisite } from "@/lib/actions/recapActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { useSession } from "next-auth/react";
import { Visite, Constante, TableName, Permission } from "@prisma/client";
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
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function ConstantePage({
  params,
}: {
  params: Promise<{ constanteId: string }>;
}) {
  const { constanteId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [selectedConstante, setSelectedConstante] = useState<Constante[]>([]);
  const [resulImc, setResulImc] = useState<number>(0);
  const [etatImc, setEtatImc] = useState<string>("");
  const [styleImc, setStyleImc] = useState<string>("");
  const [client, setClient] = useState<{
    id: string;
    nom: string;
    prenom: string;
  } | null>(null);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { setSelectedClientId } = useClientContext();
  const { data: session } = useSession();
  const router = useRouter();

  const idUser = session?.user.id as string;

  useEffect(() => {
    setSelectedClientId(constanteId);
  }, [constanteId, setSelectedClientId]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.CONSTANTE
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
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const resultConstante = await getAllContanteByIdClient(constanteId);
      setSelectedConstante(resultConstante as Constante[]);
      const result = await getAllVisiteByIdClient(constanteId);
      setVisites(result as Visite[]);
      const clientData = await getOneClient(constanteId);
      if (clientData) {
        setClient({
          id: clientData.id,
          nom: clientData.nom,
          prenom: clientData.prenom,
        });
      }
    };
    fetchData();
  }, [constanteId]);

  const form = useForm<Constante>({
    defaultValues: {
      idClient: constanteId,
      idUser: idUser,
      poids: 0,
      taille: 0,
      psSystolique: null,
      psDiastolique: null,
      temperature: null,
      lieuTemprature: "",
      pouls: null,
      frequenceRespiratoire: null,
      saturationOxygene: null,
      imc: 0,
      etatImc: "",
      idVisite: "",
    },
  });

  const watchPoids = form.watch("poids") || 0;
  const watchTaille = form.watch("taille") || 0;

  useEffect(() => {
    if (watchPoids > 0 && watchTaille > 0) {
      const imc = parseFloat(
        (watchPoids / ((watchTaille / 100) * (watchTaille / 100))).toFixed(2)
      );
      setResulImc(imc);
      form.setValue("imc", imc);
      if (imc < 18.5) {
        setEtatImc("Maigreur");
        setStyleImc("text-yellow-500 font-black");
        form.setValue("etatImc", "Maigreur");
      } else if (imc >= 18.5 && imc < 25) {
        setEtatImc("Poids normal");
        setStyleImc("text-green-500 font-black");
        form.setValue("etatImc", "Poids normal");
      } else if (imc >= 25 && imc < 30) {
        setEtatImc("Surpoids");
        setStyleImc("text-orange-500 font-black");
        form.setValue("etatImc", "Surpoids");
      } else {
        setEtatImc("Obésité");
        setStyleImc("text-red-600 font-black");
        form.setValue("etatImc", "Obésité");
      }
    }
  }, [watchPoids, watchTaille, form]);

  const onSubmit: SubmitHandler<Constante> = async (data) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une constante. Contactez un administrateur."
      );
      return router.back();
    }
    const formattedData = {
      ...data,
      idUser,
      poids: parseFloat(data.poids as unknown as string) || 0,
      taille: parseFloat(data.taille as unknown as string) || 0,
      psSystolique:
        parseInt(data.psSystolique as unknown as string, 10) || null,
      psDiastolique:
        parseInt(data.psDiastolique as unknown as string, 10) || null,
      temperature: parseFloat(data.temperature as unknown as string) || null,
      pouls: parseInt(data.pouls as unknown as string, 10) || null,
      frequenceRespiratoire:
        parseInt(data.frequenceRespiratoire as unknown as string, 10) || null,
      saturationOxygene:
        parseInt(data.saturationOxygene as unknown as string, 10) || null,
    };

    try {
      await createContante(formattedData);
      await createRecapVisite({
        idVisite: form.watch("idVisite"),
        idClient: constanteId,
        prescripteurs: [],
        formulaires: ["01 Créer la visite", "02 Fiche des constantes"],
      });
      toast.success("Constante créée avec succès !");
      router.push(`/fiches/${constanteId}`);
    } catch (error) {
      toast.error("La création de la constante a échoué.");
      console.error("Erreur lors de la création de la constante :", error);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center">
      <h2 className="text-2xl text-gray-600 font-black text-center">
        Créer la visite de -{" "}
        {client ? `${client.nom} ${client.prenom}` : "Chargement..."}
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 max-w-3xl mx-auto p-4 m-4 border rounded-md bg-gray-50 opacity-90"
        >
          <FormField
            control={form.control}
            name="idVisite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visite</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
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
                        disabled={selectedConstante.some(
                          (p) => p.idVisite === visite.id
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

          <FormField
            control={form.control}
            name="poids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poids en kg</FormLabel>
                <FormControl>
                  <Input required type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taille"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taille en (cm)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="psSystolique"
            render={({ field }) => (
              <FormItem>
                <FormLabel>psSystolique</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="number"
                    placeholder="7"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="psDiastolique"
            render={({ field }) => (
              <FormItem>
                <FormLabel>psDiastolique</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="number"
                    placeholder="7"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Température(°cl)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lieuTemprature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>lieuTemprature(°cl)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pouls"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pouls</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frequenceRespiratoire"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fréquence Respiratoire</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="saturationOxygene"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saturation Oxygène</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IMC</FormLabel>
                <FormControl>
                  <Input disabled type="number" {...field} value={resulImc} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className={`${styleImc}`}>
            <FormField
              control={form.control}
              name="etatImc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etat Imc</FormLabel>
                  <FormControl>
                    <Input disabled {...field} value={etatImc} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="idClient"
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
            name="idUser"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={idUser} className="hidden" />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-4">
            {form.formState.isSubmitting ? "En cours..." : "Créer la constante"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
