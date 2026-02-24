"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Select from "react-select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createUser,
  getAllUser,
  getOneUser,
  toggleBanUser,
  updateUser,
} from "@/lib/actions/authActions";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Clinique,
  TableName,
  UserRole,
} from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  Pencil,
  UserLock,
  UserRoundCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  UserPlus,
  Plus,
  X,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/loading";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const signUpSchema = z.object({
  name: z.string().min(5, {
    message: "Le nom doit contenir au moins 5 caractères.",
  }),
  email: z.email("L'adresse email est invalide."),
  username: z.string().min(5, {
    message: "Le nom d'utilisateur doit contenir au moins 5 caractères.",
  }),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z]/, {
      message: "Le mot de passe doit inclure au moins une lettre.",
    })
    .regex(/[0-9]/, {
      message: "Le mot de passe doit inclure au moins un chiffre.",
    }),
  idCliniques: z.array(z.string()),
  prescripteur: z.boolean().optional(),
  role: z.string().min(3, {
    message: "Le rôle doit contenir au moins 3 caractères.",
  }),
});

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  prescripteur?: boolean;
  role: string;
  idCliniques: string[];
};

type FormData = z.infer<typeof signUpSchema>;

export default function RegisterForm() {
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [allUser, setAllUser] = useState<SafeUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<SafeUser[]>([]);
  const [oneUser, setOneUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idUserUpdate, setIdUserUpdate] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const userRoleOptions = [
    { id: 1, value: UserRole.USER, label: "USER" },
    { id: 2, value: UserRole.ADMIN, label: "ADMIN" },
  ];

  const itemsPerPageOptions = [
    { value: 8, label: "8 par page" },
    { value: 10, label: "10 par page" },
    { value: 20, label: "20 par page" },
    { value: 50, label: "50 par page" },
  ];

  const router = useRouter();
  const { canRead, canDelete, isLoading: isLoadingPermissions } = usePermissionContext();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const userRole = session?.user.role as string;

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    if (!oneUser) return;

    const fetchData = async () => {
      const resultUser = await getAllUser();
      const result = resultUser.filter((user) => user.id !== idUser);

      if (userRole === "ADMIN") {
        if (oneUser?.email === "bando358@gmail.com") {
          setAllUser(result as SafeUser[]);
          setFilteredUsers(result as SafeUser[]);
        } else {
          const filteredUsers = result.filter(
            (user: { email: string }) => user.email !== "bando358@gmail.com"
          );
          const filteredUser = filteredUsers.filter(
            (user: { email: string }) => user.email !== oneUser?.email
          );
          setAllUser(filteredUser as SafeUser[]);
          setFilteredUsers(filteredUser as SafeUser[]);
        }
        if (oneUser) {
          setAllUser((prev) => [oneUser, ...prev]);
          setFilteredUsers((prev) => [oneUser, ...prev]);
        }
      } else {
        const alluser = result.filter(
          (user: { role: string }) => user.role === "USER"
        );
        const userTableId = resultUser.find(
          (user: { id: string }) => user.id === idUser
        );
        const allUserFilter = alluser.filter(
          (user: { idCliniques: string[] }) =>
            user.idCliniques?.some((id) =>
              userTableId?.idCliniques.includes(id)
            )
        );
        const filteredUser = allUserFilter.filter(
          (user: { email: string }) => user.email !== oneUser?.email
        );
        setAllUser(filteredUser as SafeUser[]);
        setFilteredUsers(filteredUser as SafeUser[]);
      }
    };
    fetchData();
  }, [userRole, idUser, oneUser]);

  const form = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      idCliniques: [""],
      role: UserRole.USER,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const clinique = await getAllClinique();

        if (userRole === "ADMIN") {
          setCliniques(clinique);
        } else {
          const oneUser = await getOneUser(idUser);

          if (oneUser) {
            const filteredCliniques = clinique.filter((c: { id: string }) =>
              oneUser.idCliniques.includes(c.id)
            );
            setCliniques(filteredCliniques);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des cliniques:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userRole, idUser]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(allUser);
      setCurrentPage(1);
    } else {
      const filtered = allUser.filter((user) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower)
        );
      });
      setFilteredUsers(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, allUser]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (isLoadingPermissions) return <TableSkeleton rows={6} columns={7} />;
  if (!canRead(TableName.USER)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  const nomCliniques = (idClinique: string[]) => {
    if (cliniques.length > 0) {
      const clinique = cliniques.filter((p) => idClinique.includes(p.id));
      return clinique.map((c, index) => (
        <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs mr-1 mb-1">
          {c.nomClinique}
        </Badge>
      ));
    }
  };

  const handleHiddenForm = () => {
    if (isVisible) {
      setIsVisible(false);
      setIsUpdating(false);
      form.reset();
    } else {
      setIsVisible(true);
    }
  };

  const handleUpdateUser = async (id: string, position: number) => {
    setPositions(position);
    const userToUpdate = allUser.find((user) => user.id === id);
    setIdUserUpdate(id);

    if (userToUpdate) {
      setIsUpdating(true);
      form.setValue("name", userToUpdate.name);
      form.setValue("email", userToUpdate.email);
      form.setValue("username", userToUpdate.username);
      form.setValue("password", ""); // password is excluded from queries for security
      form.setValue("idCliniques", userToUpdate.idCliniques);
      form.setValue("role", userToUpdate.role);
      setIsVisible(true);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    const userToUpdate = allUser.find((user) => user.id === idUserUpdate);
    try {
      if (isUpdating) {
        const userUpdate = {
          id: idUserUpdate,
          name: data.name,
          email: data.email,
          username: data.username,
          password: data.password,
          idCliniques: data.idCliniques,
          createdAt: userToUpdate?.createdAt || new Date(),
          updatedAt: new Date(),
          prescripteur:
            typeof data.prescripteur === "boolean"
              ? data.prescripteur
              : userToUpdate?.prescripteur ?? false,
          emailVerified: false,
          image: null,
          role: (data.role as UserRole) || UserRole.USER,
          banned: null,
          banReason: null,
          banExpires: null,
        };

        await updateUser(idUserUpdate, userUpdate);
        toast.success("Compte modifié avec succès !");
        setIsUpdating(false);

        const updatedUsers = [...allUser];
        if (positions !== -1) {
          updatedUsers[positions] = { ...userUpdate };
          setAllUser(updatedUsers);
        }

        form.reset();
      } else {
        const newUser = {
          id: crypto.randomUUID(),
          name: data.name,
          email: data.email,
          username: data.username,
          password: data.password,
          idCliniques: data.idCliniques,
          createdAt: new Date(),
          updatedAt: new Date(),
          prescripteur: data.prescripteur ?? false,
          emailVerified: false,
          image: null,
          role: (data.role as UserRole) || UserRole.USER,
          banned: null,
          banReason: null,
          banExpires: null,
        };
        await createUser(newUser);
        toast.success("Compte créé avec succès !");
        const result = [...allUser, newUser];
        setAllUser(result);
        handleHiddenForm();
        if (data?.role !== "ADMIN") {
          router.push("/fiche-post");
        }
      }

      form.reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("La création/modification de compte a échoué !");
      console.error(error);
    }
  };

  const cliniqueOptions = cliniques.map((clinique) => ({
    value: clinique.id,
    label: clinique.nomClinique,
  }));

  const toggleCompteUser = async (id: string) => {
    if (!canDelete(TableName.USER)) {
      toast.error(ERROR_MESSAGES.PERMISSION_DENIED_DELETE);
      return;
    }
    await toggleBanUser(id);
    toast.success("Le statut du compte a été modifié avec succès !");
    const updatedUsers = allUser.map((user) => {
      if (user.id === id) {
        return { ...user, banned: !user.banned };
      }
      return user;
    });
    setAllUser(updatedUsers);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/administrator")}
            className="rounded-xl hover:bg-violet-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-violet-100">
              <UserPlus className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Comptes utilisateurs</h1>
              <p className="text-sm text-muted-foreground">
                {allUser.length} compte{allUser.length > 1 ? "s" : ""} enregistré{allUser.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleHiddenForm}
          className={isVisible
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
            : "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
          }
        >
          {isVisible ? (
            <><X className="h-4 w-4 mr-2" /> Fermer</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" /> Nouveau compte</>
          )}
        </Button>
      </div>

      {/* Formulaire */}
      {isVisible && (
        <Card className="border-violet-200/50 shadow-lg shadow-violet-50 overflow-hidden max-w-xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-white pb-4">
            <CardTitle className="text-base font-semibold text-violet-900">
              {isUpdating ? "Modifier le compte" : "Nouveau compte"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Cliniques</label>
                  {isLoading ? (
                    <div className="p-2 text-sm text-gray-500">Chargement des cliniques...</div>
                  ) : (
                    <Select
                      isMulti
                      options={cliniqueOptions}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      placeholder="Sélectionner une ou plusieurs cliniques"
                      onChange={(selectedOptions) => {
                        const selectedValues = selectedOptions.map((option) => option.value);
                        form.setValue("idCliniques", selectedValues);
                      }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Nom et Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" className="h-10 border-gray-200 focus:border-violet-400 focus:ring-violet-400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="exemple@gmail.com" className="h-10 border-gray-200 focus:border-violet-400 focus:ring-violet-400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Nom d&apos;utilisateur</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe33" className="h-10 border-gray-200 focus:border-violet-400 focus:ring-violet-400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Mot de passe</FormLabel>
                        <FormControl>
                          <Input placeholder="*****" type="password" className="h-10 border-gray-200 focus:border-violet-400 focus:ring-violet-400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="prescripteur"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormLabel className="text-sm font-medium text-gray-700">Prescripteur :</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {oneUser?.role === "ADMIN" && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Rôle</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                            className="flex gap-5 items-center"
                          >
                            {userRoleOptions.map((option) => (
                              <FormItem
                                key={option.id}
                                className="flex items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <RadioGroupItem value={option.value} />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={handleHiddenForm} className="text-gray-600">
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 px-6"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting
                      ? "Enregistrement..."
                      : isUpdating ? "Mettre à jour" : "Créer le compte"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Recherche + Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email, username..."
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
          <div className="w-full sm:w-44">
            <Select
              options={itemsPerPageOptions}
              value={itemsPerPageOptions.find((opt) => opt.value === itemsPerPage)}
              onChange={(option) => {
                setItemsPerPage(option?.value || 8);
                setCurrentPage(1);
              }}
              className="basic-single"
              classNamePrefix="select"
              placeholder="Par page"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Nom & Prénom</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Username</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Rôle</TableHead>
                <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Statut</TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Cliniques</TableHead>
                <TableHead className="w-24 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">
                        {searchTerm ? "Aucun utilisateur trouvé" : "Aucun utilisateur enregistré"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <TableRow key={user.id} className="group hover:bg-violet-50/30 transition-colors">
                    <TableCell className="font-medium text-gray-800">
                      {user.name.toLocaleUpperCase()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {user.username}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={user.role === "ADMIN"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={user.banned !== true
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {user.banned !== true ? "Actif" : "Banni"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap max-w-xs">
                        {nomCliniques(user.idCliniques)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateUser(user.id, index)}
                          className="h-8 w-8 rounded-lg hover:bg-violet-100 hover:text-violet-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 rounded-lg",
                                user.banned
                                  ? "hover:bg-green-100 hover:text-green-700"
                                  : "hover:bg-red-100 hover:text-red-700"
                              )}
                            >
                              {user.banned ? (
                                <UserLock className="h-4 w-4" />
                              ) : (
                                <UserRoundCheck className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {user.banned ? "Réactiver le compte ?" : "Désactiver le compte ?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.banned
                                  ? `Le compte de ${user.name} sera réactivé et pourra de nouveau se connecter.`
                                  : `Le compte de ${user.name} sera désactivé et ne pourra plus se connecter.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className={user.banned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                                onClick={() => toggleCompteUser(user.id)}
                              >
                                {user.banned ? "Réactiver" : "Désactiver"}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              {(currentPage - 1) * itemsPerPage + 1} à{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur{" "}
              {filteredUsers.length}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn("h-8 w-8 p-0", currentPage === pageNum && "bg-violet-600 hover:bg-violet-700")}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        )}

        {filteredUsers.length > 0 && totalPages <= 1 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-gray-500 text-right">
            {filteredUsers.length} résultat{filteredUsers.length > 1 ? "s" : ""}
            {searchTerm && ` pour "${searchTerm}"`}
          </div>
        )}
      </Card>
    </div>
  );
}
