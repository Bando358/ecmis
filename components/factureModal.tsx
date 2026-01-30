"use client";

import MultiSelectProduit from "./multiSelectProduit";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  TarifProduit,
  FactureProduit,
  Produit,
  Clinique,
  Client,
} from "@prisma/client";
import { Input } from "./ui/input";
import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "./ui/checkbox";

interface FactureModalProps {
  open: boolean;
  tabClinique: Clinique[];
  allProduits: Produit[];
  clientData: Client;
  idClient: string;
  setOpen: (open: boolean) => void;
  setFactureProduit: React.Dispatch<React.SetStateAction<FactureProduit[]>>;
  refreshProduits: () => void;
  tarifProduits: TarifProduit[]; // Données pré-chargées filtrées par clinique
  excludedProduitIds?: string[]; // IDs des produits déjà ajoutés à exclure
}

export function FactureModal({
  open,
  tabClinique,
  allProduits,
  clientData,
  setOpen,
  refreshProduits,
  idClient,
  setFactureProduit,
  tarifProduits: tarifProduitsPreloaded, // Données pré-chargées filtrées par clinique
  excludedProduitIds = [], // IDs des produits déjà ajoutés
}: FactureModalProps) {
  const [selectedTarifProduits, setSelectedTarifProduits] = useState<TarifProduit[]>([]);
  const [checkProduits, setCheckProduits] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<TarifProduit[]>([]);

  // Filtrer les produits déjà ajoutés des options disponibles
  const availableProduits = useMemo(
    () => tarifProduitsPreloaded.filter((p) => !excludedProduitIds.includes(p.id)),
    [tarifProduitsPreloaded, excludedProduitIds]
  );

  // 🔥 OPTIMISATION : Pré-calcul des données pour éviter les re-rendus
  const { nameProduit, contraceptionProduits } = useMemo(() => {
    const nameProduit = (idProduit: string) => {
      const produit = allProduits.find((p) => p.id === idProduit);
      return produit ? produit.nomProduit : "";
    };

    const contraceptionProduits = (idProduit: string): boolean => {
      const produit = allProduits.find((p) => p.id === idProduit);
      return produit ? produit.typeProduit === "CONTRACEPTIF" : false;
    };

    return { nameProduit, contraceptionProduits };
  }, [allProduits]);

  const ajouterProduits = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit.");
      return;
    }

    const nouveauxProduits: TarifProduit[] = selectedOptions
      .filter(Boolean)
      .map((produit) => ({
        ...produit,
        quantite: 1,
        montantProduit: produit.prixUnitaire,
      }));

    setSelectedTarifProduits(nouveauxProduits);
    setSelectedOptions([]);
  };

  const form = useForm<FactureProduit>({
    defaultValues: {
      methode: false,
      quantite: 1,
      montantProduit: 0,
    },
  });

  // Nettoyer à la fermeture
  useEffect(() => {
    if (!open) {
      setSelectedTarifProduits([]);
      setSelectedOptions([]);
      form.reset();
    }
  }, [open, form]);

  // 🔥 OPTIMISATION : Regrouper les mises à jour du formulaire
  useEffect(() => {
    if (selectedTarifProduits.length > 0) {
      const produit = selectedTarifProduits[0];
      const quantite = form.watch("quantite") || 1;
      const montantProduit = quantite * produit.prixUnitaire;
      const isContraception = contraceptionProduits(produit.idProduit);

      form.setValue("idTarifProduit", produit.id);
      form.setValue("montantProduit", montantProduit);
      form.setValue("methode", isContraception);
      setCheckProduits(produit.quantiteStock);
    }

    form.setValue("idClient", idClient);
    form.setValue("idClinique", tabClinique[0]?.id ?? "");
    form.setValue("dateFacture", new Date());
  }, [selectedTarifProduits, form, idClient, tabClinique, contraceptionProduits]);

  // Calcul du montant quand la quantité change
  const quantiteWatched = form.watch("quantite");
  useEffect(() => {
    const quantite = quantiteWatched || 1;
    const produit = selectedTarifProduits.find(
      (p) => p.id === form.watch("idTarifProduit")
    );

    if (produit) {
      form.setValue("montantProduit", quantite * produit.prixUnitaire);
    }
  }, [form, quantiteWatched, selectedTarifProduits]);

  const onSubmit: SubmitHandler<FactureProduit> = async (data) => {
    const produit = selectedTarifProduits.find((p) => p.id === data.idTarifProduit);

    if (!produit) {
      toast.error("Produit non trouvé");
      return;
    }

    if (checkProduits < data.quantite) {
      toast.error("Stock insuffisant");
      return;
    }

    const factureProduit: FactureProduit = {
      ...data,
      id: crypto.randomUUID(),
      idClinique: tabClinique[0].id,
      idTarifProduit: produit.id,
      idClient,
      quantite: data.quantite,
      montantProduit: data.quantite * produit.prixUnitaire,
      dateFacture: new Date(),
      methode: form.watch("methode"),
    };

    setFactureProduit((prev) => [...prev, factureProduit]);
    refreshProduits();
    setSelectedTarifProduits([]);
    setSelectedOptions([]);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ajouter Produit</DialogTitle>
        </DialogHeader>

        <div className="flex flow-row gap-3 items-start">
          <div className="flex-1">
            <MultiSelectProduit
              produits={availableProduits}
              allProduits={allProduits}
              selectedOptions={selectedOptions}
              setSelectedOptions={setSelectedOptions}
              isLoading={false}
            />
          </div>
          <Button
            onClick={ajouterProduits}
            disabled={selectedOptions.length === 0}
          >
            Ajouter
          </Button>
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-semibold">Nom</TableCell>
                  <TableCell className="text-center font-semibold">
                    Contraception
                  </TableCell>
                  <TableCell className="font-semibold">Quantité</TableCell>
                  <TableCell className="font-semibold">Total</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTarifProduits.map((produit, index) => (
                  <TableRow key={`${produit.id}-${index}`}>
                    <TableCell className="font-medium">
                      {nameProduit(produit.idProduit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <FormField
                        control={form.control}
                        name="methode"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                id={`methode-${produit.id}`}
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                disabled={
                                  !contraceptionProduits(produit.idProduit)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name="quantite"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={checkProduits}
                                value={field.value || 1}
                                className="w-20"
                                onChange={(e) => {
                                  const value =
                                    parseInt(e.target.value, 10) || 1;
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name="montantProduit"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                className="w-24 font-semibold"
                                readOnly
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Champs cachés optimisés */}
            <FormField
              control={form.control}
              name="idTarifProduit"
              render={({ field }) => (
                <Input type="hidden" {...field} value={field.value ?? ""} />
              )}
            />
            <FormField
              control={form.control}
              name="idClient"
              render={({ field }) => (
                <Input type="hidden" {...field} value={idClient ?? ""} />
              )}
            />
            <FormField
              control={form.control}
              name="idClinique"
              render={({ field }) => (
                <Input
                  type="hidden"
                  {...field}
                  value={tabClinique[0]?.id ?? ""}
                />
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={selectedTarifProduits.length === 0}
                className="min-w-24"
              >
                Valider
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="min-w-24"
              >
                Annuler
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
