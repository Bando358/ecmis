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
  Examen,
  Permission,
  TableName,
  TypeExamen,
  User,
} from "@prisma/client";
import { Eye, EyeClosed, Pencil, Trash2 } from "lucide-react";
import {
  createExamen,
  deleteExamen,
  getAllExamen,
  updateExamen,
} from "@/lib/actions/examenActions";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneUser } from "@/lib/actions/authActions";

const tabUnite = [
  { value: "neg/pos", label: "Négatif/Positif" },
  { value: "definir", label: "à définir" },
  { value: "p/µl", label: "p/µl" },
  { value: "g/l", label: "g/l" },
  { value: "mg/l", label: "mg/l" },
  { value: "UI/I", label: "UI/I" },
  { value: "UI/ml", label: "UI/ml" },
  { value: "mmol/l", label: "mmol/l" },
  { value: "10³/µl", label: "10³/µl" },
  { value: "10⁶/µl", label: "10⁶/µl" },
  { value: "%", label: "%" },
  { value: "g/dl", label: "g/dl" },
  { value: "fl", label: "fl" },
  { value: "pg", label: "pg" },
];
export default function ExamenPage() {
  const [listeExamens, setListeExamens] = useState<Examen[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [oneUser, setOneUser] = useState<User | null>(null);

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetUser();
  }, [idUser]);
  const form = useForm<Examen>({
    defaultValues: {
      id: "",
      nomExamen: "",
      abreviation: "",
      // typeExamen: undefined,
      valeurUsuelleMinF: 0,
      valeurUsuelleMaxF: 0,
      valeurUsuelleMinH: 0,
      valeurUsuelleMaxH: 0,
      uniteMesureExamen: "",
      idUser: idUser || "",
      // ajoutez ici les autres champs si besoin
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const examens = await getAllExamen();
      setListeExamens(examens);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    form.setValue("idUser", idUser);
  }, [idUser, form]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.EXAMEN
        );
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
  }, [oneUser, router]);

  const onSubmit = async (data: Examen) => {
    const formattedData = {
      typeExamen: data.typeExamen,
      nomExamen: data.nomExamen,
      uniteMesureExamen: data.uniteMesureExamen,
      valeurUsuelleMinH:
        typeof data.valeurUsuelleMinH === "string"
          ? parseFloat(data.valeurUsuelleMinH)
          : data.valeurUsuelleMinH,
      valeurUsuelleMaxH:
        typeof data.valeurUsuelleMaxH === "string"
          ? parseFloat(data.valeurUsuelleMaxH)
          : data.valeurUsuelleMaxH,
      valeurUsuelleMinF:
        typeof data.valeurUsuelleMinF === "string"
          ? parseFloat(data.valeurUsuelleMinF)
          : data.valeurUsuelleMinF,
      valeurUsuelleMaxF:
        typeof data.valeurUsuelleMaxF === "string"
          ? parseFloat(data.valeurUsuelleMaxF)
          : data.valeurUsuelleMaxF,
      abreviation: data.abreviation,
      idUser: idUser,
    };
    try {
      if (isUpdating) {
        await updateExamen(data.id, { id: data.id, ...formattedData }); // Appel de la fonction de mise à jour avec l'ID de la prestation
        toast.success("Examen mise à jour avec succès! 🎉");
        form.setValue("nomExamen", "");
        setIsUpdating(false);
      } else {
        const id = crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
        await createExamen({ id, ...formattedData }); // Appel de la fonction de création si on est en mode ajout
        toast.success("Examen créé avec succès! 🎉");
        handleHiddenForm();
      }
      const updatedList = await getAllExamen();
      setListeExamens(updatedList);
      //form.reset(); // Réinitialisation du formulaire après soumission
      form.setValue("nomExamen", "");
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
        "Vous n'avez pas la permission de supprimer un examen. Contactez un administrateur."
      );
      return;
    } else {
      try {
        await deleteExamen(id);
        setListeExamens(listeExamens.filter((liste) => liste.id !== id));
        toast.success("Un Examen a été Supprimé avec succès! 🎉");
      } catch (error) {
        toast.error("Erreur lors de la suppression de l'Examen");
        console.error(error);
      }
    }
  };

  const handleUpdateExamen = async (id: string) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de mettre à jour un Examen. Contactez un administrateur."
      );
      return;
    } else {
      const examenToUpdate = listeExamens.find((liste) => liste.id === id);
      if (examenToUpdate) {
        setIsUpdating(true); // Activer le mode modification
        form.setValue("id", examenToUpdate.id); // Pré-remplir le champ caché pour l'ID
        form.setValue("nomExamen", examenToUpdate.nomExamen); // Pré-remplir le champ de nom de prestation
        form.setValue("abreviation", examenToUpdate.abreviation); // Pré-remplir le champ de nom de prestation
        form.setValue("valeurUsuelleMinH", examenToUpdate.valeurUsuelleMinH); // Pré-remplir le champ de nom de prestation
        form.setValue("valeurUsuelleMaxH", examenToUpdate.valeurUsuelleMaxH); // Pré-remplir le champ de nom de prestation
        form.setValue("valeurUsuelleMinF", examenToUpdate.valeurUsuelleMinF); // Pré-remplir le champ de nom de prestation
        form.setValue("valeurUsuelleMaxF", examenToUpdate.valeurUsuelleMaxF); // Pré-remplir le champ de nom de prestation
        form.setValue("typeExamen", examenToUpdate.typeExamen); // Pré-remplir le champ de nom de prestation
        // D'autres champs à pré-remplir si nécessaire
      }
      setIsVisible(true);
    }
  };

  const handleHiddenForm = () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert(
        "Vous n'avez pas la permission de créer un examen. Contactez un administrateur."
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
    <div className="space-y-4 max-w-225 mx-auto p-4 relative">
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
                  name="typeExamen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        {"Type d'examen"} :
                      </FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Type à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TypeExamen).map(
                            ([key, value], index) => (
                              <SelectItem
                                key={index}
                                value={value}
                                className="text-blue-600"
                              >
                                {key.charAt(0) + key.slice(1).toLowerCase()}
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
                    name="nomExamen"
                    rules={{
                      required: "Le nom de la prestation est obligatoire",
                    }}
                    render={({ field, fieldState }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Nom Examen :</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Goutte Epaisse ..."
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
                    name="abreviation"
                    rules={{
                      required: "Le nom de la prestation est obligatoire",
                    }}
                    render={({ field, fieldState }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Sigle :</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: GE ..."
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            className="uppercase"
                          />
                        </FormControl>
                        {/* <FormDescription>Ex: Goutte Epaisse</FormDescription> */}
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                  <Label className="col-span-2 mx-auto -mb-2 text-gray-600">
                    Femmes
                  </Label>
                  <FormField
                    control={form.control}
                    name="valeurUsuelleMinF"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur Usuelle Min (F)</FormLabel>
                        <FormControl>
                          <Input
                            required
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valeurUsuelleMaxF"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur Usuelle Max (F)</FormLabel>
                        <FormControl>
                          <Input
                            required
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Label className="col-span-2 mx-auto -mb-2 text-gray-600">
                    Hommes
                  </Label>
                  <FormField
                    control={form.control}
                    name="valeurUsuelleMinH"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur Usuelle Min (H)</FormLabel>
                        <FormControl>
                          <Input
                            required
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valeurUsuelleMaxH"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur Usuelle Max (H)</FormLabel>
                        <FormControl>
                          <Input
                            required
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="uniteMesureExamen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Unité de mesure :
                      </FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Type à sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tabUnite.map((option, index) => (
                            <SelectItem
                              key={index}
                              value={option.value ?? ""}
                              className="text-blue-600"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          <h2 className="text-2xl font-bold text-center">Liste des Examens</h2>
          {/* Tableau des examens */}
          <Table className="bg-gray-50 opacity-90 p-4 rounded-sm cursor-pointer">
            <TableHeader>
              <TableRow>
                <TableCell className="text-center">N°</TableCell>
                <TableCell>Type Examens</TableCell>
                <TableCell>Examens</TableCell>
                <TableCell>Sigle</TableCell>
                <TableCell>Unité</TableCell>
                <TableCell>Valeur H</TableCell>
                <TableCell>Valeur F</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow
                      key={`loading-${idx}`}
                      className="animate-pulse max-w-200"
                    >
                      {Array.from({ length: 10 }).map((_, i) => (
                        <TableCell key={i}>
                          <Skeleton className="h-6 w-20 bg-gray-300" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : listeExamens.map((liste, index) => (
                    <TableRow key={liste.id} className="hover:bg-gray-100">
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>{liste.typeExamen}</TableCell>
                      <TableCell>{liste.nomExamen.toWellFormed()}</TableCell>
                      <TableCell>{liste.abreviation.toUpperCase()}</TableCell>
                      <TableCell>{liste.uniteMesureExamen}</TableCell>
                      <TableCell>
                        {liste.valeurUsuelleMinH} - {liste.valeurUsuelleMaxH}
                      </TableCell>
                      <TableCell>
                        {liste.valeurUsuelleMinF} - {liste.valeurUsuelleMaxF}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            onClick={() => handleUpdateExamen(liste.id)}
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
