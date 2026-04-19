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
import { DetailCommande, TarifProduit } from "@prisma/client";

interface DetailCommandeDialogProps {
  children: React.ReactNode;
  tarifProduit: TarifProduit;
  nomProduit: string;
  idCommande: string;
  onAddDetail: (
    data: Partial<DetailCommande>,
    tarifProduit: TarifProduit
  ) => Promise<void>;
}

export function DetailCommandeDialog({
  children,
  tarifProduit,
  nomProduit,
  idCommande,
  onAddDetail,
}: DetailCommandeDialogProps) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: Partial<DetailCommande>) => {
    try {
      await onAddDetail(data, tarifProduit);
      setOpen(false);
      reset();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du produit");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Ajouter un produit à la commande</DialogTitle>
            <DialogDescription>
              Spécifiez la quantité du produit à commander.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="produit">Produit</Label>
              <Input
                id="produit"
                value={nomProduit || "Non spécifié"}
                disabled
                className="font-bold uppercase"
              />
            </div>
            <Input
              type="hidden"
              {...register("idCommande")}
              value={idCommande}
            />
            <div className="grid gap-3">
              <Label htmlFor="quantiteCommandee">Quantité</Label>
              <Input
                id="quantiteCommandee"
                type="number"
                min="1"
                {...register("quantiteCommandee", { required: true, min: 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} >Ajouter au stock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
