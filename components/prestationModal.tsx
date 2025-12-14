"use client";

import MultiSelectPrestation from "./multiSelectPrestation";
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
import { TarifPrestation, FacturePrestation } from "@prisma/client";
import { Input } from "./ui/input";
import { useState, useEffect } from "react";
// import { useSession } from "next-auth/react";
// import { getAllTarifPrestation, getOneClient } from "@/lib/actions/authActions";
import { getAllTarifPrestation } from "@/lib/actions/tarifPrestationActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { useSession } from "next-auth/react";

interface ProduitModalProps {
  openPrestation: boolean;
  idClient: string;
  setOpenPrestation: (openPrestation: boolean) => void;
  setFacturePrestation: React.Dispatch<
    React.SetStateAction<FacturePrestation[]>
  >;
  refreshProduits: () => void; // Ajout de la fonction en prop
}

export default function PrestationsModal({
  openPrestation,
  setOpenPrestation,
  refreshProduits,
  idClient,
  setFacturePrestation,
}: ProduitModalProps) {
  const [prestations, setPrestations] = useState<TarifPrestation[]>([]);
  const [selectedPrestationsClinique, setSelectedPrestationsClinique] =
    useState<TarifPrestation[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<TarifPrestation[]>([]);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  if (prestations.length > 0) {
    console.log("prestations prestationModal:", prestations);
  }

  useEffect(() => {
    if (openPrestation === false) {
      setPrestations([]);
    }
  }, [openPrestation]);

  useEffect(() => {
    const fetchData = async () => {
      if (!idClient) return;
      const client = await getOneClient(idClient);
      try {
        const allProduits = await getAllTarifPrestation();
        const produitClinique = allProduits.filter(
          (p: { idClinique: any }) => p.idClinique === client?.idClinique
        );
        setSelectedPrestationsClinique(produitClinique);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de la récupération des produits :",
          error
        );
      }
    };
    fetchData();
  }, [idClient]);

  const ajouterPrestations = () => {
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins une prestation.");
      return;
    }

    const nouveauxPrestations: TarifPrestation[] = Array.isArray(
      selectedOptions
    )
      ? selectedOptions
      : [selectedOptions];

    setPrestations(() => [...nouveauxPrestations]);
    setSelectedOptions([]); // Réinitialiser la sélection après l'ajout
  };

  const form = useForm<FacturePrestation>();

  useEffect(() => {
    form.setValue("idUser", idUser);
    form.setValue("idClient", idClient);
    // form.setValue("idVisite", idVisite);
  }, [form, idUser, idClient]);

  const onSubmit: SubmitHandler<FacturePrestation> = async (data) => {
    // const qte =
    const formattedData = {
      ...data,
      montantPrestation: parseInt(
        form.watch("prixPrestation") as unknown as string,
        10
      ),
      idPrestation: prestations[0]?.idPrestation ?? "",
    };
    console.log(formattedData);
    setFacturePrestation((prevPrestations) => [
      ...prevPrestations,
      formattedData,
    ]);
    refreshProduits();
    setPrestations([]);
    form.reset();
    // setOpenPrestation(false);
  };
  return (
    <Dialog open={openPrestation} onOpenChange={setOpenPrestation}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une Prestation</DialogTitle>
        </DialogHeader>
        <div className=" flex flow-row  gap-3">
          <MultiSelectPrestation
            tarifs={selectedPrestationsClinique}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
          />
          <Button onClick={ajouterPrestations}>Ajouter</Button>
        </div>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Prestation</TableCell>
                  <TableCell>Montant</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prestations.map((prestation) => (
                  <TableRow key={prestation?.id ?? Math.random()}>
                    <TableCell>
                      {prestation?.nomPrestation ?? ""}
                      <FormField
                        key={(prestation?.id ?? "") + "-formfield"}
                        control={form.control}
                        name="idPrestation"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                defaultValue={prestation?.idPrestation ?? ""}
                                className="hidden"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name="prixPrestation"
                        defaultValue={parseInt(
                          prestations[0].montantPrestation as unknown as string,
                          10
                        )} // Assurer une valeur par défaut
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                className="w-20"
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

            <FormField
              control={form.control}
              name="idUser"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      value={form.watch("idUser") ?? ""}
                      className="hidden"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={prestations.length === 0}>
                Valider
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpenPrestation(false)}
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
