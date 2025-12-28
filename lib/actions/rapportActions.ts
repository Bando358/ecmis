"use server";

import prisma from "@/lib/prisma";
import { getOneVisite } from "./visiteActions";
import { ClientData } from "@/components/rapportPfActions";
import { getOneGrossesse } from "./grossesseActions";
import { FactureExamen, ResultatExamen, TypeExamen } from "@prisma/client";

type ClientAvecMethodePrise = {
  nom: string;
  prenom: string;
  dateNaissance: Date;
  sexe: string;
  code: string;
  Visite: {
    id: string;
    createdAt: Date;
    idUser: string;
    motifVisite: string;
    idClient: string;
    updatedAt: Date;
    dateVisite: Date;
    idActivite: string | null;
    idLieu: string | null;
  }[];
  Planning: {
    id: string;
    createdAt: Date;
    idUser: string;
    idVisite: string;
    statut: string;
    typeContraception: string;
    motifVisite: string;
    consultation: boolean;
    counsellingPf: boolean;
    courtDuree: string | null;
    methodePrise: boolean;
    implanon: string | null;
    jadelle: string | null;
    sterilet: string | null;
    retraitImplanon: boolean;
    retraitJadelle: boolean;
    retraitSterilet: boolean;
    rdvPf: Date | null;
    updatedAt: Date;
  }[];
};

const calculerAge = (dateNaissance: Date): number => {
  const diffTemps = Date.now() - new Date(dateNaissance).getTime();
  const ageDate = new Date(diffTemps);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// Fonction utilitaire pour convertir une string JJ/MM/AAAA en Date
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
};

// Fonction checkClientStatus
const checkClientStatus = (
  dateVisiteStr: string,
  dateVisite2: Date,
  clientsAvecMethodePrise: ClientAvecMethodePrise[]
): ClientStatusInfo | null => {
  const dateVisite = parseDate(dateVisiteStr);
  if (!dateVisite) return null;

  for (const client of clientsAvecMethodePrise) {
    for (const plan of client.Planning || []) {
      // Vérifie si la visite du planning est comprise entre dateVisite et dateVisite2
      const visite = client.Visite.find(
        (v) => v.dateVisite >= dateVisite && v.dateVisite <= dateVisite2
      );

      if (
        visite &&
        (plan.retraitImplanon === true ||
          plan.retraitJadelle === true ||
          plan.retraitSterilet === true)
      ) {
        // On retourne un statut mis à jour
        return {
          nom: client.nom,
          prenom: client.prenom,
          age: calculerAge(client.dateNaissance),
          sexe: client.sexe,
          code: client.code,
          dateVisiste: dateVisiteStr,
          rdvPf: plan.rdvPf ? plan.rdvPf : null,
          statut: plan.statut || "",
          courtDuree: plan.courtDuree,
          implanon: plan.implanon,
          jadelle: plan.jadelle,
          sterilet: plan.sterilet,
          methodePrise: plan.methodePrise,
          protege: false, // => car retrait trouvé
          perdueDeVue: false,
          abandon: false,
          arret: true, // => arrêt forcé
        };
      }
    }
  }

  return null; // rien trouvé
};

const getDateVisite = async (val: string) => {
  const newVal = await getOneVisite(val);
  return newVal?.dateVisite ?? "";
};

export type ClientStatusInfo = {
  nom: string;
  prenom: string;
  age: number;
  sexe: string;
  code: string;
  statut: string;
  courtDuree: string | null;
  implanon: string | null;
  jadelle: string | null;
  sterilet: string | null;
  dateVisiste: string | Date;
  rdvPf: Date | null;
  protege: boolean;
  perdueDeVue: boolean;
  methodePrise: boolean;
  abandon: boolean;
  arret: boolean;
};

export const fetchClientsData = async (
  clinicIds: string[],
  activiteIds: string[],
  dateVisite1: Date,
  dateVisite2: Date
): Promise<ClientData[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  const allClinique = await prisma.clinique.findMany({
    where: {
      id: {
        in: clinicIds,
      },
    },
  });

  const clients = await prisma.client.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
      Visite: {
        some: {
          dateVisite: {
            gte: dateVisite1,
            lte: dateVisite2,
          },
        },
      },
    },
    include: {
      Visite: true,
      Planning: true,
      Gynecologie: true,
      Ist: true,
      Infertilite: true,
      Vbg: true,
      Medecine: true,
      Grossesse: true,
      Obstetrique: true,
      Cpon: true,
      TestGrossesse: true,
      Accouchement: true,
      Saa: true,
      DepistageVih: true,
      PecVih: true,
      RecapVisite: true,
      ExamenPvVih: true,
      FactureEchographie: true,
      FactureExamen: true,
      FacturePrestation: true,
      FactureProduit: true,
      Couverture: true,
    },
  });

  //    {
  //     MEDECIN: "MEDECIN";
  //     GYNECOLOGIE: "GYNECOLOGIE";
  //     OBSTETRIQUE: "OBSTETRIQUE";
  //     VIH: "VIH";
  //     IST: "IST";
  // }
  const typeExamen = TypeExamen;
  const allExamens = await prisma.examen.findMany({});
  const examensMedecine = allExamens.filter(
    (examen) => examen.typeExamen === typeExamen.MEDECIN
  );
  const examensGynecologie = allExamens.filter(
    (examen) => examen.typeExamen === typeExamen.GYNECOLOGIE
  );
  const examensObstetrique = allExamens.filter(
    (examen) => examen.typeExamen === typeExamen.OBSTETRIQUE
  );
  const examensIst = allExamens.filter(
    (examen) => examen.typeExamen === typeExamen.IST
  );

  const visitsData: ClientData[] = [];

  clients.forEach((client) => {
    client.Visite.forEach((visite) => {
      if (
        visite.dateVisite >= dateVisite1 &&
        visite.dateVisite <= dateVisite2
      ) {
        // 🔑 Récupération par idVisite et non par index
        const planning = client.Planning?.find((p) => p.idVisite === visite.id);
        const gyneco = client.Gynecologie?.find(
          (g) => g.idVisite === visite.id
        );
        const ist = client.Ist?.find((i) => i.istIdVisite === visite.id);
        const infert = client.Infertilite?.find(
          (f) => f.infertIdVisite === visite.id
        );
        const vbg = client.Vbg?.find((v) => v.vbgIdVisite === visite.id);
        const medecine = client.Medecine?.find(
          (m) => m.mdgIdVisite === visite.id
        );
        const grossesse = client.Grossesse?.find(
          (g) => g.grossesseIdVisite === visite.id
        );
        const obstetrique = client.Obstetrique?.find(
          (o) => o.obstIdVisite === visite.id
        );
        const cpon = client.Cpon?.find((c) => c.cponIdVisite === visite.id);
        const testGrossesse = client.TestGrossesse?.find(
          (c) => c.testIdVisite === visite.id
        );
        const accouchement = client.Accouchement?.find(
          (c) => c.accouchementIdVisite === visite.id
        );
        const saa = client.Saa?.find((c) => c.saaIdVisite === visite.id);
        const depistageVih = client.DepistageVih?.find(
          (d) => d.depistageVihIdVisite === visite.id
        );
        const pecVih = client.PecVih?.find(
          (d) => d.pecVihIdVisite === visite.id
        );
        const recapVisite = client.RecapVisite?.find(
          (r) => r.idVisite === visite.id
        );
        const examenPvVih = client.ExamenPvVih?.find(
          (e) => e.examenPvVihIdVisite === visite.id
        );

        const echographie = client.FactureEchographie?.filter(
          (e) => e.idVisite === visite.id
        );
        const examen = client.FactureExamen?.filter(
          (e) => e.idVisite === visite.id
        );

        const prestation = client.FacturePrestation?.filter(
          (e) => e.idVisite === visite.id
        );
        const produit = client.FactureProduit?.filter(
          (e) => e.idVisite === visite.id
        );
        const couverture = client.Couverture?.filter(
          (c) => c.couvertIdVisite === visite.id
        );

        visitsData.push({
          id: client.id,
          idVisite: visite.id,
          dateVisite: visite.dateVisite.toLocaleDateString(),
          idActiviteVisite: visite.idActivite || "",
          idLieu: visite.idLieu || "",
          // idLieu: visite.idActivite?.split(">")[1] || "",
          motifVisite: visite.motifVisite,
          nom: client.nom,
          prenom: client.prenom,
          age: calculerAge(client.dateNaissance),
          sexe: client.sexe,
          code: client.code,
          clinique: client.idClinique,
          ethnie: client.ethnie || "",
          serologie: client.serologie || "",
          sourceInformation: client.sourceInfo || "",
          quartier: client.quartier || "",

          // Planning
          methodePrise: planning?.methodePrise || false,
          statut: planning?.statut || "",
          consultationPf: planning?.consultation || false,
          counsellingPf: planning?.counsellingPf || false,
          courtDuree: planning?.courtDuree || null,
          implanon: planning?.implanon || null,
          retraitImplanon: planning?.retraitImplanon || false,
          jadelle: planning?.jadelle || null,
          retraitJadelle: planning?.retraitJadelle || false,
          sterilet: planning?.sterilet || null,
          retraitSterilet: planning?.retraitSterilet || false,
          raisonRetrait: planning?.raisonRetrait || null,
          raisonEffetSecondaire: planning?.raisonEffetSecondaire || null,
          rdvPf: planning?.rdvPf || null,
          pfUserId: planning?.idUser || "",

          // Gyneco
          consultationGyneco: gyneco?.consultation || false,
          motifVisiteGyneco:
            gyneco?.counsellingAvantDepitage && planning?.consultation
              ? "true"
              : "false",
          counsellingAvantDepistage: gyneco?.counsellingAvantDepitage || false,
          counsellingApresDepistage: gyneco?.counsellingApresDepitage || false,
          resultatIva: gyneco?.resultatIva || "",
          eligibleTraitementIva: gyneco?.eligibleTraitementIva || false,
          typeTraitementIva: gyneco?.typeTraitement || "",
          counsellingCancerSein: gyneco?.counselingCancerSein || false,
          resultatCancerSein: gyneco?.resultatCancerSein || "",
          counsellingAutreProbleme: gyneco?.counselingAutreProbleme || false,
          examenPhysique: gyneco?.examenPhysique || false,
          examenPalpationSein: gyneco?.examenPalpation || false,
          toucheeVaginale: gyneco?.toucheeVaginale || false,
          regleIrreguliere: gyneco?.reglesIrreguliere || false,
          regularisationMenstruelle: gyneco?.regularisationMenstruelle || false,
          autreProblemeGyneco: gyneco?.autreProblemeGyneco || false,

          // IST
          istCounsellingAvantDepitage:
            ist?.istCounsellingAvantDepitage || false,
          istType: ist?.istType || "",
          istCounsellingApresDepitage:
            ist?.istCounsellingApresDepitage || false,
          istCounselingReductionRisque:
            ist?.istCounselingReductionRisque || false,
          istExamenPhysique: ist?.istExamenPhysique || false,
          istPecEtiologique: ist?.istPecEtiologique || "",
          istTypeClient: ist?.istTypeClient || "",
          istTypePec: ist?.istTypePec || "",

          // Infertilité
          infertConsultation: infert?.infertConsultation || false,
          infertCounselling: infert?.infertCounselling || false,
          infertExamenPhysique: infert?.infertExamenPhysique || false,
          infertTraitement: infert?.infertTraitement || "",
          infertIdUser: infert?.infertIdUser || "",

          // VBG
          vbgType: vbg?.vbgType || "",
          vbgDuree: vbg?.vbgDuree || 0,
          vbgConsultation: vbg?.vbgConsultation || "",
          vbgCounsellingRelation: vbg?.vbgCounsellingRelation || false,
          vbgCounsellingViolenceSexuel:
            vbg?.vbgCounsellingViolenceSexuel || false,
          vbgCounsellingViolencePhysique:
            vbg?.vbgCounsellingViolencePhysique || false,
          vbgCounsellingSexuelite: vbg?.vbgCounsellingSexuelite || false,
          vbgPreventionViolenceSexuelle:
            vbg?.vbgPreventionViolenceSexuelle || false,
          vbgPreventionViolencePhysique:
            vbg?.vbgPreventionViolencePhysique || false,
          vbgIdUser: vbg?.vbgIdUser || "",

          // Médecine
          mdgConsultation: medecine?.mdgConsultation || false,
          mdgCounselling: medecine?.mdgCounselling || false,
          mdgEtatFemme: medecine?.mdgEtatFemme || "",
          mdgMotifConsultation: medecine?.mdgMotifConsultation || "",
          mdgTypeVisite: medecine?.mdgTypeVisite || "",
          mdgExamenPhysique: medecine?.mdgExamenPhysique || false,
          mdgSuspicionPalu: medecine?.mdgSuspicionPalu || "",
          mdgDiagnostic: medecine?.mdgDiagnostic || [],
          mdgAutreDiagnostic: medecine?.mdgAutreDiagnostic || "",
          mdgSoins: medecine?.mdgSoins || "",
          mdgPecAffection: medecine?.mdgPecAffection || "",
          mdgTypeAffection: medecine?.mdgTypeAffection || "",
          mdgTraitement: medecine?.mdgTraitement || [],
          mdgMiseEnObservation: medecine?.mdgMiseEnObservation || false,
          mdgTestRapidePalu: medecine?.mdgTestRapidePalu || false,
          mdgDureeObservation: medecine?.mdgDureeObservation || 0,
          mdgIdUser: medecine?.mdgIdUser || "",
          mdgIdClient: medecine?.mdgIdClient || "",

          // Grossesse
          obstIdGrossesse: grossesse?.id || "",
          grossesseHta: grossesse?.grossesseHta || "",
          grossesseDiabete: grossesse?.grossesseDiabete || "",
          grossesseGestite: grossesse?.grossesseGestite || 0,
          grossesseParite: grossesse?.grossesseParite || 0,
          grossesseAge: grossesse?.grossesseAge || 0,
          grossesseDdr: grossesse?.grossesseDdr || new Date(),
          termePrevu: grossesse?.termePrevu || new Date(),
          grossesseInterruption: grossesse?.grossesseInterruption || false,
          grossesseMotifInterruption:
            grossesse?.grossesseMotifInterruption || "",

          // Obstétrique
          obstConsultation: obstetrique?.obstConsultation || false,
          obstCounselling: obstetrique?.obstCounselling || false,
          obstTypeVisite: obstetrique?.obstTypeVisite || "",
          obstVat: obstetrique?.obstVat || null,
          obstSp: obstetrique?.obstSp || null,
          obstFer: obstetrique?.obstFer || false,
          obstFolate: obstetrique?.obstFolate || false,
          obstDeparasitant: obstetrique?.obstDeparasitant || false,
          obstMilda: obstetrique?.obstMilda || false,
          obstInvestigations: obstetrique?.obstInvestigations || false,
          obstEtatNutritionnel: obstetrique?.obstEtatNutritionnel || "",
          obstEtatGrossesse: obstetrique?.obstEtatGrossesse || "",
          obstPfppi: obstetrique?.obstPfppi || false,
          obstAlbuminieSucre: obstetrique?.obstAlbuminieSucre || false,
          obstAnemie: obstetrique?.obstAnemie || false,
          obstSyphilis: obstetrique?.obstSyphilis || false,
          obstAghbs: obstetrique?.obstAghbs || false,
          obstRdv: obstetrique?.obstRdv || null,

          // Cpon
          cponConsultation: cpon?.cponConsultation || false,
          cponCounselling: cpon?.cponCounselling || false,
          cponInvestigationPhysique: cpon?.cponInvestigationPhysique || false,
          cponDuree: cpon?.cponDuree || null,
          cponIdUser: cpon?.cponIdUser || null,
          // Test de grossesse
          testConsultation: testGrossesse?.testConsultation || false,
          testResultat: testGrossesse?.testResultat || "",
          // Accouchement
          accouchementConsultation:
            accouchement?.accouchementConsultation || false,
          accouchementLieu: accouchement?.accouchementLieu || "",
          accouchementStatutVat: accouchement?.accouchementStatutVat || "",
          accouchementComplications:
            accouchement?.accouchementComplications || "",
          accouchementEvacuationMere:
            accouchement?.accouchementEvacuationMere || "",
          accouchementTypeEvacuation:
            accouchement?.accouchementTypeEvacuation || "",
          accouchementEvacuationEnfant:
            accouchement?.accouchementEvacuationEnfant || "",
          accouchementMultiple: accouchement?.accouchementMultiple || "",
          accouchementEtatNaissance:
            accouchement?.accouchementEtatNaissance || "",
          accouchementEnfantVivant: accouchement?.accouchementEnfantVivant || 0,
          accouchementEnfantMortNeFrais:
            accouchement?.accouchementEnfantMortNeFrais || 0,
          accouchementEnfantMortNeMacere:
            accouchement?.accouchementEnfantMortNeMacere || 0,
          accouchementNbPoidsEfantVivant:
            accouchement?.accouchementNbPoidsEfantVivant || 0,
          accouchementIdUser: accouchement?.accouchementIdUser || "",
          // SAA
          saaTypeAvortement: saa?.saaTypeAvortement || "",
          saaMethodeAvortement: saa?.saaMethodeAvortement || "",
          saaConsultation: saa?.saaConsultation || false,
          saaSuiviPostAvortement: saa?.saaSuiviPostAvortement || false,
          saaSuiviAutoRefere: saa?.saaSuiviAutoRefere || false,
          saaCounsellingPre: saa?.saaCounsellingPre || false,
          saaMotifDemande: saa?.saaMotifDemande || "",
          saaConsultationPost: saa?.saaConsultationPost || false,
          saaCounsellingPost: saa?.saaCounsellingPost || false,
          saaTypePec: saa?.saaTypePec || "",
          saaTraitementComplication: saa?.saaTraitementComplication || "",
          saaIdUser: saa?.saaIdUser || "",
          // Dépistage VIH
          depistageVihTypeClient: depistageVih?.depistageVihTypeClient || "",
          depistageVihConsultation:
            depistageVih?.depistageVihConsultation || false,
          depistageVihCounsellingPreTest:
            depistageVih?.depistageVihCounsellingPreTest || false,
          depistageVihInvestigationTestRapide:
            depistageVih?.depistageVihInvestigationTestRapide || false,
          depistageVihResultat: depistageVih?.depistageVihResultat || "",
          depistageVihCounsellingPostTest:
            depistageVih?.depistageVihCounsellingPostTest || false,
          depistageVihCounsellingReductionRisque:
            depistageVih?.depistageVihCounsellingReductionRisque || false,
          depistageVihCounsellingSoutienPsychoSocial:
            depistageVih?.depistageVihCounsellingSoutienPsychoSocial || false,
          depistageVihIdUser: depistageVih?.depistageVihIdUser || "",
          depistageVihResultatPositifMisSousArv:
            depistageVih?.depistageVihResultatPositifMisSousArv || false,

          // pec VIH
          pecVihCounselling: pecVih?.pecVihCounselling || false,
          pecVihTypeclient: pecVih?.pecVihTypeclient || "",
          pecVihMoleculeArv: pecVih?.pecVihMoleculeArv as string,
          pecVihIoPaludisme: pecVih?.pecVihIoPaludisme || false,
          pecVihIoTuberculose: pecVih?.pecVihIoTuberculose || false,
          pecVihIoAutre: pecVih?.pecVihIoAutre || false,
          pecVihAesArv: pecVih?.pecVihAesArv || false,
          pecVihCotrimo: pecVih?.pecVihCotrimo || false,
          pecVihSoutienPsychoSocial: pecVih?.pecVihSoutienPsychoSocial || false,
          pecVihSpdp: pecVih?.pecVihSpdp || false,

          // Nom prescripteur
          recapPrescripteur: recapVisite?.prescripteurs || [],
          nomPrescripteur: "",
          idPrescripteur: "",
          // Examen Pec VIH (copié/fallbacks similaires à rapportPfActions)
          // Examen Pec VIH
          examenPvVihDatePrelevement:
            examenPvVih?.examenPvVihDatePrelevement || null,
          examenPvVihDateTraitement:
            examenPvVih?.examenPvVihDateTraitement || null,
          examenPvVihFemmeEnceinte:
            examenPvVih?.examenPvVihFemmeEnceinte === "oui" || false,
          examenPvVihAllaitement:
            examenPvVih?.examenPvVihAllaitement === "oui" || false,
          examenPvVihTypage: examenPvVih?.examenPvVihTypage || "",
          examenPvVihChargeVirale: examenPvVih?.examenPvVihChargeVirale ?? "",
          examenPvVihCd4: examenPvVih?.examenPvVihCd4 || null,
          examenPvVihGlycemie: examenPvVih?.examenPvVihGlycemie || null,
          examenPvVihCreatinemie: examenPvVih?.examenPvVihCreatinemie || null,
          examenPvVihTransaminases:
            examenPvVih?.examenPvVihTransaminases || null,
          examenPvVihUree: examenPvVih?.examenPvVihUree || null,
          examenPvVihCholesterolHdl:
            examenPvVih?.examenPvVihCholesterolHdl || null,
          examenPvVihCholesterolTotal:
            examenPvVih?.examenPvVihCholesterolTotal || null,
          examenPvVihHemoglobineNfs:
            examenPvVih?.examenPvVihHemoglobineNfs || null,
          examenPvVihConsultation:
            examenPvVih?.examenPvVihConsultation || false,
          // Indicateur viral pour les grossesses (peut venir de la table Grossesse)
          grossesseFeChargViralIndetectable: false,
          echographie: echographie
            ? echographie.map((e) => e.libelleEchographie)
            : [],
          laboMedecine: examen
            ? examen
                .filter((e) =>
                  examensMedecine.some((em) => em.nomExamen === e.libelleExamen)
                )
                .map((e) => e.libelleExamen)
            : [],
          laboIst: examen
            ? examen
                .filter((e) =>
                  examensIst.some((ei) => ei.nomExamen === e.libelleExamen)
                )
                .map((e) => e.libelleExamen)
            : [],
          laboObstetrique: examen
            ? examen
                .filter((e) =>
                  examensObstetrique.some(
                    (em) => em.nomExamen === e.libelleExamen
                  )
                )
                .map((e) => e.libelleExamen)
            : [],
          laboGyneco: examen
            ? examen
                .filter((e) =>
                  examensGynecologie.some(
                    (em) => em.nomExamen === e.libelleExamen
                  )
                )
                .map((e) => e.libelleExamen)
            : [],
          montantTotalPaiement:
            (echographie
              ? echographie.reduce((sum, e) => sum + e.prixEchographie, 0)
              : 0) +
            (examen ? examen.reduce((sum, e) => sum + e.prixExamen, 0) : 0) +
            (prestation
              ? prestation.reduce((sum, e) => sum + e.prixPrestation, 0)
              : 0) +
            (produit
              ? produit.reduce((sum, e) => sum + e.montantProduit, 0)
              : 0),
          couverture:
            couverture.length > 0 ? couverture[0].couvertIdVisite : "Aucune",
        });
      }
    });
  });

  // 🔄 Mise à jour Grossesse si nécessaire
  const visitsAllData: ClientData[] = [];
  const visitsDataCpnFalse = visitsData.filter(
    (visit) => !visit.obstConsultation
  );
  const visitsDataCpn = visitsData.filter((visit) => visit.obstConsultation);
  const visitsDataCpnUpdate = await visiteDataCpnUpdate(visitsDataCpn);
  visitsAllData.push(...visitsDataCpnUpdate);
  visitsAllData.push(...visitsDataCpnFalse);

  visitsAllData.sort((a, b) => {
    const dateA = new Date(a.dateVisite);
    const dateB = new Date(b.dateVisite);
    return dateA.getTime() - dateB.getTime();
  });
  // Ajout nom clinique
  const visitsAllDataWithCliniqueName = visitsAllData.map((v) => {
    const clinique = allClinique.find((c) => c.id === v.clinique);
    return {
      ...v,
      clinique: clinique ? clinique.nomClinique : "Clinique inconnue",
    };
  });

  // filtrage par activité si activiteIds fournis
  let visitsFilteredByActivite = visitsAllDataWithCliniqueName;
  let visitsFilteredByActiviteLieu = visitsAllDataWithCliniqueName;

  //oprération permettant de récupérer les idActivite et idLieu séparément depuis le tableau activiteIds
  const [tabIdactivite, tabIdLieu] = activiteIds.reduce<[string[], string[]]>(
    ([left, right], str) => {
      const [l = "", r = ""] = str.split(">");
      return [
        [...left, l],
        [...right, r],
      ];
    },
    [[], []] as [string[], string[]]
  );

  if (activiteIds.length > 0) {
    visitsFilteredByActivite = visitsAllDataWithCliniqueName.filter((visit) =>
      tabIdactivite.includes(visit.idActiviteVisite)
    );
    visitsFilteredByActiviteLieu = visitsFilteredByActivite.filter((visit) =>
      tabIdLieu.includes(visit.idLieu)
    );
  } else {
    visitsFilteredByActivite = visitsAllDataWithCliniqueName.filter(
      (visit) =>
        visit.idActiviteVisite === null || visit.idActiviteVisite === ""
    ); // tous les clients avec des visites
    visitsFilteredByActiviteLieu = visitsFilteredByActivite;
  }

  return visitsFilteredByActiviteLieu;
};

const visiteDataCpnUpdate = async (clients: ClientData[]) => {
  for (const client of clients) {
    const data = await getOneGrossesse(client.obstIdGrossesse);
    if (data) {
      client.grossesseHta = data.grossesseHta;
      client.grossesseDiabete = data.grossesseDiabete;
      client.grossesseGestite = data.grossesseGestite;
      client.grossesseParite = data.grossesseParite;
      client.grossesseAge = data.grossesseAge || 0;
      client.grossesseDdr = data.grossesseDdr || new Date();
      client.termePrevu = data.termePrevu || new Date();
      client.grossesseInterruption = data.grossesseInterruption || false;
      client.grossesseMotifInterruption = data.grossesseMotifInterruption || "";
      client.grossesseFeChargViralIndetectable =
        data.grossesseIdVisite &&
        client.idVisite &&
        client.examenPvVihChargeVirale &&
        Number(client.examenPvVihChargeVirale) < 1000
          ? true
          : false;
    }
  }
  return clients;
};

// export const fetchClientsStatusProtege = async (
//   clinicIds: string[],
//   activiteIds: string[],
//   dateVisite1: Date,
//   dateVisite2: Date
// ): Promise<ClientStatusInfo[]> => {
//   if (!clinicIds) {
//     alert("Veuillez choisir au moins une clinique");
//     return [];
//   }

//   const clients = await prisma.client.findMany({
//     where: {
//       idClinique: {
//         in: clinicIds,
//       },
//       Planning: {
//         some: {
//           rdvPf: {
//             gte: dateVisite1,
//             // lte: dateVisite2,
//           },
//         },
//       },
//     },
//     include: {
//       Planning: true,
//       Visite: true,
//     },
//   });
//   let activiteClient: ClientAvecMethodePrise[] = [];
//   let activiteClientLieu: ClientAvecMethodePrise[] = [];

//   // parsing robuste de activiteIds -> tabIdactivite et tabIdLieu
//   const [tabIdactivite, tabIdLieu] = (
//     Array.isArray(activiteIds) ? activiteIds : []
//   ).reduce<[string[], string[]]>(
//     ([left, right], str) => {
//       if (typeof str !== "string") return [left, right];

//       const parts = str.split(">");
//       const l = parts[0]?.trim() ?? "";
//       const r = parts[1]?.trim() ?? "";

//       if (l) left.push(l);
//       if (r) right.push(r);

//       return [left, right];
//     },
//     [[], []]
//   );

//   // Si on a des filtres d'activités
//   if (Array.isArray(activiteIds) && activiteIds.length > 0) {
//     // Cas normal : on veut les clients ayant des visites avec idActivite présent dans tabIdactivite
//     // Si tabIdactivite est vide mais tabIdLieu contient des valeurs (ex: activiteIds = [">lieuA"]), on filtre seulement par lieu.
//     if (tabIdactivite.length > 0) {
//       activiteClient = clients.filter(
//         (client) =>
//           Array.isArray(client.Visite) &&
//           client.Visite.some((visite) => {
//             const idAct = visite.idActivite ?? "";
//             return idAct !== "" && tabIdactivite.includes(idAct);
//           })
//       );
//     } else {
//       // pas d'activité fournie, garde tous les clients ayant au moins une visite (on appliquera le filtre lieu ensuite)
//       activiteClient = clients.filter(
//         (client) => Array.isArray(client.Visite) && client.Visite.length > 0
//       );
//     }

//     // Si on a des lieux fournis, on affine par lieu
//     if (tabIdLieu.length > 0) {
//       activiteClientLieu = activiteClient.filter(
//         (client) =>
//           Array.isArray(client.Visite) &&
//           client.Visite.some((visite) => {
//             const idLieu = visite.idLieu ?? "";
//             return idLieu !== "" && tabIdLieu.includes(idLieu);
//           })
//       );
//     } else {
//       activiteClientLieu = activiteClient;
//     }
//   } else {
//     // Sans filtre d'activite fourni : on garde tous les clients qui ont au moins une visite
//     activiteClient = clients.filter(
//       (client) => Array.isArray(client.Visite) && client.Visite.length > 0
//     );
//     activiteClientLieu = activiteClient;
//   }

//   const clientsStatus: ClientStatusInfo[] = [];
//   // Convert rdvPf from string|null to Date|null for type compatibility
//   const clientsAvecMethodePrise: ClientAvecMethodePrise[] = activiteClientLieu
//     .filter((client) =>
//       client.Planning?.some((plan) => plan.methodePrise === true)
//     )
//     .map((client) => ({
//       ...client,
//       Planning: client.Planning.map((plan) => ({
//         ...plan,
//         rdvPf: plan.rdvPf ? new Date(plan.rdvPf) : null,
//       })),
//     }));
//   for (const client of clientsAvecMethodePrise) {
//     for (const plan of client.Planning || []) {
//       if (plan.rdvPf) {
//         const rendezVous = new Date(plan.rdvPf);
//         const diffJours = Math.floor(
//           (dateVisite2.getTime() - rendezVous.getTime()) / (1000 * 60 * 60 * 24)
//         );

//         // Exclusion si plus de 90 jours
//         if (diffJours > 90) continue;

//         const isLongueDuree = !!(
//           plan.implanon ||
//           plan.jadelle ||
//           plan.sterilet
//         );
//         const dateDebutMethod = plan.implanon
//           ? new Date(plan.implanon)
//           : plan.jadelle
//           ? new Date(plan.jadelle)
//           : plan.sterilet
//           ? new Date(plan.sterilet)
//           : null;

//         const retrait =
//           plan.retraitImplanon || plan.retraitJadelle || plan.retraitSterilet;

//         const visitesTriees = client.Visite.sort(
//           (a, b) =>
//             new Date(b.dateVisite).getTime() - new Date(a.dateVisite).getTime()
//         );

//         const visiteLaPlusRecente = visitesTriees[0]?.dateVisite
//           ? new Date(visitesTriees[0].dateVisite)
//           : null;

//         // Récupérer la date de visite
//         let dateVisiste = "";
//         if (client.Visite?.[0]?.dateVisite) {
//           const rawDate = await getDateVisite(plan.idVisite);
//           if (rawDate instanceof Date) {
//             dateVisiste = rawDate.toLocaleDateString("fr-FR"); // ou rawDate.toISOString(), selon ton besoin
//           }
//         }

//         const status: ClientStatusInfo = {
//           nom: client.nom,
//           prenom: client.prenom,
//           age: calculerAge(client.dateNaissance),
//           sexe: client.sexe,
//           code: client.code,
//           dateVisiste: dateVisiste,
//           rdvPf: plan.rdvPf ? plan.rdvPf : null,
//           statut: plan.statut || "",
//           courtDuree: plan.courtDuree,
//           implanon: plan.implanon,
//           jadelle: plan.jadelle,
//           sterilet: plan.sterilet,
//           methodePrise: plan.methodePrise,
//           protege: false,
//           perdueDeVue: false,
//           abandon: false,
//           arret: false,
//         };

//         // Conditions pour déterminer le statut
//         if (rendezVous >= dateVisite2) {
//           status.protege = true;
//         } else if (diffJours <= 30) {
//           status.perdueDeVue = true;
//         } else if (diffJours <= 60) {
//           status.abandon = true;
//         } else if (diffJours <= 90) {
//           status.arret = true;
//         }

//         // Condition spécifique pour les méthodes de longue durée
//         if (
//           isLongueDuree &&
//           retrait &&
//           dateDebutMethod &&
//           visiteLaPlusRecente &&
//           visiteLaPlusRecente > dateDebutMethod
//         ) {
//           status.arret = true;
//           status.protege = false;
//           status.perdueDeVue = false;
//           status.abandon = false;
//         }
//         clientsStatus.push(status);

//         // tu vas me créer un fonction checkClientStatus qui va me retourner un élément de type ClientStatusInfo
//         // cette fonction checkClientStatus va prendre en paramètre status.dateVisiste et va parcourir clientsAvecMethodePrise pour les verifications
//         // cette fonction checkClientStatus va vérifier si un client a une visite de planning entre status.dateVisiste et dateVisite2 et que :
//         // planning.retraitImplanon === true || planning.retraitJadelle === true || planning.retraitSterilet === true alors tu vas mettre status.protege à false et status.arret à true
//         // Vérification spécifique via checkClientStatus
//         const checkResult = checkClientStatus(
//           typeof status.dateVisiste === "string"
//             ? status.dateVisiste
//             : status.dateVisiste instanceof Date
//             ? status.dateVisiste.toLocaleDateString("fr-FR")
//             : "",
//           dateVisite2,
//           clientsAvecMethodePrise
//         );

//         if (checkResult) {
//           // remplace le status initial par celui retourné par la vérification
//           clientsStatus.push(checkResult);
//         } else {
//           // garde le status normal
//           clientsStatus.push(status);
//         }
//       }
//     }
//   }

//   // Fonction pour convertir une date au format "JJ/MM/AAAA" en objet Date
//   const parseDate = (dateStr: string): Date => {
//     const [day, month, year] = dateStr.split("/").map(Number);
//     // Le mois est 0-indexé en JavaScript (0 pour Janvier, 11 pour Décembre)
//     return new Date(year, month - 1, day);
//   };

//   // Convertit la date cible en objet Date pour la comparaison
//   const targetDate = dateVisite2;

//   // Utilise un objet pour stocker le client le plus proche pour chaque code
//   const closestClients = clientsStatus.reduce((acc, currentClient) => {
//     const existingClient = acc[currentClient.code];
//     const currentDate = parseDate(currentClient.dateVisiste as string);

//     // Si aucun client avec ce code n'a été enregistré, ou si le client actuel a une date plus proche
//     if (
//       !existingClient ||
//       Math.abs(currentDate.getTime() - targetDate.getTime()) <
//         Math.abs(
//           parseDate(existingClient.dateVisiste as string).getTime() -
//             targetDate.getTime()
//         )
//     ) {
//       acc[currentClient.code] = currentClient;
//     }

//     return acc;
//   }, {} as Record<string, ClientStatusInfo>);

//   // Convertit l'objet des résultats en un tableau
//   const clientsProtege = Object.values(closestClients);

//   return clientsProtege;
// };

export const fetchClientsStatusProtege = async (
  clinicIds: string[],
  activiteIds: string[],
  dateVisite1: Date,
  dateVisite2: Date
): Promise<ClientStatusInfo[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  // crée une constant qui stoque dateVisite1 - 90 jours
  const dateLimite = new Date(dateVisite1);
  dateLimite.setDate(dateLimite.getDate() - 90);

  // Récupérer tous les clients avec leurs planifications et visites
  const clients = await prisma.client.findMany({
    where: {
      idClinique: {
        in: clinicIds,
      },
      Planning: {
        some: {
          rdvPf: {
            gte: dateLimite,
          },
        },
      },
    },
    include: {
      Planning: {
        where: {
          rdvPf: {
            gte: dateVisite1,
          },
          methodePrise: true,
        },
      },
      Visite: true,
    },
  });

  // on va filtrer et garder de façon unique le client qui a la visite la plus proche de dateVisite2

  // Parsing des activités et lieux
  const [tabIdactivite, tabIdLieu] = (
    Array.isArray(activiteIds) ? activiteIds : []
  ).reduce<[string[], string[]]>(
    ([left, right], str) => {
      if (typeof str !== "string") return [left, right];

      const parts = str.split(">");
      const l = parts[0]?.trim() ?? "";
      const r = parts[1]?.trim() ?? "";

      if (l) left.push(l);
      if (r) right.push(r);

      return [left, right];
    },
    [[], []]
  );

  // Filtrer les clients par activité et lieu
  let filteredClients = clients;

  if (Array.isArray(activiteIds) && activiteIds.length > 0) {
    if (tabIdactivite.length > 0) {
      filteredClients = filteredClients.filter(
        (client) =>
          Array.isArray(client.Visite) &&
          client.Visite.some((visite) => {
            const idAct = visite.idActivite ?? "";
            return idAct !== "" && tabIdactivite.includes(idAct);
          })
      );
    }

    if (tabIdLieu.length > 0) {
      filteredClients = filteredClients.filter(
        (client) =>
          Array.isArray(client.Visite) &&
          client.Visite.some((visite) => {
            const idLieu = visite.idLieu ?? "";
            return idLieu !== "" && tabIdLieu.includes(idLieu);
          })
      );
    }
  }

  // Fonction pour vérifier le statut d'un client
  const checkClientStatus = (
    dateVisiteStr: string,
    dateLimite: Date,
    clientData: ClientAvecMethodePrise
  ): Partial<ClientStatusInfo> | null => {
    if (!clientData || !clientData.Planning) return null;

    const dateVisite = parseDate(dateVisiteStr);

    // Trouver une visite de planning entre dateVisite et dateLimite
    const planningEntreDates = clientData.Planning.find((plan) => {
      if (!plan.rdvPf) return false;
      const datePlan = new Date(plan.rdvPf);
      return datePlan >= dateVisite && datePlan <= dateLimite;
    });

    if (planningEntreDates) {
      const aRetrait =
        planningEntreDates.retraitImplanon ||
        planningEntreDates.retraitJadelle ||
        planningEntreDates.retraitSterilet;

      if (aRetrait) {
        return {
          protege: false,
          arret: true,
          perdueDeVue: false,
          abandon: false,
        };
      }
    }

    return null;
  };

  // Convertir une chaîne de date en objet Date
  const parseDate = (dateStr: string): Date => {
    // Supposons que la date est au format "JJ/MM/AAAA"
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const clientsStatus: ClientStatusInfo[] = [];

  // Filtrer les clients qui ont methodePrise === true
  const clientsAvecMethodePrise = filteredClients.filter((client) =>
    client.Planning?.some((plan) => plan.methodePrise === true)
  ) as ClientAvecMethodePrise[];

  for (const client of clientsAvecMethodePrise) {
    // Trier les visites par date (la plus récente en premier)
    const visitesTriees = [...client.Visite].sort(
      (a, b) =>
        new Date(b.dateVisite).getTime() - new Date(a.dateVisite).getTime()
    );

    // Pour chaque planification du client
    for (const plan of client.Planning || []) {
      if (plan.rdvPf) {
        const rendezVous = new Date(plan.rdvPf);

        // Calculer la différence en jours
        const diffJours = Math.floor(
          (dateVisite2.getTime() - rendezVous.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Exclusion si plus de 90 jours
        // if (diffJours > 90) continue;

        // Trouver la visite la plus récente
        const visiteLaPlusRecente = visitesTriees[0]?.dateVisite
          ? new Date(visitesTriees[0].dateVisite)
          : null;

        // Déterminer si c'est une méthode longue durée
        const isLongueDuree = !!(
          plan.implanon ||
          plan.jadelle ||
          plan.sterilet
        );

        // Date de début de la méthode
        const dateDebutMethod = plan.implanon
          ? new Date(plan.implanon)
          : plan.jadelle
          ? new Date(plan.jadelle)
          : plan.sterilet
          ? new Date(plan.sterilet)
          : null;

        const retrait =
          plan.retraitImplanon || plan.retraitJadelle || plan.retraitSterilet;

        // Récupérer la date de visite pour ce planning
        let dateVisisteStr = "";
        if (plan.idVisite) {
          const rawDate = await getDateVisite(plan.idVisite);
          if (rawDate instanceof Date) {
            dateVisisteStr = rawDate.toLocaleDateString("fr-FR");
          }
        }

        // Créer le statut initial
        const status: ClientStatusInfo = {
          nom: client.nom,
          prenom: client.prenom,
          age: calculerAge(client.dateNaissance),
          sexe: client.sexe,
          code: client.code,
          dateVisiste: dateVisisteStr,
          rdvPf: plan.rdvPf,
          statut: plan.statut || "",
          courtDuree: plan.courtDuree || "",
          implanon: plan.implanon || "",
          jadelle: plan.jadelle || "",
          sterilet: plan.sterilet || "",
          methodePrise: plan.methodePrise,
          protege: false,
          perdueDeVue: false,
          abandon: false,
          arret: false,
        };

        // Vérification spécifique pour les retraits
        const checkResult = checkClientStatus(
          dateVisisteStr,
          dateVisite2,
          client
        );

        // Appliquer les statuts
        if (checkResult) {
          // Appliquer les modifications du check
          Object.assign(status, checkResult);
        } else if (rendezVous >= dateVisite2) {
          status.protege = true;
        } else if (diffJours <= 30) {
          status.perdueDeVue = true;
        } else if (diffJours <= 60) {
          status.abandon = true;
        } else if (diffJours <= 90) {
          status.arret = true;
        }

        // Condition spécifique pour les méthodes de longue durée avec retrait
        if (
          isLongueDuree &&
          retrait &&
          dateDebutMethod &&
          visiteLaPlusRecente &&
          visiteLaPlusRecente > dateDebutMethod
        ) {
          status.arret = true;
          status.protege = false;
          status.perdueDeVue = false;
          status.abandon = false;
        }

        clientsStatus.push(status);
      }
    }
  }

  // Utiliser un Map pour garder le statut le plus récent par code de client
  const clientsMap = new Map<string, ClientStatusInfo>();

  for (const clientStatus of clientsStatus) {
    const existing = clientsMap.get(clientStatus.code);

    if (
      !existing ||
      (clientStatus.dateVisiste &&
        existing.dateVisiste &&
        parseDate(
          typeof clientStatus.dateVisiste === "string"
            ? clientStatus.dateVisiste
            : clientStatus.dateVisiste.toLocaleDateString("fr-FR")
        ) >
          parseDate(
            typeof existing.dateVisiste === "string"
              ? existing.dateVisiste
              : existing.dateVisiste.toLocaleDateString("fr-FR")
          ))
    ) {
      clientsMap.set(clientStatus.code, clientStatus);
    }
  }

  return Array.from(clientsMap.values());
};

export const fetchClientsStatusProteges = async (
  clinicIds: string[],
  activiteIds: string[],
  dateVisite1: Date,
  dateVisite2: Date
): Promise<ClientStatusInfo[]> => {
  if (!clinicIds?.length) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  // -----------------------------
  // Récupération des clients
  // -----------------------------
  const clients = await prisma.client.findMany({
    where: {
      idClinique: { in: clinicIds },
      Planning: {
        some: {
          methodePrise: true,
        },
      },
    },
    include: {
      Planning: true,
      Visite: true,
    },
  });

  // -----------------------------
  // Parsing activite > lieu
  // -----------------------------
  const [tabIdActivite, tabIdLieu] = activiteIds.reduce<[string[], string[]]>(
    ([a, l], v) => {
      const [act, lieu] = v.split(">").map((s) => s?.trim());
      if (act) a.push(act);
      if (lieu) l.push(lieu);
      return [a, l];
    },
    [[], []]
  );

  // -----------------------------
  // Filtrage activité / lieu
  // -----------------------------
  const filteredClients = clients.filter((client) =>
    client.Visite.some((v) => {
      const okActivite =
        !tabIdActivite.length || tabIdActivite.includes(v.idActivite ?? "");
      const okLieu = !tabIdLieu.length || tabIdLieu.includes(v.idLieu ?? "");
      return okActivite && okLieu;
    })
  );

  const resultMap = new Map<string, ClientStatusInfo>();

  // -----------------------------
  // Traitement par client
  // -----------------------------
  for (const client of filteredClients) {
    for (const plan of client.Planning) {
      if (!plan.rdvPf) continue;

      const rdvPf = new Date(plan.rdvPf);

      const diffJours = Math.floor(
        (dateVisite1.getTime() - rdvPf.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Date visite liée au planning
      let dateVisisteStr = "";
      if (plan.idVisite) {
        const d = await getDateVisite(plan.idVisite);
        if (d instanceof Date) {
          dateVisisteStr = d.toLocaleDateString("fr-FR");
        }
      }

      const status: ClientStatusInfo = {
        nom: client.nom,
        prenom: client.prenom,
        age: calculerAge(client.dateNaissance),
        sexe: client.sexe,
        code: client.code,
        dateVisiste: dateVisisteStr,
        rdvPf: plan.rdvPf,
        statut: plan.statut || "",
        courtDuree: plan.courtDuree || "",
        implanon: plan.implanon || "",
        jadelle: plan.jadelle || "",
        sterilet: plan.sterilet || "",
        methodePrise: plan.methodePrise,
        protege: false,
        perdueDeVue: false,
        abandon: false,
        arret: false,
      };

      // -----------------------------
      // PRIORITÉ 1 : ARRÊT (retrait)
      // -----------------------------
      const dateRetrait =
        plan.retraitImplanon || plan.retraitJadelle || plan.retraitSterilet;

      if (dateRetrait) {
        const visiteRetrait = client.Visite.find(
          (v): boolean => v.id === plan.idVisite
        );
        if (visiteRetrait?.dateVisite) {
          const dRetrait = new Date(visiteRetrait.dateVisite);
          if (dRetrait >= dateVisite1 && dRetrait <= dateVisite2) {
            status.arret = true;
            resultMap.set(client.code, status);
            continue;
          }
        }
      }

      // -----------------------------
      // PRIORITÉ 2 : PROTÉGÉ
      // -----------------------------
      if (rdvPf >= dateVisite1) {
        status.protege = true;
      }
      // -----------------------------
      // PRIORITÉ 3 : PERDUE DE VUE
      // -----------------------------
      else if (diffJours >= 1 && diffJours <= 30) {
        status.perdueDeVue = true;
      }
      // -----------------------------
      // PRIORITÉ 4 : ABANDON
      // -----------------------------
      else if (diffJours >= 60 && diffJours <= 90) {
        status.abandon = true;
      }

      // -----------------------------
      // Client unique (date visite la plus récente)
      // -----------------------------
      const existing = resultMap.get(client.code);

      if (!existing) {
        resultMap.set(client.code, status);
      } else {
        const dNew = new Date(
          typeof status.dateVisiste === "string"
            ? status.dateVisiste.split("/").reverse().join("-")
            : status.dateVisiste
        );
        const dOld = new Date(
          typeof existing.dateVisiste === "string"
            ? existing.dateVisiste.split("/").reverse().join("-")
            : existing.dateVisiste
        );

        if (dNew > dOld) {
          resultMap.set(client.code, status);
        }
      }
    }
  }

  return Array.from(resultMap.values());
};

type ClientDataLaboratoire = {
  factureExamen: FactureExamen[];
  resultatExamen: (ResultatExamen & { libelleExamen?: string | "" })[];
  tabExamen: string[];
};

// ---------------------------------- Examens de laboratoire ---------------------------------- //
export const fetchClientsDataLaboratoire = async (
  clinicIds: string[],
  activiteIds: string[],
  dateVisite1: Date,
  dateVisite2: Date
): Promise<ClientDataLaboratoire[]> => {
  if (!clinicIds || clinicIds.length === 0) {
    alert("Veuillez choisir au moins une clinique");
    return [];
  }

  // Marque les paramètres comme utilisés pour éviter les erreurs TS si la fonction
  // n'est pas encore implémentée complètement.
  void dateVisite1;
  void dateVisite2;

  // TODO: implémenter la récupération réelle des factures/résultats et joindre
  // le `libelleExamen` depuis la table des libellés si nécessaire.

  const [facture, resultat] = await Promise.all([
    prisma.factureExamen.findMany({
      where: {
        idClinique: { in: clinicIds },
        Visite: {
          dateVisite: {
            gte: dateVisite1,
            lte: dateVisite2,
          },
        },
      },
      include: {
        Visite: true,
        Clinique: true,
      },
    }),
    prisma.resultatExamen.findMany({
      where: {
        idClinique: { in: clinicIds },
        Visite: {
          dateVisite: {
            gte: dateVisite1,
            lte: dateVisite2,
          },
        },
      },
      include: {
        Visite: true,
        Clinique: true,
      },
    }),
  ]);

  const newResultat = resultat.map((res) => ({
    ...res,
    libelleExamen: facture.find((f) => f.id === res.idFactureExamen)
      ?.libelleExamen, // TODO: récupérer le libellé réel si nécessaire
  }));

  const tabExamen = newResultat
    .map((res) => res.libelleExamen)
    .filter((s): s is string => !!s);

  const uniqueExamen = Array.from(new Set(tabExamen));
  uniqueExamen.sort();
  // ajouter à uniqueExamen tous les examens de facture qui ne sont pas dans resultat
  facture.forEach((fact) => {
    if (fact.libelleExamen && !uniqueExamen.includes(fact.libelleExamen)) {
      uniqueExamen.push(fact.libelleExamen);
    }
  });

  if (facture && resultat) {
    return [
      {
        factureExamen: facture,
        resultatExamen: newResultat,
        tabExamen: uniqueExamen,
      },
    ];
  }

  return [];
};
