// clientContext.tsx
"use client";

import React, { createContext, useContext, useState } from "react";

interface ClientContextProps {
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
}
const ClientContext = createContext<ClientContextProps | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <ClientContext.Provider value={{ selectedClientId, setSelectedClientId }}>
      {children}
    </ClientContext.Provider>
  );
};

// ==== HOOKS ====

// ==== HOOKS CLIENT ====
export const useClientContext = (): ClientContextProps => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
};
