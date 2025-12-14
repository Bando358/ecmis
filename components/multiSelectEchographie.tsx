// MultiSelectEchographie.tsx
import { getAllEchographies } from "@/lib/actions/echographieActions";
// import { getAllTarifExamenByClinique } from "@/lib/actions/tarifExamenActions";
import { getAllTarifEchographieByClinique } from "@/lib/actions/tarifEchographieActions";
import {
  DemandeEchographie,
  Echographie,
  TarifEchographie,
} from "@prisma/client";
import React from "react";
import Select from "react-select";
import { SingleValue } from "react-select";

interface MultiSelectProps {
  idClinique: string;
  demandes: DemandeEchographie[];
  selectedOptions: DemandeEchographie[];
  setSelectedOptions: React.Dispatch<
    React.SetStateAction<DemandeEchographie[]>
  >;
}

const MultiSelectEchographie: React.FC<MultiSelectProps> = ({
  idClinique,
  demandes,
  selectedOptions,
  setSelectedOptions,
}) => {
  const [tabEchographie, setTabEchographie] = React.useState<Echographie[]>([]);
  const [tabTarif, setTabTarif] = React.useState<TarifEchographie[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [Echographie, Tarif] = await Promise.all([
        getAllEchographies(),
        getAllTarifEchographieByClinique(idClinique),
      ]);
      setTabEchographie(Echographie);
      setTabTarif(Tarif);
      setIsLoading(false);
    };
    fetchData();
  }, [idClinique]);

  // Mode single select : accepte SingleValue
  const handleChange = (selected: SingleValue<DemandeEchographie>) => {
    if (selected) {
      setSelectedOptions([selected]);
    } else {
      setSelectedOptions([]);
    }
  };

  const getNameEchographie = (id: string) => {
    const demand = demandes.find((e) => e.id === id);
    const tarif = tabTarif.find((t) => t.id === demand?.idTarifEchographie);
    const echographie = tabEchographie.find(
      (e) => e.id === tarif?.idEchographie
    );
    return echographie ? echographie.nomEchographie : "";
  };

  const options = demandes.map((demande) => ({
    value: demande.id,
    label: getNameEchographie(demande.id),
    ...demande,
  }));

  return (
    <Select
      isMulti={false}
      options={options}
      getOptionLabel={(e) => getNameEchographie(e.id)}
      getOptionValue={(e) => e.id}
      value={selectedOptions[0] ?? null}
      onChange={handleChange}
      className="w-full"
      isLoading={isLoading}
      loadingMessage={() => "Chargement des echographies..."}
    />
  );
};

export default MultiSelectEchographie;
