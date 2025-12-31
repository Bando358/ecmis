// components/ActiviteDialog.tsx
"use client";
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activite, Clinique, User } from "@prisma/client";
import { toast } from "sonner";

import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ActiviteDialogProps {
  cliniques: Clinique[];
  users: User[];
  userId?: string;
  activites: Activite[];
  selectedCliniqueId: string;
  onActiviteCreated: (activite: Activite) => void;
  onActiviteUpdated: (activite: Activite) => void;
  handleActivite: (data: Activite, isUpdating: boolean) => Promise<void>;
  children?: React.ReactNode;
}

export function ActiviteDialog({
  cliniques,
  users,
  userId,
  activites,
  selectedCliniqueId,
  onActiviteCreated,
  onActiviteUpdated,
  handleActivite,
  children,
}: ActiviteDialogProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Activite>();

  const onSubmit: SubmitHandler<Activite> = async (data) => {
    try {
      await handleActivite(data, isUpdating);

      if (isUpdating) {
        onActiviteUpdated(data);
        setIsUpdating(false);
      } else {
        onActiviteCreated(data);
      }

      reset();
      setOpen(false);
    } catch (error) {
      console.error("Erreur détaillée:", error);
      toast.error("La création/modification de l'activité a échoué !");
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setIsUpdating(false);
    reset();
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setIsUpdating(false);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Créer une Activité
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gestion des Activités</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulaire Activité */}
          <div className="p-4 border rounded-md bg-stone-50">
            <h3 className="text-lg font-semibold mb-4">
              {isUpdating
                ? "Modifier une Activité"
                : "Créer une nouvelle Activité"}
            </h3>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">
                  Libellé de {"l'activité"}
                </label>
                <Input
                  {...register("libelle", {
                    required: "Libellé de l'activité est requis",
                  })}
                  placeholder="Libellé de l'activité"
                  className="mt-1"
                />
                {errors.libelle && (
                  <span className="text-red-500 text-sm">
                    {errors.libelle.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Date de début
                </label>
                <Input
                  type="datetime-local"
                  {...register("dateDebut", {
                    required: "Date de début est requise",
                  })}
                  className="mt-1"
                />
                {errors.dateDebut && (
                  <span className="text-red-500 text-sm">
                    {errors.dateDebut.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Date de fin</label>
                <Input
                  type="datetime-local"
                  {...register("dateFin", {
                    required: "Date de fin est requise",
                  })}
                  className="mt-1"
                />
                {errors.dateFin && (
                  <span className="text-red-500 text-sm">
                    {errors.dateFin.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Objectif Clients
                </label>
                <Input
                  type="number"
                  {...register("objectifClt", {
                    valueAsNumber: true,
                    required: "L'objectif clients est requis",
                    min: { value: 0, message: "L'objectif doit être positif" },
                  })}
                  placeholder="Objectif clients"
                  className="mt-1"
                />
                {errors.objectifClt && (
                  <span className="text-red-500 text-sm">
                    {errors.objectifClt.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Objectif Services
                </label>
                <Input
                  type="number"
                  {...register("objectifSrv", {
                    valueAsNumber: true,
                    required: "L'objectif services est requis",
                    min: { value: 0, message: "L'objectif doit être positif" },
                  })}
                  placeholder="Objectif services"
                  className="mt-1"
                />
                {errors.objectifSrv && (
                  <span className="text-red-500 text-sm">
                    {errors.objectifSrv.message}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Commentaire</label>
                <textarea
                  {...register("commentaire")}
                  placeholder="Commentaire"
                  className="w-full p-2 border rounded-md mt-1"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Clinique</label>
                <select
                  {...register("idClinique", {
                    required: "Clinique est requise",
                  })}
                  className="w-full p-2 border rounded-md"
                  defaultValue={selectedCliniqueId || ""}
                >
                  <option value="" disabled className="text-gray-200">
                    Sélectionner une clinique
                  </option>
                  {cliniques.map((clinique) => (
                    <option key={clinique.id} value={clinique.id}>
                      {clinique.nomClinique}
                    </option>
                  ))}
                </select>
                {errors.idClinique && (
                  <span className="text-red-500 text-sm">
                    {errors.idClinique.message}
                  </span>
                )}
              </div>

              <div className="hidden">
                <Input
                  {...register("idUser", {
                    required: "Utilisateur est requis",
                  })}
                  value={userId || ""} // ← Valeur par défaut
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isUpdating
                    ? isSubmitting
                      ? "Modification..."
                      : "Modifier l'Activité"
                    : isSubmitting
                    ? "Création..."
                    : "Créer l'Activité"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
