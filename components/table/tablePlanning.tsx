"use client";
import {
  deletePlanning,
  getAllPlanningByIdClient,
} from "@/lib/actions/planningActions";
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
import { Planning, Visite } from "@prisma/client";
// import { Constante } from "@prisma/client";

// type ConstanteVisite = {
//   id: string;
//   poids: number;
//   taille: number | null;
//   idClient: string;
//   dateVisite: Date;
// };

export function Table02({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataPf, setDataPf] = useState<Planning[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabPf = await getAllPlanningByIdClient(id);
      const tab = [...tabPf.reverse()];
      setDataPf(tab);
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
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce client ?"
    );
    if (confirmed) {
      await deletePlanning(id);
      setDataPf(dataPf.filter((d) => d.id !== id));
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataPf.length === 0
          ? "Aucune donnée PF"
          : "Liste des consultations PF du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Courte durée</TableHead>
          <TableHead>Implanon</TableHead>
          <TableHead>Jadelle</TableHead>
          <TableHead>Stérilet</TableHead>
          <TableHead>Retrait</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataPf.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                href={`/planning/${d.idClient}/${d.id}`}
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
            <TableCell>{d.courtDuree}</TableCell>
            <TableCell>{d.implanon}</TableCell>
            <TableCell>{d.jadelle}</TableCell>
            <TableCell>{d.sterilet}</TableCell>
            <TableCell>
              {d.retraitImplanon && <span>Implanon</span>}
              {d.retraitJadelle && <span>Jadelle</span>}
              {d.retraitSterilet && <span>Diu</span>}
            </TableCell>
            <TableCell className="flex">
              {/* <FilePenLine className="text-xl m-1 duration-300 hover:scale-150 text-blue-600 cursor-pointer" /> */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {/* <Button variant="outline"> */}
                  <Trash2 className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-red-600 cursor-pointer" />
                  {/* </Button> */}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Êtes vous absolument sûr?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. si vous cliquez sur
                      continuer la visite du client sera definitivement
                      supprimer
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600   "
                      onClick={() => handleDelete(d.id)}
                    >
                      Continue
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
