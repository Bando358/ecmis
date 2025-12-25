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
import { TeamSwitcher } from "./team-switcher";

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
  // Un seul objet team avec favicon et logo
  team: {
    name: "Logo aibef",
    favicon: "/favicon.ico",
    logo: "/logo.png", // Ici c'est une chaîne (URL), pas un élément JSX
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
        },
        {
          title: "all clients",
          url: "/client",
        },
      ],
    },
    {
      title: "Pharmacy",
      url: "#",
      icon: Pill,
      items: [
        {
          title: "Produits",
          url: "/produits",
        },
        {
          title: "Gestion de Stock",
          url: "/stock-produit",
        },
        {
          title: "Prix Produits",
          url: "/prix-produit",
        },
        {
          title: "Fiche de vente",
          url: "/fiche-de-vente",
        },
        {
          title: "Inventaire",
          url: "/inventaire",
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
        },
        {
          title: "Listings",
          url: "/listings",
        },
        {
          title: "Rapports",
          url: "/rapports",
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
        },
        {
          title: "Tarif Examen",
          url: "/fiche-prix-examen",
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
        },
        {
          title: "Tarif Echographie",
          url: "/fiche-prix-echographie",
        },
        // {
        //   title: "new echographie",
        //   url: "#",
        // },
        // {
        //   title: "Get Started",
        //   url: "#",
        // },
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
        },
        {
          title: "Tarif Prestation",
          url: "/fiche-prix-prestation",
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.team} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="mx-2" tooltip={data.dashboard.name}>
              <Link
                href={data.dashboard.url}
                className="flex gap-2 items-center"
              >
                <Gauge size={17} strokeWidth={2.3} className=" text-gray-600" />
                {data.dashboard.name}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
