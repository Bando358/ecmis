// --- Menu ---
"use client";

import * as React from "react";
import {
  Gauge,
  ListMinus,
  Pill,
  Frame,
  Map,
  PieChart,
  Settings2,
  UsersRound,
  HeartPulse,
  Stethoscope,
  Microscope,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TeamSwitcher } from "./team-switcher";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { usePermissionContext } from "@/contexts/PermissionContext";
import { TableName } from "@prisma/client";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  dashboard: {
    name: "Dashboard",
    logo: "Gauge",
    url: "/dashboard",
  },
  team: {
    name: "Logo aibef",
    favicon: "/favicon.ico",
    logo: "/logo.png",
  },
  navMain: [
    {
      title: "Clients",
      url: "#",
      icon: UsersRound,
      isActive: true,
      items: [
        {
          title: "import clients VIH",
          url: "/client-vih",
          permission: TableName.IMPORT_CLIENT_VIH,
        },
        {
          title: "all clients",
          url: "/client",
          permission: TableName.CLIENT,
        },
      ],
    },
    {
      title: "Pharmacy",
      url: "#",
      icon: Pill,
      items: [
        {
          title: "Rapport financier",
          url: "/rapport-financier",
          permission: TableName.RAPPORT_FINANCIER,
        },
        {
          title: "Produits",
          url: "/produits",
          permission: TableName.PRODUIT,
        },
        {
          title: "Prix Produits",
          url: "/prix-produit",
          permission: TableName.TARIF_PRODUIT,
        },
        {
          title: "Gestion de Stock",
          url: "/stock-produit",
          permission: TableName.STOCK_PRODUIT,
        },
        {
          title: "Inventaire",
          url: "/inventaire",
          permission: TableName.ANOMALIE_INVENTAIRE,
        },
        {
          title: "Historique commande",
          url: "/historique-commande",
          permission: TableName.COMMANDE_FOURNISSEUR,
        },
        {
          title: "Historique Inventaire",
          url: "/historique-inventaire",
          permission: TableName.HISTORIQUE_INVENTAIRE,
        },
        {
          title: "Tableau financier",
          url: "/tableau-financier",
          permission: TableName.TABLEAU_FINANCIER,
        },
        {
          title: "Journal des actions",
          url: "/journal-pharmacy",
          permission: TableName.JOURNAL_PHARMACIE,
        },
      ],
    },
    {
      title: "Listings & Reports",
      url: "#",
      icon: ListMinus,
      items: [
        {
          title: "Gestion RDV",
          url: "/gestion-rdv",
          permission: TableName.GESTION_RDV,
        },
        {
          title: "Listings",
          url: "/listings",
          permission: TableName.LISTING,
        },
        {
          title: "Rapports",
          url: "/rapports",
          permission: TableName.RAPPORT,
        },
        {
          title: "Analyser & Visualiser",
          url: "#",
          permission: TableName.ANALYSE_VISUALISER,
        },
      ],
    },
    {
      title: "Laboratoire",
      url: "#",
      icon: Microscope,
      items: [
        {
          title: "Créer un examen",
          url: "/fiche-examen",
          permission: TableName.EXAMEN,
        },
        {
          title: "Tarif Examen",
          url: "/fiche-prix-examen",
          permission: TableName.TARIF_EXAMEN,
        },
      ],
    },
    {
      title: "Echographie",
      url: "#",
      icon: HeartPulse,
      items: [
        {
          title: "Créer une Echographie",
          url: "/fiche-echographie",
          permission: TableName.ECHOGRAPHIE,
        },
        {
          title: "Tarif Echographie",
          url: "/fiche-prix-echographie",
          permission: TableName.TARIF_ECHOGRAPHIE,
        },
      ],
    },
    {
      title: "Prestation",
      url: "#",
      icon: Stethoscope,
      items: [
        {
          title: "Prestation",
          url: "/fiche-prestation",
          permission: TableName.PRESTATION,
        },
        {
          title: "Tarif Prestation",
          url: "/fiche-prix-prestation",
          permission: TableName.TARIF_PRESTATION,
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Administrator",
          url: "/administrator",
          permission: TableName.ADMINISTRATION,
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const isDashboardActive = pathname === data.dashboard.url;
  const { data: session } = useSession();
  const { permissionMap, isLoading: permissionsLoading } = usePermissionContext();
  const isAdmin = session?.user?.role === "ADMIN";
  const isPurgeUser = session?.user?.email === "bando358@gmail.com";

  const allowedTables = useMemo(() => {
    if (isAdmin) return new Set(["ALL"]);
    return new Set(
      Object.entries(permissionMap)
        .filter(([, p]) => p.canRead)
        .map(([table]) => table),
    );
  }, [permissionMap, isAdmin]);

  const navItems = useMemo(() => {
    if (!isPurgeUser) return data.navMain;
    return data.navMain.map((item) => {
      if (item.title !== "Settings") return item;
      return {
        ...item,
        items: [
          ...(item.items ?? []),
          {
            title: "Purge des clients",
            url: "/purge-clients",
            permission: TableName.ADMINISTRATION,
          },
        ],
      };
    });
  }, [isPurgeUser]);

  const permissionsLoaded = !permissionsLoading;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.team} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={cn(
                "mx-2",
                isDashboardActive && "bg-blue-100 text-blue-800 font-semibold",
              )}
              tooltip={data.dashboard.name}
            >
              <Link
                href={data.dashboard.url}
                prefetch={false}
                className="flex gap-2 items-center"
              >
                <Gauge
                  size={17}
                  strokeWidth={2.3}
                  className={cn(
                    "text-gray-600",
                    isDashboardActive && "text-blue-600",
                  )}
                />
                {data.dashboard.name}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavMain
          items={navItems}
          allowedTables={allowedTables}
          permissionsLoaded={permissionsLoaded}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
