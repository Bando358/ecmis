"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Select from "react-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

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
  registerUser,
  toggleBanUser,
  updateUser,
} from "@/lib/actions/authActions";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Clinique,
  Permission,
  TableName,
  User,
  UserRole,
} from "@prisma/client";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  ArrowBigLeftDash,
  Eye,
  EyeClosed,
  Pencil,
  UserLock,
  UserRoundCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Checkbox } from "@/components/ui/checkbox";
import { SpinnerCustom } from "@/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const signUpSchema = z.object({
  name: z.string().min(5, {
    message: "Name must be at least 5 characters.",
  }),
  email: z.email("L'adresse email est invalide."),
  username: z.string().min(5, {
    message: "Username must be at least 5 characters.",
  }),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z0-9]/, {
      message: "Le mot de passe doit inclure des lettres et des chiffres.",
    }),
  idCliniques: z.array(z.string()),
  prescripteur: z.boolean().optional(), // false par défaut
  role: z.string().min(3, {
    message: "role must be at least 3 characters.",
  }),
});

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  prescripteur?: boolean; // Make prescripteur optional to match form type
  role: string;
  idCliniques: string[];
  // idClinique?: string[]; // Rendre idClinique facultatif si nécessaire
};

type FormData = z.infer<typeof signUpSchema>;

export default function RegisterForm() {
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [allUser, setAllUser] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [idUserUpdate, setIdUserUpdate] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // États pour la pagination et la recherche
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

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  console.log("idUser : ", idUser);
  const userRole = session?.user.role as string;

  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetUser();
  }, [idUser]);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!oneUser) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(oneUser.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.USER
        );
        setPermission(perm || null);
        if (perm?.canRead || oneUser.role === "ADMIN") {
          setHasAccess(true);
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
  }, [oneUser, router]);

  useEffect(() => {
    // Attendre que oneUser soit chargé
    if (!oneUser) return;

    const fetchData = async () => {
      const resultUser = await getAllUser();
      const result = resultUser.filter((user) => user.id !== idUser); // Exclude current user
      console.log("result allUser fetchData : ", result);

      if (userRole === "ADMIN") {
        if (oneUser?.email === "bando358@gmail.com") {
          setAllUser(result as User[]);
          setFilteredUsers(result as User[]);
        } else {
          // retirer cet utilisateur de la liste ainsi que oneUser
          const filteredUsers = result.filter(
            (user: { email: string }) => user.email !== "bando358@gmail.com"
          );
          const filteredUser = filteredUsers.filter(
            (user: { email: string }) => user.email !== oneUser?.email
          );
          console.log("filteredUser1 : ", filteredUser);
          setAllUser(filteredUser as User[]);
          setFilteredUsers(filteredUser as User[]);
        }
      } else {
        const alluser = result.filter(
          (user: { role: string }) => user.role === "USER"
        );
        // Utiliser resultUser au lieu de result car result a déjà exclu l'utilisateur actuel
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
        console.log("filteredUser2 : ", filteredUser);
        setAllUser(filteredUser as User[]);
        setFilteredUsers(filteredUser as User[]);
      }
    };
    fetchData();
  }, [userRole, idUser, oneUser]); // Ajouter oneUser aux dépendances

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
            console.log("filteredCliniques : ", filteredCliniques);
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
  }, [userRole, idUser]); // ← JSON.stringify stabilise le tableau

  // Filtrer les utilisateurs en fonction du terme de recherche
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

  // Calcul des données pour la pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Gestionnaires pour la pagination
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Gestionnaire pour changer le nombre d'éléments par page
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Retour à la première page lors du changement
  };

  if (isCheckingPermissions) {
    return (
      <div className="flex gap-2 justify-center items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom />
      </div>
    );
  }

  if (!hasAccess) return null;

  const nomCliniques = (idClinique: string[]) => {
    if (cliniques.length > 0) {
      const clinique = cliniques.filter((p) => idClinique.includes(p.id));
      return clinique.map((c, index) => <li key={index}>{c.nomClinique} </li>);
      //return clinique ? clinique.nomClinique : "Clinique introuvable"; // Valeur par défaut si non trouvé
    }
  };

  const handleHiddenForm = () => {
    if (!isVisible) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const handleUpdateUser = async (id: string, position: number) => {
    setPositions(position);
    const userToUpdate = allUser.find((user) => user.id === id);

    setIdUserUpdate(id);

    if (userToUpdate) {
      setIsUpdating(true); // Activer le mode modification

      form.setValue("name", userToUpdate.name);
      form.setValue("email", userToUpdate.email);
      form.setValue("username", userToUpdate.username);
      form.setValue("password", userToUpdate.password);
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
          createdAt: userToUpdate?.createdAt || new Date(), // Provide fallback Date
          updatedAt: new Date(),
          prescripteur:
            typeof data.prescripteur === "boolean"
              ? data.prescripteur
              : userToUpdate?.prescripteur ?? false, // Always boolean
          emailVerified: false,
          image: null,
          role: (data.role as UserRole) || UserRole.USER, // Cast to UserRole
          banned: null,
          banReason: null,
          banExpires: null,
        };

        await updateUser(idUserUpdate, userUpdate);
        toast.info("User modifié avec succès 🎉 !");
        setIsUpdating(false);

        // Mettre à jour l'état allUser avec les nouvelles données
        const updatedUsers = [...allUser];
        if (positions !== -1) {
          updatedUsers[positions] = { ...userUpdate };
          console.log("updatedUsers filtered 2 : ", updatedUsers);
          setAllUser(updatedUsers);
        }

        form.reset();
      } else {
        // crée l'id via uuid

        const newUser = {
          id: crypto.randomUUID(), // Will be generated by Prisma
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
        console.log("newUser : ", newUser);
        await createUser(newUser);
        // await registerUser(data);
        toast.success("Clinique créée avec succès! 🎉 ");
        const result = [...allUser, newUser];
        console.log("result filtered-4 : ", result);
        setAllUser(result); // Mettre à jour l'état
        handleHiddenForm();
        if (data?.role !== "ADMIN") {
          router.push("/fiche-post");
        }
      }

      form.reset(); // Réinitialisation du formulaire après soumission
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
    if (permission?.canDelete) {
      alert("Vous n'avez pas la permission de bannir ce compte.");
      return;
    }
    // Logique pour activer/désactiver le compte utilisateur
    if (confirm("Êtes-vous sûr de vouloir changer le statut du compte ?")) {
      // Votre logique ici
      await toggleBanUser(id);
      toast.success("Le statut du compte a été modifié avec succès !");
      // Mettre à jour la liste des utilisateurs après la modification
      const updatedUsers = allUser.map((user) => {
        if (user.id === id) {
          return { ...user, banned: !user.banned };
        }
        return user;
      });
      setAllUser(updatedUsers);
    }
  };

  return (
    <div className={cn("flex flex-col")}>
      {/* Header avec boutons de navigation */}
      <div className="flex items-center justify-between px-6 pt-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/administrator")}
                className="h-8 w-8"
              >
                <ArrowBigLeftDash className="h-5 w-5 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Retour sur page administration</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHiddenForm}
                className="h-8 w-8"
              >
                {isVisible ? (
                  <Eye className="h-5 w-5 text-blue-600" />
                ) : (
                  <EyeClosed className="h-5 w-5 text-red-600" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ouvrir le formulaire</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Contenu principal */}
      <div className="px-6 pb-6">
        {isVisible ? (
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>
                  {!isUpdating
                    ? "Création de compte"
                    : "Mettre ajour le compte"}
                </CardTitle>
                <CardDescription>
                  Entrer vos paramètre de compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cliniques
                      </label>
                      {isLoading ? (
                        <div className="p-2 text-sm text-gray-500">
                          Chargement des cliniques...
                        </div>
                      ) : (
                        <Select
                          isMulti
                          options={cliniqueOptions}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          placeholder="Sélectionner une ou plusieurs cliniques"
                          onChange={(selectedOptions) => {
                            const selectedValues = selectedOptions.map(
                              (option) => option.value
                            );
                            form.setValue("idCliniques", selectedValues);
                          }}
                        />
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom et Prénom</FormLabel>
                          <FormControl>
                            <Input placeholder="John doe" {...field} />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="exemple@gmail.com" {...field} />
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
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Johndoe33" {...field} />
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="*****"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* faire un checkBox */}
                    <FormField
                      control={form.control}
                      name="prescripteur"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 mb-4">
                          <FormLabel>Is Prescripteur ? : </FormLabel>
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
                            <FormLabel className="text-lg font-semibold">
                              Type Role
                            </FormLabel>
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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={form.formState.isSubmitting}
                    >
                      {!form.formState.isSubmitting
                        ? isUpdating
                          ? "Mettre à jour"
                          : "Créer"
                        : isUpdating
                        ? "Mettre à jour"
                        : "En cours..."}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full">
            {allUser.length < 1 ? (
              <div className="flex items-center space-x-4 justify-center py-12">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-62.5" />
                  <Skeleton className="h-4 w-50" />
                  <Skeleton className="h-4 w-37.5" />
                </div>
              </div>
            ) : (
              <>
                {/* En-tête avec titre, recherche et filtre */}
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold text-center mb-4">
                    Liste Prestataire
                  </h3>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Barre de recherche */}
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Rechercher par nom, email, username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Sélecteur d'éléments par page */}
                    <div className="w-full md:w-48">
                      <Select
                        options={itemsPerPageOptions}
                        value={itemsPerPageOptions.find(
                          (opt) => opt.value === itemsPerPage
                        )}
                        onChange={(option) =>
                          handleItemsPerPageChange(option?.value || 8)
                        }
                        className="basic-single"
                        classNamePrefix="select"
                        placeholder="Éléments par page"
                      />
                    </div>
                  </div>
                </div>

                {/* Tableau des utilisateurs */}
                <div className="border rounded-lg bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-stone-50">
                          <TableCell className="font-semibold">
                            Nom & Prénom
                          </TableCell>
                          <TableCell className="font-semibold">
                            Nom utilisateur
                          </TableCell>
                          <TableCell className="font-semibold">Email</TableCell>
                          <TableCell className="font-semibold">Rôle</TableCell>
                          <TableCell className="font-semibold text-center">
                            Active
                          </TableCell>
                          <TableCell className="font-semibold">
                            Cliniques
                          </TableCell>
                          <TableCell className="font-semibold text-center">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user, index) => (
                          <TableRow key={user.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              {user.name.toLocaleUpperCase()}
                            </TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.role === "ADMIN"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.banned !== true
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.banned !== true ? "Oui" : "Non"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <ul className="max-w-xs">
                                {nomCliniques(user.idCliniques)}
                              </ul>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center space-x-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleUpdateUser(user.id, index)
                                        }
                                        className="h-8 w-8"
                                      >
                                        <Pencil className="h-4 w-4 text-blue-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Mettre à jour le compte</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          toggleCompteUser(user.id)
                                        }
                                        className="h-8 w-8"
                                      >
                                        {user.banned ? (
                                          <UserLock className="h-4 w-4 text-red-600" />
                                        ) : (
                                          <UserRoundCheck className="h-4 w-4 text-green-600" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Déactiver le compte</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 mx-3">
                    <div className="text-sm text-gray-600">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredUsers.length
                      )}{" "}
                      sur {filteredUsers.length} utilisateurs
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="h-8 w-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
