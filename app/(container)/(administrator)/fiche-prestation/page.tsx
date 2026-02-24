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
  TableHead,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useMemo } from "react";
import { Prestation, TableName } from "@prisma/client";
import {
  createPrestation,
  deletePrestation,
  getAllPrestation,
  updatePrestation,
} from "@/lib/actions/prestationActions";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Search,
  ArrowLeft,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { TableSkeleton } from "@/components/ui/loading";

export default function PrestationPage() {
  const [listePrestation, setListePrestation] = useState<Prestation[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user?.id ?? "";
  const { canRead, canCreate: canCreatePerm, canUpdate: canUpdatePerm, canDelete: canDeletePerm, isLoading: isLoadingPermissions } = usePermissionContext();

  const form = useForm<Prestation>({
    defaultValues: {
      nomPrestation: "",
      idUser: "",
    },
  });

  const filteredPrestations = useMemo(() => {
    return listePrestation.filter((p) =>
      p.nomPrestation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [listePrestation, searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      const prestation = await getAllPrestation();
      setListePrestation(prestation);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (idUser) {
      form.setValue("idUser", idUser);
    }
  }, [idUser, form]);

  if (isLoadingPermissions) return <TableSkeleton rows={5} columns={3} />;
  if (!canRead(TableName.PRESTATION)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  const onSubmit = async (data: Prestation) => {
    if (!canCreatePerm(TableName.PRESTATION)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    const formattedData = {
      ...data,
      idUser: form.watch("idUser"),
    };
    try {
      if (isUpdating) {
        await updatePrestation(data.id, formattedData);
        toast.success("Prestation mise à jour avec succès !");
        setIsUpdating(false);
      } else {
        await createPrestation(formattedData);
        toast.success("Prestation créée avec succès !");
      }

      const updatedList = await getAllPrestation();
      setListePrestation(updatedList);
      form.setValue("nomPrestation", "");
      setShowForm(false);
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'opération.");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeletePerm(TableName.PRESTATION)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      await deletePrestation(id);
      setListePrestation((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prestation supprimée avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
      console.error(error);
    }
  };

  const handleUpdatePrestation = (id: string) => {
    if (!canUpdatePerm(TableName.PRESTATION)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
    const prestation = listePrestation.find((p) => p.id === id);
    if (prestation) {
      setIsUpdating(true);
      setShowForm(true);
      form.setValue("id", prestation.id ?? "");
      form.setValue("nomPrestation", prestation.nomPrestation ?? "");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsUpdating(false);
    form.setValue("nomPrestation", "");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/administrator")}
            className="rounded-xl hover:bg-teal-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-teal-100">
              <Stethoscope className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Prestations</h1>
              <p className="text-sm text-muted-foreground">
                {listePrestation.length} prestation{listePrestation.length > 1 ? "s" : ""} enregistrée{listePrestation.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle prestation
          </Button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card className="border-teal-200/50 shadow-lg shadow-teal-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-white pb-4">
            <CardTitle className="text-base font-semibold text-teal-900">
              {isUpdating ? "Modifier la prestation" : "Nouvelle prestation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Nom de la prestation</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Consultation Pédiatrique"
                          className="h-10 border-gray-200 focus:border-teal-400 focus:ring-teal-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={handleCancel} className="text-gray-600">
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200 px-6"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting
                      ? "Enregistrement..."
                      : isUpdating ? "Mettre à jour" : "Créer la prestation"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Recherche + Table */}
      <Card className="shadow-sm overflow-hidden">
        {/* Barre de recherche intégrée */}
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une prestation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-9 bg-white border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="w-16 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">N°</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Nom de la prestation</TableHead>
                <TableHead className="w-24 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrestations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ClipboardList className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">
                        {searchTerm ? "Aucune prestation trouvée" : "Aucune prestation enregistrée"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrestations.map((item, index) => (
                  <TableRow key={item.id} className="group hover:bg-teal-50/30 transition-colors">
                    <TableCell className="text-center text-gray-400 font-mono text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">
                      {item.nomPrestation}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-teal-100 hover:text-teal-700"
                          onClick={() => handleUpdatePrestation(item.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette prestation ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Voulez-vous vraiment supprimer la prestation &quot;{item.nomPrestation}&quot; ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 text-white hover:bg-red-700"
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredPrestations.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-gray-500 text-center">
            {filteredPrestations.length} résultat{filteredPrestations.length > 1 ? "s" : ""}
            {searchTerm && ` pour "${searchTerm}"`}
          </div>
        )}
      </Card>
    </div>
  );
}
