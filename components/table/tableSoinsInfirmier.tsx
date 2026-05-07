"use client";
import {
  deleteSoinsInfirmier,
  getAllSoinsInfirmierByIdClient,
} from "@/lib/actions/soinsInfirmierActions";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { removeFormulaireFromRecap } from "@/lib/actions/recapActions";
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
import { SoinsInfirmier, Visite } from "@prisma/client";
import { TAB_SOINS_INFIRMIER } from "@/components/forms/SoinsInfirmierForm";

const renderTypeSoin = (value: string) => {
  return TAB_SOINS_INFIRMIER.find((t) => t.value === value)?.label ?? value;
};

export function Table18({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataSoins, setDataSoins] = useState<SoinsInfirmier[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabSoins = await getAllSoinsInfirmierByIdClient(id);
      setDataSoins(tabSoins as SoinsInfirmier[]);
      const tabVisite = await getAllVisiteByIdClient(id);
      setDataVisite(tabVisite);
    };
    fetchData();
  }, [id]);

  const fetchDate = (visite: Visite[], idVisite: string) => {
    const dateVisite = visite.find((v) => v.id === idVisite);
    if (dateVisite) {
      return dateVisite.dateVisite.toLocaleDateString("fr-FR");
    }
    return "Aucune date";
  };

  const handleDelete = async (recordId: string) => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer cette fiche de soins infirmiers ?",
    );
    if (!confirmed) return;

    const record = dataSoins.find((d) => d.id === recordId);
    await deleteSoinsInfirmier(recordId);
    const remaining = dataSoins.filter((d) => d.id !== recordId);
    setDataSoins(remaining);
    if (record && !remaining.some((d) => d.idVisite === record.idVisite)) {
      await removeFormulaireFromRecap(
        record.idVisite,
        "18 Fiche Soins Infirmiers",
      );
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataSoins.length === 0
          ? "Aucune fiche de soins infirmiers"
          : "Liste des fiches de soins infirmiers du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Type de soin</TableHead>
          <TableHead>Observations</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataSoins.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="flex">
              <Link
                href={`/fiche-soins-infirmier/${d.idClient}/${d.id}`}
                prefetch={false}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.id)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.idVisite)}
            </TableCell>
            <TableCell>{renderTypeSoin(d.typeSoin)}</TableCell>
            <TableCell
              className="max-w-[200px] truncate"
              title={d.observations ?? ""}
            >
              {d.observations ?? ""}
            </TableCell>
            <TableCell className="flex">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Êtes-vous absolument sûr ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Si vous cliquez sur
                      Continuer, la fiche de soins infirmiers sera
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
