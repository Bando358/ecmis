import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { ClientProvider } from "@/components/ClientContext"; // Import the provider
import { ShowClient } from "@/components/showClient";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      {" "}
      {/* Wrap everything with ClientProvider */}
      <SidebarProvider>
        <AppSidebar />
        <main className="w-full">
          <header className="flex justify-between h-16 shrink-0 items-center border-b px-4 mb-2 shadow-sm">
            <div className="flex items-center">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </div>
            <div className="flex items-center gap-2 px-4">
              <ShowClient />
            </div>
            <div className="flex items-center">
              {/* <Separator orientation="vertical" className="mr-2 h-4" />
              <ThemeToggle /> */}
            </div>
          </header>

          {children}
        </main>
      </SidebarProvider>
    </ClientProvider>
  );
}
