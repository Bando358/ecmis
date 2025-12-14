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
  getAllUser,
  getOneUser,
  registerUser,
  updateUser,
} from "@/lib/actions/authActions";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clinique, TableName, User } from "@prisma/client";
import { getAllClinique } from "@/lib/actions/cliniqueActions";
import {
  ArrowBigLeftDash,
  Eye,
  EyeClosed,
  Pencil,
  UserRoundMinus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SpinnerBar } from "@/components/ui/spinner-bar";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  className?: string;
}

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
});

type RegisterInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  prescripteur?: boolean; // Make prescripteur optional to match form type
  idCliniques: string[];
  // idClinique?: string[]; // Rendre idClinique facultatif si nécessaire
};

type FormData = z.infer<typeof signUpSchema>;

export default function RegisterForm() {
  const [cliniques, setCliniques] = useState<Clinique[]>([]);
  const [allUser, setAllUser] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idUserUpdate, setIdUserUpdate] = useState<string>("");
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const router = useRouter();

  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  console.log("idUser : ", idUser);
  const userRole = session?.user.role as string;

  useEffect(() => {
    // Si l'utilisateur n'est pas encore chargé, on ne fait rien
    if (!session?.user) return;

    const fetchPermissions = async () => {
      try {
        const permissions = await getUserPermissionsById(session.user.id);
        const perm = permissions.find(
          (p: { table: string }) => p.table === TableName.USER
        );

        if (perm?.canRead || session.user.role === "ADMIN") {
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
  }, [session?.user, router]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getAllUser();
      if (userRole === "ADMIN") {
        setAllUser(result as User[]);
      } else {
        const alluser = result.filter(
          (user: { role: string }) => user.role === "USER"
        );
        const userTableId = result.find(
          (user: { id: string }) => user.id === idUser
        ); // Utilisez result au lieu de allUser
        const allUserFilter = alluser.filter(
          (user: { idCliniques: string[] }) =>
            user.idCliniques?.some((id) =>
              userTableId?.idCliniques.includes(id)
            ) // Correction ici aussi
        );
        setAllUser(allUserFilter as User[]);
      }
    };
    fetchData();
  }, [userRole, idUser]); // ← Retirez allUser des dépendances

  const form = useForm<FormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      idCliniques: [""],
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
            const filteredCliniques = clinique.filter((c: { id: any }) =>
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

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerBar />
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
          role: userToUpdate?.role || "USER", // Provide fallback role if needed
          banned: null,
          banReason: null,
          banExpires: null,
        };

        await updateUser(idUserUpdate, userUpdate);
        toast.info("Clinique modifié avec succès 🎉 !");
        setIsUpdating(false);

        const oneUser = await getOneUser(idUserUpdate);
        if (oneUser) {
          const updatedUser = [...allUser]; // Copie du tableau pour éviter la mutation
          updatedUser.splice(positions, 1, oneUser); // Remplace l'élément
          setAllUser(updatedUser); // Met à jour l'état
        }
        form.reset();
      } else {
        await registerUser(data);
        toast.success("Clinique créée avec succès! 🎉 ");
        const allUser = await getAllUser(); // Récupérer les nouvelles données
        setAllUser(allUser); // Mettre à jour l'état
        handleHiddenForm();
        router.push("/fiche-post");
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

  return (
    <div className={cn("flex flex-col gap-6 relative")}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowBigLeftDash
              className="absolute top-2 text-blue-600"
              onClick={() => {
                router.push("/administrator");
              }}
            />
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
              variant={"ghost"}
              onClick={handleHiddenForm}
              className="absolute right-2 -top-1"
            >
              {isVisible ? (
                <Eye className="text-blue-600" />
              ) : (
                <EyeClosed className="text-red-600" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ouvrir le formulaire</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        {isVisible ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {!isUpdating ? "Création de compte" : "Mettre ajour le compte"}
              </CardTitle>
              <CardDescription>Entrer vos paramètre de compte</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2 w-sm"
                >
                  <div>
                    <label className="block text-sm font-medium">
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
                    {/* /> */}
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
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
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
        ) : (
          <div className="flex justify-center flex-col -mt-30 ">
            {allUser.length < 1 ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-62.5" />
                  <Skeleton className="h-4 w-50" />
                  <Skeleton className="h-4 w-37.5" />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-center font-semibold">Liste Prestataire</h3>
                <Table className="border max-w-xl ">
                  <TableHeader>
                    <TableRow className="bg-stone-50 opacity-90">
                      <TableCell>Nom & Prénom</TableCell>
                      <TableCell>Nom utilisateur</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Rôle</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell>Cliniques</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUser.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name.toLocaleUpperCase()}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell className="flex justify-center">
                          {user.banned !== true ? "Oui" : "Non"}
                        </TableCell>
                        <TableCell>
                          <ul>{nomCliniques(user.idCliniques)}</ul>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Pencil
                                    className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-slate-800 cursor-pointer"
                                    size={16}
                                    onClick={() =>
                                      handleUpdateUser(user.id, index)
                                    }
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mettre à jour le compte</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <UserRoundMinus
                                    className="text-xl duration-300 hover:scale-150 active:scale-125 text-slate-800 cursor-pointer"
                                    size={16}
                                    onClick={() => {
                                      router.push("/administrator");
                                    }}
                                  />
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
