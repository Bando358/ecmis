"use client";
import { getOneClient } from "@/lib/actions/clientActions";
import { useClientContext } from "./ClientContext";
import { useState, useEffect } from "react";
import { Client } from "@prisma/client";

export function ShowClient() {
  const [client, setClient] = useState<Client>();
  const { selectedClientId } = useClientContext();

  useEffect(() => {
    const fetchData = async () => {
      const result = await getOneClient(selectedClientId as string);
      setClient(result as Client); // Assurez-vous que result est bien de type CliniqueData[]
    };
    fetchData();
  }, [selectedClientId]);

  const calculateAge = (dateNaissance: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dateNaissance.getFullYear();
    const monthDifference = today.getMonth() - dateNaissance.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dateNaissance.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <div>
      {selectedClientId && client && (
        <div className="flex flex-col text-center">
          <p className="font-bold text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl">
            {<span>{client.nom.toUpperCase()} </span>}{" "}
            {<span>{client.prenom.toUpperCase()} </span>}{" "}
            {client.dateNaissance
              ? calculateAge(new Date(client.dateNaissance))
              : "Âge non disponible"}{" "}
            ans Tel: {client.tel_1}
          </p>
          <p className="font-semibold uppercase text-gray-600 dark:text-slate-400 text-xs sm:text-sm md:text-base">
            {client.code}
          </p>
        </div>
      )}
    </div>
  );
}
