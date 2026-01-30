// app/providers.tsx
"use client";
import ActivityTracker from "@/components/ActivityTracker";
import InactivityDebug from "@/components/InactivityDebug";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useInactivityGuard } from "@/hooks/useInactivityGuard";
import { ClientProvider } from "@/components/ClientContext";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

function InactivityGuard({ children }: { children: React.ReactNode }) {
  useInactivityGuard();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ActivityTracker />
      <ClientProvider>
        <ConfirmDialogProvider>
          <InactivityGuard>{children}</InactivityGuard>
        </ConfirmDialogProvider>
      </ClientProvider>
      <InactivityDebug />
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}
