"use client";

import { TarifExamen, Examen, TypeExamen } from "@prisma/client";
import React, { useMemo } from "react";
import Select, { SingleValue, GroupBase } from "react-select";

const typeExamenLabels: Record<TypeExamen, string> = {
  MEDECIN: "Médecine",
  GYNECOLOGIE: "Gynécologie",
  OBSTETRIQUE: "Obstétrique",
  VIH: "VIH",
  IST: "IST",
};

interface MultiSelectProps {
  tarifExamens: TarifExamen[];
  selectedOptions: TarifExamen[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<TarifExamen[]>>;
  isLoading?: boolean;
  allExamens: Examen[];
}

type OptionType = TarifExamen & {
  value: string;
  label: string;
};

const MultiSelectDemandeExamen: React.FC<MultiSelectProps> = ({
  tarifExamens,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
  allExamens,
}) => {
  const handleChange = (selected: SingleValue<OptionType>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, OptionType[]>();

    for (const tarif of tarifExamens) {
      const examen = allExamens.find((e) => e.id === tarif.idExamen);
      const type = examen?.typeExamen || "AUTRE";
      const label = typeExamenLabels[type as TypeExamen] || type;

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label)!.push({
        value: tarif.id,
        label: `${tarif.nomExamen} - ${tarif.prixExamen} CFA`,
        ...tarif,
      });
    }

    const result: GroupBase<OptionType>[] = [];
    for (const [label, options] of groups) {
      result.push({ label, options });
    }

    return result;
  }, [tarifExamens, allExamens]);

  return (
    <Select<OptionType, false, GroupBase<OptionType>>
      isMulti={false}
      options={groupedOptions}
      getOptionLabel={(e) => e.nomExamen}
      getOptionValue={(e) => e.id}
      value={
        selectedOptions[0]
          ? ({
              ...selectedOptions[0],
              value: selectedOptions[0].id,
              label: selectedOptions[0].nomExamen,
            } as OptionType)
          : null
      }
      onChange={handleChange}
      className="w-full"
      placeholder="Rechercher un examen..."
      noOptionsMessage={() => "Aucun examen disponible"}
      isLoading={isLoading}
      loadingMessage={() => "Chargement des examens..."}
      formatGroupLabel={(group) => (
        <div className="flex items-center gap-2 py-1">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {group.label}
          </span>
          <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5">
            {group.options.length}
          </span>
        </div>
      )}
    />
  );
};

export default MultiSelectDemandeExamen;
