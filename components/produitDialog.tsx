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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Produit, TypeProduit } from "@prisma/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Pencil } from "lucide-react";

interface ProduitDialogProps {
  isUpdating?: boolean;
  initialData?: Produit;
  onSubmit: (data: Produit) => Promise<void>;
  children: React.ReactNode;
}

export default function ProduitDialog({
  isUpdating = false,
  initialData,
  onSubmit,
  children,
}: ProduitDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

  const form = useForm<Produit>({
    defaultValues: initialData || {
      nomProduit: "",
      description: "",
      typeProduit: TypeProduit.MEDICAMENTS,
      idUser: idUser,
    },
  });

  // ✅ Synchronise idUser à chaque fois que la session change
  useEffect(() => {
    if (idUser) {
      form.setValue("idUser", idUser);
    }
  }, [idUser, form]);

  // ✅ Si le champ idUser devient vide après reset, on le remet
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!value.idUser && idUser) {
        form.setValue("idUser", idUser);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, idUser]);

  const handleSubmit = async (data: Produit) => {
    setIsDisabled(true);
    try {
      const formattedData = {
        ...data,
        nomProduit: data.nomProduit.trim().toLowerCase(),
        description: data.description?.trim() || "",
        idUser: idUser, // ✅ on force la valeur
      };

      await onSubmit(formattedData);
      toast.success(
        `Produit ${isUpdating ? "mis à jour" : "ajouté"} avec succès! 🎉`
      );

      setOpen(false);

      if (!isUpdating) {
        form.reset({
          nomProduit: "",
          description: "",
          typeProduit: TypeProduit.MEDICAMENTS,
          idUser: idUser, // ✅ on réinjecte idUser après reset
        });
      }
    } catch (error) {
      toast.error(
        `Erreur lors de ${isUpdating ? "la mise à jour" : "l'ajout"} du produit`
      );
      console.error(error);
    } finally {
      setIsDisabled(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isUpdating ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          children
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isUpdating ? "Modifier produit" : "Ajouter un produit"}
              </DialogTitle>
              <DialogDescription>
                {isUpdating
                  ? "Modifiez les informations du produit ci-dessous."
                  : "Remplissez les informations pour créer un nouveau produit."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Nom du produit */}
              <FormField
                control={form.control}
                name="nomProduit"
                rules={{
                  required: "Le nom du produit est obligatoire",
                  minLength: {
                    value: 3,
                    message: "Le nom doit contenir au moins 3 caractères",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Nom</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Paracétamol"
                        className="col-span-3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />

              {/* Type du produit */}
              <FormField
                control={form.control}
                name="typeProduit"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="col-span-3 w-full">
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TypeProduit).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description du produit..."
                        className="col-span-3 resize-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />

              {/* Champ caché idUser */}
              <FormField
                control={form.control}
                name="idUser"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="hidden" {...field} value={idUser} />
                    </FormControl>
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
              <Button type="submit" disabled={isDisabled || !idUser}>
                {isUpdating ? "Mettre à jour" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
