"use client";

import React from "react";
import { TableName } from "@prisma/client";
import { usePermissions, PermissionAction } from "@/hooks/usePermissions";
import { AlertCircle, Lock, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuthGuardProps {
  /** Table sur laquelle vérifier la permission */
  table: TableName;
  /** Action requise (canCreate, canRead, canUpdate, canDelete) */
  action: PermissionAction;
  /** Contenu à afficher si l'utilisateur a la permission */
  children: React.ReactNode;
  /** Contenu personnalisé à afficher si non autorisé (optionnel) */
  fallback?: React.ReactNode;
  /** Afficher un message d'erreur au lieu de rien (default: true) */
  showUnauthorized?: boolean;
  /** Message personnalisé pour l'erreur d'autorisation */
  unauthorizedMessage?: string;
  /** Afficher un loader pendant le chargement (default: true) */
  showLoader?: boolean;
}

/**
 * Composant pour protéger des éléments UI basés sur les permissions
 *
 * @example
 * ```tsx
 * // Protéger un bouton de création
 * <AuthGuard table={TableName.CLIENT} action="canCreate">
 *   <Button onClick={handleCreate}>Nouveau client</Button>
 * </AuthGuard>
 *
 * // Avec un fallback personnalisé
 * <AuthGuard
 *   table={TableName.CLIENT}
 *   action="canDelete"
 *   fallback={<span className="text-muted">Action non autorisée</span>}
 * >
 *   <DeleteButton />
 * </AuthGuard>
 *
 * // Sans message d'erreur (cache simplement le contenu)
 * <AuthGuard table={TableName.USER} action="canRead" showUnauthorized={false}>
 *   <AdminPanel />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  table,
  action,
  children,
  fallback,
  showUnauthorized = true,
  unauthorizedMessage,
  showLoader = true,
}: AuthGuardProps) {
  const { hasPermission, isLoading, error } = usePermissions();

  // Afficher un loader pendant le chargement des permissions
  if (isLoading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Si erreur de chargement des permissions, afficher un message
  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Impossible de vérifier vos permissions. Veuillez rafraîchir la page.
        </AlertDescription>
      </Alert>
    );
  }

  // Vérifier la permission
  const isAuthorized = hasPermission(table, action);

  if (isAuthorized) {
    return <>{children}</>;
  }

  // Non autorisé
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUnauthorized) {
    return null;
  }

  // Message par défaut pour les non autorisés
  const actionLabels: Record<PermissionAction, string> = {
    canCreate: "créer",
    canRead: "consulter",
    canUpdate: "modifier",
    canDelete: "supprimer",
  };

  const defaultMessage =
    unauthorizedMessage ||
    `Vous n'avez pas la permission de ${actionLabels[action]} cet élément.`;

  return (
    <Alert variant="default" className="max-w-md border-amber-200 bg-amber-50">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Accès restreint</AlertTitle>
      <AlertDescription className="text-amber-700">
        {defaultMessage}
      </AlertDescription>
    </Alert>
  );
}

/**
 * HOC pour protéger un composant entier basé sur les permissions
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  table: TableName,
  action: PermissionAction,
  options?: Omit<AuthGuardProps, "table" | "action" | "children">
) {
  const WithAuthGuardComponent = (props: P) => {
    return (
      <AuthGuard table={table} action={action} {...options}>
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };

  WithAuthGuardComponent.displayName = `WithAuthGuard(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithAuthGuardComponent;
}

/**
 * Composant pour vérifier plusieurs permissions à la fois
 * L'utilisateur doit avoir TOUTES les permissions listées
 */
interface MultiAuthGuardProps {
  permissions: Array<{ table: TableName; action: PermissionAction }>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUnauthorized?: boolean;
  requireAll?: boolean; // true = AND, false = OR
}

export function MultiAuthGuard({
  permissions,
  children,
  fallback,
  showUnauthorized = true,
  requireAll = true,
}: MultiAuthGuardProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const checkPermissions = permissions.map((p) =>
    hasPermission(p.table, p.action)
  );

  const isAuthorized = requireAll
    ? checkPermissions.every(Boolean) // AND - toutes les permissions requises
    : checkPermissions.some(Boolean); // OR - au moins une permission

  if (isAuthorized) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUnauthorized) {
    return null;
  }

  return (
    <Alert variant="default" className="max-w-md border-amber-200 bg-amber-50">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Accès restreint</AlertTitle>
      <AlertDescription className="text-amber-700">
        Vous n&apos;avez pas les permissions nécessaires pour accéder à cette
        fonctionnalité.
      </AlertDescription>
    </Alert>
  );
}
