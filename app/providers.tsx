// app/providers.tsx
"use client";
import ActivityTracker from "@/components/ActivityTracker";
import InactivityDebug from "@/components/InactivityDebug";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useInactivityGuard } from "@/hooks/useInactivityGuard";
import { ClientProvider } from "@/components/ClientContext";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { PermissionProvider } from "@/contexts/PermissionContext";

function InactivityGuard({ children }: { children: React.ReactNode }) {
  useInactivityGuard();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ActivityTracker />
      <PermissionProvider>
        <ClientProvider>
          <ConfirmDialogProvider>
            <InactivityGuard>{children}</InactivityGuard>
          </ConfirmDialogProvider>
        </ClientProvider>
      </PermissionProvider>
      <InactivityDebug />
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}
