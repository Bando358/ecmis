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
import { Post, PostStatus, TableName } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Briefcase,
  Scale,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { createPermissionBeforeChecked, updatePermissionsBulk } from "@/lib/actions/permissionActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { TableSkeleton } from "@/components/ui/loading";
import { buildPermissionsForPost } from "@/lib/permissionData";
import Select from "react-select";

export default function CreatePostForm() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [allUsers, setAllUsers] = useState<SafeUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [idPost, setIdPost] = useState<string>("");
  const [oneUser, setOneUser] = useState<SafeUser | null>(null);
  const [positions, setPositions] = useState<number>(-1);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();

  const postStatusOptions = [
    { value: PostStatus.AMD, label: "AMD" },
    { value: PostStatus.INFIRMIER, label: "Infirmier" },
    { value: PostStatus.SAGE_FEMME, label: "Sage-femme" },
    { value: PostStatus.CONSEILLER, label: "Conseiller" },
    { value: PostStatus.AIDE_SOIGNANT, label: "Aide-soignant" },
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
    if (!idUser || !oneUser) return;

    const fetchData = async () => {
      const [usersResult, postsResult] = await Promise.all([
        getAllUser(),
        getAllPost(),
      ]);

      const filteredUsers = (usersResult as SafeUser[]).filter(
        (user) => user.role !== "ADMIN",
      );

      const allUserFilter = filteredUsers.filter(
        (user: { idCliniques: string[] }) =>
          user.idCliniques?.some((id) => oneUser?.idCliniques.includes(id)),
      );

      if (oneUser.role === "ADMIN") {
        setAllUsers(filteredUsers as SafeUser[]);
        setUsers(
          filteredUsers.filter((user) => user.id !== idUser) as SafeUser[],
        );
      } else {
        setAllUsers(allUserFilter as SafeUser[]);
        setUsers(
          allUserFilter.filter((user) => user.id !== idUser) as SafeUser[],
        );
      }
      // Filtrer les postes : non-admin ne voit que les postes des users de ses cliniques
      const visibleUserIds = new Set(
        oneUser.role === "ADMIN"
          ? filteredUsers.map((u) => u.id)
          : allUserFilter.map((u) => u.id),
      );
      const visiblePosts = (postsResult as Post[]).filter(
        (post) => post.userId !== idUser && visibleUserIds.has(post.userId),
      );
      setPosts(visiblePosts);
      setFilteredPosts(visiblePosts);
    };
    fetchData();
  }, [idUser, oneUser]);

  useEffect(() => {
    let filtered = posts;

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

    if (selectedStatus) {
      filtered = filtered.filter((post) => post.title === selectedStatus);
    }

    setFilteredPosts(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, posts]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Post>();

  if (isLoadingPermissions) return <TableSkeleton rows={5} columns={6} />;
  if (!canRead(TableName.POST)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  const handleHiddenForm = () => {
    if (isVisible) {
      setIsVisible(false);
      setIsUpdating(false);
      reset();
    } else {
      setIsVisible(true);
    }
  };

  const onSubmit: SubmitHandler<Post> = async (data) => {
    const permissionsData = buildPermissionsForPost(data.title, data.userId);
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
        await updatePermissionsBulk(permissionsData);

        toast.success("Poste modifié avec succès et permissions mises à jour !");
        setIsUpdating(false);

        const onePost = await getOnePost(idPost);
        if (onePost) {
          const updatedPost = [...posts];
          updatedPost.splice(positions, 1, onePost);
          setPosts(updatedPost);
        }
        reset();
      } else {
        const newPost = await createPost(data);

        if (newPost) {
          await createPermissionBeforeChecked(permissionsData);
          toast.success("Poste créé avec succès et permissions générées !");
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
    const user = allUsers.find((u) => u.id === userId);
    return user ? user.name : "Utilisateur inconnu";
  };

  const getStatusLabel = (status: PostStatus) => {
    const statusOption = postStatusOptions.find(
      (option) => option.value === status,
    );
    return statusOption ? statusOption.label : status;
  };

  const getStatusColor = (status: PostStatus) => {
    const colors: Record<string, string> = {
      [PostStatus.MEDECIN]: "bg-blue-50 text-blue-700 border-blue-200",
      [PostStatus.SAGE_FEMME]: "bg-pink-50 text-pink-700 border-pink-200",
      [PostStatus.INFIRMIER]: "bg-teal-50 text-teal-700 border-teal-200",
      [PostStatus.LABORANTIN]: "bg-purple-50 text-purple-700 border-purple-200",
      [PostStatus.CAISSIERE]: "bg-green-50 text-green-700 border-green-200",
      [PostStatus.COMPTABLE]: "bg-indigo-50 text-indigo-700 border-indigo-200",
      [PostStatus.AMD]: "bg-amber-50 text-amber-700 border-amber-200",
      [PostStatus.ADMIN]: "bg-red-50 text-red-700 border-red-200",
      [PostStatus.SUIVI_EVALLUATION]:
        "bg-cyan-50 text-cyan-700 border-cyan-200",
    };
    return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
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

  const statusFilterOptions = [
    { value: "", label: "Tous les statuts" },
    ...postStatusOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/administrator")}
            className="rounded-xl hover:bg-amber-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100">
              <Briefcase className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Gestion des postes
              </h1>
              <p className="text-sm text-muted-foreground">
                {posts.length} poste{posts.length > 1 ? "s" : ""} enregistré
                {posts.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleHiddenForm}
          className={
            isVisible
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
              : "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200"
          }
        >
          {isVisible ? (
            <>
              <X className="h-4 w-4 mr-2" /> Fermer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Nouveau poste
            </>
          )}
        </Button>
      </div>

      {/* Formulaire */}
      {isVisible && (
        <Card className="border-amber-200/50 shadow-lg shadow-amber-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-white pb-4">
            <CardTitle className="text-base font-semibold text-amber-900">
              {isUpdating ? "Modifier le poste" : "Nouveau poste"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Titre du poste
                  </label>
                  <select
                    {...register("title", {
                      required: "Le titre du poste est requis",
                    })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner un poste
                    </option>
                    {postStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.title && (
                    <span className="text-red-500 text-xs">
                      {errors.title.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Utilisateur
                  </label>
                  <select
                    {...register("userId", {
                      required: "L'utilisateur est requis",
                    })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner un utilisateur
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {errors.userId && (
                    <span className="text-red-500 text-xs">
                      {errors.userId.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Description du poste
                </label>
                <Textarea
                  {...register("content", {
                    required: "La description du poste est requise",
                  })}
                  placeholder="Description du poste"
                  className="border-gray-200 focus:border-amber-400 focus:ring-amber-400 min-h-[80px]"
                />
                {errors.content && (
                  <span className="text-red-500 text-xs">
                    {errors.content.message}
                  </span>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleHiddenForm}
                  className="text-gray-600"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 px-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : isUpdating
                      ? "Modifier le poste"
                      : "Créer le poste"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recherche + Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par utilisateur, contenu, titre..."
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
          <div className="w-full sm:w-48">
            <Select
              options={statusFilterOptions}
              value={statusFilterOptions.find(
                (opt) => opt.value === selectedStatus,
              )}
              onChange={(option) => setSelectedStatus(option?.value || "")}
              className="basic-single"
              classNamePrefix="select"
              placeholder="Filtrer par statut"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              options={itemsPerPageOptions}
              value={itemsPerPageOptions.find(
                (opt) => opt.value === itemsPerPage,
              )}
              onChange={(option) => {
                setItemsPerPage(option?.value || 10);
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
                <TableHead className="w-14 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  N°
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Statut
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Description
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Utilisateur
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Créé le
                </TableHead>
                <TableHead className="w-24 text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-8 w-8 text-gray-300" />
                      <p className="text-sm">
                        {searchTerm || selectedStatus
                          ? "Aucun poste ne correspond aux filtres"
                          : "Aucun poste enregistré"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPosts.map((post, index) => (
                  <TableRow
                    key={post.id}
                    className="group hover:bg-amber-50/30 transition-colors"
                  >
                    <TableCell className="text-center text-gray-400 font-mono text-sm">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(post.title)}
                      >
                        {getStatusLabel(post.title)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="line-clamp-2 text-sm text-gray-700">
                        {post.content}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-800 text-sm">
                      {getUserName(post.userId)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(post.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdatePost(post.id, index)}
                          className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/fiche-permissions/${post.userId}/`)
                          }
                          className="h-8 w-8 rounded-lg hover:bg-emerald-100 hover:text-emerald-700"
                        >
                          <Scale className="h-4 w-4" />
                        </Button>
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
              {Math.min(currentPage * itemsPerPage, filteredPosts.length)} sur{" "}
              {filteredPosts.length}
            </div>

            <div className="flex items-center gap-1">
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2)
                  pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "h-8 w-8 p-0",
                      currentPage === pageNum &&
                        "bg-amber-600 hover:bg-amber-700",
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
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

            <div className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        )}

        {filteredPosts.length > 0 && totalPages <= 1 && (
          <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-gray-500 text-right">
            {filteredPosts.length} résultat{filteredPosts.length > 1 ? "s" : ""}
            {(searchTerm || selectedStatus) && ` sur ${posts.length}`}
          </div>
        )}
      </Card>
    </div>
  );
}
