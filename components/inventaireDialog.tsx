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
import { toast } from "sonner";
import { useState } from "react";
import { Clinique, Inventaire } from "@prisma/client";

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
  const { register, handleSubmit, reset } = useForm<Partial<Inventaire>>();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: Partial<Inventaire>) => {
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

      const nouvelInventaire = await onCreateInventaire(data);
      if (nouvelInventaire) {
        setOpen(false);
        reset();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de l'inventaire";
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
              <Label htmlFor="idClinique">Clinique</Label>
              <select
                id="idClinique"
                {...register("idClinique", { required: true })}
                className="border rounded-md p-2"
              >
                <option value="">Sélectionnez une clinique</option>
                {cliniques.map((clinique) => (
                  <option key={clinique.id} value={clinique.id}>
                    {clinique.nomClinique}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="dateInventaire">Date de {`l'inventaire`}</Label>
              <Input
                id="dateInventaire"
                type="datetime-local"
                {...register("dateInventaire", { required: true })}
              />
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
