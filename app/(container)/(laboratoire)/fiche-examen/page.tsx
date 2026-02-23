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
  TableHead,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import {
  Examen,
  Permission,
  TableName,
  TypeExamen,
  User,
} from "@prisma/client";
import { Plus, X, Pencil, Trash2, Search, FlaskConical } from "lucide-react";
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
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { getOneUser } from "@/lib/actions/authActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const typeExamenLabels: Record<TypeExamen, string> = {
  MEDECIN: "Médecine",
  GYNECOLOGIE: "Gynécologie",
  OBSTETRIQUE: "Obstétrique",
  VIH: "VIH",
  IST: "IST",
};

const typeExamenColors: Record<TypeExamen, string> = {
  MEDECIN: "bg-green-100 text-green-800 border-green-200",
  GYNECOLOGIE: "bg-purple-100 text-purple-800 border-purple-200",
  OBSTETRIQUE: "bg-pink-100 text-pink-800 border-pink-200",
  VIH: "bg-red-100 text-red-800 border-red-200",
  IST: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function ExamenPage() {
  const [listeExamens, setListeExamens] = useState<Examen[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

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
      valeurUsuelleMinF: 0,
      valeurUsuelleMaxF: 0,
      valeurUsuelleMinH: 0,
      valeurUsuelleMaxH: 0,
      uniteMesureExamen: "",
      idUser: idUser || "",
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
    if (!oneUser) return;
    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.EXAMEN
        );
        setPermission(perm || null);
      } catch (error) {
        console.error("Erreur lors de la vérification des permissions :", error);
      }
    };
    fetchPermissions();
  }, [oneUser, router]);

  // Compteurs par type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: listeExamens.length };
    for (const e of listeExamens) {
      counts[e.typeExamen] = (counts[e.typeExamen] || 0) + 1;
    }
    return counts;
  }, [listeExamens]);

  // Filtrage
  const filteredExamens = useMemo(() => {
    return listeExamens.filter((e) => {
      const matchType = filterType === "ALL" || e.typeExamen === filterType;
      const matchSearch =
        !searchTerm ||
        e.nomExamen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.abreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.uniteMesureExamen ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [listeExamens, filterType, searchTerm]);

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
        await updateExamen(data.id, { id: data.id, ...formattedData });
        toast.success("Examen mis à jour avec succès !");
        setIsUpdating(false);
      } else {
        if (!permission?.canCreate && session?.user.role !== "ADMIN") {
          alert("Vous n'avez pas la permission de créer un examen.");
          return router.back();
        }
        const id = crypto.randomUUID();
        await createExamen({ id, ...formattedData });
        toast.success("Examen créé avec succès !");
      }
      const updatedList = await getAllExamen();
      setListeExamens(updatedList);
      form.reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'opération.");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!permission?.canDelete && session?.user.role !== "ADMIN") {
      alert("Vous n'avez pas la permission de supprimer un examen.");
      return;
    }
    try {
      if (confirm("Êtes-vous sûr de vouloir supprimer cet examen ?")) {
        await deleteExamen(id);
        setListeExamens(listeExamens.filter((e) => e.id !== id));
        toast.success("Examen supprimé avec succès !");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
      console.error(error);
    }
  };

  const handleUpdateExamen = (id: string) => {
    if (!permission?.canUpdate && session?.user.role !== "ADMIN") {
      alert("Vous n'avez pas la permission de modifier un examen.");
      return;
    }
    const exam = listeExamens.find((e) => e.id === id);
    if (exam) {
      setIsUpdating(true);
      form.setValue("id", exam.id);
      form.setValue("typeExamen", exam.typeExamen);
      form.setValue("nomExamen", exam.nomExamen);
      form.setValue("abreviation", exam.abreviation);
      form.setValue("uniteMesureExamen", exam.uniteMesureExamen);
      form.setValue("valeurUsuelleMinH", exam.valeurUsuelleMinH);
      form.setValue("valeurUsuelleMaxH", exam.valeurUsuelleMaxH);
      form.setValue("valeurUsuelleMinF", exam.valeurUsuelleMinF);
      form.setValue("valeurUsuelleMaxF", exam.valeurUsuelleMaxF);
      setIsVisible(true);
    }
  };

  const handleCancelForm = () => {
    form.reset();
    setIsUpdating(false);
    setIsVisible(false);
  };

  const handleOpenForm = () => {
    if (!permission?.canCreate && session?.user.role !== "ADMIN") {
      alert("Vous n'avez pas la permission d'ajouter un examen.");
      return;
    }
    form.reset();
    setIsUpdating(false);
    setIsVisible(true);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <FlaskConical className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Examens</h1>
            <p className="text-sm text-gray-500">
              {listeExamens.length} examen{listeExamens.length > 1 ? "s" : ""} enregistré{listeExamens.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {!isVisible && (
          <Button onClick={handleOpenForm} className="gap-2">
            <Plus size={16} />
            Nouvel examen
          </Button>
        )}
      </div>

      {/* Formulaire */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-emerald-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {isUpdating ? "Modifier l'examen" : "Nouvel examen"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Ligne 1 : Type + Nom + Sigle */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="typeExamen"
                        rules={{ required: "Le type est obligatoire" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Type d&apos;examen</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choisir un type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(TypeExamen).map(([, value]) => (
                                  <SelectItem key={value} value={value}>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${typeExamenColors[value as TypeExamen]}`}>
                                      {(value as string).slice(0, 3)}
                                    </span>
                                    {typeExamenLabels[value as TypeExamen]}
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
                        name="nomExamen"
                        rules={{ required: "Le nom est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Nom de l&apos;examen</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Goutte Épaisse"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="abreviation"
                        rules={{ required: "Le sigle est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Sigle</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: GE"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                className="uppercase"
                              />
                            </FormControl>
                            {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Ligne 2 : Unité de mesure */}
                    <FormField
                      control={form.control}
                      name="uniteMesureExamen"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">Unité de mesure</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger className="max-w-xs">
                                <SelectValue placeholder="Choisir une unité" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tabUnite.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Ligne 3 : Valeurs usuelles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-blue-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Valeurs Hommes
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="valeurUsuelleMinH"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-500">Min</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="valeurUsuelleMaxH"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-500">Max</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-pink-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-pink-500" />
                          Valeurs Femmes
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="valeurUsuelleMinF"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-500">Min</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="valeurUsuelleMaxF"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-500">Max</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} value={field.value ?? ""} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="idUser"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} value={idUser} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={handleCancelForm}>
                        <X size={16} className="mr-1" />
                        Annuler
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting
                          ? "En cours..."
                          : isUpdating
                            ? "Mettre à jour"
                            : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterType === "ALL"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tous ({typeCounts.ALL || 0})
          </button>
          {Object.entries(TypeExamen).map(([, value]) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterType === value
                  ? typeExamenColors[value as TypeExamen]
                      .replace("100", "200") + " ring-1 ring-offset-1"
                  : typeExamenColors[value as TypeExamen]
              } hover:opacity-80`}
            >
              {typeExamenLabels[value as TypeExamen]} ({typeCounts[value] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="w-12 text-center font-semibold">N°</TableHead>
              <TableHead className="w-28 font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Examen</TableHead>
              <TableHead className="w-20 font-semibold">Sigle</TableHead>
              <TableHead className="w-20 font-semibold">Unité</TableHead>
              <TableHead className="font-semibold text-center">
                <span className="text-blue-600">Valeurs H</span>
              </TableHead>
              <TableHead className="font-semibold text-center">
                <span className="text-pink-600">Valeurs F</span>
              </TableHead>
              <TableHead className="w-24 text-center font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`skel-${idx}`}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableCell key={i}>
                      <Skeleton className="h-5 w-full bg-gray-200" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredExamens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <FlaskConical className="mx-auto h-10 w-10 mb-2 opacity-30" />
                  {searchTerm || filterType !== "ALL"
                    ? "Aucun examen ne correspond aux filtres."
                    : "Aucun examen enregistré."}
                </TableCell>
              </TableRow>
            ) : (
              filteredExamens.map((exam, index) => (
                <TableRow
                  key={exam.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <TableCell className="text-center text-gray-400 text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold ${typeExamenColors[exam.typeExamen]}`}
                    >
                      {typeExamenLabels[exam.typeExamen]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {exam.nomExamen}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 font-mono uppercase">
                    {exam.abreviation}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {exam.uniteMesureExamen || "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                      {exam.valeurUsuelleMinH ?? 0} – {exam.valeurUsuelleMaxH ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="text-pink-700 bg-pink-50 px-2 py-0.5 rounded text-xs">
                      {exam.valeurUsuelleMinF ?? 0} – {exam.valeurUsuelleMaxF ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleUpdateExamen(exam.id)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(exam.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && filteredExamens.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50/50 text-xs text-gray-400 text-right">
            {filteredExamens.length} résultat{filteredExamens.length > 1 ? "s" : ""}
            {(searchTerm || filterType !== "ALL") && ` sur ${listeExamens.length}`}
          </div>
        )}
      </Card>
    </div>
  );
}
