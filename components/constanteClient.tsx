import React, { useEffect, useState } from "react";
import { getConstantByIdVisiteClient } from "@/lib/actions/constanteActions";
import { Badge } from "./ui/badge";

interface Constante {
  poids: number;
  taille?: number;
  psSystolique?: number;
  psDiastolique?: number;
  temperature?: number;
  lieuTemprature?: string;
  pouls?: number;
  frequenceRespiratoire?: number;
  saturationOxygene?: number;
  imc?: number;
  etatImc?: string;
}

interface ConstanteProps {
  idVisite: string;
}

const normalizeConstante = (data: Constante): Constante | null => {
  if (!data) return null;

  return {
    poids: data.poids ?? 0, // Par défaut, poids ne peut pas être null
    taille: data.taille ?? undefined,
    psSystolique: data.psSystolique ?? undefined,
    psDiastolique: data.psDiastolique ?? undefined,
    temperature: data.temperature ?? undefined,
    lieuTemprature: data.lieuTemprature ?? undefined,
    pouls: data.pouls ?? undefined,
    frequenceRespiratoire: data.frequenceRespiratoire ?? undefined,
    saturationOxygene: data.saturationOxygene ?? undefined,
    imc: data.imc ?? undefined,
    etatImc: data.etatImc ?? undefined,
  };
};

const ConstanteClient: React.FC<ConstanteProps> = ({ idVisite }) => {
  const [constante, setConstante] = useState<Constante | null>(null);

  useEffect(() => {
    const fetchConstante = async () => {
      try {
        const data = await getConstantByIdVisiteClient(idVisite);
        setConstante(normalizeConstante(data as Constante));
      } catch (error) {
        console.error("Erreur lors du chargement de la constante :", error);
      }
    };

    if (idVisite) {
      fetchConstante();
    }
  }, [idVisite]);

  return (
    <div className="px-4 py-2 max-w-250 mx-auto ">
      {/* <h2 className="text-lg font-bold">Constantes de la visite</h2> */}
      <div className="grid grid-cols-5">
        <div className="flex flex-col text-md">
          <p>
            Poids :{" "}
            {constante && constante.poids ? (
              <Badge variant={"secondary"}>{constante.poids}</Badge>
            ) : (
              "..."
            )}{" "}
            kg
          </p>
          {constante && constante.taille ? (
            <p>
              Taille : <Badge variant={"secondary"}>{constante.taille}</Badge>{" "}
              cm
            </p>
          ) : (
            <p>Taille : ... cm</p>
          )}
        </div>
        <div className="flex flex-col">
          {constante && constante.imc ? (
            <p>
              IMC :
              <Badge
                variant={`${
                  constante.etatImc !== "Poids normal"
                    ? "destructive"
                    : "secondary"
                }`}
              >
                {constante.imc}
              </Badge>
            </p>
          ) : (
            <p>IMC : ...</p>
          )}
          {constante && constante.etatImc ? (
            <p>
              État IMC :{" "}
              <Badge
                variant={`${
                  constante.etatImc !== "Poids normal"
                    ? "destructive"
                    : "secondary"
                }`}
              >
                {constante.etatImc}
              </Badge>{" "}
            </p>
          ) : (
            <p>État IMC : ...</p>
          )}
        </div>
        <div className="flex flex-col">
          {constante && constante.psSystolique ? (
            <p>
              SYS :<Badge variant={"secondary"}>{constante.psSystolique}</Badge>{" "}
              mmHg
            </p>
          ) : (
            <p>SYS : ... mmHg</p>
          )}
          {constante && constante.psDiastolique ? (
            <p>
              {" "}
              DIA :{" "}
              <Badge variant={"secondary"}>
                {constante.psDiastolique}
              </Badge>{" "}
              mmHg
            </p>
          ) : (
            <p>DIA : ... mmHg</p>
          )}
        </div>
        <div className="flex flex-col">
          {constante && constante.temperature ? (
            <p>
              Température :{" "}
              <Badge variant={"secondary"}>{constante.temperature}</Badge> °C
            </p>
          ) : (
            <p>Température : ... °C</p>
          )}
          {constante && constante.lieuTemprature ? (
            <p>
              Lieu de prise :{" "}
              <Badge variant={"secondary"}>{constante.lieuTemprature}</Badge>{" "}
            </p>
          ) : (
            <p>Lieu de prise : ...</p>
          )}
        </div>
        <div className="flex flex-col">
          {constante && constante.frequenceRespiratoire ? (
            <p>
              Fréq Respiratoire :{" "}
              <Badge variant={"secondary"}>
                {constante.frequenceRespiratoire}
              </Badge>{" "}
              /min
            </p>
          ) : (
            <p>Fréq Respiratoire : ... /min</p>
          )}
          {constante && constante.saturationOxygene ? (
            <p>
              Sat en Oxygène :{" "}
              <Badge variant={"secondary"}>{constante.saturationOxygene}</Badge>{" "}
              %
            </p>
          ) : (
            <p>Sat en Oxygène : ... %</p>
          )}
        </div>
        <div className="flex flex-col">
          {constante && constante.pouls ? (
            <p>
              Pouls : <Badge variant={"secondary"}>{constante.pouls}</Badge> bpm
            </p>
          ) : (
            <p>Pouls : ... bpm</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConstanteClient;
