"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatInitials } from "@/lib/formatters";
import { User } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface UserAvatarProps {
  /** URL de l'image */
  src?: string | null;
  /** Nom de famille */
  nom?: string | null;
  /** Prénom */
  prenom?: string | null;
  /** Texte alternatif pour l'image */
  alt?: string;
  /** Taille de l'avatar */
  size?: AvatarSize;
  /** Afficher un indicateur de statut */
  status?: "online" | "offline" | "busy" | "away";
  /** Classe CSS additionnelle */
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
  "2xl": "h-24 w-24 text-3xl",
};

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

// Génère une couleur de fond basée sur les initiales
function getAvatarColor(initials: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  // Générer un index basé sur les caractères
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Avatar utilisateur avec initiales et indicateur de statut
 *
 * @example
 * ```tsx
 * // Avec image
 * <UserAvatar
 *   src="/avatars/john.jpg"
 *   nom="Dupont"
 *   prenom="Jean"
 *   size="lg"
 * />
 *
 * // Sans image (affiche les initiales)
 * <UserAvatar
 *   nom="Dupont"
 *   prenom="Jean"
 *   status="online"
 * />
 *
 * // Avec statut
 * <UserAvatar
 *   nom="Martin"
 *   prenom="Marie"
 *   status="busy"
 *   size="lg"
 * />
 * ```
 */
export function UserAvatar({
  src,
  nom,
  prenom,
  alt,
  size = "md",
  status,
  className,
}: UserAvatarProps) {
  const initials = formatInitials(nom, prenom);
  const displayAlt = alt || `${prenom || ""} ${nom || ""}`.trim() || "Avatar";
  const bgColor = initials ? getAvatarColor(initials) : "bg-muted";

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {src && <AvatarImage src={src} alt={displayAlt} />}
        <AvatarFallback className={cn(bgColor, "text-white font-medium")}>
          {initials || <User className="h-1/2 w-1/2" />}
        </AvatarFallback>
      </Avatar>

      {/* Indicateur de statut */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            statusColors[status],
            size === "xs" && "h-1.5 w-1.5",
            size === "sm" && "h-2 w-2",
            size === "md" && "h-2.5 w-2.5",
            size === "lg" && "h-3 w-3",
            size === "xl" && "h-4 w-4",
            size === "2xl" && "h-5 w-5"
          )}
        />
      )}
    </div>
  );
}

/**
 * Groupe d'avatars avec overlap
 */
export function AvatarGroup({
  users,
  max = 4,
  size = "md",
  className,
}: {
  users: Array<{
    id: string;
    src?: string | null;
    nom?: string | null;
    prenom?: string | null;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}) {
  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const overlapClasses: Record<AvatarSize, string> = {
    xs: "-ml-1.5",
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4",
    xl: "-ml-5",
    "2xl": "-ml-6",
  };

  return (
    <div className={cn("flex items-center", className)}>
      {displayUsers.map((user, index) => (
        <div
          key={user.id}
          className={cn(
            "relative rounded-full border-2 border-background",
            index > 0 && overlapClasses[size]
          )}
          style={{ zIndex: displayUsers.length - index }}
        >
          <UserAvatar
            src={user.src}
            nom={user.nom}
            prenom={user.prenom}
            size={size}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            "relative rounded-full border-2 border-background",
            overlapClasses[size]
          )}
        >
          <Avatar className={cn(sizeClasses[size], "bg-muted")}>
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar avec nom affiché
 */
export function AvatarWithName({
  src,
  nom,
  prenom,
  subtitle,
  size = "md",
  status,
  orientation = "horizontal",
  className,
}: UserAvatarProps & {
  subtitle?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const fullName = `${prenom || ""} ${nom || ""}`.trim();

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        orientation === "vertical" && "flex-col text-center gap-2",
        className
      )}
    >
      <UserAvatar
        src={src}
        nom={nom}
        prenom={prenom}
        size={size}
        status={status}
      />
      <div className={cn(orientation === "vertical" && "text-center")}>
        {fullName && (
          <p className="font-medium leading-none">{fullName}</p>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
