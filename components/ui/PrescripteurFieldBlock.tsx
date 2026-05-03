"use client";

import { UserCog } from "lucide-react";
import PrescripteurSelect, { PrescripteurOption } from "./PrescripteurSelect";

/**
 * Bloc complet de sélection du prestataire — réplique exacte du champ
 * "Prestataire pour tous les onglets" de la page planning :
 *   - carte bleu clair arrondie avec bordure
 *   - icône UserCog + label "Prestataire" + astérisque rouge si requis
 *   - PrescripteurSelect recherchable à droite (max-w-sm sur desktop)
 *
 * Utilisable directement dans un FormField RHF :
 *   <FormField
 *     control={form.control}
 *     name="xxxIdUser"
 *     render={({ field }) => (
 *       <FormItem>
 *         <FormControl>
 *           <PrescripteurFieldBlock
 *             instanceId="xxx-prescripteur"
 *             prescripteurs={allPrescripteur}
 *             value={field.value ?? ""}
 *             onChange={field.onChange}
 *             required
 *           />
 *         </FormControl>
 *         <FormMessage />
 *       </FormItem>
 *     )}
 *   />
 */
interface Props {
  prescripteurs: PrescripteurOption[];
  value: string | undefined | null;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  instanceId?: string;
}

export default function PrescripteurFieldBlock({
  prescripteurs,
  value,
  onChange,
  required,
  disabled,
  label = "Prestataire",
  instanceId,
}: Props) {
  return (
    <div className="mb-3 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 flex flex-col gap-2">
      <label className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
        <UserCog className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <PrescripteurSelect
        instanceId={instanceId}
        prescripteurs={prescripteurs}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
