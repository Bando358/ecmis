"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { BadgePlus, Zap, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Client, TableName } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerCustom } from "@/components/ui/spinner";

import {
  createClient,
  updateClient,
  fetchIncrementCounter,
  checkClientCode,
} from "@/lib/actions/clientActions";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import { getAllRegion } from "@/lib/actions/regionActions";
import { getOneUser } from "@/lib/actions/authActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";

interface RegionData {
  id: string;
  nomRegion: string;
  codeRegion: string;
}

interface CliniqueData {
  id: string;
  nomClinique: string;
  codeClinique: string;
  numClinique: string;
  idRegion: string;
}

interface QuickClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (client: Client) => void;
  clientToEdit?: Client | null;
  onClientUpdated?: (client: Client) => void;
}

const sexeOptions = [
  { label: "Feminin", value: "Féminin" },
  { label: "Masculin", value: "Masculin" },
];

const statusClientOptions = [
  { label: "Nouveau", value: "nouveau" },
  { label: "Ancien", value: "ancien" },
];

export default function QuickClientDialog({
  open,
  onOpenChange,
  onClientCreated,
  clientToEdit = null,
  onClientUpdated,
}: QuickClientDialogProps) {
  const isEditMode = !!clientToEdit;
  const { data: session } = useSession();
  const { canCreate, canUpdate } = usePermissionContext();
  const idPrestataire = session?.user?.id as string;

  const [cliniques, setCliniques] = useState<CliniqueData[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [codeGenerated, setCodeGenerated] = useState(false);

  const hasSingleClinique = cliniques.length === 1;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Client>({
    defaultValues: {
      cliniqueId: "",
      dateEnregistrement: todayStr as unknown as Date,
      nom: "",
      prenom: "",
      sexe: "",
      statusClient: "",
      code: "",
      tel_1: "",
      quartier: "",
    },
  });

  const fetchData = useCallback(async () => {
    if (!idPrestataire) return;
    const [user, allCliniques, allRegions] = await Promise.all([
      getOneUser(idPrestataire),
      getAllClinique(),
      getAllRegion(),
    ]);
    setRegions(allRegions);
    if (!user) return;

    const filtered =
      user.role === "ADMIN"
        ? allCliniques
        : allCliniques.filter((c: CliniqueData) =>
            user.idCliniques.some((uc: string | string[]) => uc.includes(c.id)),
          );
    setCliniques(filtered);

    if (filtered.length === 1) {
      setValue("cliniqueId", filtered[0].id);
    }
  }, [idPrestataire, setValue]);

  useEffect(() => {
    if (open) {
      fetchData();
      if (clientToEdit) {
        // Mode édition : pré-remplir avec les données du client
        setCodeGenerated(true); // le code existe déjà
        reset({
          cliniqueId: clientToEdit.cliniqueId || clientToEdit.idClinique || "",
          dateEnregistrement: format(new Date(clientToEdit.dateEnregistrement), "yyyy-MM-dd") as unknown as Date,
          nom: clientToEdit.nom || "",
          prenom: clientToEdit.prenom || "",
          sexe: clientToEdit.sexe || "",
          statusClient: clientToEdit.statusClient || "",
          code: clientToEdit.code || "",
          tel_1: clientToEdit.tel_1 || "",
          quartier: clientToEdit.quartier || "",
          dateNaissance: format(new Date(clientToEdit.dateNaissance), "yyyy-MM-dd") as unknown as Date,
        });
      } else {
        setCodeGenerated(false);
        reset({
          cliniqueId: "",
          dateEnregistrement: format(new Date(), "yyyy-MM-dd") as unknown as Date,
          nom: "",
          prenom: "",
          sexe: "",
          statusClient: "",
          code: "",
          tel_1: "",
          quartier: "",
        });
      }
    }
  }, [open, fetchData, reset, clientToEdit]);

  // Auto-select clinique when there's only one (sauf en édition où la valeur est déjà définie)
  useEffect(() => {
    if (cliniques.length === 1 && !clientToEdit) {
      setValue("cliniqueId", cliniques[0].id);
    }
  }, [cliniques, setValue, clientToEdit]);

  const clinic = watch("cliniqueId");
  const selectedClinique = cliniques.find((c) => c.id === clinic);
  const idRegion = selectedClinique?.idRegion || null;
  const selectedRegion = regions.find((r) => r.id === idRegion);

  const handleGenerateCode = async () => {
    if (!watch("nom") || !watch("prenom") || !selectedRegion || !selectedClinique) {
      toast.error(
        "Remplissez la clinique, le nom et le prénom avant de générer le code.",
      );
      return;
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const nomPrenom = (watch("nom") + watch("prenom"))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "");
    const initials = nomPrenom.slice(0, 3).toUpperCase();

    try {
      const { counter } = await fetchIncrementCounter(clinic, year);
      const increment = String(counter).padStart(5, "0");
      const code =
        `${selectedRegion.codeRegion}/${selectedClinique.codeClinique}${selectedClinique.numClinique}/${year}/${month}/${increment}-${initials}`.toUpperCase();
      setValue("code", code);
      setCodeGenerated(true);
      toast.success(code);
    } catch {
      toast.error("Erreur lors de la generation du code");
    }
  };

  const onSubmit = async (data: Client) => {
    if (isEditMode) {
      // — Mode édition —
      if (!canUpdate(TableName.CLIENT)) {
        toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
        return;
      }

      // Conserver tous les champs existants, ne modifier que les champs du formulaire rapide
      const updatedData = {
        ...clientToEdit!,
        nom: data.nom,
        prenom: data.prenom,
        sexe: data.sexe,
        statusClient: data.statusClient,
        code: data.code,
        tel_1: data.tel_1 || "",
        quartier: data.quartier || null,
        idClinique: clinic,
        cliniqueId: clinic,
        dateEnregistrement: new Date(data.dateEnregistrement),
        dateNaissance: new Date(data.dateNaissance),
      } as Client;

      try {
        const client = await updateClient(clientToEdit!.id, updatedData);
        onOpenChange(false);
        onClientUpdated?.(client);
        toast.success(`Client ${data.nom} ${data.prenom} modifié avec succès !`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de la modification du client",
        );
      }
    } else {
      // — Mode création —
      if (!canCreate(TableName.CLIENT)) {
        toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
        return;
      }

      const formattedData: Client = {
        ...data,
        dateEnregistrement: new Date(data.dateEnregistrement),
        dateNaissance: new Date(data.dateNaissance),
        idUser: idPrestataire,
        idClinique: clinic,
        tel_1: data.tel_1 || "",
        tel_2: "",
        sourceInfo: "RECOMMANDATION",
        statusClient: data.statusClient || "nouveau",
        populationVulnerable: "non",
        lieuNaissance: null,
        quartier: data.quartier || null,
        niveauScolaire: null,
        ethnie: null,
        profession: null,
        serologie: "inconnu",
        etatMatrimonial: null,
        codeVih: null,
      } as Client;

      try {
        const client = await createClient(formattedData);
        onOpenChange(false);
        onClientCreated?.(client);
        toast.success(`Client ${data.nom} ${data.prenom} créé avec succès !`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de la création du client",
        );
      }
    }
  };

  const labelClass =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const inputCls =
    "h-9 text-sm border-emerald-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all duration-200 hover:border-emerald-400";
  const selectCls =
    "w-full h-9 px-3 text-sm border border-emerald-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all duration-200 hover:border-emerald-400";
  const errorCls = "text-red-500 text-xs mt-1";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isEditMode ? "text-amber-700" : "text-emerald-700"}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isEditMode ? "bg-amber-100" : "bg-emerald-100"}`}>
              {isEditMode ? <Pencil className="h-4 w-4 text-amber-600" /> : <Zap className="h-4 w-4 text-emerald-600" />}
            </div>
            <span className="text-base sm:text-lg">{isEditMode ? "Modification rapide" : "Enregistrement rapide"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditMode
              ? "Modifiez les champs essentiels du client. Les autres informations restent inchangées."
              : "Champs essentiels uniquement. Les informations complémentaires pourront être ajoutées via la modification du dossier."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 1. Clinique — label si unique, select sinon */}
            <div className="sm:col-span-1">
              <label className={labelClass}>
                Clinique <span className="text-red-500">*</span>
              </label>
              {hasSingleClinique ? (
                <>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium text-emerald-800 truncate">
                      {cliniques[0].nomClinique}
                    </span>
                  </div>
                  <input type="hidden" {...register("cliniqueId")} />
                </>
              ) : (
                <>
                  <select
                    {...register("cliniqueId", {
                      required: "Clinique est requise",
                    })}
                    className={selectCls}
                  >
                    <option value="" disabled>
                      Selectionner une clinique
                    </option>
                    {cliniques.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nomClinique}
                      </option>
                    ))}
                  </select>
                  {errors.cliniqueId && (
                    <span className={errorCls}>
                      {errors.cliniqueId.message}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 2. Date d'enregistrement */}
            <div className="sm:col-span-1">
              <label className={labelClass}>
                Date d&apos;enregistrement <span className="text-red-500">*</span>
              </label>
              <input
                {...register("dateEnregistrement", {
                  required: "Date d'enregistrement requise",
                })}
                type="date"
                className={selectCls}
              />
              {errors.dateEnregistrement && (
                <span className={errorCls}>
                  {errors.dateEnregistrement.message}
                </span>
              )}
            </div>

            {/* 3. Nom */}
            <div className="sm:col-span-1">
              <label className={labelClass}>
                Nom <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("nom", {
                  required: "Nom est requis",
                  minLength: { value: 2, message: "Minimum 2 caracteres" },
                })}
                placeholder="Nom"
                className={`${inputCls} capitalize`}
              />
              {errors.nom && (
                <span className={errorCls}>{errors.nom.message}</span>
              )}
            </div>

            {/* 4. Prenom */}
            <div className="sm:col-span-1">
              <label className={labelClass}>
                Prenom <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("prenom", {
                  required: "Prenom est requis",
                  minLength: { value: 2, message: "Minimum 2 caracteres" },
                })}
                placeholder="Prenom"
                className={`${inputCls} capitalize`}
              />
              {errors.prenom && (
                <span className={errorCls}>{errors.prenom.message}</span>
              )}
            </div>

            {/* 5. Date de naissance */}
            <div className="sm:col-span-1">
              <label className={labelClass}>
                Date de naissance <span className="text-red-500">*</span>
              </label>
              <input
                {...register("dateNaissance", {
                  required: "Date de naissance requise",
                })}
                type="date"
                className={selectCls}
              />
              {errors.dateNaissance && (
                <span className={errorCls}>{errors.dateNaissance.message}</span>
              )}
            </div>

            {/* 6. Sexe */}
            <div className="sm:col-span-1">
              <label className={labelClass}>
                Sexe <span className="text-red-500">*</span>
              </label>
              <select
                {...register("sexe", { required: "Sexe est requis" })}
                className={selectCls}
                defaultValue=""
              >
                <option value="" disabled>
                  Selectionner
                </option>
                {sexeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.sexe && (
                <span className={errorCls}>{errors.sexe.message}</span>
              )}
            </div>

            {/* 7. Telephone */}
            <div className="sm:col-span-1">
              <label className={labelClass}>Telephone</label>
              <Input
                {...register("tel_1")}
                placeholder="0X XX XX XX XX"
                className={inputCls}
              />
            </div>

            {/* 8. Quartier */}
            <div className="sm:col-span-1">
              <label className={labelClass}>Quartier</label>
              <Input
                {...register("quartier")}
                placeholder="Quartier de residence"
                className={`${inputCls} capitalize`}
              />
            </div>

            {/* 9. Code (saisie libre ou auto-genere) */}
            <div className="col-span-1 sm:col-span-2">
              <label className={labelClass}>
                Code client <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  {...register("code", {
                    required: "Code est requis",
                    setValueAs: (v: string) => v?.toUpperCase(),
                    validate: async (value) => {
                      if (!value) return true;
                      // En mode édition, ne pas bloquer si le code est inchangé
                      if (clientToEdit && value.toUpperCase() === clientToEdit.code?.toUpperCase()) return true;
                      const taken = await checkClientCode(value);
                      return !taken || "Ce code est déjà utilisé.";
                    },
                  })}
                  placeholder="Saisir un code ou cliquer sur +"
                  className={`${inputCls} uppercase pr-10`}
                />
                <button
                  type="button"
                  onClick={() => handleGenerateCode()}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200 ${
                    codeGenerated
                      ? "text-emerald-600 cursor-default"
                      : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer active:scale-95"
                  }`}
                >
                  <BadgePlus className="h-5 w-5" />
                </button>
              </div>
              {errors.code && (
                <span className={errorCls}>{errors.code.message}</span>
              )}
            </div>

            {/* 10. Statut client */}
            <div className="col-span-1 sm:col-span-2">
              <label className={labelClass}>
                Statut client <span className="text-red-500">*</span>
              </label>
              <select
                {...register("statusClient", { required: "Statut est requis" })}
                className={selectCls}
                defaultValue=""
              >
                <option value="" disabled>
                  Selectionner
                </option>
                {statusClientOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.statusClient && (
                <span className={errorCls}>{errors.statusClient.message}</span>
              )}
            </div>
          </div>

          {/* Info defaults — création uniquement */}
          {!isEditMode && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <span className="font-semibold">Valeurs par défaut :</span>{" "}
              Statut = Nouveau, Sérologie = Inconnu, Source = Recommandation.
              Modifiables ensuite via la fiche client.
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto text-white ${isEditMode ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {isSubmitting && (
                <SpinnerCustom className="mr-2 text-white/60" />
              )}
              {isEditMode ? "Modifier le client" : "Créer le client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
