// MultiSelectExamen.tsx
import { getAllExamen } from "@/lib/actions/examenActions";
import { getAllTarifExamenByClinique } from "@/lib/actions/tarifExamenActions";
import { DemandeExamen, Examen, TarifExamen } from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  idClinique: string;
  demandes: DemandeExamen[];
  selectedOptions: DemandeExamen[];
  setSelectedOptions: React.Dispatch<React.SetStateAction<DemandeExamen[]>>;
}

const MultiSelectExamen: React.FC<MultiSelectProps> = ({
  idClinique,
  demandes,
  selectedOptions,
  setSelectedOptions,
}) => {
  const [tabExamen, setTabExamen] = React.useState<Examen[]>([]);
  const [tabTarif, setTabTarif] = React.useState<TarifExamen[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [Examen, Tarif] = await Promise.all([
        getAllExamen(),
        getAllTarifExamenByClinique(idClinique),
      ]);
      setTabExamen(Examen);
      setTabTarif(Tarif);
      setIsLoading(false);
    };
    fetchData();
  }, [idClinique]);

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
    const tarif = tabTarif.find((t) => t.id === demand?.idTarifExamen);
    const examen = tabExamen.find((e) => e.id === tarif?.idExamen);
    return examen ? examen.nomExamen : "";
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
      isLoading={isLoading}
      loadingMessage={() => "Chargement des examens..."}
    />
  );
};

export default MultiSelectExamen;
