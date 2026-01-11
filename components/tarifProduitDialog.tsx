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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { TarifProduit, Produit, Clinique } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReactSelect from "react-select";

interface TarifProduitDialogProps {
  produits: Produit[];
  cliniques: Clinique[];
  isUpdating?: boolean;
  initialData?: TarifProduit;
  onSubmit: (data: TarifProduit) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TarifProduitDialog({
  produits,
  cliniques,
  isUpdating = false,
  initialData,
  onSubmit,
  open,
  onOpenChange,
}: TarifProduitDialogProps) {
  const [isDisabled, setIsDisabled] = useState(false);
  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

  const form = useForm<TarifProduit>({
    defaultValues: {
      idProduit: "",
      idClinique: "",
      prixUnitaire: 0,
      quantiteStock: 0,
      idUser: idUser,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        idProduit: "",
        idClinique: "",
        prixUnitaire: 0,
        quantiteStock: 0,
        idUser: idUser,
      });
    }
  }, [initialData, idUser, form]);

  const handleSubmit = async (data: TarifProduit) => {
    setIsDisabled(true);
    try {
      await onSubmit({ ...data, idUser });
    } catch (error) {
      toast.error("Erreur lors de l’enregistrement");
      console.error("Erreur lors de l’enregistrement :", error);
    } finally {
      setIsDisabled(false);
    }
  };

  const groupedProduitOptions = Object.entries(
    produits.reduce((acc, produit) => {
      const type = produit.typeProduit || "Autres";
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        value: produit.id,
        label: produit.nomProduit,
      });
      return acc;
    }, {} as Record<string, { value: string; label: string }[]>)
  ).map(([type, options]) => ({ label: type, options }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-112.5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isUpdating ? "Modifier le tarif" : "Ajouter un tarif"}
              </DialogTitle>
              <DialogDescription>
                {isUpdating
                  ? "Modifiez les informations du tarif produit."
                  : "Ajoutez un nouveau tarif produit."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Produit */}
              <FormField
                control={form.control}
                name="idProduit"
                rules={{ required: "Le produit est obligatoire" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit</FormLabel>
                    <ReactSelect
                      options={groupedProduitOptions}
                      placeholder="Sélectionnez un produit"
                      value={groupedProduitOptions
                        .flatMap((g) => g.options)
                        .find((o) => o.value === field.value)}
                      onChange={(val) => field.onChange(val?.value)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Clinique */}
              <FormField
                control={form.control}
                name="idClinique"
                rules={{ required: "La clinique est obligatoire" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinique</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez une clinique" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cliniques.map((clinique) => (
                          <SelectItem key={clinique.id} value={clinique.id}>
                            {clinique.nomClinique}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prix unitaire */}
              <FormField
                control={form.control}
                name="prixUnitaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix unitaire</FormLabel>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantité */}
              <FormField
                control={form.control}
                name="quantiteStock"
                render={({ field }) => (
                  <FormItem className={isUpdating ? "hidden" : ""}>
                    <FormLabel>Quantité en stock</FormLabel>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isDisabled}>
                {isUpdating ? "Mettre à jour" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
