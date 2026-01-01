"use client";

import {
  getUserPermissionsById,
  updatePermission,
} from "@/lib/actions/permissionActions";
import { Permission, User } from "@prisma/client";
import { use, useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { getOneUser } from "@/lib/actions/authActions";
import { useSession } from "next-auth/react";

export default function PermissionPage({
  params,
}: {
  params: Promise<{ permissionId: string }>;
}) {
  const { permissionId } = use(params);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userAdmin, setUserAdmin] = useState<User | null>(null);
  const [permissionsUserAdmin, setPermissionsUserAdmin] = useState<
    Permission[]
  >([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [modifiedPermissions, setModifiedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  const { data: session } = useSession();

  // === Charger toutes les données en une seule fois ===
  useEffect(() => {
    const fetchAllData = async () => {
      if (!session?.user?.id) return;

      try {
        setLoading(true);

        // Charger l'admin connecté et ses permissions
        const adminData = await getOneUser(session.user.id);
        setUserAdmin(adminData);

        const adminPerms = await getUserPermissionsById(session.user.id);
        setPermissionsUserAdmin(adminPerms);

        // Charger le user cible et ses permissions
        const targetUserData = await getOneUser(permissionId);
        setTargetUser(targetUserData);

        const targetPerms = await getUserPermissionsById(permissionId);
        const sorted = targetPerms.sort((a, b) =>
          a.table.localeCompare(b.table)
        );

        // retirer bilan de sorted
        const filteredSorted = sorted.filter((perm) => perm.table !== "BILAN");

        setPermissions(filteredSorted);
        setFilteredPermissions(filteredSorted);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [permissionId, session?.user?.id]);

  // === Filtrage ===
  useEffect(() => {
    const filtered = permissions.filter((permission) =>
      permission.table.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPermissions(filtered);
  }, [searchTerm, permissions]);

  // === Vérifie si l'admin a le droit d'accorder une action sur une table ===
  const canGrant = (
    table: string,
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

  // Switch global "Tout" (exclut Delete)
  const handleAllSwitchChange = (permissionId: string, value: boolean) => {
    const targetPerm = permissions.find((p) => p.id === permissionId);
    if (!targetPerm) return;

    // Appliquer seulement Create, Read et Update (pas Delete)
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
            // canDelete reste inchangé
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Chargement...</div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Gestion des Permissions</h1>
        <p className="text-gray-600">
          Utilisateur : <span className="font-medium">{targetUser?.name}</span>
        </p>
      </div>

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">TableName</TableHead>
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
                  Aucune permission trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredPermissions.map((permission) => {
                // allActive vérifie seulement Create, Read et Update (pas Delete)
                const allActive =
                  permission.canCreate &&
                  permission.canRead &&
                  permission.canUpdate;

                const disableCreate = !canGrant(permission.table, "canCreate");
                const disableRead = !canGrant(permission.table, "canRead");
                const disableUpdate = !canGrant(permission.table, "canUpdate");
                const disableDelete = !canGrant(permission.table, "canDelete");
                // disableAll vérifie seulement Create, Read et Update
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
                          handleSwitchChange(permission.id, "canRead", checked)
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
                          onClick={() => handleUpdatePermission(permission)}
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
      </div>
    </div>
  );
}
