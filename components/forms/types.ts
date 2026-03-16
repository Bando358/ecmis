import { Client, Grossesse, Obstetrique, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";

export interface SharedFormProps {
  clientId: string;
  visites: Visite[];
  allPrescripteur: SafeUser[];
  isPrescripteur: boolean;
  client: Client | null;
  idUser: string;
  /** Données pré-chargées par le parent pour éviter un double fetch */
  initialGrossesses?: Grossesse[];
  initialObstetriques?: Obstetrique[];
  /** Callback quand une grossesse est créée (pour synchroniser les onglets) */
  onGrossesseCreated?: (grossesse: Grossesse) => void;
}
