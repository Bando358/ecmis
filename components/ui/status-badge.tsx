"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MinusCircle,
  Loader2,
  LucideIcon,
} from "lucide-react";

export type StatusType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "inactive"
  | "loading";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  success: {
    label: "Succès",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  error: {
    label: "Erreur",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  },
  warning: {
    label: "Attention",
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  },
  info: {
    label: "Info",
    icon: AlertCircle,
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  inactive: {
    label: "Inactif",
    icon: MinusCircle,
    className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
  },
  loading: {
    label: "Chargement",
    icon: Loader2,
    className: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100",
  },
};

interface StatusBadgeProps {
  /** Type de statut */
  status: StatusType;
  /** Label personnalisé (optionnel) */
  label?: string;
  /** Afficher l'icône */
  showIcon?: boolean;
  /** Taille */
  size?: "sm" | "default" | "lg";
  /** Classes additionnelles */
  className?: string;
}

/**
 * Badge de statut avec icône et couleur
 *
 * @example
 * ```tsx
 * <StatusBadge status="success" />
 * <StatusBadge status="pending" label="En cours" />
 * <StatusBadge status="error" showIcon={false} />
 * ```
 */
export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = "default",
  className,
}: StatusBadgeProps) {
  const config = statusConfigs[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconSizes[size],
            status === "loading" && "animate-spin"
          )}
        />
      )}
      {label || config.label}
    </Badge>
  );
}

// ============================================
// BADGES SPÉCIFIQUES AU DOMAINE MÉDICAL
// ============================================

type PaymentStatus = "paid" | "partial" | "unpaid" | "refunded";

const paymentStatusMap: Record<PaymentStatus, { status: StatusType; label: string }> = {
  paid: { status: "success", label: "Payé" },
  partial: { status: "warning", label: "Partiel" },
  unpaid: { status: "error", label: "Impayé" },
  refunded: { status: "info", label: "Remboursé" },
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const config = paymentStatusMap[status];
  return (
    <StatusBadge
      status={config.status}
      label={config.label}
      className={className}
    />
  );
}

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "noshow";

const appointmentStatusMap: Record<AppointmentStatus, { status: StatusType; label: string }> = {
  scheduled: { status: "pending", label: "Planifié" },
  confirmed: { status: "info", label: "Confirmé" },
  completed: { status: "success", label: "Terminé" },
  cancelled: { status: "inactive", label: "Annulé" },
  noshow: { status: "error", label: "Absent" },
};

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const config = appointmentStatusMap[status];
  return (
    <StatusBadge
      status={config.status}
      label={config.label}
      className={className}
    />
  );
}

type UserStatus = "active" | "inactive" | "banned" | "pending";

const userStatusMap: Record<UserStatus, { status: StatusType; label: string }> = {
  active: { status: "success", label: "Actif" },
  inactive: { status: "inactive", label: "Inactif" },
  banned: { status: "error", label: "Banni" },
  pending: { status: "pending", label: "En attente" },
};

export function UserStatusBadge({
  status,
  className,
}: {
  status: UserStatus;
  className?: string;
}) {
  const config = userStatusMap[status];
  return (
    <StatusBadge
      status={config.status}
      label={config.label}
      className={className}
    />
  );
}

type StockStatus = "inStock" | "lowStock" | "outOfStock";

const stockStatusMap: Record<StockStatus, { status: StatusType; label: string }> = {
  inStock: { status: "success", label: "En stock" },
  lowStock: { status: "warning", label: "Stock faible" },
  outOfStock: { status: "error", label: "Rupture" },
};

export function StockStatusBadge({
  status,
  className,
}: {
  status: StockStatus;
  className?: string;
}) {
  const config = stockStatusMap[status];
  return (
    <StatusBadge
      status={config.status}
      label={config.label}
      className={className}
    />
  );
}

/**
 * Détermine le statut de stock basé sur la quantité
 */
export function getStockStatus(
  quantity: number,
  minStock: number = 10
): StockStatus {
  if (quantity <= 0) return "outOfStock";
  if (quantity <= minStock) return "lowStock";
  return "inStock";
}

/**
 * Badge pour afficher un booléen Oui/Non
 */
export function BooleanBadge({
  value,
  trueLabel = "Oui",
  falseLabel = "Non",
  className,
}: {
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
  className?: string;
}) {
  if (value === null || value === undefined) {
    return (
      <StatusBadge status="inactive" label="-" showIcon={false} className={className} />
    );
  }

  return (
    <StatusBadge
      status={value ? "success" : "inactive"}
      label={value ? trueLabel : falseLabel}
      showIcon={false}
      className={className}
    />
  );
}
