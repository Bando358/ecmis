"use client";
import { use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useClientContext } from "@/components/ClientContext";

import {
  updateConstante,
  getOneConstante,
} from "@/lib/actions/constanteActions";
import { useSession } from "next-auth/react";
import { Permission, TableName, User, Visite } from "@prisma/client";
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
import { Constante } from "@prisma/client";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneUser } from "@/lib/actions/authActions";
// modifConstanteId
export default function ConstantePage({
  params,
}: {
  params: Promise<{ modifConstanteId: string }>;
}) {
  const { modifConstanteId } = use(params);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [constante, setConstante] = useState<Constante>();
  const [dateConstante, setDateConstante] = useState<Date>();
  const [isLoading, setIsLoading] = useState(true);

  // const [selectedConstante, setSelectedConstante] = useState<Constante[]>([]);
  const [resulImc, setResulImc] = useState<number>();
  const [etatImc, setEtatImc] = useState<string>("");
  const [styleImc, setStyleImc] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [permission, setPermission] = useState<Permission | null>(null);
  const { setSelectedClientId } = useClientContext();

  const { data: session } = useSession();

  const idPrestataire = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idPrestataire);
      setOneUser(user);
    };
    fetUser();
  }, [idPrestataire]);
  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
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
  }, [oneUser, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const oneConstante = await getOneConstante(modifConstanteId);
        if (oneConstante) {
          setConstante(oneConstante);

          const result = await getAllVisiteByIdClient(oneConstante.idClient);
          const resultaVisite = result.filter(
            (r: { id: string }) => oneConstante.idVisite === r.id
          );
          setVisites(resultaVisite as Visite[]); // Assurez-vous que result est bien de type CliniqueData[]

          const dateConst = result.find(
            (r: { id: string }) => r.id === oneConstante.idVisite
          );
          setDateConstante(dateConst?.dateVisite);

          setSelectedClientId(oneConstante.idClient);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
      // setSelectedConstante(resultConstante as Constante[]);
    };
    fetchData();
  }, [modifConstanteId, setSelectedClientId]);

  // console.log(visites);

  const form = useForm<Constante>({
    defaultValues: {
      poids: 0,
      taille: null,
      psSystolique: null,
      psDiastolique: null,
      temperature: null,
      lieuTemprature: "",
      pouls: null,
      frequenceRespiratoire: null,
      saturationOxygene: null,
      imc: null,
      etatImc: "",
      idClient: "",
      idUser: "",
      idVisite: "",
    },
  });
  const onSubmit: SubmitHandler<Constante> = async (data) => {
    const formattedData = {
      ...data,
      idUser: idPrestataire,
      idClient: constante?.idClient,
      idVisite: visites[0].id,
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
      // await createContante(formattedData);
      if (constante) {
        console.log("modifConstanteId : ", modifConstanteId);
        console.log("constante?.id : ", constante?.id);
        console.log("formattedData : ", formattedData);
        console.log("visites : ", visites[0]);
        await updateConstante(modifConstanteId, formattedData);
        const oneConstante = await getOneConstante(modifConstanteId);
        if (oneConstante) {
          setConstante(oneConstante);
        }
      }
      // await createRecapVisite({
      //   idVisite: form.watch("idVisite"),
      //   idClient: form.watch("idClient"),
      //   formulaires: ["01 Créer la visite", "02 Fiche des constantes"], // À adapter dynamiquement
      // });
      toast.info("Constante modifiée avec succès ! 🎉");
      // router.push(`/fiches/${modifConstanteId}`);
    } catch (error) {
      toast.error("La création de la constante a échoué.");
      console.error("Erreur lors de la création de la constante :", error);
    } finally {
      setIsVisible(false);
    }
  };

  const watchPoids = form.watch("poids") || 0;
  const watchTaille = form.watch("taille") || 0;
  useEffect(() => {
    if (watchPoids && watchPoids > 0 && watchTaille && watchTaille > 0) {
      setResulImc(
        parseFloat(
          (watchPoids / ((watchTaille / 100) * (watchTaille / 100))).toFixed(2)
        )
      );
      // const imc = parseFloat(resulImc)
      if (resulImc && resulImc < 18.5) {
        setEtatImc("Maigreur");
        setStyleImc("text-yellow-500 font-black");
      } else if (resulImc && resulImc >= 18.5 && resulImc < 25) {
        setEtatImc("Poids normal");
        setStyleImc("text-green-500 font-black");
      } else if (resulImc && resulImc >= 25 && resulImc < 30) {
        setEtatImc("Surpoids");
        setStyleImc("text-orange-500 font-black");
      } else {
        setEtatImc("Obésité");
        setStyleImc("text-red-600 font-black");
      }
    }
  }, [watchPoids, watchTaille, resulImc, etatImc, styleImc]);
  useEffect(() => {
    // const idclient = visites[0].idClient;
    if (constante) {
      form.setValue("idClient", constante.idClient);
    }
    form.setValue("idUser", idPrestataire);
  }, [constante, idPrestataire, form]);

  useEffect(() => {
    if (resulImc) {
      form.setValue("imc", resulImc);
    }
    if (etatImc) {
      form.setValue("etatImc", etatImc);
    }
  }, [resulImc, etatImc, form]);

  const handleUpdateVisite = async () => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de modifier une visite. Contactez un administrateur."
      );
      return router.back();
    }
    if (constante) {
      //setIsUpdating(true); // Activer le mode modification

      form.setValue("idVisite", constante.idVisite);
      form.setValue("poids", constante.poids);
      form.setValue("taille", constante.taille);
      form.setValue("etatImc", constante.etatImc);
      form.setValue("lieuTemprature", constante.lieuTemprature);
      form.setValue("imc", constante.imc);
      form.setValue("pouls", constante.pouls);
      form.setValue("psDiastolique", constante.psDiastolique);
      form.setValue("psSystolique", constante.psSystolique);
      form.setValue("frequenceRespiratoire", constante.frequenceRespiratoire);
      form.setValue("saturationOxygene", constante.saturationOxygene);
      form.setValue("temperature", constante.temperature);
      setIsVisible(true);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center">
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-600">Chargement...</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl text-gray-600 font-black text-center">
            Modifier les constante du client
          </h2>
          {isVisible ? (
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
                      <FormLabel>Selectionnez la visite</FormLabel>
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
                          {visites && visites.length > 0 ? (
                            visites.map((visite, index) => (
                              <SelectItem key={index} value={visite.id}>
                                {new Date(visite.dateVisite).toLocaleDateString(
                                  "fr-FR"
                                )}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Aucune visite disponible
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                        <Input
                          required
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
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
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
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
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
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
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
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
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
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
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
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
                        <Input
                          disabled
                          type="number"
                          {...field}
                          value={resulImc ?? ""}
                        />
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
                          <Input disabled {...field} value={etatImc ?? ""} />
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
                        <Input
                          {...field}
                          value={idPrestataire}
                          className="hidden"
                        />
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
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "En cours..." : "Appliquer"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div>
              <h2 className="text-2xl text-gray-600 font-black text-center">
                {/* Fiche de visite du client : {oneClient && oneClient.nom}{" "}
            {oneClient && oneClient.prenom.toUpperCase()} du{" "}
            <span>
              {dateConstante &&
                new Date(dateConstante && dateConstante)}{" "}
            </span> */}
              </h2>
              <div className="flex flex-col border p-3 gap-2 max-w-md mx-auto">
                <div className="grid grid-cols-2">
                  <div>Date de visite :</div>
                  <div>
                    {dateConstante &&
                      new Date(dateConstante).toLocaleDateString("fr-FR")}
                  </div>
                  <div>{constante?.taille && "Taille : "}</div>
                  <div>{constante?.taille && constante?.taille} </div>
                  <div>{constante?.poids && "Poids : "}</div>
                  <div>{constante?.poids && constante?.poids} </div>
                  <div>{constante?.psSystolique && "PsSystolique : "}</div>
                  <div>
                    {constante?.psSystolique && constante?.psSystolique}{" "}
                  </div>
                  <div>{constante?.psDiastolique && "PsDiastolique : "}</div>
                  <div>
                    {constante?.psDiastolique && constante?.psDiastolique}{" "}
                  </div>
                  <div>{constante?.temperature && "Température : "}</div>
                  <div>{constante?.temperature && constante?.temperature} </div>
                  <div>
                    {constante?.lieuTemprature && "Lieu Température : "}
                  </div>
                  <div>
                    {constante?.lieuTemprature && constante?.lieuTemprature}{" "}
                  </div>
                  <div>{constante?.pouls && "Pouls : "}</div>
                  <div>{constante?.pouls && constante?.pouls} </div>
                  <div>
                    {constante?.frequenceRespiratoire &&
                      "Fréquence Respiratoire : "}
                  </div>
                  <div>
                    {constante?.frequenceRespiratoire &&
                      constante?.frequenceRespiratoire}{" "}
                  </div>
                  <div>
                    {constante?.saturationOxygene && "Saturation Oxygène : "}
                  </div>
                  <div>
                    {constante?.saturationOxygene &&
                      constante?.saturationOxygene}{" "}
                  </div>
                  <div>{constante?.imc && "IMC : "}</div>
                  <div>
                    {constante?.imc && constante?.imc <= 25 ? (
                      <span className="text-green-500 font-semibold">
                        {Math.floor(constante?.imc)}
                        {" = "} {constante?.etatImc}{" "}
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold">
                        {constante?.imc && Math.floor(constante?.imc)}
                        {" = "}
                        {constante?.etatImc}{" "}
                      </span>
                    )}
                  </div>

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
            </div>
          )}
        </>
      )}
    </div>
  );
}
