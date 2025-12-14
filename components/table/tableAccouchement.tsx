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
import { Accouchement, Permission, TableName, Visite } from "@prisma/client";
import { useSession } from "next-auth/react";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export function Table08({ id }: { id: string }) {
  const [dataVisite, setDataVisite] = useState<Visite[]>([]);
  const [dataAccouchement, setDataAccouchement] = useState<Accouchement[]>([]);
  const { setSelectedClientId } = useClientContext();
  const [permission, setPermission] = useState<Permission | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: Permission) => p.table === TableName.ACCOUCHEMENT
        );
        setPermission(perm || null);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [session?.user]);

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
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer un accouchement. Contactez un administrateur."
      );
      return;
    }
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce client ?"
    );
    if (confirmed) {
      await deleteAccouchement(id);
      setDataAccouchement(dataAccouchement.filter((d) => d.id !== id));
    }
  };

  const handleUpdateAccouchement = (e: React.MouseEvent) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      e.preventDefault();
      alert(
        "Vous n'avez pas la permission de modifier un accouchement. Contactez un administrateur."
      );
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
                // target="_blank"
                href={`/fiche-accouchement/${d.accouchementIdClient}/${d.id}`}
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
