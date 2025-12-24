"use client";

import * as React from "react";
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
    logo: string; // Ce doit être une chaîne (URL)
  };
}) {
  if (!team) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Wrapper Link pour que tout soit cliquable */}
        <Link href="/client" className="block">
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground px-3 w-full hover:bg-accent/50 transition-colors cursor-pointer"
          >
            {/* Favicon */}
            <div className="bg-blue-300 text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg mr-3">
              <Image
                src={team.favicon}
                alt={`${team.name} favicon`}
                width={20}
                height={20}
                className="size-5 object-contain"
              />
            </div>

            {/* Logo et nom */}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="flex items-center gap-2">
                <div className="relative  flex-shrink-0 -left-3 ">
                  <Image
                    src={"/logo.png"}
                    alt={`${team.name} logo`}
                    // fill
                    width={150}
                    height={24}
                    className="object-contain mt-2.5 "
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
