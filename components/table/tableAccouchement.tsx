"use client";
import {
  deleteAccouchement,
  getAllAccouchementByIdClient,
} from "@/lib/actions/accouchementActions";
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
import { Accouchement, TableName, Visite } from "@prisma/client";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { toast } from "sonner";
import { removeFormulaireFromRecap } from "@/lib/actions/recapActions";

export function Table08({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataAccouchement, setDataAccouchement] = useState<Accouchement[]>([]);
  const { setSelectedClientId } = useClientContext();
  const { canUpdate, canDelete } = usePermissionContext();

  useEffect(() => {
    const fetchData = async () => {
      const tabAccouchement = await getAllAccouchementByIdClient(id);
      const tab = [...tabAccouchement.reverse()];
      setDataAccouchement(tab);
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
    if (!canDelete(TableName.ACCOUCHEMENT)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce client ?"
    );
    if (confirmed) {
      const record = dataAccouchement.find((d) => d.id === id);
      await deleteAccouchement(id);
      const remaining = dataAccouchement.filter((d) => d.id !== id);
      setDataAccouchement(remaining);
      if (record && !remaining.some((d) => d.accouchementIdVisite === record.accouchementIdVisite)) {
        await removeFormulaireFromRecap(record.accouchementIdVisite, "09 Fiche Accouchement");
      }
    }
  };

  const handleUpdateAccouchement = (e: React.MouseEvent) => {
    if (!canUpdate(TableName.ACCOUCHEMENT)) {
      e.preventDefault();
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
  };

  return (
    <Table className="max-w-150 mx-4">
      <TableCaption>
        {dataAccouchement.length === 0
          ? "Aucune donnée Accouchement"
          : "Liste des consultations d'Accouchement du client"}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Editer</TableHead>
          <TableHead>Date Visite</TableHead>
          <TableHead>Lieu Accouchement</TableHead>
          <TableHead>Statut Vaccinal</TableHead>
          <TableHead>Etat Naissance</TableHead>
          <TableHead>Enfant Vivant</TableHead>

          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dataAccouchement.map((d) => (
          <TableRow key={d.id}>
            <TableCell className=" flex" onClick={handleUpdateAccouchement}>
              <Link
                href={`/fiche-accouchement/${d.accouchementIdClient}/${d.id}`}
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
              {fetchDate(dataVisite, d.accouchementIdVisite)}
            </TableCell>
            <TableCell>{d.accouchementLieu}</TableCell>
            <TableCell>{d.accouchementStatutVat}</TableCell>
            <TableCell>{d.accouchementEtatNaissance}</TableCell>
            <TableCell>{d.accouchementEnfantVivant}</TableCell>

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
