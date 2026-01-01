"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  getUserPermissionsById,
  updatePermission,
} from "@/lib/actions/permissionActions";
import { getOneUser, getAllUser } from "@/lib/actions/authActions";
import { Permission, User, TableName, Post } from "@prisma/client";
import { getOnePostIdClient } from "@/lib/actions/postActions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowBigLeftDash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PermissionInitialPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userAdmin, setUserAdmin] = useState<User | null>(null);
  const [permissionsUserAdmin, setPermissionsUserAdmin] = useState<
    Permission[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [modifiedPermissions, setModifiedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [oneUser, setOneUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userPost, setUserPost] = useState<Post | null>(null);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;

  // === Charger l'utilisateur admin connecté ===
  useEffect(() => {
    const fetUser = async () => {
      const user = await getOneUser(idUser);
      setOneUser(user);
    };
    fetUser();
  }, [idUser]);
  useEffect(() => {
    const fetchUserAdmin = async () => {
      if (oneUser?.id) {
        const userData = await getOneUser(oneUser.id);
        setUserAdmin(userData);

        // Récupérer le poste de l'utilisateur
        if (!userData) return;
        const postData = await getOnePostIdClient(userData.id);
        setUserPost(postData);

        // Récupérer ses permissions
        const permsAdmin = await getUserPermissionsById(oneUser.id);
        setPermissionsUserAdmin(permsAdmin);
      }
    };
    fetchUserAdmin();
  }, [oneUser?.id]);

  // === Charger tous les utilisateurs ===
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await getAllUser();
        // retirer tous les ADMIN de allUsers
        const users = allUsers.filter(
          (user: { role: string }) => user.role !== "ADMIN"
        );
        if (userAdmin && userAdmin?.role === "ADMIN") {
          setUsers(users);
        } else {
          const filteredIclinicUsers = userAdmin?.idCliniques;
          // On va vérifier si filteredIclinicUsers est inclue dans allUsers.idCliniques
          const filteredUsers = allUsers.filter(
            (user: { idCliniques: any[] }) =>
              user.idCliniques?.some((id: string) =>
                filteredIclinicUsers?.includes(id)
              )
          );
          const finalUsers = filteredUsers.filter(
            (user) => user.role !== "ADMIN"
          );
          setUsers(finalUsers.filter((user) => user.id !== oneUser?.id));
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (userAdmin) {
      fetchUsers();
    }
  }, [userAdmin, oneUser]);

  // === Charger les permissions quand un utilisateur est sélectionné ===
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedUserId) {
        setPermissions([]);
        setSelectedUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userData = await getOneUser(selectedUserId);
        const perms = await getUserPermissionsById(selectedUserId);

        // Trier par nom de table
        const sorted = perms.sort((a: { table: string }, b: { table: any }) =>
          a.table.localeCompare(b.table)
        );

        // retirer bilan de sorted
        const filteredSorted = sorted.filter((perm) => perm.table !== "BILAN");
        setPermissions(filteredSorted);
        setFilteredPermissions(filteredSorted);
        setSelectedUser(userData);
      } catch (error) {
        console.error("Erreur lors du chargement des permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedUserId) {
      fetchPermissions();
    }
  }, [selectedUserId]);

  // === Filtrage des permissions ===
  useEffect(() => {
    const filtered = permissions.filter((permission) =>
      permission.table.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPermissions(filtered);
  }, [searchTerm, permissions]);

  // === Vérifie si l'admin a le droit d'accorder une action sur une table ===
  const canGrant = (
    table: TableName,
    action: "canCreate" | "canRead" | "canUpdate" | "canDelete"
  ): boolean => {
    if (userAdmin?.role === "ADMIN") return true; // full access
    const adminPerm = permissionsUserAdmin.find((p) => p.table === table);
    if (!adminPerm) return false;
    return adminPerm[action];
  };

  // === GESTION DES SWITCHS ===
  const handleSwitchChange = (
    permissionId: string,
    action: "canCreate" | "canRead" | "canUpdate" | "canDelete",
    value: boolean
  ) => {
    const updatedPermissions = permissions.map((perm) =>
      perm.id === permissionId ? { ...perm, [action]: value } : perm
    );

    setPermissions(updatedPermissions);

    const newModified = new Set(modifiedPermissions);
    newModified.add(permissionId);
    setModifiedPermissions(newModified);
  };

  // Switch global "Tout" - tout sauf Delete
  const handleAllSwitchChange = (permissionId: string, value: boolean) => {
    const targetPerm = permissions.find((p) => p.id === permissionId);
    if (!targetPerm) return;

    // Appliquer seulement les actions que l'admin peut accorder, SAUF canDelete
    const updatedPermissions = permissions.map((perm) =>
      perm.id === permissionId
        ? {
            ...perm,
            canCreate: canGrant(perm.table, "canCreate")
              ? value
              : perm.canCreate,
            canRead: canGrant(perm.table, "canRead") ? value : perm.canRead,
            canUpdate: canGrant(perm.table, "canUpdate")
              ? value
              : perm.canUpdate,
            // NE PAS modifier canDelete - laisser sa valeur actuelle
            canDelete: perm.canDelete,
          }
        : perm
    );

    setPermissions(updatedPermissions);
    const newModified = new Set(modifiedPermissions);
    newModified.add(permissionId);
    setModifiedPermissions(newModified);
  };

  // === MISE À JOUR D'UNE PERMISSION ===
  const handleUpdatePermission = async (permission: Permission) => {
    setIsPending(true);
    try {
      const updates = [
        updatePermission(
          permission.userId,
          permission.table,
          "canCreate",
          permission.canCreate
        ),
        updatePermission(
          permission.userId,
          permission.table,
          "canRead",
          permission.canRead
        ),
        updatePermission(
          permission.userId,
          permission.table,
          "canUpdate",
          permission.canUpdate
        ),
        updatePermission(
          permission.userId,
          permission.table,
          "canDelete",
          permission.canDelete
        ),
      ];

      await Promise.all(updates);
      const newModified = new Set(modifiedPermissions);
      newModified.delete(permission.id);
      setModifiedPermissions(newModified);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
    setIsPending(false);
  };

  // === MISE À JOUR DE TOUTES LES PERMISSIONS ===
  const handleUpdateAll = async () => {
    setIsPending(true);
    try {
      for (const permissionId of modifiedPermissions) {
        const permission = permissions.find((p) => p.id === permissionId);
        if (permission) await handleUpdatePermission(permission);
      }
      setModifiedPermissions(new Set());
    } catch (error) {
      console.error("Erreur lors de la mise à jour globale:", error);
    }
    setIsPending(false);
  };

  if (usersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Chargement des utilisateurs...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ArrowBigLeftDash
              className="absolute top-2 text-blue-600"
              onClick={() => {
                router.back();
              }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Retour sur la page précédente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="mb-6  flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold mb-2">Gestion des Permissions</h1>
        <p className="text-gray-600">
          Sélectionnez un utilisateur pour gérer ses permissions
        </p>
      </div>

      {/* Sélection de l'utilisateur */}
      <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Sélectionner un utilisateur
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un utilisateur..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      <span>{user.name}</span>
                      <span className="text-muted-foreground text-sm">
                        ({user.email})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedUser && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Utilisateur sélectionné :</span>{" "}
              {selectedUser.name} ({selectedUser.email})
            </p>
            <p className="text-sm text-muted-foreground">
              Poste : {userPost ? userPost.title : "Non défini"}
            </p>
          </div>
        )}
      </div>

      {/* Tableau des permissions (uniquement si un utilisateur est sélectionné) */}
      {selectedUserId && (
        <>
          {/* Barre de recherche + bouton global */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {modifiedPermissions.size > 0 && (
              <Button onClick={handleUpdateAll} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour tout ({modifiedPermissions.size})
              </Button>
            )}
          </div>

          {/* Tableau des permissions */}
          <div className="border rounded-lg bg-gray-50 opacity-95">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Chargement des permissions...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Table</TableHead>
                    <TableHead className="text-center">Tout</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Read</TableHead>
                    <TableHead className="text-center">Update</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPermissions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchTerm
                          ? "Aucune permission trouvée"
                          : "Aucune permission configurée"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPermissions.map((permission) => {
                      // CORRECTION: N'inclure que Create, Read et Update pour le switch "Tout"
                      const allActive =
                        permission.canCreate &&
                        permission.canRead &&
                        permission.canUpdate;
                      // canDelete est exclu du calcul

                      const disableCreate = !canGrant(
                        permission.table,
                        "canCreate"
                      );
                      const disableRead = !canGrant(
                        permission.table,
                        "canRead"
                      );
                      const disableUpdate = !canGrant(
                        permission.table,
                        "canUpdate"
                      );
                      const disableDelete = !canGrant(
                        permission.table,
                        "canDelete"
                      );
                      // CORRECTION: Ne pas inclure disableDelete dans disableAll
                      const disableAll =
                        disableCreate && disableRead && disableUpdate;

                      return (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {permission.table}
                          </TableCell>

                          {/* Switch Tout */}
                          <TableCell className="text-center">
                            <Switch
                              checked={allActive}
                              disabled={disableAll}
                              onCheckedChange={(checked) =>
                                handleAllSwitchChange(permission.id, checked)
                              }
                            />
                          </TableCell>

                          {/* Create */}
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canCreate}
                              disabled={disableCreate}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(
                                  permission.id,
                                  "canCreate",
                                  checked
                                )
                              }
                            />
                          </TableCell>

                          {/* Read */}
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canRead}
                              disabled={disableRead}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(
                                  permission.id,
                                  "canRead",
                                  checked
                                )
                              }
                            />
                          </TableCell>

                          {/* Update */}
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canUpdate}
                              disabled={disableUpdate}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(
                                  permission.id,
                                  "canUpdate",
                                  checked
                                )
                              }
                            />
                          </TableCell>

                          {/* Delete */}
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canDelete}
                              disabled={disableDelete}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(
                                  permission.id,
                                  "canDelete",
                                  checked
                                )
                              }
                            />
                          </TableCell>

                          {/* Bouton Mettre à jour */}
                          <TableCell className="text-center">
                            {modifiedPermissions.has(permission.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  handleUpdatePermission(permission)
                                }
                              >
                                {isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Mettre à jour
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {!selectedUserId && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <UserIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Veuillez sélectionner un utilisateur pour gérer ses permissions</p>
        </div>
      )}
    </div>
  );
}
