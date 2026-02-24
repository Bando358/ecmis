"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableName } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { ERROR_MESSAGES } from "@/lib/constants";
import { toast } from "sonner";
import {
  MapPin,
  Building2,
  UserPlus,
  Briefcase,
  ShieldCheck,
  CalendarCheck,
  DatabaseBackup,
  Settings2,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  permission?: TableName; // null = ADMIN only
}

export default function Administrator() {
  const { canRead, isLoading } = usePermissionContext();
  const { data: session } = useSession();
  const router = useRouter();

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!canRead(TableName.ADMINISTRATION)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  const tabAdmin: AdminItem[] = [
    {
      label: "Régions",
      description: "Gérer les régions géographiques",
      href: "/fiche-region/",
      icon: MapPin,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      permission: TableName.REGION,
    },
    {
      label: "Cliniques",
      description: "Créer et configurer les cliniques",
      href: "/fiche-clinique/",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      permission: TableName.CLINIQUE,
    },
    {
      label: "Comptes",
      description: "Gérer les comptes utilisateurs",
      href: "/fiche-compte/",
      icon: UserPlus,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      permission: TableName.USER,
    },
    {
      label: "Posts",
      description: "Définir les postes de travail",
      href: "/fiche-post/",
      icon: Briefcase,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      permission: TableName.POST,
    },
    {
      label: "Permissions",
      description: "Configurer les droits d'accès",
      href: "/fiche-permissions/",
      icon: ShieldCheck,
      color: "text-red-600",
      bgColor: "bg-red-50",
      permission: TableName.PERMISSION,
    },
    {
      label: "Activités",
      description: "Définir les types d'activités",
      href: "/fiche-activites/",
      icon: CalendarCheck,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      permission: TableName.ACTIVITE,
    },
    {
      label: "Sauvegarde",
      description: "Sauvegarder la base de données",
      href: "/sauvegarde",
      icon: DatabaseBackup,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      // Pas de permission spécifique → ADMIN uniquement
    },
  ];

  const visibleCards = tabAdmin.filter((item) => {
    if (!item.permission) return session?.user?.role === "ADMIN"; // Sauvegarde → ADMIN uniquement
    return canRead(item.permission);
  });

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Settings2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-muted-foreground">
            Configuration et gestion du système
          </p>
        </div>
        {session?.user?.role && (
          <Badge
            variant="secondary"
            className="ml-auto bg-blue-50 text-blue-700 border-blue-200"
          >
            {session.user.role}
          </Badge>
        )}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={index} href={item.href} prefetch={false}>
              <Card
                className={cn(
                  "group h-full cursor-pointer border-gray-200/80",
                  "transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-300",
                )}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                      item.bgColor,
                      "group-hover:bg-blue-100",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors duration-300",
                        item.color,
                        "group-hover:text-blue-600",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 group-hover:text-blue-800 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 mt-1 text-gray-300 transition-all duration-300",
                      "group-hover:text-blue-500 group-hover:translate-x-1",
                    )}
                  />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
