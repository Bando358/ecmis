"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  getUserPermissionsById,
  updatePermission,
} from "@/lib/actions/permissionActions";
import { getOneUser, getAllUser } from "@/lib/actions/authActions";
import { Permission, TableName, Post } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { getOnePostIdClient } from "@/lib/actions/postActions";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Search,
  User as UserIcon,
  ShieldCheck,
  Loader2,
  X,
} from "lucide-react";
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
import { TableSkeleton } from "@/components/ui/loading";
import { useRouter } from "next/navigation";

export default function PermissionInitialPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userAdmin, setUserAdmin] = useState<SafeUser | null>(null);
  const [permissionsUserAdmin, setPermissionsUserAdmin] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modifiedPermissions, setModifiedPermissions] = useState<Set<string>>(new Set());
  const [oneUser, setOneUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userPost, setUserPost] = useState<Post | null>(null);

  const router = useRouter();
  const { data: session } = useSession();
  const idUser = session?.user.id as string;
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();

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

        if (!userData) return;
        const postData = await getOnePostIdClient(userData.id);
        setUserPost(postData);

        const permsAdmin = await getUserPermissionsById(oneUser.id);
        setPermissionsUserAdmin(permsAdmin);
      }
    };
    fetchUserAdmin();
  }, [oneUser?.id]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await getAllUser();
        const users = allUsers.filter(
          (user: { role: string }) => user.role !== "ADMIN"
        );
        if (userAdmin && userAdmin?.role === "ADMIN") {
          setUsers(users);
        } else {
          const filteredIclinicUsers = userAdmin?.idCliniques;
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

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedUserId) {
        setPermissions([]);
        setSelectedUser(null);
        setUserPost(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userData = await getOneUser(selectedUserId);
        const perms = await getUserPermissionsById(selectedUserId);

        const postData = await getOnePostIdClient(selectedUserId);
        setUserPost(postData);

        const sorted = perms.sort((a: { table: string }, b: { table: any }) =>
          a.table.localeCompare(b.table)
        );

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

  useEffect(() => {
    const filtered = permissions.filter((permission) =>
      permission.table.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPermissions(filtered);
  }, [searchTerm, permissions]);

  const canGrant = (
    table: TableName,
    action: "canCreate" | "canRead" | "canUpdate" | "canDelete"
  ): boolean => {
    if (userAdmin?.role === "ADMIN") return true;
    const adminPerm = permissionsUserAdmin.find((p) => p.table === table);
    if (!adminPerm) return false;
    return adminPerm[action];
  };

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

  const handleAllSwitchChange = (permissionId: string, value: boolean) => {
    const targetPerm = permissions.find((p) => p.id === permissionId);
    if (!targetPerm) return;

    const updatedPermissions = permissions.map((perm) =>
      perm.id === permissionId
        ? {
            ...perm,
            canCreate: canGrant(perm.table, "canCreate") ? value : perm.canCreate,
            canRead: canGrant(perm.table, "canRead") ? value : perm.canRead,
            canUpdate: canGrant(perm.table, "canUpdate") ? value : perm.canUpdate,
            canDelete: perm.canDelete,
          }
        : perm
    );

    setPermissions(updatedPermissions);
    const newModified = new Set(modifiedPermissions);
    newModified.add(permissionId);
    setModifiedPermissions(newModified);
  };

  const handleUpdatePermission = async (permission: Permission) => {
    setIsPending(true);
    try {
      const updates = [
        updatePermission(permission.userId, permission.table, "canCreate", permission.canCreate),
        updatePermission(permission.userId, permission.table, "canRead", permission.canRead),
        updatePermission(permission.userId, permission.table, "canUpdate", permission.canUpdate),
        updatePermission(permission.userId, permission.table, "canDelete", permission.canDelete),
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

  if (isLoadingPermissions) return <TableSkeleton rows={5} columns={7} />;
  if (!canRead(TableName.PERMISSION)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  if (usersLoading) {
    return <TableSkeleton rows={5} columns={7} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/administrator")}
          className="rounded-xl hover:bg-rose-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-50 to-rose-100">
            <ShieldCheck className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Gestion des permissions</h1>
            <p className="text-sm text-muted-foreground">
              Configurer les droits d&apos;accès par utilisateur
            </p>
          </div>
        </div>
      </div>

      {/* Sélection utilisateur */}
      <Card className="border-rose-200/50 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Sélectionner un utilisateur
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-10 border-gray-200">
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

            {selectedUser && (
              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
                  <UserIcon className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedUser.name} <span className="text-gray-500 font-normal">({selectedUser.email})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Poste : <Badge variant="secondary" className="bg-rose-50 text-rose-700 border-rose-200 text-xs ml-1">
                      {userPost ? userPost.title : "Non défini"}
                    </Badge>
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tableau des permissions */}
      {selectedUserId && (
        <Card className="shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une table..."
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

            {modifiedPermissions.size > 0 && (
              <Button
                onClick={handleUpdateAll}
                disabled={isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour tout ({modifiedPermissions.size})
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-rose-500" />
                <span className="text-sm text-gray-500">Chargement des permissions...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="w-1/4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Table</TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Tout</TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Créer</TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Lire</TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Modifier</TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Supprimer</TableHead>
                    <TableHead className="text-center font-semibold text-gray-600 text-xs uppercase tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPermissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ShieldCheck className="h-8 w-8 text-gray-300" />
                          <p className="text-sm">
                            {searchTerm ? "Aucune permission trouvée" : "Aucune permission configurée"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPermissions.map((permission) => {
                      const allActive =
                        permission.canCreate &&
                        permission.canRead &&
                        permission.canUpdate;

                      const disableCreate = !canGrant(permission.table, "canCreate");
                      const disableRead = !canGrant(permission.table, "canRead");
                      const disableUpdate = !canGrant(permission.table, "canUpdate");
                      const disableDelete = !canGrant(permission.table, "canDelete");
                      const disableAll = disableCreate && disableRead && disableUpdate;

                      return (
                        <TableRow key={permission.id} className="group hover:bg-rose-50/30 transition-colors">
                          <TableCell className="font-medium text-gray-800 text-sm">
                            {permission.table}
                          </TableCell>

                          <TableCell className="text-center">
                            <Switch
                              checked={allActive}
                              disabled={disableAll}
                              onCheckedChange={(checked) =>
                                handleAllSwitchChange(permission.id, checked)
                              }
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canCreate}
                              disabled={disableCreate}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(permission.id, "canCreate", checked)
                              }
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canRead}
                              disabled={disableRead}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(permission.id, "canRead", checked)
                              }
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canUpdate}
                              disabled={disableUpdate}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(permission.id, "canUpdate", checked)
                              }
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            <Switch
                              checked={permission.canDelete}
                              disabled={disableDelete}
                              onCheckedChange={(checked) =>
                                handleSwitchChange(permission.id, "canDelete", checked)
                              }
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            {modifiedPermissions.has(permission.id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleUpdatePermission(permission)}
                                className="text-xs border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                              >
                                {isPending && (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                )}
                                Sauvegarder
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

          {filteredPermissions.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-gray-500 text-right">
              {filteredPermissions.length} permission{filteredPermissions.length > 1 ? "s" : ""}
              {searchTerm && ` pour "${searchTerm}"`}
            </div>
          )}
        </Card>
      )}

      {!selectedUserId && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
            <UserIcon className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm">Sélectionnez un utilisateur pour gérer ses permissions</p>
        </div>
      )}
    </div>
  );
}
