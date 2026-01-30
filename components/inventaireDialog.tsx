"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Clinique, Inventaire } from "@prisma/client";

// Schéma de validation Zod
const InventaireSchema = z.object({
  idClinique: z.string().min(1, "Veuillez sélectionner une clinique"),
  dateInventaire: z.string().min(1, "Veuillez sélectionner une date"),
  idUser: z.string().optional(),
});

type InventaireFormData = z.infer<typeof InventaireSchema>;

interface InventaireDialogProps {
  children: React.ReactNode;
  cliniques?: Clinique[];

  allInventaires?: Inventaire[];
  onCreateInventaire: (data: Partial<Inventaire>) => Promise<Inventaire | null>;
}

export function InventaireDialog({
  children,
  cliniques = [],
  allInventaires = [],
  onCreateInventaire,
}: InventaireDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventaireFormData>({
    resolver: zodResolver(InventaireSchema),
  });
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: InventaireFormData) => {
    setIsSubmitting(true);
    try {
      // Vérifier si un inventaire existe déjà pour cette clinique à cette date
      const dateInventaire = new Date(data.dateInventaire!);
      const dateStr = dateInventaire.toISOString().split("T")[0]; // Format YYYY-MM-DD

      const inventaireExistant = allInventaires.find((inv) => {
        const invDate = new Date(inv.dateInventaire)
          .toISOString()
          .split("T")[0];
        return inv.idClinique === data.idClinique && invDate === dateStr;
      });

      if (inventaireExistant) {
        toast.error(
          "Un inventaire existe déjà pour cette clinique à cette date. Veuillez choisir une autre date."
        );
        setIsSubmitting(false);
        return;
      }

      // Convertir les données pour correspondre au type attendu
      const inventaireData = {
        idClinique: data.idClinique,
        dateInventaire: new Date(data.dateInventaire),
        idUser: data.idUser,
      };
      const nouvelInventaire = await onCreateInventaire(inventaireData);
      if (nouvelInventaire) {
        setOpen(false);
        reset();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de l'inventaire ou Un inventaire existe déjà pour cette clinique à cette date.";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-150">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nouvel inventaire</DialogTitle>
            <DialogDescription>
              Créez un nouvel inventaire pour gérer votre stock.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="idClinique">
                Clinique <span className="text-red-500">*</span>
              </Label>
              <select
                id="idClinique"
                {...register("idClinique")}
                className={`border rounded-md p-2 ${errors.idClinique ? "border-red-500" : ""}`}
              >
                <option value="">Sélectionnez une clinique</option>
                {cliniques.map((clinique) => (
                  <option key={clinique.id} value={clinique.id}>
                    {clinique.nomClinique}
                  </option>
                ))}
              </select>
              {errors.idClinique && (
                <span className="text-red-500 text-sm">{errors.idClinique.message}</span>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="dateInventaire">
                Date de {`l'inventaire`} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateInventaire"
                type="datetime-local"
                {...register("dateInventaire")}
                className={errors.dateInventaire ? "border-red-500" : ""}
              />
              {errors.dateInventaire && (
                <span className="text-red-500 text-sm">{errors.dateInventaire.message}</span>
              )}
            </div>
            <div className=" gap-3 hidden">
              <Label htmlFor="idUser">ID Utilisateur</Label>
              <Input
                id="idUser"
                // {...register("idUser", { required: true })}
                placeholder="Entrez l'ID de l'utilisateur"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}{" "}
              {`l'inventaire`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
