// app/providers.tsx
"use client";
import ActivityTracker from "@/components/ActivityTracker";
import InactivityDebug from "@/components/InactivityDebug";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useInactivityGuard } from "@/hooks/useInactivityGuard";
import { ClientProvider } from "@/components/ClientContext";

function InactivityGuard({ children }: { children: React.ReactNode }) {
  useInactivityGuard();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ActivityTracker />
      <ClientProvider>
        <InactivityGuard>{children}</InactivityGuard>
      </ClientProvider>
      <InactivityDebug />
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}
