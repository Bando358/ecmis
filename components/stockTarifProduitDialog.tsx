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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { TarifProduit } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Produit, Clinique } from "@prisma/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface StockTarifProduitDialogProps {
  produits: Produit[];
  cliniques: Clinique[];
  // fournisseurs: Fournisseur[];
  isUpdating?: boolean;
  initialData?: TarifProduit;
  onSubmit: (data: TarifProduit) => Promise<void>;
  children: React.ReactNode;
}

export default function StockTarifProduitDialog({
  produits,
  cliniques,
  // fournisseurs,
  isUpdating = false,
  initialData,
  onSubmit,
  children,
}: StockTarifProduitDialogProps) {
  const [open, setOpen] = useState(false);
  const [produitPopoverOpen, setProduitPopoverOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

  const form = useForm<TarifProduit>({
    defaultValues: initialData || {
      idProduit: "",
      idClinique: "",
      // idFournisseur: "",
      prixUnitaire: 0,
      quantiteStock: 0,
    },
  });

  useEffect(() => {
    if (idUser) {
      form.setValue("idUser", idUser);
    }
  }, [idUser, form]);

  const handleSubmit = async (data: TarifProduit) => {
    setIsDisabled(true);
    try {
      await onSubmit(data);
      toast.success(
        `Tarif produit ${isUpdating ? "mis à jour" : "ajouté"} avec succès! 🎉`
      );
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(
        `Erreur lors de ${
          isUpdating ? "la mise à jour" : "l'ajout"
        } du tarif produit`
      );
      console.error(error);
    } finally {
      setIsDisabled(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isUpdating
                  ? "Modifier tarif produit"
                  : "Ajouter un tarif produit"}
              </DialogTitle>
              <DialogDescription>
                {isUpdating
                  ? "Modifiez les informations du tarif produit ci-dessous."
                  : "Remplissez les informations pour créer un nouveau tarif produit."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="idProduit"
                rules={{ required: "Le produit est obligatoire" }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Produit</FormLabel>
                    <Popover
                      open={produitPopoverOpen}
                      onOpenChange={setProduitPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={produitPopoverOpen}
                            className={cn(
                              "w-70 justify-between col-span-3",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? produits.find(
                                  (produit) => produit.id === field.value
                                )?.nomProduit
                              : "Sélectionnez un produit"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-70 p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher un produit..." />
                          <CommandList>
                            <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                            <CommandGroup>
                              {produits.map((produit) => (
                                <CommandItem
                                  value={produit.id}
                                  key={produit.id}
                                  onSelect={() => {
                                    form.setValue("idProduit", produit.id);
                                    setProduitPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      produit.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {produit.nomProduit}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />

              {/* Clinique */}
              <FormField
                control={form.control}
                name="idClinique"
                rules={{ required: "La clinique est obligatoire" }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Clinique</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined} // <-- évite la chaîne vide
                    >
                      <FormControl>
                        <SelectTrigger className="w-70 col-span-3">
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
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />

              {/* Fournisseur */}
              {/* <FormField
                control={form.control}
                name="idFournisseur"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Fournisseur</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                      value={field.value ? field.value : "none"} // <-- "none" au lieu de ""
                    >
                      <FormControl>
                        <SelectTrigger className="w-[280px] col-span-3">
                          <SelectValue placeholder="Sélectionnez un fournisseur (optionnel)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun fournisseur</SelectItem>
                        {fournisseurs.map((fournisseur) => (
                          <SelectItem
                            key={fournisseur.id}
                            value={fournisseur.id}
                          >
                            {fournisseur.nomFournisseur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              /> */}

              <FormField
                control={form.control}
                name="prixUnitaire"
                rules={{
                  required: "Le prix unitaire est obligatoire",
                  min: { value: 1, message: "Le prix doit être supérieur à 0" },
                }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Prix unitaire</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="w-[280px] col-span-3"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantiteStock"
                rules={{
                  required: "La quantité en stock est obligatoire",
                  min: {
                    value: 0,
                    message: "La quantité ne peut pas être négative",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">
                      Quantité en stock
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="w-[280px] col-span-3"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
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
