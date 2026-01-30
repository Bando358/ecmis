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
import { Clinique, CommandeFournisseur } from "@prisma/client";

// Schéma de validation Zod
const CommandeSchema = z.object({
  idClinique: z.string().min(1, "Veuillez sélectionner une clinique"),
  dateCommande: z.string().min(1, "Veuillez sélectionner une date"),
});

type CommandeFormData = z.infer<typeof CommandeSchema>;

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<CommandeFormData>({
    resolver: zodResolver(CommandeSchema),
  });
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: CommandeFormData) => {
    try {
      // Convertir les données pour correspondre au type attendu
      const commandeData = {
        idClinique: data.idClinique,
        dateCommande: new Date(data.dateCommande),
      };
      const nouvelleCommande = await onCreateCommande(commandeData);
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
              <Label htmlFor="dateCommande">
                Date de commande <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateCommande"
                type="datetime-local"
                {...register("dateCommande")}
                className={errors.dateCommande ? "border-red-500" : ""}
              />
              {errors.dateCommande && (
                <span className="text-red-500 text-sm">{errors.dateCommande.message}</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} >Enregistrer la commande</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
