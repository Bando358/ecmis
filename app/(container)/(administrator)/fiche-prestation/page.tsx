"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Permission, Prestation, TableName } from "@/lib/generated/prisma";
import {
  createPrestation,
  deletePrestation,
  getAllPrestation,
  updatePrestation,
} from "@/lib/actions/prestationActions";
import { Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function PrestationPage() {
  const [listePrestation, setListePrestation] = useState<Prestation[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";

  const form = useForm<Prestation>({
    defaultValues: {
      nomPrestation: "",
      idUser: "",
    },
  });

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find((p) => p.table === TableName.PRESTATION);

        if (perm?.canRead || session.user.role === "ADMIN") {
          setHasAccess(true);
          setPermission(perm || null);
        } else {
          alert("Vous n'avez pas la permission d'accéder à cette page.");
          router.back();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    fetchPermissions();
  }, [session?.user, router]);

  // Initialiser la liste des prestations
  useEffect(() => {
    const fetchData = async () => {
      const prestation = await getAllPrestation();
      setListePrestation(prestation);
    };
    fetchData();
  }, []);

  // Mettre à jour le champ idUser quand la session est disponible
  useEffect(() => {
    if (idUser) {
      form.setValue("idUser", idUser);
    }
  }, [idUser, form]);

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerBar />
      </div>
    );
  }

  if (!hasAccess) return null;

  const onSubmit = async (data: Prestation) => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer une prestation. Contactez un administrateur."
      );
      return;
    }
    const formattedData = {
      ...data,
      idUser: form.watch("idUser"),
    };
    try {
      if (isUpdating) {
        await updatePrestation(data.id, formattedData);
        toast.success("Prestation mise à jour avec succès! 🎉");
        setIsUpdating(false);
      } else {
        await createPrestation(formattedData);
        toast.success("Prestation créée avec succès! 🎉");
      }

      const updatedList = await getAllPrestation();
      setListePrestation(updatedList);
      form.setValue("nomPrestation", "");
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'opération.");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une prestation. Contactez un administrateur."
      );
      return;
    }
    try {
      await deletePrestation(id);
      setListePrestation((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prestation supprimée avec succès! 🎉");
    } catch (error) {
      toast.error("Erreur lors de la suppression de la prestation.");
      console.error(error);
    }
  };

  const handleUpdatePrestation = (id: string) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de mettre à jour une prestation. Contactez un administrateur."
      );
      return;
    }
    const prestation = listePrestation.find((p) => p.id === id);
    if (prestation) {
      setIsUpdating(true);
      form.setValue("id", prestation.id ?? "");
      form.setValue("nomPrestation", prestation.nomPrestation ?? "");
    }
  };

  return (
    <div className="space-y-4 max-w-[900px] p-4 flex flex-col mx-auto">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-3/4 flex flex-row mx-auto p-4 rounded-sm items-end gap-4 relative bg-gray-50 opacity-90"
        >
          <FormField
            control={form.control}
            name="nomPrestation"
            rules={{
              required: "Le nom de la prestation est obligatoire",
              minLength: {
                value: 3,
                message: "Le nom doit contenir au moins 3 caractères",
              },
            }}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Nom Prestation :</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Consultation ..." {...field} />
                </FormControl>
                <FormDescription>Ex: Consultation Pédiatrique</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Champ caché pour idUser */}
          <FormField
            control={form.control}
            name="idUser"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} type="hidden" />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="relative -top-7">
            {form.formState.isSubmitting
              ? isUpdating
                ? "Modifier"
                : "Ajouter..."
              : "Ajouter"}
          </Button>
        </form>
      </Form>

      {/* Tableau des prestations */}
      <Table className="bg-gray-50 opacity-90 p-4 rounded-sm">
        <TableHeader>
          <TableRow>
            <TableCell>N°</TableCell>
            <TableCell>Nom Prestation</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listePrestation.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{item.nomPrestation.toUpperCase()}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Pencil
                    size={16}
                    onClick={() => handleUpdatePrestation(item.id)}
                    className="text-blue-600 cursor-pointer hover:scale-125 transition-transform"
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Trash2 className="text-red-600 cursor-pointer hover:scale-125 transition-transform" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Supprimer cette prestation ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Voulez-vous vraiment
                          supprimer cette prestation ?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 text-white"
                          onClick={() => handleDelete(item.id)}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
