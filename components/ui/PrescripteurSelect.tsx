"use client";

import { useEffect, useState } from "react";
import ReactSelect from "react-select";
import { SafeUser } from "@/types/prisma";

/**
 * Select recherchable pour les prescripteurs.
 *
 * Identique au champ "Prestataire pour tous les onglets" de la page planning
 * (placeholder, message vide, menu portal) afin que tous les formulaires
 * fiche-* aient une expérience cohérente.
 *
 *   <PrescripteurSelect
 *     prescripteurs={allPrescripteur}
 *     value={field.value}
 *     onChange={field.onChange}
 *     required
 *   />
 */
export type PrescripteurOption = Pick<SafeUser, "id" | "name">;

interface Props {
  prescripteurs: PrescripteurOption[];
  value: string | undefined | null;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  instanceId?: string;
}

export default function PrescripteurSelect({
  prescripteurs,
  value,
  onChange,
  placeholder = "Rechercher un prestataire...",
  required,
  disabled,
  instanceId,
}: Props) {
  // Le portail doit être assigné APRÈS le montage côté client. Si on
  // évalue document.body directement dans le rendu, la version SSR fige
  // la valeur à undefined et le menu se rend alors inline en poussant le
  // contenu. On passe donc par un state initialisé dans useEffect.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const options = prescripteurs.map((p) => ({
    value: p.id,
    label: p.name || "",
  }));

  const selected = value ? options.find((o) => o.value === value) ?? null : null;

  return (
    <ReactSelect
      instanceId={instanceId}
      classNamePrefix="select"
      isClearable={!required}
      isSearchable
      isDisabled={disabled}
      placeholder={placeholder}
      noOptionsMessage={() => "Aucun prestataire trouvé"}
      options={options}
      value={selected}
      onChange={(opt) =>
        onChange((opt as { value: string } | null)?.value ?? "")
      }
      // Le menu est rendu dans document.body et positionné en "fixed"
      // pour flotter au-dessus du formulaire sans en perturber le layout.
      menuPortalTarget={portalTarget ?? undefined}
      menuPosition="fixed"
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      }}
      filterOption={(option, raw) => {
        if (!raw) return true;
        const q = raw
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .trim();
        const label = (option.label || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "");
        // Match exact substring
        if (label.includes(q)) return true;
        // Match initials : "ka" => "Koffi Aya"
        const initials = label
          .split(/\s+/)
          .map((part) => part[0] || "")
          .join("");
        return initials.includes(q);
      }}
    />
  );
}
