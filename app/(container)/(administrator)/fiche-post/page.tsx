"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  createPost,
  deletePost,
  getAllPost,
  getAllPosts,
  getOnePost,
  updatePost,
} from "@/lib/actions/postActions";
import { getAllUser, getOneUser } from "@/lib/actions/authActions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Post, PostStatus, TableName, User } from "@prisma/client";
import { toast } from "sonner";
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
import { Eye, EyeClosed, Pencil, ArrowBigLeftDash, Scale } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  createPermissionBeforeChecked,
  getUserPermissionsById,
} from "@/lib/actions/permissionActions";
import { dataPermission } from "@/lib/permissionData";
import { Textarea } from "@/components/ui/textarea";
import { SpinnerCustom } from "@/components/ui/spinner";
import { on } from "events";

export default function CreatePostForm() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idPost, setIdPost] = useState<string>("");
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  const postStatusOptions = [
    { value: PostStatus.AMD, label: "AMD" },
    { value: PostStatus.INFIRMIER, label: "Infirmier" },
    { value: PostStatus.SAGE_FEMME, label: "Sage-femme" },
    { value: PostStatus.MEDECIN, label: "Médecin" },
    { value: PostStatus.LABORANTIN, label: "Laborantin" },
    { value: PostStatus.CAISSIERE, label: "Caissière" },
    { value: PostStatus.COMPTABLE, label: "Comptable" },
    { value: PostStatus.SUIVI_EVALLUATION, label: "Suivi Évaluation" },
    { value: PostStatus.ADMIN, label: "Administrateur" },
  ];
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
          (p: { table: string }) => p.table === TableName.POST
        );

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
  }, [oneUser]);

  useEffect(() => {
    // Attendre que idUser soit disponible
    if (!idUser) return;

    const fetchData = async () => {
      const [usersResult, postsResult] = await Promise.all([
        getAllUser(),
        getAllPost(),
      ]);

      // retirer tous les ADMIN de allUsers
      const filteredUsers = (usersResult as User[]).filter(
        (user) => user.role !== "ADMIN"
      );

      setUsers(filteredUsers.filter((user) => user.id !== idUser) as User[]);
      setPosts(postsResult.filter((post) => post.userId !== idUser) as Post[]);
    };
    fetchData();
  }, [idUser]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Post>();

  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center gap-2 items-center h-64">
        <p className="text-gray-500">Vérification des permissions</p>
        <SpinnerCustom />
      </div>
    );
  }

  if (!hasAccess) return null;

  const handleHiddenForm = () => {
    if (!isVisible) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const onSubmit: SubmitHandler<Post> = async (data) => {
    // Création des permissions pour ce poste
    const permissionsData = dataPermission.map((permission) => ({
      userId: data.userId,
      table: permission.table,
      canCreate: permission.canCreate,
      canRead: permission.canRead,
      canUpdate: permission.canUpdate,
      canDelete: permission.canDelete,
    }));
    try {
      if (isUpdating) {
        const PostData = {
          id: idPost,
          title: data.title,
          content: data.content,
          userId: data.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await updatePost(idPost, PostData);
        await createPermissionBeforeChecked(permissionsData);

        toast.info("Poste modifié avec succès 🎉 !");
        setIsUpdating(false);

        const onePost = await getOnePost(idPost);
        if (onePost) {
          const updatedPost = [...posts];
          updatedPost.splice(positions, 1, onePost);
          setPosts(updatedPost);
        }
        reset();
      } else {
        // Création du poste
        const newPost = await createPost(data);

        if (newPost) {
          // await createPermission(permissionsData);
          await createPermissionBeforeChecked(permissionsData);
          console.log("permissionsData ", permissionsData);
          toast.success("Poste créé avec succès et permissions générées! 🎉 ");
          const allPosts = await getAllPost();
          setPosts(allPosts as Post[]);
          handleHiddenForm();
        }
      }

      reset();
      setIsVisible(false);
    } catch (error) {
      toast.error("La création/modification du poste a échoué !");
      console.error(error);
    }
  };

  const handleUpdatePost = async (id: string, position: number) => {
    setPositions(position);
    const postToUpdate = posts.find((post) => post.id === id);

    setIdPost(id);

    if (postToUpdate) {
      setIsUpdating(true);

      setValue("title", postToUpdate.title);
      setValue("content", postToUpdate.content);
      setValue("userId", postToUpdate.userId);

      setIsVisible(true);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : "Utilisateur inconnu";
  };

  const getStatusLabel = (status: PostStatus) => {
    const statusOption = postStatusOptions.find(
      (option) => option.value === status
    );
    return statusOption ? statusOption.label : status;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeletePost = async (postId: string) => {
    // if (!permissions?.canDelete && session?.user.role !== "ADMIN") {
    //   toast.error("Vous n'avez pas la permission de supprimer ce post.");
    //   return;
    // }

    if (confirm("Êtes-vous sûr de vouloir supprimer ce post ?")) {
      try {
        await deletePost(postId);
        const allPosts = await getAllPosts();
        setPosts(allPosts as Post[]);
        toast.success("Post supprimé avec succès 🎉");
      } catch (error) {
        toast.error("Erreur lors de la suppression du post");
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-4 relative max-w-4xl mx-auto p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowBigLeftDash
              className="absolute top-2 text-blue-600 cursor-pointer"
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

      {isVisible && (
        <>
          <h2 className="text-center text-xl font-bold uppercase">
            {isUpdating
              ? "Formulaire de modification d'un Poste"
              : "Formulaire de création d'un Poste"}
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 border rounded-md bg-stone-50 space-y-4"
          >
            <div className="flex flex-row space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium">
                  Titre du Poste
                </label>
                <select
                  {...register("title", {
                    required: "Le titre du poste est requis",
                  })}
                  className="w-full p-2 border rounded-md"
                  name="title"
                  defaultValue=""
                >
                  <option value="" disabled className="text-gray-200">
                    Sélectionner un poste
                  </option>
                  {postStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.title && (
                  <span className="text-red-500 text-sm">
                    {errors.title.message}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium">Utilisateur</label>
                <select
                  {...register("userId", {
                    required: "L'utilisateur est requis",
                  })}
                  className="w-full p-2 border rounded-md"
                  name="userId"
                  defaultValue=""
                >
                  <option value="" disabled className="text-gray-200">
                    Sélectionner un utilisateur
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {errors.userId && (
                  <span className="text-red-500 text-sm">
                    {errors.userId.message}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Description du Poste
              </label>
              <Textarea
                {...register("content", {
                  required: "La description du poste est requise",
                })}
                placeholder="Description du poste"
                className="mt-1"
                name="content"
              />
              {errors.content && (
                <span className="text-red-500 text-sm">
                  {errors.content.message}
                </span>
              )}
            </div>

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isUpdating && isSubmitting
                ? "Modification en cours ..."
                : isUpdating
                ? "Modifier le Poste"
                : isSubmitting
                ? "Création en cours ..."
                : "Créer le Poste"}
            </Button>
          </form>
        </>
      )}

      <div className="flex-1">
        <h2 className="text-center text-xl font-bold uppercase">
          Liste des Postes
        </h2>
        <Table className="border rounded-md shadow-md bg-white overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableCell>Statut</TableCell>
              <TableCell>Contenu</TableCell>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Créé le</TableCell>
              <TableCell>Modifié le</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post, index) => (
              <TableRow key={post.id}>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getStatusLabel(post.title)}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="line-clamp-2 text-sm">{post.content}</div>
                </TableCell>
                <TableCell>{getUserName(post.userId)}</TableCell>
                <TableCell>{formatDate(post.createdAt)}</TableCell>
                <TableCell>{formatDate(post.updatedAt)}</TableCell>
                <TableCell className="flex flex-row items-center justify-center">
                  <div className="flex gap-2">
                    <Pencil
                      className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-blue-600 cursor-pointer"
                      size={16}
                      onClick={() => handleUpdatePost(post.id, index)}
                    />
                    <Scale
                      className="text-xl m-1 duration-300 hover:scale-150 active:scale-125 text-green-600 cursor-pointer"
                      size={16}
                      onClick={() =>
                        router.push(`/fiche-permissions/${post.userId}/`)
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
