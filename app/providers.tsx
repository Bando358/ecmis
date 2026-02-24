// app/providers.tsx
"use client";
import ActivityTracker from "@/components/ActivityTracker";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ClientProvider } from "@/components/ClientContext";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { PermissionProvider } from "@/contexts/PermissionContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <ActivityTracker />
      <PermissionProvider>
        <ClientProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </ClientProvider>
      </PermissionProvider>
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}
