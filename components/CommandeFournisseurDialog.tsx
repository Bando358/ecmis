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
import { Clinique, CommandeFournisseur } from "@prisma/client";
// import { getAllClinique } from "@/lib/actions/cliniqueActions";

interface CommandeFournisseurDialogProps {
  children: React.ReactNode;
  cliniques?: Clinique[];
  onCreateCommande: (
    data: Partial<CommandeFournisseur>
  ) => Promise<CommandeFournisseur | null>;
}

export function CommandeFournisseurDialog({
  children,
  cliniques = [],
  onCreateCommande,
}: CommandeFournisseurDialogProps) {
  const { register, handleSubmit, reset } =
    useForm<Partial<CommandeFournisseur>>();
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: Partial<CommandeFournisseur>) => {
    try {
      const nouvelleCommande = await onCreateCommande(data);
      if (nouvelleCommande) {
        toast.success("Commande créée avec succès!");
        setOpen(false);
        reset();
      }
    } catch (error) {
      toast.error("Erreur lors de la création de la commande");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-150">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nouvelle commande fournisseur</DialogTitle>
            <DialogDescription>
              Créez une nouvelle commande pour approvisionner votre stock.
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
              <Label htmlFor="dateCommande">Date de commande</Label>
              <Input
                id="dateCommande"
                type="datetime-local"
                {...register("dateCommande", { required: true })}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="submit">Enregistrer la commande</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
