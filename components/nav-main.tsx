"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="px-2">
      <SidebarGroupLabel className="px-2 py-3 text-sm font-semibold">
        Menu
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const hasActiveChild = item.items?.some(
            (sub) => sub.url !== "#" && pathname === sub.url,
          );
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || hasActiveChild}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "px-3",
                      hasActiveChild &&
                        "bg-blue-50 text-blue-700 font-semibold",
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          hasActiveChild && "text-blue-600",
                        )}
                      />
                    )}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mt-1 space-y-1 ml-4">
                    {item.items?.map((subItem) => {
                      const isActive =
                        subItem.url !== "#" && pathname === subItem.url;
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className={cn(
                              "py-4 px-3",
                              isActive &&
                                "bg-blue-100 text-blue-800 font-semibold border-l-2 border-blue-600",
                            )}
                          >
                            <Link href={subItem.url} prefetch={false}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
