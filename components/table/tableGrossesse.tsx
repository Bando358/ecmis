"use client";
// import {
//   deleteGrossesse,
//   getAllGrossesseByIdClient,
//   getAllVisiteByIdClient,
// } from "@/lib/actions/authActions";
import {
  deleteGrossesse,
  getAllGrossesseByIdClient,
} from "@/lib/actions/grossesseActions";
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
import { Grossesse, Visite } from "@prisma/client";

export function Table05({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataGrossesse, setDataGrossesse] = useState<Grossesse[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabGrossesse = await getAllGrossesseByIdClient(id);
      const tab = [...tabGrossesse.reverse()];
      setDataGrossesse(tab);
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
      "Êtes-vous sûr de vouloir supprimer la grossesse ce client ?"
    );
    if (confirmed) {
      await deleteGrossesse(id);
      setDataGrossesse(dataGrossesse.filter((d) => d.id !== id));
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataGrossesse.length === 0
          ? "Aucune donnée de Grossesse"
          : "Liste des consultations la Grossesse du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>HTA</TableHead>
          <TableHead>Diabète</TableHead>
          <TableHead>Gestité</TableHead>
          <TableHead>Parité</TableHead>
          <TableHead>{"Äge Grossesse"}</TableHead>
          <TableHead>{"Semaine d'aménorrhée"}</TableHead>
          <TableHead>Terme Prévu</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataGrossesse.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                href={`/fiche-grossesse/${d.grossesseIdClient}/${d.id}`}
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
              {fetchDate(dataVisite, d.grossesseIdVisite)}
            </TableCell>
            <TableCell>{d.grossesseHta}</TableCell>
            <TableCell>{d.grossesseDiabete}</TableCell>
            <TableCell>{d.grossesseGestite}</TableCell>
            <TableCell>{d.grossesseParite}</TableCell>
            <TableCell>{d.grossesseAge}</TableCell>
            <TableCell>
              {d.grossesseDdr &&
                new Date(d.grossesseDdr).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>
              {d.termePrevu &&
                new Date(d.termePrevu).toLocaleDateString("fr-FR")}
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
