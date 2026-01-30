"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TableName, Permission } from "@prisma/client";
import { getUserPermissionsById } from "@/lib/actions/permissionActions";

export type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

export interface PermissionMap {
  [key: string]: {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
}

export interface UsePermissionsReturn {
  permissions: Permission[];
  permissionMap: PermissionMap;
  isLoading: boolean;
  error: string | null;
  hasPermission: (table: TableName, action: PermissionAction) => boolean;
  canCreate: (table: TableName) => boolean;
  canRead: (table: TableName) => boolean;
  canUpdate: (table: TableName) => boolean;
  canDelete: (table: TableName) => boolean;
  refreshPermissions: () => Promise<void>;
}

/**
 * Hook pour gérer les permissions de l'utilisateur connecté
 * @returns Objet contenant les permissions et les fonctions de vérification
 */
export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionMap, setPermissionMap] = useState<PermissionMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id;

  // Construire une map des permissions pour un accès rapide O(1)
  const buildPermissionMap = useCallback((perms: Permission[]): PermissionMap => {
    const map: PermissionMap = {};
    perms.forEach((perm) => {
      map[perm.table] = {
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      };
    });
    return map;
  }, []);

  // Charger les permissions
  const loadPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions([]);
      setPermissionMap({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const userPermissions = await getUserPermissionsById(userId);
      setPermissions(userPermissions);
      setPermissionMap(buildPermissionMap(userPermissions));
    } catch (err) {
      console.error("Erreur lors du chargement des permissions:", err);
      setError("Impossible de charger les permissions");
      setPermissions([]);
      setPermissionMap({});
    } finally {
      setIsLoading(false);
    }
  }, [userId, buildPermissionMap]);

  // Rafraîchir les permissions
  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  // Charger les permissions au montage et quand l'userId change
  useEffect(() => {
    if (status === "authenticated" && userId) {
      loadPermissions();
    } else if (status === "unauthenticated") {
      setPermissions([]);
      setPermissionMap({});
      setIsLoading(false);
    }
  }, [status, userId, loadPermissions]);

  // Vérifier une permission spécifique
  const hasPermission = useCallback(
    (table: TableName, action: PermissionAction): boolean => {
      // Les admins ont toutes les permissions
      if (session?.user?.role === "ADMIN") {
        return true;
      }

      const tablePermissions = permissionMap[table];
      if (!tablePermissions) {
        return false;
      }

      return tablePermissions[action] ?? false;
    },
    [permissionMap, session?.user?.role]
  );

  // Raccourcis pour les actions courantes
  const canCreate = useCallback(
    (table: TableName) => hasPermission(table, "canCreate"),
    [hasPermission]
  );

  const canRead = useCallback(
    (table: TableName) => hasPermission(table, "canRead"),
    [hasPermission]
  );

  const canUpdate = useCallback(
    (table: TableName) => hasPermission(table, "canUpdate"),
    [hasPermission]
  );

  const canDelete = useCallback(
    (table: TableName) => hasPermission(table, "canDelete"),
    [hasPermission]
  );

  return {
    permissions,
    permissionMap,
    isLoading,
    error,
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    refreshPermissions,
  };
}
