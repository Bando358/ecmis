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
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { AnomalieInventaire } from "@prisma/client";
import { Textarea } from "./ui/textarea";

// Schéma de validation Zod
const AnomalieSchema = z.object({
  description: z.string().min(1, "Veuillez décrire l'anomalie"),
});

type AnomalieFormData = z.infer<typeof AnomalieSchema>;

interface AnomalieInventaireDialogProps {
  children: React.ReactNode;
  quantiteReelle: number;
  idUser: string;
  idDetailInventaire: string;
  idTarifProduit: string;
  produit: string;
  ecart: number;
  onCreateAnomalie: (
    data: Partial<AnomalieInventaire>
  ) => Promise<AnomalieInventaire | null>;
}

export function AnomalieInventaireDialog({
  children,
  idTarifProduit,
  idDetailInventaire,
  ecart,
  quantiteReelle,
  idUser,
  produit,
  onCreateAnomalie,
}: AnomalieInventaireDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<AnomalieFormData>({
    resolver: zodResolver(AnomalieSchema),
  });
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: AnomalieFormData) => {
    const newData = {
      id: "",
      idTarifProduit: idTarifProduit,
      idUser: idUser,
      idDetailInventaire: idDetailInventaire,
      quantiteManquante: ecart,
      dateAnomalie: new Date(),
      description: data.description,
    };
    try {
      const nouvelleAnomalie = await onCreateAnomalie(newData);
      if (nouvelleAnomalie) {
        setOpen(false);
        reset();
      }
    } catch (error) {
      toast.error("Erreur lors de la création de l'anomalie d'inventaire");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-150">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nouvelle anomalie {"d'inventaire"}</DialogTitle>
            <DialogDescription>
              Créez une nouvelle anomalie {"d'inventaire"} pour signaler un
              écart de stock.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label>{produit}</Label>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="quantiteManquante">
                Désormais, la quantité de {produit} sera de : {quantiteReelle}{" "}
                car {ecart}{" "}
                {ecart > 1 ? "unités sont en plus" : "unité sont manquantes"}.
              </Label>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Description de l'anomalie"
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <span className="text-red-500 text-sm">{errors.description.message}</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} >Enregistrer {"l'anomalie"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
