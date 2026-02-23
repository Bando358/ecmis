// tableVisite.tsx
"use client";
import {
  deleteVisite,
  getAllVisiteByIdClient,
} from "@/lib/actions/visiteActions";
import { deleteRecapVisite } from "@/lib/actions/recapActions";
import { Visite } from "@prisma/client";
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
import { toast } from "sonner";

export function Table00({ id }: { id: string }) {
  const [data, setData] = useState<Visite[]>([]);
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const tab = await getAllVisiteByIdClient(id);
      setData(tab);
    };
    fetchData();
  }, [id]);

  const handleDelete = async (visiteId: string) => {
    try {
      await deleteRecapVisite(visiteId);
      await deleteVisite(visiteId);
      setData(data.filter((d) => d.id !== visiteId));
      toast.success("Visite supprimée avec succès");
    } catch {
      toast.error("Erreur lors de la suppression de la visite");
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {data.length === 0 ? "Aucune visite" : "Liste des visites du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Motif</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex">
              <Link
                href={`/visite/${d.idClient}/${d.id}`}
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
              {new Date(d.dateVisite).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>{d.motifVisite || "—"}</TableCell>
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
                      continuer, la visite du client sera définitivement
                      supprimée.
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
