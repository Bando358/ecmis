import { Client, Grossesse, Obstetrique, Visite } from "@prisma/client";
import { SafeUser } from "@/types/prisma";

export interface SharedFormProps {
  clientId: string;
  visites: Visite[];
  allPrescripteur: SafeUser[];
  isPrescripteur: boolean;
  client: Client | null;
  idUser: string;
  /** Prescripteur sélectionné au niveau de la page (partagé entre tous les onglets).
   *  Quand il est fourni, les formulaires l'utilisent comme idUser sans afficher
   *  leur propre sélecteur. */
  selectedPrescripteurId?: string;
  /** Données pré-chargées par le parent pour éviter un double fetch */
  initialGrossesses?: Grossesse[];
  initialObstetriques?: Obstetrique[];
  /** Callback quand une grossesse est créée (pour synchroniser les onglets) */
  onGrossesseCreated?: (grossesse: Grossesse) => void;
  /** Callback quand une visite est créée (pour synchroniser les onglets sans rechargement) */
  onVisiteCreated?: (visite: Visite) => void;
}
