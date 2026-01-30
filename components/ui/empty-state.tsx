"use client";

import { ReactNode } from "react";
import {
  FileSearch,
  Users,
  Package,
  FileText,
  Calendar,
  Search,
  FolderOpen,
  AlertCircle,
  Plus,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateVariant =
  | "default"
  | "search"
  | "clients"
  | "products"
  | "documents"
  | "calendar"
  | "folder"
  | "error";

interface EmptyStateProps {
  /** Variante prédéfinie */
  variant?: EmptyStateVariant;
  /** Icône personnalisée */
  icon?: LucideIcon;
  /** Titre */
  title: string;
  /** Description */
  description?: string;
  /** Texte du bouton d'action */
  actionLabel?: string;
  /** Callback du bouton d'action */
  onAction?: () => void;
  /** Icône du bouton d'action */
  actionIcon?: LucideIcon;
  /** Contenu additionnel */
  children?: ReactNode;
  /** Classe CSS */
  className?: string;
}

const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: FileSearch,
  search: Search,
  clients: Users,
  products: Package,
  documents: FileText,
  calendar: Calendar,
  folder: FolderOpen,
  error: AlertCircle,
};

const variantColors: Record<EmptyStateVariant, string> = {
  default: "text-gray-400",
  search: "text-blue-400",
  clients: "text-indigo-400",
  products: "text-emerald-400",
  documents: "text-amber-400",
  calendar: "text-purple-400",
  folder: "text-slate-400",
  error: "text-red-400",
};

/**
 * Composant pour afficher un état vide
 *
 * @example
 * ```tsx
 * // Basique
 * <EmptyState
 *   variant="clients"
 *   title="Aucun client"
 *   description="Commencez par ajouter votre premier client"
 *   actionLabel="Nouveau client"
 *   onAction={() => router.push("/clients/new")}
 * />
 *
 * // Recherche sans résultat
 * <EmptyState
 *   variant="search"
 *   title="Aucun résultat"
 *   description={`Aucun résultat pour "${searchQuery}"`}
 * />
 *
 * // Personnalisé
 * <EmptyState
 *   icon={Stethoscope}
 *   title="Aucune consultation"
 *   description="Ce patient n'a pas encore de consultation"
 * >
 *   <Button>Créer une consultation</Button>
 * </EmptyState>
 * ```
 */
export function EmptyState({
  variant = "default",
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  children,
  className,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];
  const iconColor = variantColors[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Icône avec cercle de fond */}
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className={cn("h-10 w-10", iconColor)} strokeWidth={1.5} />
      </div>

      {/* Titre */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Action ou children */}
      {actionLabel && onAction ? (
        <Button onClick={onAction}>
          <ActionIcon className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Variantes pré-configurées pour les cas courants
 */
export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title="Aucun résultat"
      description={`Aucun résultat trouvé pour "${query}". Essayez de modifier votre recherche.`}
      actionLabel={onClear ? "Effacer la recherche" : undefined}
      onAction={onClear}
      actionIcon={Search}
    />
  );
}

export function NoClients({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      variant="clients"
      title="Aucun client"
      description="Vous n'avez pas encore de clients. Commencez par en ajouter un."
      actionLabel={onAdd ? "Nouveau client" : undefined}
      onAction={onAdd}
    />
  );
}

export function NoProducts({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      variant="products"
      title="Aucun produit"
      description="Votre inventaire est vide. Ajoutez des produits pour commencer."
      actionLabel={onAdd ? "Nouveau produit" : undefined}
      onAction={onAdd}
    />
  );
}

export function NoDocuments({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      variant="documents"
      title="Aucun document"
      description="Aucun document n'a été créé pour ce dossier."
      actionLabel={onAdd ? "Nouveau document" : undefined}
      onAction={onAdd}
    />
  );
}

export function NoAppointments({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      variant="calendar"
      title="Aucun rendez-vous"
      description="Aucun rendez-vous prévu. Planifiez-en un nouveau."
      actionLabel={onAdd ? "Nouveau rendez-vous" : undefined}
      onAction={onAdd}
    />
  );
}

export function ErrorState({
  message = "Une erreur est survenue",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title="Erreur"
      description={message}
      actionLabel={onRetry ? "Réessayer" : undefined}
      onAction={onRetry}
    />
  );
}
