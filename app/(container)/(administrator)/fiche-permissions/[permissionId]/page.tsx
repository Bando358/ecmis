"use client";

import {
  getUserPermissionsById,
  updatePermission,
} from "@/lib/actions/permissionActions";
import { Permission, TableName } from "@prisma/client";
import { SafeUser } from "@/types/prisma";
import { use, useState, useEffect } from "react";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Search,
  ShieldCheck,
  Save,
  X,
  User as UserIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/loading";
import { getOneUser } from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PermissionPage({
  params,
}: {
  params: Promise<{ permissionId: string }>;
}) {
  const { permissionId } = use(params);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userAdmin, setUserAdmin] = useState<SafeUser | null>(null);
  const [permissionsUserAdmin, setPermissionsUserAdmin] = useState<
    Permission[]
  >([]);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [modifiedPermissions, setModifiedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const { canRead, isLoading: isLoadingPermissions } = usePermissionContext();

  useEffect(() => {
    const fetchUserAdmin = async () => {
      if (session?.user?.id) {
        const userData = await getOneUser(session.user.id);
        setUserAdmin(userData);
        const permsAdmin = await getUserPermissionsById(session.user.id);
        setPermissionsUserAdmin(permsAdmin);
      }
    };
    fetchUserAdmin();
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchPermissions = async () => {
      const userData = await getOneUser(permissionId);
      const perms = await getUserPermissionsById(permissionId);
      const sorted = perms.sort((a, b) => a.table.localeCompare(b.table));
      const filteredSorted = sorted.filter((perm) => perm.table !== "BILAN");
      setPermissions(filteredSorted);
      setFilteredPermissions(filteredSorted);
      setUser(userData);
      setLoading(false);
    };
    if (userAdmin) fetchPermissions();
  }, [permissionId, userAdmin]);

  useEffect(() => {
    const filtered = permissions.filter((permission) =>
      permission.table.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPermissions(filtered);
  }, [searchTerm, permissions]);

  const canGrant = (
    table: string,
    action: "canCreate" | "canRead" | "canUpdate" | "canDelete"
  ): boolean => {
    if (userAdmin?.role === "ADMIN") return true;
    const adminPerm = permissionsUserAdmin.find((p) => p.table === table);
    if (!adminPerm) return false;
    return adminPerm[action];
  };

  const handleSwitchChange = (
    permId: string,
    action: "canCreate" | "canRead" | "canUpdate" | "canDelete",
    value: boolean
  ) => {
    const updatedPermissions = permissions.map((perm) =>
      perm.id === permId ? { ...perm, [action]: value } : perm
    );
    setPermissions(updatedPermissions);
    const newModified = new Set(modifiedPermissions);
    newModified.add(permId);
    setModifiedPermissions(newModified);
  };

  const handleAllSwitchChange = (permId: string, value: boolean) => {
    const targetPerm = permissions.find((p) => p.id === permId);
    if (!targetPerm) return;
    const updatedPermissions = permissions.map((perm) =>
      perm.id === permId
        ? {
            ...perm,
            canCreate: canGrant(perm.table, "canCreate")
              ? value
              : perm.canCreate,
            canRead: canGrant(perm.table, "canRead") ? value : perm.canRead,
            canUpdate: canGrant(perm.table, "canUpdate")
              ? value
              : perm.canUpdate,
            canDelete: perm.canDelete,
          }
        : perm
    );
    setPermissions(updatedPermissions);
    const newModified = new Set(modifiedPermissions);
    newModified.add(permId);
    setModifiedPermissions(newModified);
  };

  const handleUpdatePermission = async (permission: Permission) => {
    setIsPending(true);
    try {
      await Promise.all([
        updatePermission(permission.userId, permission.table, "canCreate", permission.canCreate),
        updatePermission(permission.userId, permission.table, "canRead", permission.canRead),
        updatePermission(permission.userId, permission.table, "canUpdate", permission.canUpdate),
        updatePermission(permission.userId, permission.table, "canDelete", permission.canDelete),
      ]);
      const newModified = new Set(modifiedPermissions);
      newModified.delete(permission.id);
      setModifiedPermissions(newModified);
      toast.success("Permission mise à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    }
    setIsPending(false);
  };

  const handleUpdateAll = async () => {
    setIsPending(true);
    try {
      for (const permId of modifiedPermissions) {
        const permission = permissions.find((p) => p.id === permId);
        if (permission) await handleUpdatePermission(permission);
      }
      setModifiedPermissions(new Set());
      toast.success("Toutes les permissions ont été mises à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour globale:", error);
      toast.error("Erreur lors de la mise à jour globale");
    }
    setIsPending(false);
  };

  if (isLoadingPermissions) return <TableSkeleton rows={5} columns={7} />;
  if (!canRead(TableName.PERMISSION)) {
    toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ);
    router.back();
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl hover:bg-rose-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Gestion des permissions
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="font-medium text-rose-600">{user?.name}</span>
                {user?.email && (
                  <span className="text-gray-400">· {user.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {modifiedPermissions.size > 0 && (
          <Button
            onClick={handleUpdateAll}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Tout enregistrer ({modifiedPermissions.size})
          </Button>
        )}
      </div>

      {/* Table Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-rose-500" />
              <h2 className="font-semibold text-gray-900">Matrice des permissions</h2>
              <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                {filteredPermissions.length}
              </Badge>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 bg-white/80 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="w-1/4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Table
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tout
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Créer
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Lire
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Modifier
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-red-600">
                  Supprimer
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-rose-300" />
                      </div>
                      <p className="text-sm text-gray-500">
                        Aucune permission trouvée
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
                  const disableAll =
                    disableCreate && disableRead && disableUpdate;

                  const isModified = modifiedPermissions.has(permission.id);

                  return (
                    <TableRow
                      key={permission.id}
                      className={`group transition-colors ${
                        isModified
                          ? "bg-rose-50/50"
                          : "hover:bg-gray-50/50"
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-700">
                            {permission.table}
                          </span>
                          {isModified && (
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                          )}
                        </div>
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
                        {isModified && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleUpdatePermission(permission)}
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            {isPending ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Sauver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
