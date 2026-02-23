/**
 * ECMIS — Captures d'écran pour le Guide d'Utilisation
 *
 * Organisation par chapitres :
 *   ch01  Authentification (login, inscription)
 *   ch02  Interface générale (sidebar)
 *   ch03  Tableau de bord
 *   ch04  Gestion des clients
 *   ch05  Dossier patient — Hub des fiches
 *   ch06  Dossier patient — Visite & Constantes
 *   ch07  Dossier patient — Santé reproductive
 *   ch08  Dossier patient — Maternité
 *   ch09  Dossier patient — IST & VIH
 *   ch10  Dossier patient — Médecine & VBG
 *   ch11  Dossier patient — Examens & Échographie
 *   ch12  Dossier patient — Référence & Facturation
 *   ch13  Pharmacie
 *   ch14  Laboratoire & Échographie
 *   ch15  Rapports & Analyses
 *   ch16  Administration
 *
 * Usage :
 *   1. npm run dev
 *   2. npx playwright test screenshots.spec.ts
 *
 * Sortie : C:\Users\AIBEF\Desktop\screenshots-ecmis\
 */

import { test } from "@playwright/test";
import path from "path";

// ============================================================
// CONFIGURATION
// ============================================================
const BASE_URL = "http://localhost:3000";
const LOGIN_USERNAME = "bando358";
const LOGIN_PASSWORD = "bando358";
const CLIENT_ID = "94c06d42-e504-44c8-a50a-2e9220f2c2f7";
const SCREENSHOT_DIR = path.join(
  "C:",
  "Users",
  "AIBEF",
  "Desktop",
  "screenshots-ecmis",
);

const WAIT_AFTER_FILTER = 3000; // ms après application d'un filtre (données rechargées)
const WAIT_SCROLL = 1200; // ms après un scroll (rendu)

// Filtres par défaut pour les pages qui nécessitent clinique / période
const CLINIQUE_NAME = "DALOA";
const DATE_DEBUT = "2025-10-01"; // format yyyy-mm-dd pour input[type="date"]
const DATE_FIN = new Date().toISOString().split("T")[0]; // aujourd'hui

type Page = import("@playwright/test").Page;

// ============================================================
// HELPERS
// ============================================================

/** Capture d'écran avec log */
async function capture(pg: Page, name: string, description: string) {
  await pg.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
  console.log(`  ✓ ${name}.png — ${description}`);
}

/**
 * Attendre que le contenu réel de la page soit chargé.
 * Essaie plusieurs sélecteurs courants dans ECMIS et attend le premier trouvé.
 * Fallback : timeout de 6s si aucun sélecteur trouvé.
 */
async function waitForPageReady(pg: Page, extraSelector?: string) {
  const selectors = [
    'table tbody tr',                          // pages avec tableaux de données
    'form button[type="submit"]',              // pages avec formulaires
    'button:has-text("Rechercher")',            // dashboard
    'button:has-text("Générer")',              // rapports
    'input[placeholder*="Rechercher"]',         // pages avec barre de recherche
    'h1',                                       // titre de page chargé
    'h2',                                       // sous-titre
    '.card, [class*="Card"]',                   // cartes UI
  ];

  if (extraSelector) selectors.unshift(extraSelector);

  try {
    await Promise.race([
      ...selectors.map((s) =>
        pg.locator(s).first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {})
      ),
      pg.waitForTimeout(6000), // fallback absolu
    ]);
    // Petit délai supplémentaire pour laisser les animations/rendus finir
    await pg.waitForTimeout(800);
  } catch {
    await pg.waitForTimeout(3000);
  }
}

/**
 * Navigation + attente intelligente du contenu
 */
async function navigateTo(pg: Page, route: string, extraSelector?: string) {
  await pg.goto(`${BASE_URL}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await waitForPageReady(pg, extraSelector);
}

/** Sélectionner la visite la plus récente dans un Select shadcn/ui */
async function selectMostRecentVisite(pg: Page) {
  try {
    const selectTrigger = pg
      .locator(
        'button[role="combobox"]:has-text("lectionner"), button[role="combobox"]:has-text("Choisir"), button[role="combobox"]:has-text("Visite")',
      )
      .first();

    if (!(await selectTrigger.isVisible({ timeout: 3000 }))) return false;

    await selectTrigger.click();
    await pg.waitForTimeout(800);

    const options = pg.locator('[role="option"]:not([data-disabled])');
    const count = await options.count();
    if (count === 0) {
      await pg.keyboard.press("Escape");
      return false;
    }

    const dateTexts: { text: string; index: number }[] = [];
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) dateTexts.push({ text: text.trim(), index: i });
    }

    let bestIdx = 0;
    let bestDate = new Date(0);
    for (const dt of dateTexts) {
      const parts = dt.text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (parts) {
        const d = new Date(+parts[3], +parts[2] - 1, +parts[1]);
        if (d > bestDate) {
          bestDate = d;
          bestIdx = dt.index;
        }
      }
    }

    await options.nth(bestIdx).click();
    await pg.waitForTimeout(1500); // attendre le rechargement des données de la visite
    console.log(`    → Visite sélectionnée : ${dateTexts[bestIdx]?.text}`);
    return true;
  } catch {
    await pg.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

/** Ouvrir un groupe de la sidebar */
async function openSidebarGroup(pg: Page, label: string) {
  try {
    const group = pg
      .locator(
        `button:has-text("${label}"), [data-sidebar="menu-button"]:has-text("${label}")`,
      )
      .first();
    if (await group.isVisible({ timeout: 2000 })) {
      await group.click();
      await pg.waitForTimeout(400);
    }
  } catch {
    // Groupe non trouvé
  }
}

/**
 * Remplir les dates de début et fin (input[type="date"])
 */
async function fillDates(pg: Page) {
  try {
    const dateInputs = pg.locator('input[type="date"]');
    const count = await dateInputs.count();
    if (count >= 2) {
      await dateInputs.nth(0).fill(DATE_DEBUT);
      await dateInputs.nth(1).fill(DATE_FIN);
      console.log(`    → Dates : ${DATE_DEBUT} → ${DATE_FIN}`);
      await pg.waitForTimeout(500);
    }
  } catch {
    console.log("    ⚠ Impossible de remplir les dates");
  }
}

/**
 * Sélectionner la clinique DALOA dans un Select shadcn/ui
 * (Dashboard, Historique-inventaire, Historique-commande)
 */
async function selectCliniqueShadcn(pg: Page) {
  try {
    const trigger = pg
      .locator(
        'button[role="combobox"]:has-text("clinique"), button[role="combobox"]:has-text("Toutes"), button[role="combobox"]:has-text("Clinique")',
      )
      .first();

    if (!(await trigger.isVisible({ timeout: 3000 }))) return false;

    await trigger.click();
    await pg.waitForTimeout(800);

    const option = pg
      .locator(`[role="option"]:has-text("${CLINIQUE_NAME}")`)
      .first();
    if (await option.isVisible({ timeout: 2000 })) {
      await option.click();
      await pg.waitForTimeout(800);
      console.log(`    → Clinique : ${CLINIQUE_NAME}`);
      return true;
    }

    await pg.keyboard.press("Escape");
    return false;
  } catch {
    await pg.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

/**
 * Sélectionner la clinique DALOA dans un react-select (multi-select)
 * (Rapports, Listings)
 */
async function selectCliniqueReactSelect(pg: Page) {
  try {
    const selectContainer = pg
      .locator('div:has-text("Sélectionner une ou plusieurs cliniques")')
      .locator('[class*="control"], [class*="ValueContainer"]')
      .first();

    const reactSelect = pg
      .locator(
        '[id*="clinique-select"], [class*="select"]:has-text("clinique")',
      )
      .first();

    if (await selectContainer.isVisible({ timeout: 2000 })) {
      await selectContainer.click();
    } else if (await reactSelect.isVisible({ timeout: 2000 })) {
      await reactSelect.click();
    } else {
      const placeholder = pg
        .locator('div:has-text("plusieurs cliniques")')
        .first();
      if (await placeholder.isVisible({ timeout: 2000 })) {
        await placeholder.click();
      } else {
        return false;
      }
    }

    await pg.waitForTimeout(500);
    await pg.keyboard.type(CLINIQUE_NAME, { delay: 50 });
    await pg.waitForTimeout(800);

    const option = pg
      .locator(`[class*="option"]:has-text("${CLINIQUE_NAME}")`)
      .first();
    if (await option.isVisible({ timeout: 3000 })) {
      await option.click();
      await pg.waitForTimeout(500);
      console.log(`    → Clinique (react-select) : ${CLINIQUE_NAME}`);
      return true;
    }

    await pg.keyboard.press("Escape");
    return false;
  } catch {
    await pg.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

/**
 * Sélectionner la clinique dans la page Client (Popover + Command + Checkbox)
 */
async function selectCliniqueClientPage(pg: Page) {
  try {
    const filterBtn = pg
      .locator(
        'button:has-text("Antenne"), button:has-text("antenne"), button:has-text("Clinique"), button:has-text("Filtr")',
      )
      .first();

    if (!(await filterBtn.isVisible({ timeout: 3000 }))) return false;

    await filterBtn.click();
    await pg.waitForTimeout(800);

    const searchInput = pg
      .locator(
        'input[placeholder*="Rechercher"], input[placeholder*="rechercher"], input[placeholder*="antenne"]',
      )
      .first();
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill(CLINIQUE_NAME);
      await pg.waitForTimeout(500);
    }

    const daloa = pg.locator(`text=${CLINIQUE_NAME}`).first();
    if (await daloa.isVisible({ timeout: 2000 })) {
      await daloa.click();
      await pg.waitForTimeout(500);
      console.log(`    → Filtre client : ${CLINIQUE_NAME}`);
    }

    await pg.keyboard.press("Escape");
    await pg.waitForTimeout(800);
    return true;
  } catch {
    await pg.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

/**
 * Appliquer filtres Dashboard : dates + clinique (shadcn) + attendre rechargement
 */
async function applyDashboardFilters(pg: Page) {
  await fillDates(pg);
  await selectCliniqueShadcn(pg);
  // Cliquer sur Rechercher si présent
  try {
    const searchBtn = pg.locator('button:has-text("Rechercher")').first();
    if (await searchBtn.isVisible({ timeout: 2000 })) {
      await searchBtn.click();
    }
  } catch { /* pas de bouton rechercher */ }
  await pg.waitForTimeout(WAIT_AFTER_FILTER);
}

/**
 * Appliquer filtres Rapports/Listings : dates + clinique (react-select) + attendre
 */
async function applyReportFilters(pg: Page) {
  await fillDates(pg);
  await selectCliniqueReactSelect(pg);
  await pg.waitForTimeout(WAIT_AFTER_FILTER);
}

/**
 * Capturer une fiche patient avec sélection de visite + scroll
 */
async function captureFiche(
  pg: Page,
  route: string,
  name: string,
  desc: string,
  withScroll = true,
) {
  try {
    await navigateTo(pg, `${route}/${CLIENT_ID}`, 'form button[type="submit"]');
    await selectMostRecentVisite(pg);
    // Attendre que le formulaire se remplisse avec les données de la visite
    await pg.waitForTimeout(2000);
    await pg.evaluate(() => window.scrollTo(0, 0));
    await pg.waitForTimeout(500);
    await capture(pg, name, desc);

    if (withScroll) {
      await pg.evaluate(() => window.scrollTo(0, 500));
      await pg.waitForTimeout(WAIT_SCROLL);
      await capture(pg, `${name}-suite`, `${desc} — suite`);
    }
  } catch (err) {
    console.log(`  ✗ ${route} — ${(err as Error).message}`);
  }
}

// ============================================================
// TEST PRINCIPAL
// ============================================================
test.describe("ECMIS — Guide d'utilisation", () => {
  test.setTimeout(900_000); // 15 min max

  test("Capturer toutes les pages pour le guide", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // ══════════════════════════════════════════════════════════
    // CH01 — AUTHENTIFICATION
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH01 — Authentification ═══");

    // 1a. Page de login vide
    await navigateTo(page, "/login");
    await capture(page, "ch01-01-login-vide", "Page de connexion vide");

    // 1b. Login avec identifiants saisis
    const usernameInput = page
      .locator('input[name="username"], input[type="text"]')
      .first();
    const passwordInput = page
      .locator('input[name="password"], input[type="password"]')
      .first();
    await usernameInput.fill(LOGIN_USERNAME);
    await passwordInput.fill(LOGIN_PASSWORD);
    await page.waitForTimeout(500);
    await capture(page, "ch01-02-login-rempli", "Formulaire de connexion rempli");

    // 1c. Connexion
    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Se connecter"), button:has-text("Connexion")',
      )
      .first();
    await submitBtn.click();

    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 20000,
      });
      console.log(`  ✓ Connecté — redirigé vers : ${page.url()}`);
    } catch {
      console.log("  ⚠ Pas de redirection — vérifiez vos identifiants");
    }
    await page.waitForTimeout(3000);

    // 1d. Page d'inscription
    try {
      await navigateTo(page, "/register");
      await capture(page, "ch01-03-inscription", "Page d'inscription");
    } catch {
      console.log("  ⚠ Page d'inscription non accessible");
    }

    // ══════════════════════════════════════════════════════════
    // CH02 — SIDEBAR (une seule capture avec tous les menus ouverts)
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH02 — Sidebar ═══");

    await navigateTo(page, "/dashboard", 'button:has-text("Rechercher")');

    // Ouvrir toutes les sections de la sidebar
    const sidebarGroups = [
      "Clients", "Pharma", "Listing", "Laboratoire",
      "chographie", "Prestation", "Settings",
    ];
    for (const label of sidebarGroups) {
      await openSidebarGroup(page, label);
    }
    await page.waitForTimeout(600);
    await capture(page, "ch02-01-sidebar-complete", "Sidebar — tous les menus ouverts");

    // ══════════════════════════════════════════════════════════
    // CH03 — TABLEAU DE BORD
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH03 — Tableau de bord ═══");

    await navigateTo(page, "/dashboard", 'button:has-text("Rechercher")');

    // Appliquer filtres : clinique DALOA + période
    await applyDashboardFilters(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(WAIT_SCROLL);
    await capture(page, "ch03-01-dashboard-vue-ensemble", "Dashboard — vue d'ensemble (DALOA)");

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(WAIT_SCROLL);
    await capture(page, "ch03-02-dashboard-graphiques", "Dashboard — graphiques et statistiques");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(WAIT_SCROLL);
    await capture(page, "ch03-03-dashboard-bas-page", "Dashboard — bas de page");

    // ══════════════════════════════════════════════════════════
    // CH04 — GESTION DES CLIENTS
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH04 — Gestion des clients ═══");

    await navigateTo(page, "/client", 'input[placeholder*="Rechercher"]');

    // Filtrer par clinique DALOA
    await selectCliniqueClientPage(page);
    await page.waitForTimeout(WAIT_AFTER_FILTER);
    await capture(page, "ch04-01-clients-liste", "Liste des clients (DALOA)");

    await navigateTo(page, "/client-vih", "table tbody tr");
    await capture(page, "ch04-02-clients-vih", "Clients VIH");

    await navigateTo(page, "/formulaire-client", 'form button[type="submit"]');
    await capture(page, "ch04-03-formulaire-client-haut", "Formulaire nouveau client — haut");

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(WAIT_SCROLL);
    await capture(page, "ch04-04-formulaire-client-bas", "Formulaire nouveau client — bas");

    // ══════════════════════════════════════════════════════════
    // CH05 — DOSSIER PATIENT — HUB DES FICHES
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH05 — Hub des fiches patient ═══");

    await navigateTo(page, `/fiches/${CLIENT_ID}`);
    await capture(page, "ch05-01-fiches-hub-accueil", "Hub des fiches — accueil");

    const hubCategories = [
      { label: "Visite", name: "ch05-02-hub-visite", desc: "Catégorie Visite & Constante" },
      { label: "reproductive", name: "ch05-03-hub-reproductive", desc: "Catégorie Santé reproductive" },
      { label: "Maternit", name: "ch05-04-hub-maternite", desc: "Catégorie Maternité" },
      { label: "IST", name: "ch05-05-hub-ist-vih", desc: "Catégorie IST & VIH" },
      { label: "decine", name: "ch05-06-hub-medecine", desc: "Catégorie Médecine & VBG" },
      { label: "Examen", name: "ch05-07-hub-examens", desc: "Catégorie Examens & Échographie" },
      { label: "rence", name: "ch05-08-hub-reference", desc: "Catégorie Référencement" },
      { label: "Factur", name: "ch05-09-hub-facturation", desc: "Catégorie Facturation" },
    ];

    for (const cat of hubCategories) {
      try {
        const btn = page.locator(`button:has-text("${cat.label}")`).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await page.waitForTimeout(1500);
          await capture(page, cat.name, cat.desc);
        }
      } catch {
        // Catégorie non trouvée
      }
    }

    // ══════════════════════════════════════════════════════════
    // CH06 — DOSSIER PATIENT — VISITE & CONSTANTES
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH06 — Visite & Constantes ═══");

    // Visite (formulaire de création, pas de sélection de visite)
    try {
      await navigateTo(page, `/visite/${CLIENT_ID}`, 'form button[type="submit"]');
      await page.waitForTimeout(1500);
      await capture(page, "ch06-01-fiche-visite", "Formulaire de visite");
    } catch (err) {
      console.log(`  ✗ visite — ${(err as Error).message}`);
    }

    // Constantes vitales
    await captureFiche(page, "/constante", "ch06-02-fiche-constante", "Formulaire des constantes vitales", false);

    // ══════════════════════════════════════════════════════════
    // CH07 — DOSSIER PATIENT — SANTÉ REPRODUCTIVE
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH07 — Santé reproductive ═══");

    await captureFiche(page, "/planning", "ch07-01-fiche-planning", "Fiche planning familial");
    await captureFiche(page, "/fiche-gyneco", "ch07-02-fiche-gyneco", "Fiche gynécologie");
    await captureFiche(page, "/fiche-infertilite", "ch07-03-fiche-infertilite", "Fiche infertilité");

    // ══════════════════════════════════════════════════════════
    // CH08 — DOSSIER PATIENT — MATERNITÉ
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH08 — Maternité ═══");

    await captureFiche(page, "/fiche-test", "ch08-01-fiche-test-grossesse", "Fiche test de grossesse");
    await captureFiche(page, "/fiche-grossesse", "ch08-02-fiche-grossesse", "Fiche grossesse");
    await captureFiche(page, "/fiche-obstetrique", "ch08-03-fiche-obstetrique", "Fiche CPN (obstétrique)");
    await captureFiche(page, "/fiche-accouchement", "ch08-04-fiche-accouchement", "Fiche accouchement");
    await captureFiche(page, "/fiche-cpon", "ch08-05-fiche-cpon", "Fiche CPoN (post-natale)");
    await captureFiche(page, "/fiche-saa", "ch08-06-fiche-saa", "Fiche SAA");

    // ══════════════════════════════════════════════════════════
    // CH09 — DOSSIER PATIENT — IST & VIH
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH09 — IST & VIH ═══");

    await captureFiche(page, "/fiche-ist", "ch09-01-fiche-ist", "Fiche IST");
    await captureFiche(page, "/fiche-depistage", "ch09-02-fiche-depistage", "Fiche dépistage VIH");
    await captureFiche(page, "/fiche-pec-vih", "ch09-03-fiche-pec-vih", "Fiche PEC VIH");
    await captureFiche(page, "/fiche-examenPvvih", "ch09-04-fiche-examen-pvvih", "Fiche examen PV VIH");

    // ══════════════════════════════════════════════════════════
    // CH10 — DOSSIER PATIENT — MÉDECINE & VBG
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH10 — Médecine & VBG ═══");

    await captureFiche(page, "/fiche-mdg", "ch10-01-fiche-medecine", "Fiche médecine générale");
    await captureFiche(page, "/fiche-vbg", "ch10-02-fiche-vbg", "Fiche VBG");
    await captureFiche(page, "/fiche-ordonnance", "ch10-03-fiche-ordonnance", "Fiche ordonnance");

    // ══════════════════════════════════════════════════════════
    // CH11 — DOSSIER PATIENT — EXAMENS & ÉCHOGRAPHIE
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH11 — Examens & Échographie ═══");

    await captureFiche(page, "/fiche-demande-examen", "ch11-01-demande-examen", "Demande d'examen", false);
    await captureFiche(page, "/fiche-resultat-examen", "ch11-02-resultat-examen", "Résultat d'examen", false);
    await captureFiche(page, "/fiche-demande-echographie", "ch11-03-demande-echo", "Demande d'échographie", false);

    // ══════════════════════════════════════════════════════════
    // CH12 — DOSSIER PATIENT — RÉFÉRENCE & FACTURATION
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH12 — Référence & Facturation ═══");

    await captureFiche(page, "/fiche-reference", "ch12-01-fiche-reference", "Fiche référence");
    await captureFiche(page, "/fiche-contre-reference", "ch12-02-fiche-contre-reference", "Fiche contre-référence");
    await captureFiche(page, "/fiche-pharmacy", "ch12-03-fiche-facturation", "Fiche facturation / pharmacie");

    // ══════════════════════════════════════════════════════════
    // CH13 — PHARMACIE
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH13 — Pharmacie ═══");

    const pagesPharmacy = [
      { route: "/produits", name: "ch13-01-produits", desc: "Liste des produits", filter: false, wait: "table tbody tr" },
      { route: "/stock-produit", name: "ch13-02-stock", desc: "Gestion du stock", filter: false, wait: "table tbody tr" },
      { route: "/prix-produit", name: "ch13-03-prix", desc: "Tarifs des produits", filter: false, wait: "table tbody tr" },
      { route: "/fiche-de-vente", name: "ch13-04-ventes", desc: "Fiches de vente", filter: false, wait: "table tbody tr" },
      { route: "/inventaire", name: "ch13-05-inventaire", desc: "Inventaire", filter: false, wait: "table tbody tr" },
      { route: "/historique-inventaire", name: "ch13-06-historique-inventaire", desc: "Historique inventaires", filter: true, wait: "table tbody tr" },
      { route: "/historique-commande", name: "ch13-07-historique-commandes", desc: "Historique commandes", filter: true, wait: "table tbody tr" },
    ];

    for (const p of pagesPharmacy) {
      try {
        await navigateTo(page, p.route, p.wait);
        if (p.filter) {
          await selectCliniqueShadcn(page);
          await page.waitForTimeout(WAIT_AFTER_FILTER);
        }
        await capture(page, p.name, p.desc);
      } catch (err) {
        console.log(`  ✗ ${p.route} — ${(err as Error).message}`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // CH14 — LABORATOIRE & ÉCHOGRAPHIE
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH14 — Laboratoire & Échographie ═══");

    const pagesLabo = [
      { route: "/fiche-examen", name: "ch14-01-examens", desc: "Gestion des examens" },
      { route: "/fiche-prix-examen", name: "ch14-02-prix-examens", desc: "Tarifs des examens" },
      { route: "/fiche-echographie", name: "ch14-03-echographies", desc: "Gestion des échographies" },
      { route: "/fiche-prix-echographie", name: "ch14-04-prix-echographies", desc: "Tarifs des échographies" },
    ];

    for (const p of pagesLabo) {
      try {
        await navigateTo(page, p.route, "table tbody tr");
        await capture(page, p.name, p.desc);
      } catch (err) {
        console.log(`  ✗ ${p.route} — ${(err as Error).message}`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // CH15 — RAPPORTS & ANALYSES
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH15 — Rapports & Analyses ═══");

    // Rapports et Listings — filtres dates + react-select clinique
    const pagesRapportsAvecFiltre = [
      { route: "/rapports", name: "ch15-01-rapports", desc: "Rapports consolidés" },
      { route: "/listings", name: "ch15-02-listings", desc: "Listings des données" },
    ];

    for (const p of pagesRapportsAvecFiltre) {
      try {
        await navigateTo(page, p.route, 'input[type="date"]');
        await applyReportFilters(page);
        await capture(page, p.name, `${p.desc} (DALOA)`);
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(WAIT_SCROLL);
        await capture(page, `${p.name}-suite`, `${p.desc} — données`);
      } catch (err) {
        console.log(`  ✗ ${p.route} — ${(err as Error).message}`);
      }
    }

    // Gestion RDV — uniquement dates, PAS de react-select
    // (le react-select déclenche des fetches en cascade qui bloquent la page)
    try {
      await navigateTo(page, "/gestion-rdv", 'input[type="date"]');
      await fillDates(page);
      await page.waitForTimeout(WAIT_AFTER_FILTER);
      await capture(page, "ch15-03-gestion-rdv", "Gestion des rendez-vous");
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(WAIT_SCROLL);
      await capture(page, "ch15-03-gestion-rdv-suite", "Gestion des rendez-vous — données");
    } catch (err) {
      console.log(`  ✗ /gestion-rdv — ${(err as Error).message}`);
    }

    // ══════════════════════════════════════════════════════════
    // CH16 — ADMINISTRATION
    // ══════════════════════════════════════════════════════════
    console.log("\n═══ CH16 — Administration ═══");

    const pagesAdmin = [
      { route: "/administrator", name: "ch16-01-admin-panel", desc: "Panneau d'administration" },
      { route: "/fiche-clinique", name: "ch16-02-cliniques", desc: "Gestion des cliniques" },
      { route: "/fiche-activites", name: "ch16-03-activites", desc: "Gestion des activités" },
      { route: "/fiche-compte", name: "ch16-04-comptes", desc: "Gestion des comptes" },
      { route: "/fiche-permissions", name: "ch16-05-permissions", desc: "Gestion des permissions" },
      { route: "/fiche-post", name: "ch16-06-postes", desc: "Gestion des postes" },
      { route: "/fiche-prestation", name: "ch16-07-prestations", desc: "Gestion des prestations" },
      { route: "/fiche-prix-prestation", name: "ch16-08-prix-prestations", desc: "Tarifs des prestations" },
      { route: "/fiche-region", name: "ch16-09-regions", desc: "Gestion des régions" },
      { route: "/sauvegarde", name: "ch16-10-sauvegarde", desc: "Sauvegarde et restauration" },
    ];

    for (const p of pagesAdmin) {
      try {
        await navigateTo(page, p.route, "table tbody tr");
        await capture(page, p.name, p.desc);
      } catch (err) {
        console.log(`  ✗ ${p.route} — ${(err as Error).message}`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // RÉSUMÉ
    // ══════════════════════════════════════════════════════════
    console.log("\n════════════════════════════════════════");
    console.log("  CAPTURES TERMINÉES");
    console.log(`  Dossier : ${SCREENSHOT_DIR}`);
    console.log("════════════════════════════════════════\n");
  });
});
