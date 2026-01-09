// Fiches médicales du client
"use client";
import Link from "next/link";
import { useState, useEffect, use } from "react";
import { SquareChevronLeft, SquareChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useClientContext } from "@/components/ClientContext";
import { cn } from "@/lib/utils";
import { getAllVisiteByIdClient } from "@/lib/actions/visiteActions";
import { getRecapVisiteByIdVisite } from "@/lib/actions/recapActions";
import { RecapVisite, Visite } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";

// tables
import { Table00 } from "@/components/table/tableVisite";
import { Table01 } from "@/components/table/tableConstante";
import { Table02 } from "@/components/table/tablePlanning";
import { Table03 } from "@/components/table/tableGyneco";
import { Table04 } from "@/components/table/tableFacturation";
import { Table05 } from "@/components/table/tableGrossesse";
import { Table06 } from "@/components/table/tableTestGrossesse";
import { Table07 } from "@/components/table/tableCpn";
import { Table08 } from "@/components/table/tableAccouchement";
import { Table09 } from "@/components/table/tableCpon";
import { Table10 } from "@/components/table/tableSaa";
import { Table11 } from "@/components/table/tableIst";
import { Table12 } from "@/components/table/tableInfertilite";
import { Table13 } from "@/components/table/tableDepistage";
import { Table14 } from "@/components/table/tablePecVih";
import { Table15 } from "@/components/table/tableVbg";
import { Table16 } from "@/components/table/tableMedecine";
import Retour from "@/components/retour";

interface FicheLink {
  label: string;
  href: string;
}

type Category = {
  name: string;
  fiches: FicheLink[];
};

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
  const { setSelectedClientId } = useClientContext();

  useEffect(() => {
    setSelectedClientId(fichesId);
  }, [fichesId, setSelectedClientId]);

  const incrementDate = () => {
    if (currentIndex < allVisite.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const decrementDate = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // regroupement par catégorie
  const categories: Category[] = [
    {
      name: "Visite & Constante",
      fiches: [
        { label: "Visite", href: `/visite/${fichesId}` },
        { label: "Constantes", href: `/constante/${fichesId}` },
      ],
    },
    {
      name: "Santé reproductive",
      fiches: [
        { label: "Planification familiale", href: `/planning/${fichesId}` },
        { label: "Gynécologique", href: `/fiche-gyneco/${fichesId}` },
        { label: "Infertilité", href: `/fiche-infertilite/${fichesId}` },
      ],
    },
    {
      name: "Maternité",
      fiches: [
        { label: "Test TBG", href: `/fiche-test/${fichesId}` },
        { label: "Grossesse", href: `/fiche-grossesse/${fichesId}` },
        { label: "CPN", href: `/fiche-obstetrique/${fichesId}` },
        { label: "Accouchement", href: `/fiche-accouchement/${fichesId}` },
        { label: "CPoN", href: `/fiche-cpon/${fichesId}` },
        { label: "SAA", href: `/fiche-saa/${fichesId}` },
      ],
    },
    {
      name: "IST & VIH",
      fiches: [
        { label: "IST", href: `/fiche-ist/${fichesId}` },
        { label: "Dépistage VIH", href: `/fiche-depistage/${fichesId}` },
        { label: "PEC VIH", href: `/fiche-pec-vih/${fichesId}` },
        { label: "Examen PV VIH", href: `/fiche-examenPvvih/${fichesId}` },
      ],
    },
    {
      name: "Médecine & VBG",
      fiches: [
        { label: "Médecine générale", href: `/fiche-mdg/${fichesId}` },
        { label: "VBG", href: `/fiche-vbg/${fichesId}` },
        { label: "Ordonnance", href: `/fiche-ordonnance/${fichesId}` },
      ],
    },
    {
      name: "Examens & Echo",
      fiches: [
        { label: "Demande Examen", href: `/fiche-demande-examen/${fichesId}` },
        {
          label: "Résultat Examen",
          href: `/fiche-resultat-examen/${fichesId}`,
        },
        {
          label: "Demande Echo",
          href: `/fiche-demande-echographie/${fichesId}`,
        },
        {
          label: "Résultat Echo",
          href: `/fiche-resultat-echographie/${fichesId}`,
        },
      ],
    },
    {
      name: "Référencement",
      fiches: [
        { label: "Référence", href: `/fiche-reference/${fichesId}` },
        // { label: "Imprimer Référence", href: `/imprime-reference/${fichesId}` },
        {
          label: "Contre référence",
          href: `/fiche-contre-reference/${fichesId}`,
        },
      ],
    },
    {
      name: "Facturation",
      fiches: [{ label: "Facturation", href: `/fiche-pharmacy/${fichesId}` }],
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const visiteId = await getAllVisiteByIdClient(fichesId);
      setAllVisite(visiteId);
    };
    fetchData();
  }, [fichesId]);

  useEffect(() => {
    const fetchAllRecaps = async () => {
      const results = await Promise.all(
        allVisite.map((v) => getRecapVisiteByIdVisite(v.id))
      );
      setTabRecapVisite(results.flat());
    };
    if (allVisite.length > 0) {
      fetchAllRecaps();
    }
  }, [allVisite]);

  const handleAccordionClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };

  const renderTabsForCategory = (categoryName: string) => {
    const category = categories.find((cat) => cat.name === categoryName);
    if (!category) return null;

    switch (categoryName) {
      case "Visite & Constante":
        return (
          <Tabs defaultValue="visite" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {index === 0 && <Table00 id={fichesId} />}
                      {index === 1 && <Table01 id={fichesId} />}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "Santé reproductive":
        return (
          <Tabs defaultValue="planification-familiale" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {index === 0 && <Table02 id={fichesId} />}
                      {index === 1 && <Table03 id={fichesId} />}
                      {index === 2 && <Table12 id={fichesId} />}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "Maternité":
        return (
          <Tabs defaultValue="grossesse" className="w-full mt-6">
            <TabsList className="bg-blue-100 flex flex-wrap">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {index === 0 && <Table06 id={fichesId} />}
                      {index === 1 && <Table05 id={fichesId} />}
                      {index === 2 && <Table07 id={fichesId} />}
                      {index === 3 && <Table08 id={fichesId} />}
                      {index === 4 && <Table09 id={fichesId} />}
                      {index === 5 && <Table10 id={fichesId} />}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "IST & VIH":
        return (
          <Tabs defaultValue="ist" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {index === 0 && <Table11 id={fichesId} />}
                      {index === 1 && <Table13 id={fichesId} />}
                      {index === 2 && <Table14 id={fichesId} />}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "Médecine & VBG":
        return (
          <Tabs defaultValue="vbg" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, rotate: -5 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {index === 0 && <Table16 id={fichesId} />}
                      {index === 1 && <Table15 id={fichesId} />}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "Examens & Echo":
        return (
          <Tabs defaultValue="test-tbg" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* {index === 0 && <Table06 id={fichesId} />} */}
                      {/* Ajouter les autres tables pour demande examen et laboratoire */}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "Référencement":
        return (
          <Tabs defaultValue="référence" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Ajouter les tables pour référence et contre référence */}
                      <p className="text-center py-8">Contenu à implémenter</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "Facturation":
        return (
          <Tabs defaultValue="facturation" className="w-full mt-6">
            <TabsList className="bg-blue-100">
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
              <TabsContent
                key={index}
                value={fiche.label.toLowerCase().replace(/\s+/g, "-")}
              >
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{fiche.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table04 id={fichesId} />
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full relative">
      <Retour />
      <div className="space-y-4 max-w-300 mx-auto p-4">
        <h2 className="text-center text-xl font-bold uppercase text-gray-600">
          Fiches médicales
        </h2>

        {/* Accordion avec framer motion */}
        <Accordion
          type="single"
          collapsible
          className="w-full px-4 mx-auto grid gap-2 border p-2 rounded-md bg-blue-50 md:grid-cols-2 lg:grid-cols-4"
          onValueChange={(value) => {
            if (value) {
              const categoryIndex = parseInt(value.replace("cat-", ""));
              handleAccordionClick(categories[categoryIndex].name);
            }
          }}
        >
          {categories.map((cat, idx) => (
            <AccordionItem
              key={idx}
              value={`cat-${idx}`}
              className="border rounded-md"
            >
              <AccordionTrigger className="font-bold text-blue-700 px-3">
                {cat.name}
              </AccordionTrigger>
              <AccordionContent>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-2 pl-4"
                  >
                    {cat.fiches.map((fiche, index) => (
                      <Link
                        href={fiche.href}
                        key={index}
                        className="text-blue-800 dark:text-slate-400 underline font-semibold"
                      >
                        {fiche.label}
                      </Link>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Section visites */}
        <Card className="w-full py-3">
          <div className="flex justify-between -mt-3 py-2 px-3">
            <div>
              {allVisite.length < 10 ? (
                <span>0{allVisite.length}</span>
              ) : (
                <span>{allVisite.length}</span>
              )}{" "}
              <span>visites</span>
            </div>
            <div className="relative flex items-center gap-2">
              {/* Flèche gauche */}
              <button
                className={cn(
                  "text-2xl text-blue-600",
                  currentIndex === 0 && "text-gray-400 cursor-not-allowed"
                )}
                onClick={decrementDate}
                disabled={currentIndex === 0}
              >
                <SquareChevronLeft />
              </button>

              {/* Carousel */}
              <div className="w-48 overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentIndex * 100}%)`, // Défilement horizontal
                  }}
                >
                  {allVisite.map((visite) => (
                    <div
                      key={visite.id}
                      className="w-48 text-center border px-2 rounded-sm shrink-0"
                    >
                      {visite.dateVisite.toLocaleDateString("fr-FR")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Flèche droite */}
              <button
                className={cn(
                  "text-2xl text-blue-600",
                  currentIndex === allVisite.length - 1 &&
                    "text-gray-400 cursor-not-allowed"
                )}
                onClick={incrementDate}
                disabled={currentIndex === allVisite.length - 1}
              >
                <SquareChevronRight />
              </button>
            </div>
          </div>
          <Separator orientation="horizontal" className="-mt-6 bg-blue-200" />
          <CardContent>
            {allVisite.length > 0 ? (
              <>
                <div className="grid grid-cols-4">
                  {tabRecapVisite.length > 0 &&
                    tabRecapVisite[currentIndex]?.formulaires.map(
                      (form, index) => (
                        <p key={index}>
                          <span className="text-blue-800 font-semibold">
                            {form}
                          </span>
                        </p>
                      )
                    )}
                </div>
              </>
            ) : (
              "Chargement en cours..."
            )}
            {allVisite.length > 0 &&
              tabRecapVisite.length === 0 &&
              "Aucune fiche saisie"}
          </CardContent>
        </Card>

        {/* Afficher uniquement le Tabs correspondant à la catégorie sélectionnée */}
        {renderTabsForCategory(selectedCategory)}
      </div>
    </div>
  );
}
