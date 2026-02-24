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
  Echographie,
  RegionExaminee,
  TypeEchographie,
  TableName,
} from "@prisma/client";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  ScanLine,
  Loader2,
} from "lucide-react";
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
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const typeEchographieLabels: Record<TypeEchographie, string> = {
  OBST: "Obstétrique",
  GYN: "Gynécologie",
  INF: "Infertilité",
  MDG: "Médecine Générale",
  CAR: "Cardiologie",
};

const typeEchographieColors: Record<TypeEchographie, string> = {
  OBST: "bg-pink-100 text-pink-800 border-pink-200",
  GYN: "bg-purple-100 text-purple-800 border-purple-200",
  INF: "bg-blue-100 text-blue-800 border-blue-200",
  MDG: "bg-green-100 text-green-800 border-green-200",
  CAR: "bg-red-100 text-red-800 border-red-200",
};

const regionLabels: Record<string, string> = {
  ABDOMEN: "Abdomen",
  PELVIS_BASSIN: "Pelvis / Bassin",
  GYNECOLOGIE_OBSTETRIQUE: "Gynéco-Obstétrique",
  SEINS: "Seins",
  COU: "Cou",
  MUSCLES_ET_ARTICULATIONS: "Muscles & Articulations",
  TESTICULES: "Testicules",
  PROSTATE: "Prostate",
  COEUR: "Cœur",
  PELVIENNE_ABDOMINALE: "Pelvienne / Abdominale",
  LOMBES_PELVIENNE: "Lombes / Pelvienne",
  ZONE_LOCALISEE: "Zone localisée",
  BOURSES: "Bourses",
  HANCHES: "Hanches",
  MEMBRES_COU: "Membres / Cou",
  THORAX: "Thorax",
  OESOPHAGE: "Œsophage",
};

export default function EchographiePage() {
  const [listeEchographies, setListeEchographies] = useState<Echographie[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const router = useRouter();
  const { canCreate, canUpdate, canDelete, canRead, isLoading: isLoadingPermissions } = usePermissionContext();

  const form = useForm<Echographie>({
    defaultValues: {
      id: "",
      nomEchographie: "",
      organeExaminee: "",
      idUser: idUser || "",
    },
  });

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

  // Compteurs par type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: listeEchographies.length };
    for (const e of listeEchographies) {
      counts[e.typeEchographie] = (counts[e.typeEchographie] || 0) + 1;
    }
    return counts;
  }, [listeEchographies]);

  // Filtrage
  const filteredEchographies = useMemo(() => {
    return listeEchographies.filter((e) => {
      const matchType = filterType === "ALL" || e.typeEchographie === filterType;
      const matchSearch =
        !searchTerm ||
        e.nomEchographie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.organeExaminee ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        regionLabels[e.regionExaminee]?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [listeEchographies, filterType, searchTerm]);

  const onSubmit = async (data: Echographie) => {
    const formattedData = {
      typeEchographie: data.typeEchographie,
      regionExaminee: data.regionExaminee,
      nomEchographie: data.nomEchographie,
      organeExaminee: data.organeExaminee,
      idUser: idUser,
    };
    try {
      if (isUpdating) {
        await updateEchographie(data.id, { id: data.id, ...formattedData });
        toast.success("Échographie mise à jour avec succès !");
        setIsUpdating(false);
      } else {
        if (!canCreate(TableName.ECHOGRAPHIE)) {
          toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
          return;
        }
        const id = crypto.randomUUID();
        await createEchographie({ id, ...formattedData });
        toast.success("Échographie créée avec succès !");
      }
      const updatedList = await getAllEchographies();
      setListeEchographies(updatedList);
      form.reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'opération.");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete(TableName.ECHOGRAPHIE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    try {
      if (confirm("Êtes-vous sûr de vouloir supprimer cette échographie ?")) {
        await deleteEchographie(id);
        setListeEchographies(listeEchographies.filter((e) => e.id !== id));
        toast.success("Échographie supprimée avec succès !");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
      console.error(error);
    }
  };

  const handleUpdateEchographie = (id: string) => {
    if (!canUpdate(TableName.ECHOGRAPHIE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_UPDATE);
      return;
    }
    const echo = listeEchographies.find((e) => e.id === id);
    if (echo) {
      setIsUpdating(true);
      form.setValue("id", echo.id);
      form.setValue("typeEchographie", echo.typeEchographie);
      form.setValue("nomEchographie", echo.nomEchographie);
      form.setValue("regionExaminee", echo.regionExaminee);
      form.setValue("organeExaminee", echo.organeExaminee);
      setIsVisible(true);
    }
  };

  const handleCancelForm = () => {
    form.reset();
    setIsUpdating(false);
    setIsVisible(false);
  };

  const handleOpenForm = () => {
    if (!canCreate(TableName.ECHOGRAPHIE)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_CREATE);
      return;
    }
    form.reset();
    setIsUpdating(false);
    setIsVisible(true);
  };

  if (isLoadingPermissions) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!canRead(TableName.ECHOGRAPHIE)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  return (
    <div className="space-y-4 max-w-6xl mx-auto p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ScanLine className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Échographies</h1>
            <p className="text-sm text-gray-500">
              {listeEchographies.length} échographie{listeEchographies.length > 1 ? "s" : ""} enregistrée{listeEchographies.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {!isVisible && (
          <Button onClick={handleOpenForm} className="gap-2">
            <Plus size={16} />
            Nouvelle échographie
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
            <Card className="border-indigo-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {isUpdating ? "Modifier l'échographie" : "Nouvelle échographie"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="typeEchographie"
                        rules={{ required: "La spécialité est obligatoire" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Spécialité</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choisir une spécialité" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(TypeEchographie).map(([, value]) => (
                                  <SelectItem key={value} value={value}>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${typeEchographieColors[value as TypeEchographie]}`}>
                                      {value}
                                    </span>
                                    {typeEchographieLabels[value as TypeEchographie]}
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
                        name="regionExaminee"
                        rules={{ required: "La région est obligatoire" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Région examinée</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choisir une région" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(RegionExaminee).map(([key, value]) => (
                                  <SelectItem key={value} value={value}>
                                    {regionLabels[key] || key.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nomEchographie"
                        rules={{ required: "Le nom est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Nom de l&apos;échographie</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Échographie abdominale"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            {fieldState.error && (
                              <FormMessage>{fieldState.error.message}</FormMessage>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organeExaminee"
                        rules={{ required: "L'organe examiné est obligatoire" }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Organes examinés</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Ex: Foie, vésicule biliaire, pancréas"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                className="resize-none h-9.5"
                              />
                            </FormControl>
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
        {/* Barre de recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une échographie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Filtre par type */}
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
          {Object.entries(TypeEchographie).map(([, value]) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterType === value
                  ? typeEchographieColors[value as TypeEchographie]
                      .replace("bg-", "bg-")
                      .replace("100", "200") + " ring-1 ring-offset-1"
                  : typeEchographieColors[value as TypeEchographie]
              } hover:opacity-80`}
            >
              {value} ({typeCounts[value] || 0})
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
              <TableHead className="font-semibold">Région</TableHead>
              <TableHead className="font-semibold">Nom de l&apos;échographie</TableHead>
              <TableHead className="font-semibold">Organes examinés</TableHead>
              <TableHead className="w-24 text-center font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`skel-${idx}`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableCell key={i}>
                      <Skeleton className="h-5 w-full bg-gray-200" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredEchographies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  <ScanLine className="mx-auto h-10 w-10 mb-2 opacity-30" />
                  {searchTerm || filterType !== "ALL"
                    ? "Aucune échographie ne correspond aux filtres."
                    : "Aucune échographie enregistrée."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEchographies.map((echo, index) => (
                <TableRow
                  key={echo.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <TableCell className="text-center text-gray-400 text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold ${typeEchographieColors[echo.typeEchographie]}`}
                    >
                      {typeEchographieLabels[echo.typeEchographie]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {regionLabels[echo.regionExaminee] || echo.regionExaminee.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="font-medium text-sm max-w-60 whitespace-normal">
                    {echo.nomEchographie}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-60 whitespace-normal">
                    {echo.organeExaminee ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleUpdateEchographie(echo.id)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(echo.id)}
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
        {!isLoading && filteredEchographies.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50/50 text-xs text-gray-400 text-right">
            {filteredEchographies.length} résultat{filteredEchographies.length > 1 ? "s" : ""}
            {(searchTerm || filterType !== "ALL") && ` sur ${listeEchographies.length}`}
          </div>
        )}
      </Card>
    </div>
  );
}
