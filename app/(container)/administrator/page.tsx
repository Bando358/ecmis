"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  CalendarCheck,
  DatabaseBackup,
  Settings2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";

interface AdminItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  permission?: TableName;
}

export default function Administrator() {
  const { canRead, isLoading } = usePermissionContext();
  const { data: session } = useSession();
  const router = useRouter();

  if (isLoading) return <LoadingPage />;
  if (!canRead(TableName.ADMINISTRATION)) { toast.error(ERROR_MESSAGES.PERMISSION_DENIED_READ); router.back(); return null; }

  const tabAdmin: AdminItem[] = [
    {
      label: "Régions",
      description: "Gérer les régions géographiques",
      href: "/fiche-region/",
      icon: MapPin,
      color: "text-emerald-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      borderColor: "hover:border-emerald-300 hover:shadow-emerald-100/50",
      permission: TableName.REGION,
    },
    {
      label: "Cliniques",
      description: "Créer et configurer les cliniques",
      href: "/fiche-clinique/",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100/50",
      borderColor: "hover:border-blue-300 hover:shadow-blue-100/50",
      permission: TableName.CLINIQUE,
    },
    {
      label: "Comptes utilisateurs",
      description: "Gérer les comptes et les accès",
      href: "/fiche-compte/",
      icon: UserPlus,
      color: "text-violet-600",
      bgColor: "bg-gradient-to-br from-violet-50 to-violet-100/50",
      borderColor: "hover:border-violet-300 hover:shadow-violet-100/50",
      permission: TableName.USER,
    },
    {
      label: "Postes",
      description: "Définir les postes de travail",
      href: "/fiche-post/",
      icon: Briefcase,
      color: "text-amber-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      borderColor: "hover:border-amber-300 hover:shadow-amber-100/50",
      permission: TableName.POST,
    },
    {
      label: "Activités",
      description: "Définir les activités et lieux",
      href: "/fiche-activites/",
      icon: CalendarCheck,
      color: "text-cyan-600",
      bgColor: "bg-gradient-to-br from-cyan-50 to-cyan-100/50",
      borderColor: "hover:border-cyan-300 hover:shadow-cyan-100/50",
      permission: TableName.ACTIVITE,
    },
    {
      label: "Sauvegarde",
      description: "Sauvegarder et restaurer la base",
      href: "/sauvegarde",
      icon: DatabaseBackup,
      color: "text-slate-600",
      bgColor: "bg-gradient-to-br from-slate-50 to-slate-100/50",
      borderColor: "hover:border-slate-300 hover:shadow-slate-100/50",
    },
  ];

  const visibleCards = tabAdmin.filter((item) => {
    if (!item.permission) return session?.user?.role === "ADMIN";
    return canRead(item.permission);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* En-tête premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptMi0yaDF2MWgtMXYtMXptLTIgMGgxdjFoLTF2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <Settings2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
              <p className="text-sm text-slate-300 mt-1">
                Configuration et gestion du système eCMIS
              </p>
            </div>
          </div>
          {session?.user?.role && (
            <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium">
              {session.user.role}
            </Badge>
          )}
        </div>
      </div>

      {/* Grille de modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleCards.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={index} href={item.href} prefetch={false}>
              <Card
                className={cn(
                  "group h-full cursor-pointer border-gray-200/60 bg-white",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-1.5 hover:shadow-xl",
                  item.borderColor,
                )}
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                      item.bgColor,
                      "group-hover:scale-110 group-hover:shadow-md",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6 transition-all duration-300",
                        item.color,
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors text-[15px]">
                      {item.label}
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 shrink-0 mt-0.5 text-gray-300 transition-all duration-300",
                      "group-hover:text-gray-500 group-hover:translate-x-1",
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
