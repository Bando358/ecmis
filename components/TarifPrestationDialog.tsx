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
import {
  TarifPrestation,
  Prestation as PrismaPrestation,
  Clinique,
  Prestation,
} from "@prisma/client";

type PrestationWithType = PrismaPrestation & { typePrestation?: string };
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

interface TarifPrestationDialogProps {
  prestations: Prestation[];
  cliniques: Clinique[];
  isUpdating?: boolean;
  initialData?: TarifPrestation;
  onSubmit: (data: TarifPrestation) => Promise<void>;
  children: React.ReactNode;
}

export default function TarifPrestationDialog({
  prestations,
  cliniques,
  isUpdating = false,
  initialData,
  onSubmit,
  children,
}: TarifPrestationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

  const form = useForm<TarifPrestation>({
    defaultValues: initialData || {
      idPrestation: "",
      idClinique: "",
      montantPrestation: 0,
    },
  });

  useEffect(() => {
    if (idUser) form.setValue("idUser", idUser);
  }, [idUser, form]);

  // ✅ Regrouper les prestations par typePrestation (si la propriété existe)
  const groupedPrestationOptions = Object.entries(
    (prestations as PrestationWithType[]).reduce((acc, prestation) => {
      // Utiliser typePrestation si disponible, sinon "Autres"
      const type = prestation.typePrestation || "Autres";
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        value: String(prestation.id),
        label: prestation.nomPrestation,
      });
      return acc;
    }, {} as Record<string, { value: string; label: string }[]>)
  ).map(([typePrestation, options]) => ({
    label: typePrestation,
    options,
  }));

  const handleSubmit = async (data: TarifPrestation) => {
    setIsDisabled(true);
    try {
      await onSubmit({ ...data, idUser });
      toast.success(
        `Tarif prestation ${
          isUpdating ? "mis à jour" : "ajouté"
        } avec succès 🎉`
      );
      setOpen(false);
      form.reset({
        idPrestation: "",
        idClinique: "",
        montantPrestation: 0,
      });
    } catch (error) {
      toast.error(
        `Erreur lors de ${
          isUpdating ? "la mise à jour" : "l'ajout"
        } du tarif prestation`
      );
      console.error(error);
    } finally {
      setIsDisabled(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-112.5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isUpdating
                  ? "Modifier tarif prestation"
                  : "Ajouter un tarif prestation"}
              </DialogTitle>
              <DialogDescription>
                {isUpdating
                  ? "Modifiez les informations du tarif prestation ci-dessous."
                  : "Remplissez les informations pour créer un nouveau tarif prestation."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* ✅ Sélecteur de prestation groupé par typePrestation */}
              <FormField
                control={form.control}
                name="idPrestation"
                rules={{ required: "La prestation est obligatoire" }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Prestation</FormLabel>
                    <div className="col-span-3">
                      <ReactSelect
                        options={groupedPrestationOptions}
                        placeholder="Sélectionnez une prestation"
                        value={groupedPrestationOptions
                          .flatMap((group) => group.options)
                          .find((option) => option.value === field.value)}
                        onChange={(selectedOption) => {
                          field.onChange(selectedOption?.value || "");
                          form.trigger("idPrestation");
                        }}
                        classNamePrefix="select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "hsl(var(--border))",
                            borderRadius: "0.5rem",
                            minHeight: "38px",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 9999,
                          }),
                        }}
                        isSearchable
                      />
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Sélecteur de clinique */}
              <FormField
                control={form.control}
                name="idClinique"
                rules={{ required: "La clinique est obligatoire" }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Clinique</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
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

              {/* Montant de la prestation */}
              <FormField
                control={form.control}
                name="montantPrestation"
                rules={{
                  required: "Le montant est obligatoire",
                  min: {
                    value: 1,
                    message: "Le montant doit être supérieur à 0",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Montant</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="w-70 col-span-3"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
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
