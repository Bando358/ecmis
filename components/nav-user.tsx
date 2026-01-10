"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
// import Image from "next/image";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEffect } from "react";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: session, status } = useSession();
  // Déplacer la redirection dans un useEffect
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [status, session, router]);

  // Gestion des états de chargement ou non-authentification
  if (status === "loading") {
    return <div>Loading...</div>; // Indicateur de chargement
  }
  if (!session) {
    return <div>Redirecting...</div>; // Affiche un message pendant la redirection
  }

  function extractInitials(name: string) {
    if (!name) return "";

    // Diviser le nom complet en mots
    const parts = name.trim().split(/\s+/);

    // Si le tableau est vide, retourner une chaîne vide
    if (parts.length === 0) return "";

    // Extraire la première lettre du nom de famille
    const lastNameInitial = parts[parts.length - 1][0].toUpperCase();

    // Extraire les premières lettres des prénoms
    const firstNamesInitials = parts
      .slice(0, -1) // Exclure le dernier mot (nom de famille)
      .map((part) => part[0].toUpperCase()) // Prendre la première lettre
      .join("");

    // Combiner les initiales des prénoms et du nom de famille
    return firstNamesInitials + lastNameInitial;
  }

  // Exemple d'utilisation
  const fullName = "Jean Paul Sartre";
  console.log(extractInitials(fullName)); // JPS

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={session?.user?.image ?? ""}
                  alt={session?.user?.name ?? "Default Name"}
                />
                <AvatarFallback className="rounded-lg">
                  {extractInitials(session?.user?.name as string)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {session?.user?.name}
                  {/* hello */}
                </span>
                <span className="truncate text-xs">
                  {session?.user?.email}
                  {/* hello */}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={session?.user?.image ?? ""}
                    alt={session?.user?.name ?? "Default Name"}
                  />
                  <AvatarFallback className="rounded-lg">
                    {extractInitials(session?.user?.name as string)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {session?.user?.name}
                    {/* hello */}
                  </span>
                  <span className="truncate text-xs">
                    {session?.user?.email}
                    {/* hello */}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup> */}
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem> */}
            <DropdownMenuItem onClick={() => signOut()}>
              {/* <DropdownMenuItem> */}
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
