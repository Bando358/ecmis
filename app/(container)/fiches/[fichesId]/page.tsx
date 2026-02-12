// Fiches médicales du client
"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect, use, useMemo, useCallback } from "react";
import {
  SquareChevronLeft,
  SquareChevronRight,
  Loader2,
  User,
  Phone,
  Hash,
  Calendar,
  ClipboardList,
  Heart,
  Baby,
  Shield,
  Stethoscope,
  FlaskConical,
  ArrowRightLeft,
  Receipt,
  ChevronRight,
  FileText,
  Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/components/ClientContext";
import { cn } from "@/lib/utils";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getRecapVisiteByIdVisite } from "@/lib/actions/recapActions";
import { getOneClient } from "@/lib/actions/clientActions";
import { Client, RecapVisite, Visite } from "@prisma/client";
import { motion } from "framer-motion";
import Retour from "@/components/retour";

// Loader pour les composants dynamiques
const TableLoader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    <span className="ml-2 text-muted-foreground">Chargement...</span>
  </div>
);

// Tables chargées dynamiquement (lazy loading)
const Table00 = dynamic(
  () =>
    import("@/components/table/tableVisite").then((mod) => ({
      default: mod.Table00,
    })),
  { loading: TableLoader },
);
const Table01 = dynamic(
  () =>
    import("@/components/table/tableConstante").then((mod) => ({
      default: mod.Table01,
    })),
  { loading: TableLoader },
);
const Table02 = dynamic(
  () =>
    import("@/components/table/tablePlanning").then((mod) => ({
      default: mod.Table02,
    })),
  { loading: TableLoader },
);
const Table03 = dynamic(
  () =>
    import("@/components/table/tableGyneco").then((mod) => ({
      default: mod.Table03,
    })),
  { loading: TableLoader },
);
const Table04 = dynamic(
  () =>
    import("@/components/table/tableFacturation").then((mod) => ({
      default: mod.Table04,
    })),
  { loading: TableLoader },
);
const Table05 = dynamic(
  () =>
    import("@/components/table/tableGrossesse").then((mod) => ({
      default: mod.Table05,
    })),
  { loading: TableLoader },
);
const Table06 = dynamic(
  () =>
    import("@/components/table/tableTestGrossesse").then((mod) => ({
      default: mod.Table06,
    })),
  { loading: TableLoader },
);
const Table07 = dynamic(
  () =>
    import("@/components/table/tableCpn").then((mod) => ({
      default: mod.Table07,
    })),
  { loading: TableLoader },
);
const Table08 = dynamic(
  () =>
    import("@/components/table/tableAccouchement").then((mod) => ({
      default: mod.Table08,
    })),
  { loading: TableLoader },
);
const Table09 = dynamic(
  () =>
    import("@/components/table/tableCpon").then((mod) => ({
      default: mod.Table09,
    })),
  { loading: TableLoader },
);
const Table10 = dynamic(
  () =>
    import("@/components/table/tableSaa").then((mod) => ({
      default: mod.Table10,
    })),
  { loading: TableLoader },
);
const Table11 = dynamic(
  () =>
    import("@/components/table/tableIst").then((mod) => ({
      default: mod.Table11,
    })),
  { loading: TableLoader },
);
const Table12 = dynamic(
  () =>
    import("@/components/table/tableInfertilite").then((mod) => ({
      default: mod.Table12,
    })),
  { loading: TableLoader },
);
const Table13 = dynamic(
  () =>
    import("@/components/table/tableDepistage").then((mod) => ({
      default: mod.Table13,
    })),
  { loading: TableLoader },
);
const Table14 = dynamic(
  () =>
    import("@/components/table/tablePecVih").then((mod) => ({
      default: mod.Table14,
    })),
  { loading: TableLoader },
);
const Table15 = dynamic(
  () =>
    import("@/components/table/tableVbg").then((mod) => ({
      default: mod.Table15,
    })),
  { loading: TableLoader },
);
const Table16 = dynamic(
  () =>
    import("@/components/table/tableMedecine").then((mod) => ({
      default: mod.Table16,
    })),
  { loading: TableLoader },
);

// Types
interface FicheLink {
  label: string;
  href: string;
  tableComponent?: React.ComponentType<{ id: string }>;
}

interface Category {
  name: string;
  icon: React.ElementType;
  color: string;
  fiches: FicheLink[];
  defaultTab: string;
  animation: {
    initial: Record<string, number>;
    animate: Record<string, number>;
  };
}

// Configuration centralisée des catégories avec leurs tables associées
const createCategories = (fichesId: string): Category[] => [
  {
    name: "Visite & Constante",
    icon: ClipboardList,
    color: "text-blue-600",
    defaultTab: "visite",
    animation: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
    fiches: [
      { label: "Visite", href: `/visite/${fichesId}`, tableComponent: Table00 },
      {
        label: "Constantes",
        href: `/constante/${fichesId}`,
        tableComponent: Table01,
      },
    ],
  },
  {
    name: "Santé reproductive",
    icon: Heart,
    color: "text-pink-600",
    defaultTab: "planification-familiale",
    animation: {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
    },
    fiches: [
      {
        label: "Planification familiale",
        href: `/planning/${fichesId}`,
        tableComponent: Table02,
      },
      {
        label: "Gynécologique",
        href: `/fiche-gyneco/${fichesId}`,
        tableComponent: Table03,
      },
      {
        label: "Infertilité",
        href: `/fiche-infertilite/${fichesId}`,
        tableComponent: Table12,
      },
    ],
  },
  {
    name: "Maternité",
    icon: Baby,
    color: "text-purple-600",
    defaultTab: "test-tbg",
    animation: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
    },
    fiches: [
      {
        label: "Test TBG",
        href: `/fiche-test/${fichesId}`,
        tableComponent: Table06,
      },
      {
        label: "Grossesse",
        href: `/fiche-grossesse/${fichesId}`,
        tableComponent: Table05,
      },
      {
        label: "CPN",
        href: `/fiche-obstetrique/${fichesId}`,
        tableComponent: Table07,
      },
      {
        label: "Accouchement",
        href: `/fiche-accouchement/${fichesId}`,
        tableComponent: Table08,
      },
      {
        label: "CPoN",
        href: `/fiche-cpon/${fichesId}`,
        tableComponent: Table09,
      },
      { label: "SAA", href: `/fiche-saa/${fichesId}`, tableComponent: Table10 },
    ],
  },
  {
    name: "IST & VIH",
    icon: Shield,
    color: "text-red-600",
    defaultTab: "ist",
    animation: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
    },
    fiches: [
      { label: "IST", href: `/fiche-ist/${fichesId}`, tableComponent: Table11 },
      {
        label: "Dépistage VIH",
        href: `/fiche-depistage/${fichesId}`,
        tableComponent: Table13,
      },
      {
        label: "PEC VIH",
        href: `/fiche-pec-vih/${fichesId}`,
        tableComponent: Table14,
      },
      { label: "Examen PV VIH", href: `/fiche-examenPvvih/${fichesId}` },
    ],
  },
  {
    name: "Médecine & VBG",
    icon: Stethoscope,
    color: "text-emerald-600",
    defaultTab: "médecine-générale",
    animation: {
      initial: { opacity: 0, rotate: -5 },
      animate: { opacity: 1, rotate: 0 },
    },
    fiches: [
      {
        label: "Médecine générale",
        href: `/fiche-mdg/${fichesId}`,
        tableComponent: Table16,
      },
      { label: "VBG", href: `/fiche-vbg/${fichesId}`, tableComponent: Table15 },
      { label: "Ordonnance", href: `/fiche-ordonnance/${fichesId}` },
    ],
  },
  {
    name: "Examens & Echo",
    icon: FlaskConical,
    color: "text-amber-600",
    defaultTab: "demande-examen",
    animation: {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
    },
    fiches: [
      { label: "Demande Examen", href: `/fiche-demande-examen/${fichesId}` },
      { label: "Résultat Examen", href: `/fiche-resultat-examen/${fichesId}` },
      { label: "Demande Echo", href: `/fiche-demande-echographie/${fichesId}` },
      {
        label: "Résultat Echo",
        href: `/fiche-resultat-echographie/${fichesId}`,
      },
    ],
  },
  {
    name: "Référencement",
    icon: ArrowRightLeft,
    color: "text-cyan-600",
    defaultTab: "référence",
    animation: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
    },
    fiches: [
      { label: "Référence", href: `/fiche-reference/${fichesId}` },
      {
        label: "Contre référence",
        href: `/fiche-contre-reference/${fichesId}`,
      },
    ],
  },
  {
    name: "Facturation",
    icon: Receipt,
    color: "text-slate-600",
    defaultTab: "facturation",
    animation: {
      initial: { opacity: 0, y: 40 },
      animate: { opacity: 1, y: 0 },
    },
    fiches: [
      {
        label: "Facturation",
        href: `/fiche-pharmacy/${fichesId}`,
        tableComponent: Table04,
      },
    ],
  },
];

// Composant pour le contenu d'un onglet
interface TabContentItemProps {
  fiche: FicheLink;
  fichesId: string;
  animation: Category["animation"];
}

const TabContentItem = ({
  fiche,
  fichesId,
  animation,
}: TabContentItemProps) => {
  const TableComponent = fiche.tableComponent;

  return (
    <TabsContent value={fiche.label.toLowerCase().replace(/\s+/g, "-")}>
      <motion.div
        initial={animation.initial}
        animate={animation.animate}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
          <CardHeader className="bg-blue-50/40">
            <CardTitle>{fiche.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {TableComponent ? (
              <TableComponent id={fichesId} />
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Contenu à implémenter
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </TabsContent>
  );
};

// Composant pour les onglets d'une catégorie
interface CategoryTabsProps {
  category: Category;
  fichesId: string;
}

const CategoryTabs = ({ category, fichesId }: CategoryTabsProps) => (
  <Tabs defaultValue={category.defaultTab} className="w-full mt-6">
    <TabsList
      className={cn(
        "bg-muted/70",
        category.fiches.length > 4 && "flex flex-wrap",
      )}
    >
      {category.fiches.map((fiche, index) => (
        <TabsTrigger
          key={index}
          value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
        >
          {fiche.label}
        </TabsTrigger>
      ))}
    </TabsList>

    {category.fiches.map((fiche, index) => (
      <TabContentItem
        key={index}
        fiche={fiche}
        fichesId={fichesId}
        animation={category.animation}
      />
    ))}
  </Tabs>
);

// Composant pour le carousel de dates
interface DateCarouselProps {
  allVisite: Visite[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const DateCarousel = ({
  allVisite,
  currentIndex,
  onPrevious,
  onNext,
}: DateCarouselProps) => (
  <div className="relative flex items-center gap-1">
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onPrevious}
      disabled={currentIndex === 0}
      aria-label="Visite précédente"
    >
      <SquareChevronLeft className="h-5 w-5" />
    </Button>

    <div className="w-48 overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {allVisite.map((visite) => (
          <div
            key={visite.id}
            className="w-48 text-center border px-2 py-1 rounded-md shrink-0 bg-muted/30 text-sm font-medium"
          >
            {visite.dateVisite.toLocaleDateString("fr-FR")}
          </div>
        ))}
      </div>
    </div>

    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onNext}
      disabled={currentIndex === allVisite.length - 1}
      aria-label="Visite suivante"
    >
      <SquareChevronRight className="h-5 w-5" />
    </Button>
  </div>
);

// Utilitaire pour calculer l'âge
const calculateAge = (dateNaissance: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateNaissance.getFullYear();
  const monthDifference = today.getMonth() - dateNaissance.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dateNaissance.getDate())
  ) {
    age--;
  }
  return age;
};

// Composant principal
export default function Fiches({
  params,
}: {
  params: Promise<{ fichesId: string }>;
}) {
  const { fichesId } = use(params);

  const [allVisite, setAllVisite] = useState<Visite[]>([]);
  const [tabRecapVisite, setTabRecapVisite] = useState<RecapVisite[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Visite & Constante");
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const { setSelectedClientId } = useClientContext();

  // Mémoriser les catégories
  const categories = useMemo(() => createCategories(fichesId), [fichesId]);

  // Sélectionner le clientId
  useEffect(() => {
    setSelectedClientId(fichesId);
  }, [fichesId, setSelectedClientId]);

  // Navigation du carousel
  const incrementDate = useCallback(() => {
    setCurrentIndex((prev) => (prev < allVisite.length - 1 ? prev + 1 : prev));
  }, [allVisite.length]);

  const decrementDate = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Charger les données client + visites
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [clientData, visites] = await Promise.all([
          getOneClient(fichesId),
          getAllVisiteByIdClient(fichesId),
        ]);

        setClient(clientData as Client | null);
        setAllVisite(visites);

        if (visites.length > 0) {
          const recaps = await Promise.all(
            visites.map((v) => getRecapVisiteByIdVisite(v.id)),
          );
          setTabRecapVisite(recaps.flat());
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fichesId]);

  // Trouver la catégorie sélectionnée
  const selectedCategoryData = useMemo(
    () => categories.find((cat) => cat.name === selectedCategory),
    [categories, selectedCategory],
  );

  // Récap de la visite courante
  const currentRecap = useMemo(
    () => tabRecapVisite[currentIndex],
    [tabRecapVisite, currentIndex],
  );

  return (
    <div className="w-full relative">
      <Retour />
      <div className="space-y-4 max-w-300 mx-auto p-4">
        {/* ===== En-tête client ===== */}
        <Card className="overflow-hidden border-blue-200 shadow-md shadow-blue-100/40">
          <div className="bg-linear-to-r from-blue-900 to-blue-700 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">
                    {client ? (
                      <span className="uppercase">
                        {client.nom} {client.prenom}
                      </span>
                    ) : (
                      <span className="text-blue-200">Chargement...</span>
                    )}
                  </CardTitle>
                  {client && (
                    <p className="text-sm text-blue-100">Dossier médical</p>
                  )}
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
                Fiches
              </Badge>
            </div>
          </div>

          {/* Infos client */}
          {client && (
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="secondary"
                  className="gap-1 bg-blue-50 text-blue-800 border-blue-200"
                >
                  <Calendar className="h-3 w-3" />
                  {calculateAge(new Date(client.dateNaissance))} ans
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1 font-mono bg-blue-50 text-blue-800 border-blue-200"
                >
                  <Hash className="h-3 w-3" />
                  {client.code}
                </Badge>
                {client.tel_1 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-blue-50 text-blue-800 border-blue-200"
                  >
                    <Phone className="h-3 w-3" />
                    {client.tel_1}
                  </Badge>
                )}
                {client.codeVih && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-red-600 border-red-200"
                  >
                    <Shield className="h-3 w-3" />
                    {client.codeVih}
                  </Badge>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* ===== Navigation des catégories ===== */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-md",
                  isSelected
                    ? "border-blue-400 bg-blue-50/60 shadow-sm shadow-blue-100/40"
                    : "border-blue-200/50 bg-card hover:border-blue-300 hover:bg-blue-50/30",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isSelected ? "bg-blue-100" : "bg-blue-50/60",
                  )}
                >
                  <Icon className={cn("h-4 w-4", cat.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-blue-800" : "text-foreground",
                    )}
                  >
                    {cat.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cat.fiches.length} fiche{cat.fiches.length > 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    isSelected
                      ? "text-blue-600 rotate-90"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* ===== Liens rapides de la catégorie sélectionnée ===== */}
        {selectedCategoryData && (
          <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30 bg-blue-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm items-center rounded-md">
                <Badge
                  variant="secondary"
                  className="bg-blue-600/80 text-gray-100 font-bold inline-flex items-center border-blue-200 mr-2"
                >
                  <Link2
                    size={24} // Augmentez cette valeur
                    className="h-6 w-6 inline-block mr-1 text-red-600"
                  />
                  Formulaires de {selectedCategoryData.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 -mt-6">
              <div className="flex flex-wrap gap-2">
                {selectedCategoryData.fiches.map((fiche, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5 border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <Link href={fiche.href} prefetch={false}>
                      <FileText className="h-3.5 w-3.5" />
                      {fiche.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== Section visites ===== */}
        <Card className="border-blue-200/60 shadow-sm shadow-blue-100/30">
          <CardHeader className="pb-3 bg-blue-50/40">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base">Visites</CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 border-blue-200"
                >
                  {allVisite.length.toString().padStart(2, "0")}
                </Badge>
              </div>

              {allVisite.length > 0 && (
                <DateCarousel
                  allVisite={allVisite}
                  currentIndex={currentIndex}
                  onPrevious={decrementDate}
                  onNext={incrementDate}
                />
              )}
            </div>
          </CardHeader>

          <Separator className="bg-border" />

          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-muted-foreground">
                  Chargement des visites...
                </span>
              </div>
            ) : allVisite.length > 0 ? (
              <>
                {currentRecap?.formulaires?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {currentRecap.formulaires.map((form, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {form}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Aucune fiche saisie pour cette visite
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aucune visite enregistrée
              </p>
            )}
          </CardContent>
        </Card>

        {/* ===== Onglets de la catégorie sélectionnée ===== */}
        {selectedCategoryData && (
          <CategoryTabs category={selectedCategoryData} fichesId={fichesId} />
        )}
      </div>
    </div>
  );
}
