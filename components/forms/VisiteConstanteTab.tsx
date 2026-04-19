"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Activite, Constante, Lieu, TableName, Visite } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Activity, CalendarDays, Save } from "lucide-react";
import { SpinnerCustom } from "@/components/ui/spinner";
import { createVisite } from "@/lib/actions/visiteActions";
import { createContante } from "@/lib/actions/constanteActions";
import { createRecapVisite } from "@/lib/actions/recapActions";
import { getAllActiviteByIdClinique } from "@/lib/actions/activiteActions";
import { getAllLieuByTabIdActivite } from "@/lib/actions/lieuActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { SharedFormProps } from "./types";

const MOTIFS_VISITE = [
  { id: 1, libelle: "CONTRACEPTION", value: "CONTRACEPTION" },
  { id: 2, libelle: "GYNECOLOGIE", value: "GYNECOLOGIE" },
  { id: 3, libelle: "TEST GROSSESSE", value: "TEST GROSSESSE" },
  { id: 4, libelle: "CPN", value: "CPN" },
  { id: 5, libelle: "VIH", value: "VIH" },
  { id: 6, libelle: "MEDECINE GENERALE", value: "MDG" },
  { id: 7, libelle: "INFERTILITE", value: "INFERTILITE" },
  { id: 8, libelle: "VBG", value: "VBG" },
  { id: 9, libelle: "IST", value: "IST" },
  { id: 10, libelle: "SAA", value: "SAA" },
  { id: 11, libelle: "LABORATOIRE", value: "LABORATOIRE" },
  { id: 12, libelle: "ECHOGRAPHIE", value: "ECHOGRAPHIE" },
];

type FormData = {
  dateVisite: string;
  motifVisite: string;
  idActivite: string | null;
  idLieu: string | null;
  poids: number;
  taille: number | null;
  psSystolique: number | null;
  psDiastolique: number | null;
};

export default function VisiteConstanteTab({
  clientId,
  client,
  idUser,
  visites,
  onVisiteCreated,
}: SharedFormProps) {
  const { canCreate } = usePermissionContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activite, setActivite] = useState<Activite[]>([]);
  const [lieus, setLieus] = useState<Lieu[]>([]);

  const form = useForm<FormData>({
    defaultValues: {
      dateVisite: format(new Date(), "yyyy-MM-dd"),
      motifVisite: "",
      idActivite: null,
      idLieu: null,
      poids: 0,
      taille: null,
      psSystolique: null,
      psDiastolique: null,
    },
    mode: "onChange",
  });

  const idActivite = form.watch("idActivite");
  const poidsWatched = form.watch("poids");
  const tailleWatched = form.watch("taille");

  // Calcul automatique de l'IMC et de l'état IMC en temps réel
  const { imc, etatImc } = useMemo(() => {
    const p = Number(poidsWatched) || 0;
    const t = tailleWatched ? Number(tailleWatched) : 0;
    if (p <= 0 || t <= 0) return { imc: null as number | null, etatImc: "" };
    const tailleM = t / 100;
    const imcCalc = Math.round((p / (tailleM * tailleM)) * 10) / 10;
    let etat = "";
    if (imcCalc < 18.5) etat = "Maigreur";
    else if (imcCalc < 25) etat = "Poids normal";
    else if (imcCalc < 30) etat = "Surpoids";
    else etat = "Obésité";
    return { imc: imcCalc, etatImc: etat };
  }, [poidsWatched, tailleWatched]);

  // Charger les activités de la clinique du client
  useEffect(() => {
    if (!client?.idClinique) return;
    const fetchActivites = async () => {
      try {
        const data = await getAllActiviteByIdClinique(client.idClinique);
        setActivite(data);
      } catch (error) {
        console.error("Erreur chargement activités:", error);
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
        console.error("Erreur chargement lieux:", error);
        setLieus([]);
      }
    };
    fetchLieus();
  }, [idActivite]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!canCreate(TableName.VISITE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    if (isSubmitting) return;

    if (!data.motifVisite) {
      toast.error("Le motif de la visite est obligatoire");
      return;
    }
    if (data.idActivite && !data.idLieu) {
      toast.error("Le lieu est obligatoire lorsqu'une activité est sélectionnée");
      return;
    }

    // Vérifier s'il existe déjà une visite à cette date
    const existing = visites.find(
      (v) => format(new Date(v.dateVisite), "yyyy-MM-dd") === data.dateVisite,
    );
    if (existing) {
      toast.warning("Une visite existe déjà pour cette date");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Créer la visite
      const visiteData = {
        id: crypto.randomUUID(),
        dateVisite: new Date(data.dateVisite + "T12:00:00"),
        motifVisite: data.motifVisite,
        idUser,
        idClinique: client?.idClinique || "",
        idClient: clientId,
        idActivite: data.idActivite || null,
        idLieu: data.idLieu || null,
        createdAt: new Date(),
      } as Visite;

      const newVisite = await createVisite(visiteData);

      // 2. Créer la constante (IMC et État IMC déjà calculés en temps réel)
      const poids = Number(data.poids);
      const taille = data.taille ? Number(data.taille) : null;

      const constanteData = {
        id: crypto.randomUUID(),
        idVisite: newVisite.id,
        idClient: clientId,
        idUser,
        poids,
        taille,
        psSystolique: data.psSystolique ? Number(data.psSystolique) : null,
        psDiastolique: data.psDiastolique ? Number(data.psDiastolique) : null,
        imc,
        etatImc: etatImc || null,
        temperature: null,
        lieuTemprature: null,
        pouls: null,
        frequenceRespiratoire: null,
        saturationOxygene: null,
        createdAt: new Date(),
      } as Constante;

      await createContante(constanteData);

      // 3. Créer/mettre à jour RecapVisite avec le prescripteur (idUser) et les formulaires
      await createRecapVisite({
        idVisite: newVisite.id,
        idClient: clientId,
        prescripteurs: [idUser],
        formulaires: ["01 Créer la visite", "02 Fiche des constantes"],
      });

      toast.success("Visite et constantes créées avec succès !");

      // Notifier le parent pour qu'il ajoute la nouvelle visite dans son state
      onVisiteCreated?.(newVisite);

      // Réinitialiser le formulaire (sans recharger toute la page)
      form.reset({
        dateVisite: format(new Date(), "yyyy-MM-dd"),
        motifVisite: "",
        idActivite: null,
        idLieu: null,
        poids: 0,
        taille: null,
        psSystolique: null,
        psDiastolique: null,
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de la visite",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full justify-center p-4">
      <h2 className="text-2xl text-blue-900 font-black text-center mb-6">
        Fiche de création de visite & constantes
      </h2>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col border border-blue-200/50 rounded-lg p-6 gap-4 max-w-md mx-auto bg-white shadow-md shadow-blue-100/30"
        >
          {/* Date de visite */}
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

          {/* Motif de la visite */}
          <FormField
            control={form.control}
            name="motifVisite"
            rules={{ required: "Le motif de la visite est obligatoire" }}
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
                    {MOTIFS_VISITE.map((motif) => (
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

          {/* Activité (optionnel) */}
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

          {/* Lieu (optionnel) */}
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

          <Separator className="my-2" />

          {/* Section Constantes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Constantes</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="poids"
                rules={{
                  required: "Poids requis",
                  min: { value: 0.1, message: "Poids invalide" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-sm">
                      Poids (kg) <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="65"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        value={field.value || ""}
                        className="w-full p-2 border rounded-md"
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
                    <FormLabel className="font-medium text-sm">Taille (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="170"
                        {...field}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          field.onChange(isNaN(v) ? null : v);
                        }}
                        value={field.value ?? ""}
                        className="w-full p-2 border rounded-md"
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
                    <FormLabel className="font-medium text-sm">P. SYS (mmHg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="120"
                        {...field}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          field.onChange(isNaN(v) ? null : v);
                        }}
                        value={field.value ?? ""}
                        className="w-full p-2 border rounded-md"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="psDiastolique"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-sm">P. DIAS (mmHg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="80"
                        {...field}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          field.onChange(isNaN(v) ? null : v);
                        }}
                        value={field.value ?? ""}
                        className="w-full p-2 border rounded-md"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* IMC calculé automatiquement (lecture seule) */}
              <FormItem>
                <FormLabel className="font-medium text-sm">IMC</FormLabel>
                <Input
                  type="text"
                  readOnly
                  value={imc !== null ? imc.toFixed(1) : ""}
                  placeholder="—"
                  className="w-full p-2 border rounded-md bg-gray-50 cursor-not-allowed"
                />
              </FormItem>

              {/* État IMC calculé automatiquement (lecture seule) */}
              <FormItem>
                <FormLabel className="font-medium text-sm">État IMC</FormLabel>
                <Input
                  type="text"
                  readOnly
                  value={etatImc}
                  placeholder="—"
                  className="w-full p-2 border rounded-md bg-gray-50 cursor-not-allowed"
                />
              </FormItem>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-blue-50 rounded-md p-2 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>
              Client : <span className="font-medium">{client?.nom} {client?.prenom}</span>
              {" — "}{visites.length} visite(s) existante(s)
            </span>
          </div>

          <Button
            type="submit"
            className="mt-2 gap-2"
            disabled={isSubmitting || !form.watch("motifVisite")}
          >
            {isSubmitting ? (
              <SpinnerCustom className="text-white/60" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? "En cours..." : "Créer la visite & constantes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
