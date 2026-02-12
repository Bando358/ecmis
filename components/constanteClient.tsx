import React, { useEffect, useState, useRef } from "react";
import { getConstantByIdVisiteClient } from "@/lib/actions/constanteActions";
import { Skeleton } from "./ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Weight,
  Ruler,
  Calculator,
  HeartPulse,
  Thermometer,
  Wind,
  Droplets,
} from "lucide-react";

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
    poids: data.poids ?? 0,
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

const getImcConfig = (etat?: string) => {
  switch (etat) {
    case "Maigreur":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" };
    case "Poids normal":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-400" };
    case "Surpoids":
      return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-400" };
    case "Obésité":
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-400" };
    default:
      return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };
  }
};

const Metric = ({
  icon: Icon,
  label,
  value,
  unit,
  iconColor = "text-blue-400",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  iconColor?: string;
}) => (
  <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-white/80 px-2 py-1 text-xs shadow-sm">
    <Icon className={`h-3 w-3 shrink-0 ${iconColor}`} />
    <span className="text-muted-foreground/70">{label}</span>
    <span className="font-semibold text-blue-950">
      {value}
      {unit && <span className="ml-0.5 font-normal text-muted-foreground">{unit}</span>}
    </span>
  </div>
);

const Separator = () => (
  <div className="hidden sm:block h-4 w-px bg-blue-200/50" />
);

const ConstanteClient: React.FC<ConstanteProps> = ({ idVisite }) => {
  const [constante, setConstante] = useState<Constante | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedId = useRef<string>("");

  useEffect(() => {
    if (!idVisite || idVisite === lastFetchedId.current) return;

    let cancelled = false;
    const fetchConstante = async () => {
      setIsLoading(true);
      try {
        const data = await getConstantByIdVisiteClient(idVisite);
        if (!cancelled) {
          lastFetchedId.current = idVisite;
          setConstante(normalizeConstante(data as Constante));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Erreur lors du chargement de la constante :", error);
          setConstante(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchConstante();
    return () => {
      cancelled = true;
    };
  }, [idVisite]);

  if (!idVisite) return null;

  const imcConfig = constante ? getImcConfig(constante.etatImc) : null;
  const hasMorpho = constante ? (constante.taille != null || constante.imc != null) : false;
  const hasCardio = constante ? (constante.psSystolique != null || constante.psDiastolique != null || constante.pouls != null) : false;
  const hasRespi = constante ? (constante.temperature != null || constante.frequenceRespiratoire != null || constante.saturationOxygene != null) : false;

  // Clé unique pour déclencher l'animation à chaque changement d'état
  const stateKey = isLoading ? "loading" : constante ? `data-${lastFetchedId.current}` : "empty";

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative mb-3 overflow-hidden rounded-lg border border-blue-200/60 bg-linear-to-r from-blue-50/80 via-white to-blue-50/40"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-blue-400 to-blue-600 rounded-l-lg" />
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        </motion.div>
      )}

      {!isLoading && !constante && (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative mb-3 overflow-hidden rounded-lg border border-dashed border-blue-200/60 bg-blue-50/20"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-200 rounded-l-lg" />
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Activity className="h-3.5 w-3.5 text-blue-300" />
            <span className="text-xs text-muted-foreground italic">Aucune constante pour cette visite</span>
          </div>
        </motion.div>
      )}

      {!isLoading && constante && imcConfig && (
        <motion.div
          key={stateKey}
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative mb-3 overflow-hidden rounded-lg border border-blue-200/60 bg-linear-to-r from-blue-50/80 via-white to-blue-50/40 shadow-sm"
        >
          {/* Barre d'accent latérale */}
          <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-blue-400 to-blue-600 rounded-l-lg" />

          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2">
            {/* Titre compact */}
            <div className="flex items-center gap-1.5 mr-1">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/80">Constantes</span>
            </div>

            <Separator />

            {/* Morphologie */}
            <Metric icon={Weight} label="Poids" value={constante.poids} unit="kg" iconColor="text-blue-500" />

            {constante.taille != null && (
              <Metric icon={Ruler} label="Taille" value={constante.taille} unit="cm" iconColor="text-indigo-400" />
            )}

            {constante.imc != null && (
              <div className={`inline-flex items-center gap-1.5 rounded-md border ${imcConfig.border} ${imcConfig.bg} px-2 py-1 text-xs shadow-sm`}>
                <Calculator className={`h-3 w-3 shrink-0 ${imcConfig.text}`} />
                <span className={`font-semibold ${imcConfig.text}`}>
                  IMC {constante.imc}
                </span>
                {constante.etatImc && (
                  <>
                    <span className={`h-1.5 w-1.5 rounded-full ${imcConfig.dot}`} />
                    <span className={`font-normal ${imcConfig.text} opacity-80`}>{constante.etatImc}</span>
                  </>
                )}
              </div>
            )}

            {/* Séparateur cardio */}
            {hasMorpho && hasCardio && <Separator />}

            {/* Cardio-vasculaire */}
            {constante.psSystolique != null && constante.psDiastolique != null && (
              <Metric
                icon={HeartPulse}
                label="TA"
                value={`${constante.psSystolique}/${constante.psDiastolique}`}
                unit="mmHg"
                iconColor="text-rose-400"
              />
            )}

            {constante.psSystolique != null && constante.psDiastolique == null && (
              <Metric icon={HeartPulse} label="SYS" value={constante.psSystolique} unit="mmHg" iconColor="text-rose-400" />
            )}

            {constante.psDiastolique != null && constante.psSystolique == null && (
              <Metric icon={HeartPulse} label="DIA" value={constante.psDiastolique} unit="mmHg" iconColor="text-rose-400" />
            )}

            {constante.pouls != null && (
              <Metric icon={HeartPulse} label="Pouls" value={constante.pouls} unit="bpm" iconColor="text-pink-400" />
            )}

            {/* Séparateur respi */}
            {(hasMorpho || hasCardio) && hasRespi && <Separator />}

            {/* Température & Respiratoire */}
            {constante.temperature != null && (
              <Metric icon={Thermometer} label="T°" value={constante.temperature} unit="°C" iconColor="text-amber-500" />
            )}

            {constante.frequenceRespiratoire != null && (
              <Metric icon={Wind} label="FR" value={constante.frequenceRespiratoire} unit="/min" iconColor="text-teal-400" />
            )}

            {constante.saturationOxygene != null && (
              <Metric icon={Droplets} label="SpO₂" value={constante.saturationOxygene} unit="%" iconColor="text-cyan-500" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConstanteClient;
