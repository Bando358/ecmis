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
import { useEffect, useState } from "react";
import {
  CommandeFournisseur,
  DetailCommande,
  Produit,
  TarifProduit,
} from "@prisma/client";
import { getAllCommandesFournisseur } from "@/lib/actions/commandeFournisseurActions";
import { getAllProduits } from "@/lib/actions/produitActions";

interface DetailCommandeDialogProps {
  children: React.ReactNode;
  tarifProduit: TarifProduit;
  idCommande: string;
  onAddDetail: (
    data: Partial<DetailCommande>,
    tarifProduit: TarifProduit
  ) => Promise<void>;
}

export function DetailCommandeDialog({
  children,
  tarifProduit,
  idCommande,
  onAddDetail,
}: DetailCommandeDialogProps) {
  const { register, handleSubmit, reset } = useForm();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [commandeFournisseur, setCommandeFournisseur] = useState<
    CommandeFournisseur[]
  >([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const allCommandesFournisseur = await getAllCommandesFournisseur();
      const allProduit = await getAllProduits();
      setProduits(allProduit);
      // Filtrer les commandes pour ne garder que celles qui ont des détails
      setCommandeFournisseur(allCommandesFournisseur);
    };

    fetchData();
  }, []);

  const onSubmit = async (data: Partial<DetailCommande>) => {
    try {
      await onAddDetail(data, tarifProduit); // <-- ici on passe les 2 paramètres
      // toast.success("Produit ajouté à la commande!");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du produit");
      console.error(error);
    }
  };

  // Retourne le nom du produit à partir de son id
  const nameProduit = (id: string) => {
    const produit = produits.find((p) => p.id === id);
    return produit ? produit.nomProduit : undefined;
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
                value={nameProduit(tarifProduit?.idProduit) || "Non spécifié"}
                disabled
                className="font-bold uppercase"
              />
            </div>
            {/* Champ caché pour idCommande, toujours présent et initialisé via la prop */}
            <Input
              type="hidden"
              {...register("idCommande")}
              value={idCommande}
            />
            <div className="grid gap-3">
              <Label htmlFor="idClinique">
                Sélectionnez la commande fournisseur
              </Label>
              <select
                id="idCommande"
                {...register("idCommande", { required: true })}
                className="border rounded-md p-2"
                defaultValue={idCommande}
              >
                <option value="">Sélectionnez une commande fournisseur</option>
                {commandeFournisseur.map((commande) => (
                  <option key={commande.id} value={commande.id}>
                    {commande.dateCommande?.toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
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
            <Button type="submit">Ajouter au stock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
