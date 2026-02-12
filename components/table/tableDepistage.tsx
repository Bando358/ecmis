"use client";

import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import {
  deleteDepistageVih,
  getAllDepistageVihByIdClient,
} from "@/lib/actions/depistageVihActions";
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
import { DepistageVih, Visite } from "@prisma/client";

export function Table13({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataDepistageVih, setDataDepistageVih] = useState<DepistageVih[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabDepistageVih = await getAllDepistageVihByIdClient(id);
      const tab = [...tabDepistageVih.reverse()];
      setDataDepistageVih(tab);
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

  const handleDelete = async (id: string) => {
    await deleteDepistageVih(id);
    setDataDepistageVih(dataDepistageVih.filter((d) => d.id !== id));
  };

  const getTypeClientLabel = (type: string) => {
    const types = {
      CDIP: "CDIP",
      IST: "IST",
      PTME: "PTME",
      EnfantMerePos: "Enfant de mère positive",
      conjointPos: "Conjoint positif",
      autre: "Autre",
    };
    return types[type as keyof typeof types] || type;
  };

  const getResultatLabel = (resultat: string) => {
    const resultats = {
      negatif: "Négatif",
      positif: "Positif",
      indetermine: "Indéterminé",
    };
    return resultats[resultat as keyof typeof resultats] || resultat;
  };

  return (
    <Table className="max-w-225 mx-4">
      <TableCaption>
        {dataDepistageVih.length === 0
          ? "Aucune donnée de dépistage VIH"
          : "Liste des dépistages VIH du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Type client</TableHead>
          <TableHead>Test rapide</TableHead>
          <TableHead>Résultat</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataDepistageVih.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="flex">
              <Link
                href={`/fiche-depistage/${d.depistageVihIdClient}/${d.id}`}
                prefetch={false}
                className="block -pr-1"
              >
                <NotebookPen
                  onClick={() => setSelectedClientId(d.depistageVihIdClient)}
                  className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer"
                />
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {fetchDate(dataVisite, d.depistageVihIdVisite)}
            </TableCell>
            <TableCell>
              {getTypeClientLabel(d.depistageVihTypeClient)}
            </TableCell>
            <TableCell>
              {d.depistageVihInvestigationTestRapide ? "Oui" : "Non"}
            </TableCell>
            <TableCell>
              {d.depistageVihResultat
                ? getResultatLabel(d.depistageVihResultat)
                : "-"}
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
                      continuer, le dépistage VIH du client sera définitivement
                      supprimé.
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
