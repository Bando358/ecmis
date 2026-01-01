"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  createPost,
  getAllPost,
  getOnePost,
  updatePost,
} from "@/lib/actions/postActions";
import { getAllUser, getOneUser } from "@/lib/actions/authActions";
import { useEffect, useState, useMemo } from "react";
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
import {
  Eye,
  EyeClosed,
  Pencil,
  ArrowBigLeftDash,
  Scale,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  createPermissionBeforeChecked,
  getUserPermissionsById,
} from "@/lib/actions/permissionActions";
import { dataPermission } from "@/lib/permissionData";
import { Textarea } from "@/components/ui/textarea";
import { SpinnerCustom } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import Select from "react-select";

export default function CreatePostForm() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idPost, setIdPost] = useState<string>("");
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<number>(-1);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // États pour la pagination et la recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");

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

  const itemsPerPageOptions = [
    { value: 5, label: "5 par page" },
    { value: 10, label: "10 par page" },
    { value: 20, label: "20 par page" },
    { value: 50, label: "50 par page" },
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
    // Attendre que idUser et oneUser soient disponibles
    if (!idUser || !oneUser) return;

    const fetchData = async () => {
      const [usersResult, postsResult] = await Promise.all([
        getAllUser(),
        getAllPost(),
      ]);

      // retirer tous les ADMIN de allUsers
      const filteredUsers = (usersResult as User[]).filter(
        (user) => user.role !== "ADMIN"
      );

      const allUserFilter = filteredUsers.filter(
        (user: { idCliniques: string[] }) =>
          user.idCliniques?.some((id) => oneUser?.idCliniques.includes(id))
      );

      console.log(" allUserFilter ", allUserFilter);
      console.log(" filteredUsers ", filteredUsers);

      setUsers(allUserFilter.filter((user) => user.id !== idUser) as User[]);
      setPosts(postsResult.filter((post) => post.userId !== idUser) as Post[]);
      setFilteredPosts(
        postsResult.filter((post) => post.userId !== idUser) as Post[]
      );
    };
    fetchData();
  }, [idUser, oneUser]);

  // Filtrer les posts en fonction des critères de recherche
  useEffect(() => {
    let filtered = posts;

    // Filtre par recherche texte
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((post) => {
        const userName = getUserName(post.userId).toLowerCase();
        const postContent = post.content?.toLowerCase() || "";
        const postTitle = getStatusLabel(post.title).toLowerCase();

        return (
          userName.includes(searchLower) ||
          postContent.includes(searchLower) ||
          postTitle.includes(searchLower)
        );
      });
    }

    // Filtre par statut
    if (selectedStatus) {
      filtered = filtered.filter((post) => post.title === selectedStatus);
    }

    // Filtre par utilisateur
    if (selectedUser) {
      filtered = filtered.filter((post) => post.userId === selectedUser);
    }

    setFilteredPosts(filtered);
    setCurrentPage(1); // Retour à la première page lors du changement de filtre
  }, [searchTerm, selectedStatus, selectedUser, posts]);

  // Calcul des données pour la pagination
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);

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
    setCurrentPage(1);
  };

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
          setFilteredPosts(allPosts as Post[]);
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

  // const handleDeletePost = async (postId: string) => {
  //   if (confirm("Êtes-vous sûr de vouloir supprimer ce post ?")) {
  //     try {
  //       await deletePost(postId);
  //       const allPosts = await getAllPosts();
  //       setPosts(allPosts as Post[]);
  //       setFilteredPosts(allPosts as Post[]);
  //       toast.success("Post supprimé avec succès 🎉");
  //     } catch (error) {
  //       toast.error("Erreur lors de la suppression du post");
  //       console.error(error);
  //     }
  //   }
  // };

  // Options pour les filtres
  const userOptions = [
    { value: "", label: "Tous les utilisateurs" },
    ...users.map((user) => ({
      value: user.id,
      label: `${user.name} (${user.email})`,
    })),
  ];

  const statusOptions = [
    { value: "", label: "Tous les statuts" },
    ...postStatusOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <div className="space-y-4 relative max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
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
        <h2 className="text-center text-xl font-bold uppercase mb-4">
          Liste des Postes
        </h2>

        {/* Barres de recherche et filtres */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche principale */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par utilisateur, contenu, titre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtre par statut */}
            <div className="w-full md:w-48">
              <Select
                options={statusOptions}
                value={statusOptions.find(
                  (opt) => opt.value === selectedStatus
                )}
                onChange={(option) => setSelectedStatus(option?.value || "")}
                className="basic-single"
                classNamePrefix="select"
                placeholder="Filtrer par statut"
              />
            </div>

            {/* Filtre par utilisateur */}
            {/* <div className="w-full md:w-48">
              <Select
                options={userOptions}
                value={userOptions.find((opt) => opt.value === selectedUser)}
                onChange={(option) => setSelectedUser(option?.value || "")}
                className="basic-single"
                classNamePrefix="select"
                placeholder="Filtrer par utilisateur"
              />
            </div> */}

            {/* Sélecteur d'éléments par page */}
            <div className="w-full md:w-48">
              <Select
                options={itemsPerPageOptions}
                value={itemsPerPageOptions.find(
                  (opt) => opt.value === itemsPerPage
                )}
                onChange={(option) =>
                  handleItemsPerPageChange(option?.value || 5)
                }
                className="basic-single"
                classNamePrefix="select"
                placeholder="Éléments par page"
              />
            </div>
          </div>

          {/* Affichage du nombre de résultats */}
          {/* <div className="text-sm text-gray-600">
            {filteredPosts.length} poste(s) trouvé(s)
            {searchTerm && <span> pour "{searchTerm}"</span>}
          </div> */}
        </div>

        {/* Tableau des posts */}
        <div className="border rounded-md shadow-md bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableCell className="font-semibold">Statut</TableCell>
                  <TableCell className="font-semibold">Contenu</TableCell>
                  <TableCell className="font-semibold">Utilisateur</TableCell>
                  <TableCell className="font-semibold">Crée le</TableCell>
                  <TableCell className="font-semibold">Modifié le</TableCell>
                  <TableCell className="font-semibold text-center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPosts.length > 0 ? (
                  paginatedPosts.map((post, index) => (
                    <TableRow key={post.id} className="hover:bg-gray-50">
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getStatusLabel(post.title)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="line-clamp-2 text-sm">
                          {post.content}
                        </div>
                      </TableCell>
                      <TableCell>{getUserName(post.userId)}</TableCell>
                      <TableCell>{formatDate(post.createdAt)}</TableCell>
                      <TableCell>{formatDate(post.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdatePost(post.id, index)
                                  }
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifier le poste</p>
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
                                    router.push(
                                      `/fiche-permissions/${post.userId}/`
                                    )
                                  }
                                  className="h-8 w-8"
                                >
                                  <Scale className="h-4 w-4 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ajouter les droits d'accès</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/* <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePost(post.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Supprimer le poste</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      Aucun post trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
            <div className="text-sm text-gray-600">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à{" "}
              {Math.min(currentPage * itemsPerPage, filteredPosts.length)} sur{" "}
              {filteredPosts.length} postes
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
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
      </div>
    </div>
  );
}
