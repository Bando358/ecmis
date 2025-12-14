"use client";

import { TarifEchographie } from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  tarifEchographies: TarifEchographie[];
  selectedOptions: TarifEchographie[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<TarifEchographie[]>>;
  isLoading?: boolean;
}

const MultiSelectDemandeEchographie: React.FC<MultiSelectProps> = ({
  tarifEchographies,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
}) => {
  // Mode single select : accepte SingleValue
  const handleChange = (selected: SingleValue<TarifEchographie>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const options = tarifEchographies.map((tarif) => ({
    value: tarif.id,
    label: `${tarif.nomEchographie} - ${tarif.prixEchographie} CFA`,
    ...tarif,
  }));

  return (
    <Select
      isMulti={false}
      options={options}
      getOptionLabel={(e) => e.nomEchographie}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ?? null}
      onChange={handleChange}
      className="w-full"
      placeholder="Sélectionner une échographie..."
      isLoading={isLoading}
      loadingMessage={() => "Chargement des échographies..."}
    />
  );
};

export default MultiSelectDemandeEchographie;
