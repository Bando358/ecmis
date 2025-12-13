"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  Echographie,
  Permission,
  RegionExaminee,
  TableName,
} from "@/lib/generated/prisma";
import { Eye, EyeClosed, Pencil, Trash2 } from "lucide-react";

import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createEchographie,
  deleteEchographie,
  getAllEchographies,
  updateEchographie,
} from "@/lib/actions/echographieActions";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export default function EchographiePage() {
  const [listeEchographies, setListeEchographies] = useState<Echographie[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();
  const form = useForm<Echographie>({
    defaultValues: {
      id: "",
      nomEchographie: "",
      organeExaminee: "",
      idUser: idUser || "",
    },
  });

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find((p) => p.table === TableName.ECHOGRAPHIE);
        setPermission(perm || null);

        // if (perm?.canRead || session.user.role === "ADMIN") {
        // } else {
        //   alert("Vous n'avez pas la permission d'accéder à cette page.");
        //   router.back();
        // }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des permissions :",
          error
        );
      }
    };

    fetchPermissions();
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const echographies = await getAllEchographies();
      setListeEchographies(echographies);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    form.setValue("idUser", idUser);
  }, [idUser, form]);

  const onSubmit = async (data: Echographie) => {
    const formattedData = {
      regionExaminee: data.regionExaminee,
      nomEchographie: data.nomEchographie,
      organeExaminee: data.organeExaminee,
      idUser: idUser,
    };
    try {
      if (isUpdating) {
        await updateEchographie(data.id, { id: data.id, ...formattedData }); // Appel de la fonction de mise à jour avec l'ID de la prestation
        toast.success("Echographie mise à jour avec succès! 🎉");
        form.setValue("nomEchographie", "");
        setIsUpdating(false);
      } else {
        if (!permission?.canCreate && session?.user.role !== "ADMIN") {
          alert(
            "Vous n'avez pas la permission de créer une Echographie. Contactez un administrateur."
          );
          return router.back();
        } else {
          const id = crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2);
          await createEchographie({ id, ...formattedData }); // Appel de la fonction de création si on est en mode ajout
          toast.success("Echographie créée avec succès! 🎉");
          handleHiddenForm();
        }
      }
      const updatedList = await getAllEchographies();
      setListeEchographies(updatedList);
      //form.reset(); // Réinitialisation du formulaire après soumission
      form.setValue("nomEchographie", "");
      form.reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'opération.");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de supprimer une Echographie. Contactez un administrateur."
      );
      return;
    } else {
      try {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette échographie ?")) {
          await deleteEchographie(id);
          setListeEchographies(
            listeEchographies.filter((liste) => liste.id !== id)
          );
          toast.success("Une Echographie a été Supprimée avec succès! 🎉");
        }
      } catch (error) {
        toast.error("Erreur lors de la suppression de l'Echographie");
        console.error(error);
      }
    }
  };

  const handleUpdateEchographie = async (id: string) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de mettre à jour une Echographie. Contactez un administrateur."
      );
      return;
    } else {
      const echographieToUpdate = listeEchographies.find(
        (liste) => liste.id === id
      );
      if (echographieToUpdate) {
        setIsUpdating(true); // Activer le mode modification
        form.setValue("id", echographieToUpdate.id); // Pré-remplir le champ caché pour l'ID
        form.setValue("nomEchographie", echographieToUpdate.nomEchographie); // Pré-remplir le champ de nom de prestation
        form.setValue("regionExaminee", echographieToUpdate.regionExaminee); // Pré-remplir le champ de région examinée
        form.setValue("organeExaminee", echographieToUpdate.organeExaminee); // Pré-remplir le champ d'organe examiné
      }
      setIsVisible(true);
    }
  };

  const handleHiddenForm = () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission d'ouvrir le formulaire d'échographie. Contactez un administrateur."
      );
      return;
    } else {
      if (!isVisible) {
        setIsVisible(true);
        // rafraichirPage();
      } else {
        setIsVisible(false);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-[900px] mx-auto p-4 relative">
      {/* className="space-y-4 max-w-[900px] mx-auto relative flex flex-col justify-center p-4 border rounded-md" */}
      <Button
        variant={"ghost"}
        onClick={handleHiddenForm}
        className="absolute top-2 z-10 mb-4"
      >
        {isVisible ? (
          <Eye className="text-blue-600" />
        ) : (
          <EyeClosed className="text-red-600" />
        )}
      </Button>
      {isVisible && (
        <AnimatePresence initial={isVisible} mode="wait">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 max-w-md rounded-sm mx-auto px-4 py-2 bg-white shadow-md"
              >
                <FormField
                  control={form.control}
                  name="regionExaminee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        {"Région examinée"} :
                      </FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Type à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(RegionExaminee).map(
                            ([key, value], index) => (
                              <SelectItem
                                key={index}
                                value={value}
                                className="text-blue-600"
                              >
                                {key.replace(/_/g, " ").toUpperCase()}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomEchographie"
                    rules={{
                      required: "Le nom de la prestation est obligatoire",
                    }}
                    render={({ field, fieldState }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Nom Echographie :</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="abdominale ..."
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            // className="capitalize"
                          />
                        </FormControl>
                        {/* <FormDescription>Ex: Goutte Epaisse</FormDescription> */}
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organeExaminee"
                    rules={{
                      required: "L'organe examiné est obligatoire",
                    }}
                    render={({ field, fieldState }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Organes Examinés :</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Foie, vésicule biliaire, pancréas ..."
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            // className="capitalize"
                          />
                        </FormControl>
                        {/* <FormDescription>Ex: Goutte Epaisse</FormDescription> */}
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="idUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} value={idUser} className="hidden" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="mx-auto block">
                  {form.formState.isSubmitting ? "Modifier" : "Ajouter"}
                </Button>
              </form>
            </Form>
          </motion.div>
        </AnimatePresence>
      )}
      <AnimatePresence initial={true} mode="wait">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-center">
            Liste des Échographies
          </h2>
          {/* Tableau des échographies */}
          <Table className="bg-gray-50 opacity-90 p-4 rounded-sm cursor-pointer">
            <TableHeader>
              <TableRow>
                <TableCell className="text-center">N°</TableCell>
                <TableCell>Région échographique</TableCell>
                <TableCell>Nom Echographie</TableCell>
                <TableCell>Organes Examinés</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow
                      key={`loading-${idx}`}
                      className="animate-pulse max-w-[800px]"
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableCell key={i}>
                          <Skeleton className="h-6 w-20 bg-gray-300" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : listeEchographies.map((liste, index) => (
                    <TableRow key={liste.id} className="hover:bg-gray-100">
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>{liste.regionExaminee}</TableCell>
                      <TableCell className="max-w-[200px] whitespace-normal">
                        Échographie {liste.nomEchographie.toWellFormed()}
                      </TableCell>
                      <TableCell className="max-w-[200px] whitespace-normal">
                        {liste.organeExaminee?.toWellFormed() ?? "—"}
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            onClick={() => handleUpdateEchographie(liste.id)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(liste.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
