// MultiSelectProduit.tsx
import { TarifPrestation } from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  tarifs: TarifPrestation[];
  selectedOptions: TarifPrestation[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<TarifPrestation[]>>;
  isLoading?: boolean;
}

const MultiSelectPrestation: React.FC<MultiSelectProps> = ({
  tarifs,
  selectedOptions,
  setSelectedOptions,
  isLoading = false,
}) => {
  // Mode single select : accepte SingleValue
  const handleChange = (selected: SingleValue<TarifPrestation>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const options = tarifs.map((tarif) => ({
    value: tarif.id,
    label: tarif.nomPrestation,
    ...tarif,
  }));

  return (
    <Select
      isMulti={false}
      options={options}
      getOptionLabel={(e) => e.nomPrestation}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ?? null}
      onChange={handleChange}
      className="w-full"
      isLoading={isLoading}
      loadingMessage={() => "Chargement des prestations..."}
    />
  );
};

export default MultiSelectPrestation;
