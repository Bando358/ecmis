"use client";

import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher({
  team,
}: {
  team: {
    name: string;
    favicon: string;
    logo: string;
  };
}) {
  if (!team) {
    return null;
  }

  // Vérifier si on est dans la période de Noël (10 décembre - 10 janvier)
  const isChristmasPeriod = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    return (month === 12 && day >= 10) || (month === 1 && day <= 10);
  };

  const logoPath = isChristmasPeriod() ? "/logo-noel.png" : "/logo.png";
  const logoAlt = isChristmasPeriod()
    ? `${team.name} logo de Noël`
    : `${team.name} logo`;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/client" className="block">
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground px-3 w-full hover:bg-accent/50 transition-colors cursor-pointer"
          >
            {/* Favicon */}
            <div className="bg-blue-300  text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg mr-3">
              <Image
                src={team.favicon}
                alt={`${team.name} favicon`}
                width={20}
                height={20}
                className="size-5 object-contain"
              />
            </div>

            {/* Logo avec condition */}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="flex items-center gap-2">
                <div className="relative shrink-0 -left-3">
                  <Image
                    src={logoPath}
                    alt={logoAlt}
                    width={logoPath === "/logo-noel.png" ? 130 : 150}
                    height={24}
                    className="object-contain mt-2.5 py-2"
                  />
                </div>
              </div>
            </div>

            <ChevronsUpDown className="ml-auto text-muted-foreground" />
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
