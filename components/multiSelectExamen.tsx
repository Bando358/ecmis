// MultiSelectExamen.tsx
import { DemandeExamen, Examen, TarifExamen } from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  demandes: DemandeExamen[];
  selectedOptions: DemandeExamen[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<DemandeExamen[]>>;
  tarifExamens: TarifExamen[];
  allExamens: Examen[];
}

const MultiSelectExamen: React.FC<MultiSelectProps> = ({
  demandes,
  selectedOptions,
  setSelectedOptions,
  tarifExamens,
  allExamens,
}) => {
  // Mode single select : accepte SingleValue
  const handleChange = (selected: SingleValue<DemandeExamen>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const getNameExamen = (id: string) => {
    const demand = demandes.find((e) => e.id === id);
    const tarif = tarifExamens.find((t) => t.id === demand?.idTarifExamen);
    const examen = allExamens.find((e) => e.id === tarif?.idExamen);
    return examen ? examen.nomExamen : "Inconnu";
  };

  const options = demandes.map((demande) => ({
    value: demande.id,
    label: getNameExamen(demande.id),
    ...demande,
  }));

  return (
    <Select
      isMulti={false}
      options={options}
      getOptionLabel={(e) => getNameExamen(e.id)}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ?? null}
      onChange={handleChange}
      className="w-full"
      placeholder="Sélectionner un examen..."
      noOptionsMessage={() => "Aucun examen disponible"}
    />
  );
};

export default MultiSelectExamen;
