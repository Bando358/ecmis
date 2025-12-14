"use client";

import { getAllPecVihByIdClient } from "@/lib/actions/pecVihActions";
import { deletePecVih } from "@/lib/actions/pecVihActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NotebookPen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useClientContext } from "../ClientContext";
import { PecVih, Visite } from "@prisma/client";

export function Table14({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataPecVih, setDataPecVih] = useState<PecVih[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabPecVih = await getAllPecVihByIdClient(id);
      const tab = [...tabPecVih.reverse()];
      setDataPecVih(tab);
      const tabVisite = await getAllVisiteByIdClient(id);
      setDataVisite(tabVisite);
    };
    fetchData();
  }, [id]);

  const fetchDate = (visite: Visite[], id: string) => {
    const dateVisite = visite.find((v) => v.id === id);
    if (dateVisite) {
      return dateVisite.dateVisite.toLocaleDateString("fr-FR");
    }

    return "Aucune date";
  };

  const formatDateRdv = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR");
  };

  const handleDelete = async (id: string) => {
    await deletePecVih(id);
    setDataPecVih(dataPecVih.filter((d) => d.id !== id));
  };

  const getTypeClientLabel = (type: string) => {
    const types = {
      "Consultation Initiale": "Consultation Initiale",
      Suivi: "Suivi",
      Autre: "Autre",
    };
    return types[type as keyof typeof types] || type;
  };

  const getBooleanLabel = (value: boolean) => {
    return value ? "Oui" : "Non";
  };

  return (
    <Table className="max-w-300 mx-4">
      <TableCaption>
        {dataPecVih.length === 0
          ? "Aucune donnée de prise en charge VIH"
          : "Liste des prises en charge VIH du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Type consultation</TableHead>
          <TableHead>Molecule ARV</TableHead>
          <TableHead>SPDP</TableHead>
          <TableHead>Date RDV</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataPecVih.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="flex">
              <Link
                // target="_blank"
                href={`/fiche-pec-vih/${d.pecVihIdClient}/${d.id}`}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.pecVihIdClient)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.pecVihIdVisite)}
            </TableCell>
            <TableCell>{getTypeClientLabel(d.pecVihTypeclient)}</TableCell>
            <TableCell>{d.pecVihMoleculeArv || "-"}</TableCell>
            <TableCell>{getBooleanLabel(d.pecVihSpdp)}</TableCell>
            <TableCell>
              {d.pecDateRdvSuivi ? formatDateRdv(d.pecDateRdvSuivi) : "-"}
            </TableCell>
            <TableCell className="flex">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Êtes vous absolument sûr?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Si vous cliquez sur
                      continuer, la prise en charge VIH du client sera
                      définitivement supprimée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600"
                      onClick={() => handleDelete(d.id)}
                    >
                      Continuer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
