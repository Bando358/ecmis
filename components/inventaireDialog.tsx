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
  onCreateInventaire: (data: Partial<Inventaire>) => Promise<Inventaire | null>;
}

export function InventaireDialog({
  children,
  cliniques = [],
  onCreateInventaire,
}: InventaireDialogProps) {
  const { register, handleSubmit, reset } = useForm<Partial<Inventaire>>();
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: Partial<Inventaire>) => {
    try {
      const nouvelInventaire = await onCreateInventaire(data);
      if (nouvelInventaire) {
        toast.success("Inventaire créé avec succès!");
        setOpen(false);
        reset();
      }
    } catch (error) {
      toast.error("Erreur lors de la création de l'inventaire");
      console.error(error);
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
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="submit">Enregistrer {`l'inventaire`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
