"use client";

import React, { createContext, useContext } from "react";
import {
  usePermissions,
  UsePermissionsReturn,
} from "@/hooks/usePermissions";

const PermissionContext = createContext<UsePermissionsReturn | null>(null);

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const permissions = usePermissions();
  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext(): UsePermissionsReturn {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error(
      "usePermissionContext must be used within a PermissionProvider",
    );
  }
  return ctx;
}
