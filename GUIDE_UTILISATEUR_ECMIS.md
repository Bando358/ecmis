# Guide d'Utilisation de l'Application eCMIS

## Système Électronique de Gestion des Informations Cliniques

**Version 3.0**
**AIBEF - Association Ivoirienne pour le Bien-Être Familial**

---

## Table des Matières

1. [Contexte général](#1-contexte-général)
2. [Objectif du guide](#2-objectif-du-guide)
3. [Présentation générale de l'application](#3-présentation-générale-de-lapplication)
4. [Accès à l'application](#4-accès-à-lapplication)
5. [Tableau de bord (Dashboard)](#5-tableau-de-bord-dashboard)
6. [Navigation générale (Sidebar)](#6-navigation-générale-sidebar)
7. [Module Clients](#7-module-clients)
8. [Doublons & Fusion de Clients](#8-doublons--fusion-de-clients)
9. [Dossier Médical — Hub des Fiches](#9-dossier-médical--hub-des-fiches)
10. [Visite & Constantes](#10-visite--constantes)
11. [Planning Familial](#11-planning-familial)
12. [Gynécologie & Infertilité](#12-gynécologie--infertilité)
13. [Maternité](#13-maternité)
14. [IST & VIH](#14-ist--vih)
15. [Médecine Générale & VBG](#15-médecine-générale--vbg)
16. [Examens & Échographie](#16-examens--échographie)
17. [Référencement & Facturation](#17-référencement--facturation)
18. [Module Pharmacie](#18-module-pharmacie)
19. [Module Laboratoire & Échographie](#19-module-laboratoire--échographie)
20. [Rapports, Listings & Rendez-vous](#20-rapports-listings--rendez-vous)
21. [Module Analyse & Visualisation](#21-module-analyse--visualisation)
22. [Module Administration](#22-module-administration)
23. [Sauvegarde des Données](#23-sauvegarde-des-données)
24. [Bonnes Pratiques](#24-bonnes-pratiques)
25. [Assistance et Support](#25-assistance-et-support)
26. [Sécurité et Confidentialité](#26-sécurité-et-confidentialité)
27. [Annexes](#27-annexes)

---

## 1. Contexte général

L'application eCMIS (Electronic Client Medical Information System) est une application web conçue pour répondre aux besoins opérationnels de l'Association Ivoirienne pour le Bien-Être Familial (AIBEF).

Elle vise à remplacer un système de gestion médicale basé sur des dossiers papier et des registres fragmentés, souvent sources de lenteur, d'erreurs et de difficultés dans le suivi des patients.

### 1.1 Objectif principal

**L'objectif principal de eCMIS est de centraliser et digitaliser l'ensemble du parcours client dans une structure médicale offrant des services de :**

- Santé reproductive et planification familiale
- Prise en charge du VIH
- Consultations prénatales (CPN)
- Maternité
- Médecine générale
- Laboratoire, pharmacie et imagerie médicale

### 1.2 Adaptation au contexte ivoirien

**Le système a été spécifiquement développé pour le contexte ivoirien, en tenant compte :**

- de la gestion multi-antennes (cliniques),
- de la terminologie médicale locale,
- des exigences de reporting pour les partenaires et bailleurs.

### 1.3 Architecture technique

**Son architecture technique** (Next.js, TypeScript, Prisma) garantit performance, sécurité et fiabilité, essentielles pour la gestion de données médicales sensibles.

Au-delà d'un outil de saisie, eCMIS est un levier d'amélioration de la qualité des soins, offrant une vision unifiée du dossier patient et des données fiables pour la prise de décision.

---

## 2. Objectif du guide

Ce guide a pour objectif d'accompagner les utilisateurs finaux dans l'utilisation quotidienne de l'application eCMIS.

### 2.1 Public concerné

| Public | Responsabilités |
|--------|-----------------|
| **Administrateurs** | Configuration système, gestion des utilisateurs |
| **Prestataires de santé** | Médecins, sages-femmes, infirmiers |
| **Agents d'accueil** | Enregistrement des clients, gestion des RDV |
| **Gestionnaires** | Suivi des stocks, rapports, facturation |

### 2.2 Conventions utilisées

| Symbole | Signification |
|---------|---------------|
| * | Champ obligatoire |
| ⚠️ | Attention / Avertissement |
| 💡 | Conseil / Astuce |
| 🔴 | Bouton rouge = Supprimer/Annuler |
| 🟢 | Bouton vert/bleu = Valider/Enregistrer |
| 🔀 | Affichage conditionnel (champs qui apparaissent selon un choix) |

---

## 3. Présentation générale de l'application

### 🎯 But

Centraliser toutes les activités médicales et administratives d'une structure de santé dans un seul outil.

### 📊 L'application en chiffres

| Élément | Nombre | Description |
|---------|:------:|-------------|
| **Tables en base de données** | 67 | Modèles Prisma couvrant données cliniques, financières, pharmaceutiques, administratives et analytiques |
| **Pages accessibles** | 83 | Écrans de l'application (tableaux de bord, formulaires, listes, rapports, administration) |
| **Formulaires de saisie** | 78 | Formulaires répartis dans les composants et pages pour la création et la modification de données |
| **Enums de référence** | 13 | Types énumérés (rôles, statuts, méthodes, types de produits, etc.) |

> **NB :** Un **Enum** (abréviation de *énumération*) est une liste fermée de valeurs prédéfinies utilisée par le système pour garantir la cohérence des données. Par exemple, l'enum *Role* n'autorise que les valeurs `ADMIN` ou `USER`, l'enum *Sexe* uniquement `M` ou `F`, et l'enum *TypeProduit* uniquement `CONTRACEPTIF`, `MEDICAMENTS` ou `CONSOMMABLES`. Cela empêche toute saisie libre et évite les erreurs ou incohérences dans la base de données.

### 📝 Description

L'application permet la gestion complète :

| Module | Fonctionnalités |
|--------|-----------------|
| **Clients** | Dossiers patients, historique médical, détection de doublons |
| **Consultations** | Visites, constantes, fiches médicales spécialisées |
| **Examens** | Demandes, résultats, facturation |
| **Pharmacie** | Stock, ventes directes, rapports financiers, inventaires, journal des actions |
| **Facturation** | Prestations, examens, produits, commissions prescripteurs |
| **Rapports** | Statistiques, exports, listings, rendez-vous |
| **Analyse** | Tableaux croisés dynamiques, indicateurs de santé, exports Excel/PDF |
| **Administration** | Cliniques, comptes, permissions, activités, régions, sauvegardes |

---

## 4. Accès à l'application

### 4.1 Page de connexion

#### 🎯 But

Garantir un accès sécurisé à l'application. Chaque utilisateur doit s'authentifier avant d'accéder aux données médicales.

#### 📝 Description

La page de connexion est le point d'entrée de l'application. L'utilisateur doit saisir :
- son **nom d'utilisateur**
- son **mot de passe**

**Étapes de connexion :**
1. Ouvrez votre navigateur et saisissez l'adresse fournie par votre administrateur
2. Saisissez votre **Nom d'utilisateur**
3. Saisissez votre **Mot de passe**
4. Cliquez sur le bouton **Se connecter**

En cas d'identifiants incorrects, un message d'erreur s'affiche.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch01-01-login-vide.png` | Page de connexion vide |
| `ch01-02-login-rempli.png` | Formulaire de connexion rempli |

### 4.2 Création de compte (Inscription)

#### 🎯 But

Permettre la création d'un compte utilisateur par le premier administrateur.

#### 📝 Description

**Champs requis :**

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Nom complet | Texte | Oui * |
| Email | Email | Oui * |
| Nom d'utilisateur | Texte | Oui * |
| Mot de passe | Mot de passe | Oui * |
| Confirmation mot de passe | Mot de passe | Oui * |

⚠️ **Important** : Le mot de passe doit contenir minimum 8 caractères avec majuscule, minuscule et chiffre.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch01-03-inscription.png` | Page d'inscription |

### 4.3 Déconnexion automatique

Pour des raisons de sécurité, l'application vous déconnecte automatiquement après :

| Condition | Durée |
|-----------|-------|
| Session active | 24 heures maximum |
| Inactivité | 30 minutes |

💡 **Conseil** : Enregistrez régulièrement votre travail pour éviter toute perte de données.

---

## 5. Tableau de bord (Dashboard)

### 🎯 But

Offrir une vue d'ensemble rapide de l'activité de la structure médicale, avec des indicateurs chiffrés et des graphiques interactifs filtrables par clinique et période.

### 👤 Rôles concernés

- Administrateur
- Prestataires de santé

### 📝 Description

Le Dashboard s'affiche après une connexion réussie. Il présente des indicateurs calculés dynamiquement en fonction des filtres sélectionnés :

**Filtres disponibles :**

| Filtre | Description |
|--------|-------------|
| **Période** | Dates de début et de fin |
| **Type de période** | Quotidien, hebdomadaire, mensuel, trimestriel, semestriel, annuel |
| **Clinique** | Sélection de la clinique (antenne) |
| **Prescripteur** | Filtrage par prescripteur (selon la clinique sélectionnée) |

**Indicateurs affichés :**

| Élément | Description |
|---------|-------------|
| **Nombre de clients** | Total des clients enregistrés pour la période |
| **Nombre de visites** | Visites effectuées |
| **Factures** | Examens, produits, prestations, échographies facturés |
| **Graphiques** | Évolution des consultations sur la période |

💡 **Conseil** : Sélectionnez la clinique et la période puis cliquez sur **Rechercher** pour actualiser les données.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch03-01-dashboard-vue-ensemble.png` | Dashboard — en-tête avec filtres et indicateurs |
| `ch03-02-dashboard-graphiques.png` | Dashboard — graphiques et statistiques |
| `ch03-03-dashboard-bas-page.png` | Dashboard — bas de page |

---

## 6. Navigation générale (Sidebar)

### 🎯 But

Faciliter l'accès rapide et structuré à toutes les fonctionnalités via un menu latéral toujours visible.

### 📝 Description

Le menu latéral gauche est organisé en sections dépliantes :

| Section | Sous-menus |
|---------|------------|
| **Dashboard** | Tableau de bord principal |
| **Clients** | Liste des clients, Doublons & Fusion, Import VIH |
| **Pharmacie** | Vente Directe, Rapport financier, Produits, Stock, Prix, Inventaire, Historiques, Tableau financier, Journal des actions |
| **Listings** | Rapports, Listings, Gestion RDV |
| **Laboratoire** | Examens, Prix des examens |
| **Échographie** | Échographies, Prix des échographies |
| **Prestation** | Prestations, Prix des prestations |
| **Settings** | Administration, Cliniques, Activités, Comptes, Permissions, Postes, Régions, Sauvegarde |

Chaque section se déplie en cliquant dessus pour afficher les sous-menus.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch02-01-sidebar-complete.png` | Sidebar — tous les menus ouverts |

---

## 7. Module Clients

### 7.1 Liste des clients

#### 🎯 But

Afficher, rechercher et gérer l'ensemble des patients enregistrés dans la structure. Permet un accès rapide au dossier médical de chaque client.

#### 📝 Description

La page présente un tableau interactif paginé :

| Colonne | Description |
|---------|-------------|
| **Ouvrir** | Accéder au dossier médical complet |
| **Nom / Prénom** | Identité du client |
| **Âge** | Calcul automatique depuis la date de naissance |
| **Code** | Identifiant unique du client |
| **Antenne** | Clinique de rattachement |
| **Tél 1** | Numéro de contact principal |
| **Code VIH** | Code VIH si applicable |
| **Actions** | Modifier, Supprimer |

**Fonctionnalités :**
- 🔍 **Recherche dynamique** par nom, code ou téléphone
- 🏥 **Filtre par clinique** (antenne) via le bouton de filtre
- 📄 **Pagination** ajustable (8 à 100 lignes par page)
- ➕ **Nouveau client** pour créer un enregistrement

⚠️ Les actions de modification et suppression sont conditionnées par les permissions de l'utilisateur.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch04-01-clients-liste.png` | Liste des clients filtrée par clinique |

### 7.2 Import clients VIH

#### 🎯 But

Importer des données patients VIH en masse depuis des fichiers CSV/Excel, pour les modules PEC VIH et Caractéristiques.

#### 📝 Description

Deux onglets sont disponibles :
- **Patient in Care** : import des données de prise en charge VIH
- **Listing Characteristics** : import des caractéristiques des patients VIH

💡 **Conseil** : Téléchargez le modèle fourni avant de préparer vos données.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch04-02-clients-vih.png` | Interface d'import clients VIH |

### 7.3 Création d'un nouveau client

#### 🎯 But

Enregistrer un nouveau patient dans le système avec toutes ses informations personnelles et médicales de base.

#### 📝 Description

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Clinique | Sélection | Oui * |
| Code | Texte (auto-généré) | Oui * |
| Nom | Texte | Oui * |
| Prénom | Texte | Oui * |
| Date de naissance | Date | Oui * |
| Sexe | Sélection (M/F) | Oui * |
| Téléphone 1 | Téléphone | Oui * |
| Téléphone 2 | Téléphone | Non |
| Lieu de naissance | Texte | Non |
| Quartier | Texte | Non |
| Niveau scolaire | Sélection | Non |
| Profession | Texte | Non |
| État matrimonial | Sélection | Non |
| Ethnie | Texte | Non |
| Sérologie | Sélection | Non |
| Source d'information | Sélection | Oui * |
| Statut client | Sélection | Oui * |
| Code VIH | Texte | Non |

💡 Le **code client** est généré automatiquement à partir de la clinique, la région et le nom.

**Étapes :**
1. Sélectionnez la **Clinique** de rattachement
2. Remplissez les champs obligatoires (*)
3. Cliquez sur **Enregistrer**

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch04-03-formulaire-client-haut.png` | Formulaire nouveau client — partie haute |
| `ch04-04-formulaire-client-bas.png` | Formulaire nouveau client — partie basse |

---

## 8. Doublons & Fusion de Clients

### 🎯 But

Détecter les clients potentiellement en double dans la base de données, les comparer côte à côte, puis fusionner les doublons en conservant toutes les données médicales et administratives sans perte.

### 👤 Rôles concernés

- Administrateur
- Utilisateurs ayant la permission `FUSION_CLIENT`

### 📝 Description

Le module de gestion des doublons se compose de 4 étapes : **Scanner**, **Comparer**, **Fusionner**, **Historique**.

### 8.1 Scanner les doublons

#### 📝 Description

Sélectionnez les cliniques à analyser puis cliquez sur **Scanner**. Le système détecte automatiquement les doublons selon deux méthodes :

| Méthode | Critères | Badge |
|---------|----------|-------|
| **Correspondance exacte** | Même nom + prénom + date de naissance | 🔴 Rouge |
| **Correspondance similaire** | Noms similaires (seuil ≥ 80%) + 2 critères parmi : date de naissance, téléphone | ⚪ Gris |

**Résultats affichés :**

Les doublons sont regroupés sous forme de cartes dépliables. Chaque groupe affiche :

| Colonne | Description |
|---------|-------------|
| **Code** | Code client unique |
| **Nom / Prénom** | Identité |
| **Date naissance** | Date de naissance |
| **Tél** | Numéro de téléphone |
| **Clinique** | Antenne de rattachement |
| **Visites** | Nombre de visites enregistrées |
| **Actions** | Bouton **Comparer** |

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch04-05-doublons-scan.png` | Scanner de doublons — résultats avec groupes |

### 8.2 Comparer deux clients

#### 📝 Description

Cliquez sur **Comparer** pour ouvrir un dialogue affichant les deux fiches côte à côte :

**Informations comparées :**

| Champ | Description |
|-------|-------------|
| Nom, Prénom | Identité |
| Date de naissance | Âge |
| Code, Code VIH | Identifiants |
| Tél 1, Tél 2 | Contacts |
| Sexe | Genre |
| Profession | Activité professionnelle |
| Quartier | Lieu de résidence |
| État matrimonial | Situation familiale |
| Statut, Source | Informations complémentaires |
| Clinique | Antenne |
| Relations | Nombre total de données associées (visites, consultations, factures, etc.) |

**Détection de conflits :**

Si certains champs diffèrent entre les deux clients, une section jaune « Conflits détectés » s'affiche avec un tableau comparatif.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch04-06-doublons-comparer.png` | Comparaison côte à côte avec conflits |

### 8.3 Fusionner les clients

#### 📝 Description

Cliquez sur **Fusionner** depuis le dialogue de comparaison. Le processus se déroule en 3 étapes :

**Étape 1 — Choix du client principal**

Sélectionnez le client qui sera conservé. Par défaut, le système propose le client ayant le plus de données associées.

| Choix | Conséquence |
|-------|-------------|
| **Client principal** | Conservé avec son ID, code et toutes ses données |
| **Client secondaire** | Toutes ses données sont transférées puis il est supprimé |

**Étape 2 — Résolution des conflits**

🔀 **Affichage conditionnel :** Si des conflits existent (champs avec des valeurs différentes), un formulaire apparaît pour chaque conflit :

| Conflit | Action |
|---------|--------|
| Téléphone différent | Choisir la valeur du Client A ou Client B |
| Profession différente | Choisir la valeur du Client A ou Client B |
| Quartier différent | Choisir la valeur du Client A ou Client B |
| État matrimonial différent | Choisir la valeur du Client A ou Client B |

**Étape 3 — Confirmation**

⚠️ Un dialogue de confirmation s'affiche : *« Êtes-vous sûr de vouloir fusionner ces clients ? Cette action est irréversible. »*

**Données transférées lors de la fusion :**

| Catégorie | Tables concernées |
|-----------|-------------------|
| **Visites** | Visite, RecapVisite, Constante |
| **Santé reproductive** | Planning, Gynécologie, Infertilité |
| **Maternité** | Grossesse, Obstétrique, Accouchement, CPoN, Test grossesse, SAA |
| **IST & VIH** | IST, Dépistage VIH, PEC VIH, Examen PV VIH |
| **Médecine** | Médecine générale, VBG, Ordonnance |
| **Examens** | Demande/Résultat/Facture d'examen, Demande/Résultat/Facture d'échographie |
| **Facturation** | Facture prestation, Facture produit |
| **Autre** | Référence, Contre-référence, Bilan, Couverture |

💡 La fusion est exécutée dans une **transaction atomique** : soit tout est transféré avec succès, soit rien n'est modifié.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch04-07-doublons-fusion-config.png` | Configuration de la fusion — choix du principal et conflits |
| `ch04-08-doublons-fusion-confirm.png` | Confirmation avant fusion irréversible |

### 8.4 Historique des fusions

#### 📝 Description

Cliquez sur le bouton **Historique** en haut de la page pour consulter toutes les fusions effectuées.

| Colonne | Description |
|---------|-------------|
| **Date** | Date de la fusion |
| **Client principal** | ID du client conservé |
| **Client fusionné** | Nom et code du client supprimé |
| **Relations** | Nombre de données transférées |
| **Par** | Nom de l'utilisateur ayant effectué la fusion |

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch04-09-doublons-historique.png` | Historique des fusions effectuées |

---

## 9. Dossier Médical — Hub des Fiches

### 🎯 But

Offrir un point d'accès centralisé à toutes les fiches médicales d'un patient. Ce hub affiche l'identité du client, l'historique des visites et organise les fiches par catégorie.

### 📝 Description

Le hub se compose de 3 zones :

**1. En-tête du patient** — Affiche le nom, l'âge, le code client, le téléphone et le code VIH (si applicable).

**2. Navigation par catégorie** — 8 boutons de catégorie organisent les fiches :

| Catégorie | Fiches incluses |
|-----------|-----------------|
| **Visite & Constante** | Visite, Constantes vitales |
| **Santé reproductive** | Planning familial, Gynécologie, Infertilité |
| **Maternité** | Test grossesse, Grossesse, CPN, Accouchement, CPoN, SAA |
| **IST & VIH** | IST, Dépistage VIH, PEC VIH, Examen PV VIH |
| **Médecine & VBG** | Médecine générale, VBG, Ordonnance |
| **Examens & Echo** | Demande d'examen, Résultat d'examen, Demande d'écho, Résultat d'écho |
| **Référencement** | Référence, Contre-référence |
| **Facturation** | Historique des factures |

**3. Section visites** — Carousel navigable affichant les visites du patient avec un récapitulatif des formulaires saisis pour chaque visite.

En cliquant sur une catégorie, les onglets correspondants s'affichent avec les tableaux de données et les liens vers les formulaires.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch05-01-fiches-hub-accueil.png` | Hub des fiches — vue d'accueil |
| `ch05-02-hub-visite.png` | Catégorie Visite & Constante |
| `ch05-03-hub-reproductive.png` | Catégorie Santé reproductive |
| `ch05-04-hub-maternite.png` | Catégorie Maternité |
| `ch05-05-hub-ist-vih.png` | Catégorie IST & VIH |
| `ch05-06-hub-medecine.png` | Catégorie Médecine & VBG |
| `ch05-07-hub-examens.png` | Catégorie Examens & Échographie |
| `ch05-08-hub-reference.png` | Catégorie Référencement |
| `ch05-09-hub-facturation.png` | Catégorie Facturation |

---

## 10. Visite & Constantes

### 10.1 Créer une visite

#### 🎯 But

Enregistrer une nouvelle visite pour un client. La visite est le point d'entrée obligatoire avant toute saisie de fiche médicale.

#### 📝 Description

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Date de visite | Date | Oui * |
| Motif de visite | Radio (12 motifs) | Oui * |
| Activité | Sélection | Non |
| Lieu | Sélection | Non |

**Motifs disponibles :** Contraception, Gynécologie, Test grossesse, CPN, VIH, Médecine générale, Infertilité, VBG, IST, SAA, Laboratoire, Échographie.

🔀 **Affichage conditionnel :** le champ **Lieu** est désactivé tant qu'aucune **Activité** n'est sélectionnée. Lorsqu'une activité est choisie, les lieux associés à cette activité deviennent disponibles.

⚠️ Une seule visite par jour et par client est autorisée.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch06-01-fiche-visite.png` | Formulaire de création de visite |

### 10.2 Enregistrer les constantes

#### 🎯 But

Documenter les signes vitaux du patient lors de sa visite. L'IMC est calculé automatiquement et classifié par couleur.

#### 📝 Description

| Constante | Unité | Valeurs normales |
|-----------|-------|------------------|
| Poids | kg | Variable |
| Taille | cm | Variable |
| Tension systolique | mmHg | 90-140 |
| Tension diastolique | mmHg | 60-90 |
| Température | °C | 36.5-37.5 |
| Lieu température | Texte | — |
| Pouls | bpm | 60-100 |
| Fréquence respiratoire | /min | 12-20 |
| Saturation O2 | % | 95-100 |
| **IMC** | kg/m² | **Calculé automatiquement** |
| **État IMC** | Texte | **Classifié automatiquement** |

💡 L'**IMC** et l'**État IMC** sont calculés automatiquement dès que le poids et la taille sont saisis. La couleur de l'état change selon la classification : jaune (maigreur), vert (normal), orange (surpoids), rouge (obésité).

Le formulaire nécessite de sélectionner une visite existante dans le menu déroulant. Les visites pour lesquelles des constantes ont déjà été enregistrées sont désactivées.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch06-02-fiche-constante.png` | Formulaire des constantes vitales |

---

## 11. Planning Familial

### 🎯 But

Enregistrer les consultations de planification familiale, documenter les méthodes contraceptives utilisées et programmer les rendez-vous de suivi.

### 👤 Rôles concernés

- Sage-femme, Infirmier(e), Conseiller(e)

### 📝 Description

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Visite | Sélection | Oui * |
| Statut | Radio : NU (Nouvel Utilisateur) / AU (Ancien Utilisateur) | Oui * |
| Type de contraception | Sélection | Oui * |
| Motif de visite | Sélection | Oui * |
| Counselling PF | Case à cocher | Non |
| Courte durée | Radio (méthodes) | Non |
| Implanon | Radio : Insertion / Contrôle | Non |
| Retrait Implanon | Case à cocher | Non |
| Jadelle | Radio : Insertion / Contrôle | Non |
| Retrait Jadelle | Case à cocher | Non |
| Stérilet (DIU) | Radio : Insertion / Contrôle | Non |
| Retrait Stérilet | Case à cocher | Non |
| Date RDV PF | Date | Non |

### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Retrait Implanon**, **Retrait Jadelle** ou **Retrait Stérilet** | L'un des retraits est coché | → Apparition de **Raison du retrait** (sélection) |
| **Raison du retrait** | = « Effet secondaire » | → Apparition de **Description de l'effet secondaire** (texte libre) |

💡 Les rendez-vous planifiés ici apparaîtront automatiquement dans le module **Gestion des RDV**.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch07-01-fiche-planning.png` | Formulaire planning familial — haut |
| `ch07-01-fiche-planning-suite.png` | Formulaire planning familial — suite |

---

## 12. Gynécologie & Infertilité

### 12.1 Consultation gynécologique

#### 🎯 But

Enregistrer une consultation de gynécologie incluant le dépistage du cancer du col et du sein.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Motif de consultation | Sélection |
| Counselling avant dépistage | Case à cocher |
| Counselling après dépistage | Case à cocher |
| Résultat IVA | Radio : Négatif / Positif |
| Counselling cancer du sein | Case à cocher |
| Examen physique | Case à cocher |
| Examen palpation | Case à cocher |
| Touchée vaginale | Case à cocher |
| Règles irrégulières | Case à cocher |
| Régularisation menstruelle | Case à cocher |
| Autre problème gynéco | Case à cocher |

#### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Résultat IVA** | = « Positif » | → **Éligible au traitement IVA** (case à cocher) |
| **Éligible au traitement IVA** | Coché | → **Type de traitement** (Chryothérapie / Thermocoagulation) |
| **Counselling cancer du sein** | Coché | → **Résultat cancer du sein** (10 options : Normal, Kyste, Mastite, etc.) |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch07-02-fiche-gyneco.png` | Formulaire gynécologie — haut |
| `ch07-02-fiche-gyneco-suite.png` | Formulaire gynécologie — suite |

### 12.2 Suivi d'infertilité

#### 🎯 But

Documenter les consultations d'infertilité et le type de traitement prescrit.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Consultation | Case à cocher |
| Counselling | Case à cocher |
| Examen physique | Case à cocher |
| Traitement | Radio : Médicale / Hormonale / Ovulation |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch07-03-fiche-infertilite.png` | Formulaire infertilité — haut |
| `ch07-03-fiche-infertilite-suite.png` | Formulaire infertilité — suite |

---

## 13. Maternité

### 13.1 Test de grossesse

#### 🎯 But

Enregistrer les résultats de test de grossesse.

#### 📝 Description

Formulaire simple avec sélection de la visite et résultat (Positif / Négatif).

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch08-01-fiche-test-grossesse.png` | Formulaire test de grossesse |
| `ch08-01-fiche-test-grossesse-suite.png` | Formulaire test de grossesse — suite |

### 13.2 Enregistrer une grossesse

#### 🎯 But

Initier le suivi prénatal d'une cliente en enregistrant les données de la grossesse.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| HTA | Radio : Oui / Non |
| Diabète | Radio : Oui / Non |
| Gestité | Nombre (total de grossesses) |
| Parité | Nombre (accouchements) |
| Âge gestationnel | Nombre (semaines) |
| Date dernières règles | Date |
| Terme prévu | Date (calculé) |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch08-02-fiche-grossesse.png` | Formulaire grossesse — haut |
| `ch08-02-fiche-grossesse-suite.png` | Formulaire grossesse — suite |

### 13.3 Consultation prénatale (CPN)

#### 🎯 But

Documenter le suivi prénatal avec les examens, vaccinations et supplémentations.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Grossesse | Sélection |
| Numéro CPN | Radio : CPN 1 à 5+ |
| SP | Radio : SP 1 à 5+ |
| VAT | Radio : VAT 1 à 5+ |
| Fer | Case à cocher |
| Folate | Case à cocher |
| Déparasitant | Case à cocher |
| MILDA | Case à cocher |
| Investigations physiques | Case à cocher |
| État nutritionnel | Texte (auto-rempli depuis IMC) |
| État grossesse | Radio : Normal / À risque |
| Counselling PF | Case à cocher |
| Albuminurie/Sucre | Case à cocher |
| Anémie | Case à cocher |
| Syphilis | Case à cocher |
| AgHbs | Case à cocher |
| Date RDV | Date |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch08-03-fiche-obstetrique.png` | Formulaire CPN — haut |
| `ch08-03-fiche-obstetrique-suite.png` | Formulaire CPN — suite |

### 13.4 Accouchement

#### 🎯 But

Documenter l'accouchement, les éventuelles complications et l'état du nouveau-né.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Grossesse | Sélection |
| Lieu d'accouchement | Radio : Dans l'établissement / À domicile |
| Statut VAT | Radio : Non vaccinée / Incomplètement / Complètement |
| Complications | Radio : Oui / Non |
| Accouchement multiple | Radio : Oui / Non |
| État de naissance | Radio : À terme / Prématuré / Post terme |
| Enfants vivants | Nombre |
| Mort-nés frais | Nombre |
| Mort-nés macérés | Nombre |
| Enfants faible poids | Nombre |

#### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Complications** | = « Oui » | → **Évacuation de la mère** (Radio : Oui / Non) |
| **Évacuation de la mère** | = « Oui » | → **Type d'évacuation** (sélection) |

Les champs de complications apparaissent avec une animation fluide.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch08-04-fiche-accouchement.png` | Formulaire accouchement — haut |
| `ch08-04-fiche-accouchement-suite.png` | Formulaire accouchement — suite |

### 13.5 Consultation post-natale (CPoN)

#### 🎯 But

Assurer le suivi de la mère après l'accouchement.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Durée CPoN | Radio : 6-72h / 4-10 jours / 10 jrs à < 6 sem. / 6-8 semaines |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch08-05-fiche-cpon.png` | Formulaire CPoN — haut |
| `ch08-05-fiche-cpon-suite.png` | Formulaire CPoN — suite |

### 13.6 Soins après avortement (SAA)

#### 🎯 But

Documenter les soins post-avortement et le counselling associé.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Grossesse | Sélection (si applicable) |
| Suivi post-avortement | Case à cocher |
| Counselling pré-avortement | Case à cocher |

#### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Counselling pré-avortement** | Coché | → **Motif de demande** (sélection) — apparaît avec animation CSS |
| **Counselling pré** = décoché ET **Suivi post** = décoché | Les deux décochés | → Section complète de prise en charge : **Méthode d'avortement**, **Type d'avortement**, **Consultation post**, **Counselling post**, **Type de PEC**, **Traitement complication** |

⚠️ Le champ **Grossesse** n'apparaît que si le patient a une grossesse non interrompue enregistrée.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch08-06-fiche-saa.png` | Formulaire SAA — haut |
| `ch08-06-fiche-saa-suite.png` | Formulaire SAA — suite |

---

## 14. IST & VIH

### 14.1 Fiche IST

#### 🎯 But

Enregistrer les infections sexuellement transmissibles diagnostiquées, avec le type de prise en charge.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Type de client | Sélection : CPN / PV VIH / Autres |
| Type d'IST | Sélection (12 types) |
| Counselling avant dépistage | Case à cocher |
| Examen physique | Case à cocher |
| Counselling après dépistage | Case à cocher |
| Counselling réduction des risques | Case à cocher |
| Type de PEC | Radio : Syndromique / Étiologique |

#### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Type de PEC** | = « Étiologique » | → **PEC étiologique** (sélection : Candidose, Chancre Mou, Chlamydiose, Herpes Simplex, Syphilis, Autres) |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch09-01-fiche-ist.png` | Formulaire IST — haut |
| `ch09-01-fiche-ist-suite.png` | Formulaire IST — suite |

### 14.2 Dépistage VIH

#### 🎯 But

Enregistrer les tests de dépistage VIH avec le counselling pré et post-test.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Type de client | Sélection (6 types) |
| Investigation test rapide | Case à cocher |

#### 🔀 Affichage conditionnel (avec animation)

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Investigation test rapide** | Coché | → **Résultat** (Radio : Négatif / Positif / Indéterminé) + **Counselling post-test** (case à cocher) — *apparition animée* |
| **Counselling post-test** coché ET **Résultat** = « Positif » | Les deux conditions réunies | → **Counselling réduction des risques** + **Soutien psycho-social** (cases à cocher) — *apparition animée* |

💡 Ce formulaire utilise des animations fluides pour guider progressivement le prestataire dans les étapes du dépistage.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch09-02-fiche-depistage.png` | Formulaire dépistage VIH — haut |
| `ch09-02-fiche-depistage-suite.png` | Formulaire dépistage VIH — suite |

### 14.3 Prise en charge VIH (PEC VIH)

#### 🎯 But

Suivre les clients séropositifs sous traitement ARV avec les co-infections et le soutien psycho-social.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Type de client | Sélection : Consultation initiale / Suivi / Autre |
| Molécule ARV | Sélection (3 molécules) |
| Effets secondaires ARV | Case à cocher |
| Cotrimoxazole | Case à cocher |
| SPDP | Case à cocher |
| IO Paludisme | Case à cocher |
| IO Tuberculose | Case à cocher |
| IO Autre | Case à cocher |
| Soutien psycho-social | Case à cocher |
| Date RDV suivi | Date |

💡 Les rendez-vous de suivi apparaîtront automatiquement dans le module **Gestion des RDV**.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch09-03-fiche-pec-vih.png` | Formulaire PEC VIH — haut |
| `ch09-03-fiche-pec-vih-suite.png` | Formulaire PEC VIH — suite |

### 14.4 Examens biologiques VIH

#### 🎯 But

Documenter les examens de suivi biologique des patients VIH (CD4, charge virale, bilans).

#### 📝 Description

| Section | Examens |
|---------|---------|
| **Prélèvement** | Date de prélèvement, Date de traitement |
| **Statut** | Femme enceinte (Oui/Non), Allaitement (Oui/Non) |
| **Typage** | VIH1, VIH2, VIH1&2 |
| **Virologie** | Charge virale, Charge virale log, CD4 |
| **Biochimie** | Glycémie, Créatininémie, Transaminases, Urée |
| **Lipides** | Cholestérol HDL, Cholestérol total |
| **Hématologie** | Hémoglobine NFS |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch09-04-fiche-examen-pvvih.png` | Formulaire examen PV VIH — haut |
| `ch09-04-fiche-examen-pvvih-suite.png` | Formulaire examen PV VIH — suite |

---

## 15. Médecine Générale & VBG

### 15.1 Consultation de médecine générale

#### 🎯 But

Enregistrer les consultations de médecine générale avec diagnostic, traitement et suivi.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Femme enceinte | Radio : Oui / Non |
| Motif de consultation | Texte libre |
| Examen physique | Case à cocher |
| Type de visite | Radio : Traité / Contrôlé / Référé |
| Soins infirmiers | Sélection |
| Mise en observation | Case à cocher |

#### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Type de visite** | = « Traité » | → Section complète de traitement : **Suspicion paludisme** (Radio : Simple / Grave / R.A.S), **Diagnostic** (multi-sélection), **Autre diagnostic** (texte), **Type d'affection** (sélection), **Traitement** (multi-sélection) — *animation fluide* |
| **Suspicion paludisme** | = « Simple » ou « Grave » | → **Test rapide paludisme** (case à cocher) — *animation imbriquée* |
| **Mise en observation** | Coché | → **Durée d'observation** (nombre, en heures) |

💡 Ce formulaire a deux niveaux d'affichage conditionnel imbriqués : le type de visite contrôle l'affichage de toute la section traitement, et au sein de celle-ci, la suspicion de paludisme contrôle l'affichage du test rapide.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch10-01-fiche-medecine.png` | Formulaire médecine générale — haut |
| `ch10-01-fiche-medecine-suite.png` | Formulaire médecine générale — suite |

### 15.2 Prise en charge VBG

#### 🎯 But

Documenter les cas de violences basées sur le genre avec les services de counselling fournis.

⚠️ **Confidentialité** : Ces informations sont strictement confidentielles et soumises au secret médical.

#### 📝 Description

| Champ | Type |
|-------|------|
| Visite | Sélection |
| Type de VBG | Sélection : Viol, Agressions sexuelles, Agressions physiques, Mariage forcé, Déni de ressources, Maltraitance psychologique |
| Durée | Nombre (heures) |
| Consultation | Radio : PEC (Prise En Charge) / Référé |

#### 🔀 Affichage conditionnel

| Déclencheur | Condition | Champs affichés |
|-------------|-----------|-----------------|
| **Consultation** | = « PEC » | → Section complète de counselling : **Counselling relation**, **Counselling violence sexuelle**, **Counselling violence physique**, **Counselling sexualité**, **Prévention violence sexuelle**, **Prévention violence physique** (cases à cocher) |
| **Consultation** | = « Référé » | → Aucun champ supplémentaire (le patient est orienté) |

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch10-02-fiche-vbg.png` | Formulaire VBG — haut |
| `ch10-02-fiche-vbg-suite.png` | Formulaire VBG — suite |

### 15.3 Ordonnance

#### 🎯 But

Créer des ordonnances médicales imprimables pour les patients.

#### 📝 Description

Après sélection d'une visite :
- Si **aucune ordonnance** n'existe → le formulaire de création apparaît avec des champs de saisie de médicaments (ajout dynamique)
- Si **une ordonnance existe** → un aperçu imprimable s'affiche avec le logo, les informations patient et la liste des médicaments

**Actions disponibles :** Imprimer, Modifier, Supprimer, Retour.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch10-03-fiche-ordonnance.png` | Formulaire/Aperçu ordonnance — haut |
| `ch10-03-fiche-ordonnance-suite.png` | Formulaire/Aperçu ordonnance — suite |

---

## 16. Examens & Échographie

### 16.1 Demande d'examen

#### 🎯 But

Créer une demande d'examen de laboratoire pour un patient lors d'une visite.

#### 📝 Description

Sélectionnez la visite puis choisissez les examens souhaités parmi la liste disponible.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch11-01-demande-examen.png` | Formulaire de demande d'examen |

### 16.2 Résultat d'examen

#### 🎯 But

Enregistrer les résultats des examens de laboratoire effectués.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch11-02-resultat-examen.png` | Formulaire de résultat d'examen |

### 16.3 Demande d'échographie

#### 🎯 But

Créer une demande d'échographie pour un patient.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch11-03-demande-echo.png` | Formulaire de demande d'échographie |

---

## 17. Référencement & Facturation

### 17.1 Fiche référence

#### 🎯 But

Enregistrer les références de patients vers d'autres structures de soins.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch12-01-fiche-reference.png` | Fiche référence — haut |
| `ch12-01-fiche-reference-suite.png` | Fiche référence — suite |

### 17.2 Fiche contre-référence

#### 🎯 But

Enregistrer les retours de patients référés par d'autres structures.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch12-02-fiche-contre-reference.png` | Fiche contre-référence — haut |
| `ch12-02-fiche-contre-reference-suite.png` | Fiche contre-référence — suite |

### 17.3 Facturation

#### 🎯 But

Consulter et gérer la facturation des produits, prestations et examens pour un patient.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch12-03-fiche-facturation.png` | Fiche facturation — haut |
| `ch12-03-fiche-facturation-suite.png` | Fiche facturation — suite |

---

## 18. Module Pharmacie

### 18.1 Gestion des produits

#### 🎯 But

Gérer le catalogue des produits pharmaceutiques de la structure (contraceptifs, médicaments, consommables).

#### 📝 Description

| Colonne | Description |
|---------|-------------|
| N° | Numéro séquentiel |
| Nom | Désignation du produit |
| Type | CONTRACEPTIF, MÉDICAMENTS ou CONSOMMABLES |
| Description | Détails du produit |
| Actions | Modifier, Supprimer |

**Fonctionnalités :** Recherche dynamique, bouton **Ajouter un produit**.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-01-produits.png` | Liste des produits pharmaceutiques |

### 18.2 Gestion du stock

#### 🎯 But

Suivre les niveaux de stock par clinique, créer des commandes fournisseur et gérer les approvisionnements.

#### 📝 Description

Sélectionnez une clinique pour afficher le stock. Les quantités en stock inférieures à 10 sont affichées en rouge. Créez des commandes fournisseur et ajoutez les produits à commander.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-02-stock.png` | Gestion du stock produits |

### 18.3 Tarifs des produits

#### 🎯 But

Définir les prix unitaires des produits par clinique.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-03-prix.png` | Tarifs des produits |

### 18.4 Rapport financier

#### 🎯 But

Générer et exporter les rapports financiers de la structure : fiche de vente journalière et commissions des prescripteurs (examens et échographies).

#### 📝 Description

Cette page remplace l'ancienne « Fiche de vente » et centralise tous les rapports financiers. Après sélection des filtres, les données sont affichées à l'écran et exportables en **PDF**.

**Filtres obligatoires :**

| Filtre | Description |
|--------|-------------|
| **Date de début** | Début de la période |
| **Date de fin** | Fin de la période |
| **Clinique(s)** | Multi-sélection des cliniques |
| **Type de rapport** | Choix parmi 5 types |

**Types de rapports disponibles :**

| Type | Description |
|------|-------------|
| **Fiche de vente journalière** | Récapitulatif des ventes par catégorie (produits, prestations, examens, échographies) avec prix unitaire, quantité, montant et stock final. Affiche le total recette global. |
| **Commission prescripteur — Détail client (Examen)** | Liste détaillée des commissions d'examen : date de visite, prescripteur, client, montant de la commission |
| **Commission prescripteur — Total (Examen)** | Total des commissions d'examen agrégé par prescripteur avec nombre de commissions et contact |
| **Commission prescripteur — Détail client (Échographie)** | Liste détaillée des commissions d'échographie par client |
| **Commission prescripteur — Total (Échographie)** | Total des commissions d'échographie agrégé par prescripteur |

**Étapes :**
1. Sélectionnez les **dates** de début et de fin
2. Sélectionnez la ou les **clinique(s)**
3. Choisissez le **type de rapport**
4. Cliquez sur **Générer le rapport**
5. Consultez les résultats à l'écran
6. Cliquez sur **Télécharger PDF** pour exporter

💡 Le PDF généré inclut le logo AIBEF, les informations de la caissière, la période et les signatures (Caissière / Comptable).

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-04-ventes.png` | Rapport financier — interface avec filtres et résultats |

### 18.5 Inventaire

#### 🎯 But

Réaliser des inventaires réguliers du stock, valider les quantités réelles et signaler les anomalies.

#### 📝 Description

**Étapes :**
1. Sélectionnez la **clinique**
2. Cliquez sur **Nouvel inventaire**
3. Pour chaque produit, saisissez la **quantité réelle**
4. Cliquez sur **Valider** pour chaque produit
5. En cas d'écart, cliquez sur **Ajuster** et documentez l'anomalie

💡 Exportez l'inventaire en PDF pour l'archivage.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-05-inventaire.png` | Interface d'inventaire |

### 18.6 Historique des inventaires

#### 🎯 But

Consulter l'historique des inventaires réalisés avec statut, anomalies et détails.

#### 📝 Description

Filtrez par clinique et statut (terminé / en cours). Consultez les détails de chaque inventaire et exportez en PDF.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-06-historique-inventaire.png` | Historique des inventaires |

### 18.7 Historique des commandes

#### 🎯 But

Consulter l'historique des commandes fournisseur avec détails et exports.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-07-historique-commandes.png` | Historique des commandes fournisseur |

### 18.8 Vente directe

#### 🎯 But

Permet de vendre des produits (seringues, consommables, médicaments) à des clients de passage **sans les enregistrer** dans la base clients. Utile pour les ventes ponctuelles au comptoir.

#### 📋 Fonctionnement

1. **Sélection de la clinique** — choisir la clinique source du stock
2. **Ajout au panier** — rechercher un produit via le combobox, spécifier la quantité
3. **Validation** — le stock est décrémenté automatiquement dans une transaction atomique
4. **Historique** — les ventes du jour sont affichées en bas de page, regroupées par lot (batch)

#### 📝 Champs principaux

| Champ | Description | Obligatoire |
|-------|-------------|:-----------:|
| Clinique | Clinique source du stock | * |
| Produit | Sélection via combobox avec recherche | * |
| Quantité | Nombre d'unités vendues | * |
| Prix unitaire | Calculé automatiquement depuis le tarif | Auto |
| Type produit | Contraceptif, Médicament, Consommable | Auto |

#### ⚠️ Points importants

- Le stock doit être suffisant, sinon la vente est refusée
- La suppression d'une vente **restaure le stock** automatiquement
- Les ventes directes apparaissent dans le **Rapport financier** (section Produits)

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-08-vente-directe.png` | Interface de vente directe avec panier |

### 18.9 Tableau financier

#### 🎯 But

Offrir une vue d'ensemble consolidée des recettes et dépenses par période, sous forme de tableau synthétique.

#### 📋 Fonctionnement

1. **Filtres** — sélectionner la période et la clinique
2. **Affichage** — vue tabulaire des données financières consolidées

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-10-tableau-financier.png` | Tableau financier consolidé |

### 18.10 Journal des actions pharmaceutiques

#### 🎯 But

Tracer l'historique complet de toutes les opérations pharmaceutiques (entrées de stock, sorties, ajustements, ventes, commandes) pour assurer la traçabilité et l'audit.

#### 📋 Fonctionnement

1. **Consultation** — liste paginée de toutes les opérations avec filtres
2. **Filtres disponibles** — par clinique, par type d'action, par période
3. **Statistiques** — résumé des opérations en haut de page

#### 📝 Informations affichées

| Champ | Description |
|-------|-------------|
| Date | Date et heure de l'opération |
| Type d'action | Entrée, Sortie, Ajustement, Vente, etc. |
| Produit | Nom du produit concerné |
| Quantité | Quantité impliquée |
| Utilisateur | Nom de l'agent ayant effectué l'opération |
| Clinique | Clinique concernée |

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch13-11-journal-pharmacie.png` | Journal des actions pharmaceutiques |

---

## 19. Module Laboratoire & Échographie

### 19.1 Gestion des examens

#### 🎯 But

Configurer le catalogue des examens de laboratoire disponibles (nom, unité, valeurs normales, type).

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch14-01-examens.png` | Gestion des examens de laboratoire |

### 19.2 Tarifs des examens

#### 🎯 But

Définir les prix des examens par clinique.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch14-02-prix-examens.png` | Tarifs des examens |

### 19.3 Gestion des échographies

#### 🎯 But

Configurer les types d'échographies disponibles (abdominale, pelvienne, obstétricale, gynécologique, mammaire).

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch14-03-echographies.png` | Gestion des échographies |

### 19.4 Tarifs des échographies

#### 🎯 But

Définir les prix des échographies par clinique.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch14-04-prix-echographies.png` | Tarifs des échographies |

---

## 20. Rapports, Listings & Rendez-vous

### 20.1 Rapports

#### 🎯 But

Générer des rapports statistiques consolidés pour le suivi des activités et le reporting aux partenaires/bailleurs.

#### 📝 Description

**Filtres obligatoires :**

| Filtre | Description |
|--------|-------------|
| Période | Dates de début et de fin |
| Type de rapport | 15 types disponibles |
| Clinique(s) | Multi-sélection |
| Activité(s) | Optionnel, filtré par clinique |

**Types de rapports :**

| Rapport | Description |
|---------|-------------|
| Planning Familial | Statistiques PF par méthode et tranche d'âge |
| Gynécologie | Consultations gynéco |
| Obstétrique | Suivi grossesses et accouchements |
| IST | Infections traitées |
| Autre SSR | Santé sexuelle et reproductive |
| Médecine générale | Consultations MDG |
| Pédiatrie | Suivi pédiatrique |
| SAA | Soins post-avortement |
| Dépistage VIH | Tests et résultats |
| PEC VIH | Patients sous traitement |
| Laboratoire | Examens réalisés |
| SIG (3 variantes) | Système d'information de gestion |
| Validation | Rapport de validation |

**Étapes :**
1. Sélectionnez les dates de début et de fin
2. Choisissez le type de rapport
3. Sélectionnez la ou les clinique(s)
4. Cliquez sur **Générer**

💡 Les rapports peuvent être exportés en **Excel** ou **PDF**.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch15-01-rapports.png` | Interface des rapports avec filtres |
| `ch15-01-rapports-suite.png` | Rapports — tableau de données |

### 20.2 Listings

#### 🎯 But

Générer des listes nominatives de patients filtrées par programme et clinique.

#### 📝 Description

**Types de listings :**
- Planning Familial
- Obstétrique
- PEC VIH
- Toutes les données

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch15-02-listings.png` | Interface des listings avec filtres |
| `ch15-02-listings-suite.png` | Listings — données |

### 20.3 Gestion des rendez-vous

#### 🎯 But

Consulter et gérer les rendez-vous programmés automatiquement depuis les fiches Planning Familial, Obstétrique et PEC VIH.

#### 📝 Description

**Filtres :** Période, type de service, clinique(s), activité(s).

**Types de rendez-vous :**

| Type | Source |
|------|--------|
| Planning Familial | Champ « RDV PF » des fiches planning |
| Obstétrique | Champ « RDV » des fiches CPN |
| PEC VIH | Champ « Date RDV suivi » des fiches PEC VIH |

Après génération, les résultats s'affichent en onglets par type de service.

#### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch15-03-gestion-rdv.png` | Interface gestion des rendez-vous |
| `ch15-03-gestion-rdv-suite.png` | Gestion RDV — données |

---

## 21. Module Analyse & Visualisation

### 🎯 But

Offrir un outil d'analyse avancée inspiré du modèle DHIS2, permettant de croiser des indicateurs de santé avec des dimensions (période, clinique, activité, etc.) pour produire des tableaux croisés dynamiques, des graphiques et des exports.

### 👤 Rôles concernés

- Administrateur, gestionnaires et responsables autorisés (permission `ANALYSE_VISUALISER`)

### 📋 Fonctionnement

1. **Sélection des indicateurs** — choisir parmi 25 indicateurs organisés par groupe (PF, Obstétrique, VIH, Laboratoire, etc.)
2. **Sélection des dimensions** — période (mois, trimestre, année), unité organisationnelle (clinique, région, district)
3. **Génération** — le système calcule les données et les affiche sous forme de tableau croisé dynamique
4. **Visualisation** — basculer entre vue tableau, graphique en barres ou courbes
5. **Sauvegarde** — enregistrer une analyse pour la retrouver ultérieurement
6. **Export** — exporter en Excel (ExcelJS) ou PDF (jsPDF)

### 📝 Indicateurs disponibles (exemples)

| Groupe | Indicateurs |
|--------|-------------|
| Planning Familial | Nouvelles acceptantes, Anciennes acceptantes, Total PF par méthode |
| Obstétrique | CPN, Accouchements, CPoN |
| VIH | Dépistages, PEC VIH actifs, Examens PV VIH |
| Laboratoire | Examens réalisés, Échographies réalisées |
| Médecine | Consultations MDG, IST, VBG |

### 📝 Dimensions

| Dimension | Description |
|-----------|-------------|
| Période | Mois, trimestre, semestre, année |
| Unité organisationnelle | Clinique, région, district |
| Activité | Type d'activité de la clinique |

### 🖼️ Captures d'écran

| Image | Description |
|-------|-------------|
| `ch17-01-analyser.png` | Interface d'analyse avec sélection des indicateurs |
| `ch17-02-analyser-tableau.png` | Tableau croisé dynamique des résultats |
| `ch17-03-analyser-graphique.png` | Visualisation graphique des données |

---

## 22. Module Administration

### 🎯 But

Permettre aux administrateurs de configurer et gérer les éléments de base du système eCMIS : cliniques, comptes, permissions, activités, postes et régions.

### 👤 Rôles concernés

- Administrateur uniquement

⚠️ **Si l'utilisateur n'est pas autorisé, l'accès est automatiquement refusé.**

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-01-admin-panel.png` | Panneau d'administration — grille de navigation |

### 22.1 Gestion des cliniques

#### 🎯 But

Créer et gérer les cliniques (antennes) rattachées à une région.

#### 📝 Description

| Champ | Description |
|-------|-------------|
| Nom de la clinique | Désignation officielle |
| Type | CA (Centre AIBEF) ou CF (Centre Franchisé) |
| Numéro | Identifiant unique |
| Région | Rattachement géographique |

Le formulaire se déplie via le bouton en haut à droite. Le tableau liste toutes les cliniques avec possibilité de modifier.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-02-cliniques.png` | Gestion des cliniques |

### 22.2 Gestion des activités

#### 🎯 But

Configurer les activités médicales (ex : planification familiale, obstétrique, PEC VIH) et leurs lieux associés avec des périodes de validité.

#### 📝 Description

Sélectionnez une clinique, puis créez des activités avec leurs lieux et dates. Les activités créées deviennent disponibles dans les formulaires de visite et les modules de rendez-vous/rapports.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-03-activites.png` | Gestion des activités |

### 22.3 Gestion des comptes utilisateurs

#### 🎯 But

Créer des comptes utilisateurs, attribuer des rôles et des cliniques d'affectation.

#### 📝 Description

| Champ | Description |
|-------|-------------|
| Nom | Nom complet |
| Email | Adresse email |
| Nom d'utilisateur | Identifiant de connexion |
| Mot de passe | Mot de passe sécurisé |
| Rôle | USER ou ADMIN |
| Cliniques | Multi-sélection des cliniques d'affectation |
| Prescripteur | Case à cocher (détermine si le nom apparaît automatiquement comme prescripteur) |

**Actions :** Créer, Modifier, Bannir/Débannir, Supprimer.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-04-comptes.png` | Gestion des comptes utilisateurs |

### 22.4 Gestion des permissions

#### 🎯 But

Contrôler finement les droits d'accès de chaque utilisateur sur chaque module (table) de l'application.

#### 📝 Description

Sélectionnez un utilisateur, puis activez/désactivez les permissions :

| Permission | Description |
|------------|-------------|
| **canRead** | Consulter les données |
| **canCreate** | Ajouter de nouvelles données |
| **canUpdate** | Modifier les données existantes |
| **canDelete** | Supprimer des données |

Chaque permission s'applique individuellement par table (Visite, Constante, Planning, IST, etc.).

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-05-permissions.png` | Gestion des permissions |

### 22.5 Gestion des postes

#### 🎯 But

Créer et gérer les postes/fonctions disponibles dans la structure (AMD, Infirmier, Sage-femme, Médecin, etc.).

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-06-postes.png` | Gestion des postes |

### 22.6 Gestion des prestations

#### 🎯 But

Configurer les services médicaux offerts par la structure.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-07-prestations.png` | Gestion des prestations |

### 22.7 Tarifs des prestations

#### 🎯 But

Définir les tarifs des prestations par clinique.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-08-prix-prestations.png` | Tarifs des prestations |

### 22.8 Gestion des régions

#### 🎯 But

Créer et gérer les régions administratives auxquelles sont rattachées les cliniques.

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-09-regions.png` | Gestion des régions |

---

## 23. Sauvegarde des Données

### 🎯 But

Assurer la sécurité et la pérennité des données en permettant la sauvegarde et la restauration de la base de données.

### 👤 Rôles concernés

- Administrateur uniquement

### 📝 Description

**Onglet Sauvegarde :**
1. Sélectionnez le mode (Safe / Force / Overwrite)
2. Cliquez sur **Sauvegarder**
3. Téléchargez le fichier de sauvegarde généré

**Onglet Restauration :**
1. Sélectionnez un fichier SQL de sauvegarde
2. Choisissez le mode de restauration
3. Confirmez la restauration

⚠️ **Attention** : La restauration écrase les données actuelles. Cette action est irréversible. Effectuez des sauvegardes régulières (quotidiennes recommandées).

#### 🖼️ Capture d'écran

| Image | Description |
|-------|-------------|
| `ch16-10-sauvegarde.png` | Interface de sauvegarde et restauration |

---

## 24. Bonnes Pratiques

| N° | Recommandation |
|----|----------------|
| 1 | **Toujours vérifier l'antenne sélectionnée** avant toute opération |
| 2 | **Créer la visite avant** de saisir les fiches médicales |
| 3 | **Respecter l'ordre chronologique** des visites et consultations |
| 4 | **Éviter les suppressions inutiles** — privilégier la désactivation |
| 5 | **Utiliser les filtres** pour gagner du temps dans les recherches |
| 6 | **Enregistrer régulièrement** les données lors de longues saisies |
| 7 | **Vérifier les permissions** avant d'entreprendre des actions sensibles |
| 8 | **Consulter l'historique client** avant toute nouvelle intervention |
| 9 | **Se déconnecter** après chaque session de travail |
| 10 | **Signaler immédiatement** tout problème ou anomalie |

---

## 25. Assistance et Support

### En cas de difficulté

| Étape | Action |
|-------|--------|
| 1 | **Contacter l'administrateur** système de votre clinique |
| 2 | **Vérifier vos permissions** dans le module Administration |
| 3 | **Actualiser la page** (F5) en cas de problème d'affichage |
| 4 | **Vider le cache** du navigateur si nécessaire |
| 5 | **Vérifier la connexion internet** |

### Contacts support technique

| Type | Contact |
|------|---------|
| **Email support** | support.ecmis@aibef.ci |
| **Téléphone** | [Numéro à définir par l'administration] |
| **Heures de support** | [Périodes à définir] |

---

## 26. Sécurité et Confidentialité

### Principes fondamentaux

| Principe | Description |
|----------|-------------|
| **Secret médical** | Les données sont strictement confidentielles |
| **Accès contrôlé** | Chaque utilisateur n'a accès qu'aux données nécessaires |
| **Traçabilité** | Toutes les actions sont enregistrées |
| **Sauvegarde** | Les données sont sauvegardées régulièrement |

### Responsabilités de l'utilisateur

| Action | Consigne |
|--------|----------|
| Identifiants | **Ne jamais partager** vos identifiants de connexion |
| Session | **Se déconnecter** après chaque session |
| Anomalies | **Signaler immédiatement** toute activité suspecte |

---

## 27. Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **AMD** | Agent de Marketing Social/Distributeur Communautaire |
| **ARV** | Antirétroviraux |
| **CA** | Centre AIBEF |
| **CD4** | Lymphocytes T CD4 |
| **CF** | Centre Franchisé |
| **CPN** | Consultation Prénatale |
| **CPoN** | Consultation Post-Natale |
| **DIU** | Dispositif Intra-Utérin (stérilet) |
| **IMC** | Indice de Masse Corporelle |
| **IST** | Infection Sexuellement Transmissible |
| **IVA** | Inspection Visuelle à l'Acide acétique |
| **MILDA** | Moustiquaire Imprégnée à Longue Durée d'Action |
| **PEC** | Prise En Charge |
| **PF** | Planning Familial |
| **SAA** | Soins Après Avortement |
| **SP** | Sulfadoxine-Pyriméthamine (antipaludique) |
| **VAT** | Vaccin Antitétanique |
| **VBG** | Violences Basées sur le Genre |
| **VIH** | Virus de l'Immunodéficience Humaine |

### B. Index des captures d'écran

| Chapitre | Images | Description |
|----------|--------|-------------|
| CH01 | `ch01-01` à `ch01-03` | Authentification |
| CH02 | `ch02-01` | Sidebar |
| CH03 | `ch03-01` à `ch03-03` | Dashboard |
| CH04 | `ch04-01` à `ch04-04` | Clients |
| CH05 | `ch05-01` à `ch05-09` | Hub des fiches |
| CH06 | `ch06-01` à `ch06-02` | Visite & Constantes |
| CH07 | `ch07-01` à `ch07-03` (+suites) | Santé reproductive |
| CH08 | `ch08-01` à `ch08-06` (+suites) | Maternité |
| CH09 | `ch09-01` à `ch09-04` (+suites) | IST & VIH |
| CH10 | `ch10-01` à `ch10-03` (+suites) | Médecine & VBG |
| CH11 | `ch11-01` à `ch11-03` | Examens & Écho |
| CH12 | `ch12-01` à `ch12-03` (+suites) | Référence & Facturation |
| CH13 | `ch13-01` à `ch13-07` | Pharmacie |
| CH14 | `ch14-01` à `ch14-04` | Laboratoire & Écho |
| CH15 | `ch15-01` à `ch15-03` (+suites) | Rapports & RDV |
| CH16 | `ch16-01` à `ch16-10` | Administration |

### C. Configuration requise

| Élément | Spécification |
|---------|---------------|
| Navigateur | Chrome, Firefox, Edge (versions récentes) |
| Connexion | Internet stable |
| Résolution | Minimum 1280x720 pixels |

---

## Historique des versions

| Version | Date | Modifications |
|---------|------|---------------|
| 1.0 | Janvier 2026 | Version initiale |
| 1.1 | Janvier 2026 | Ajout contexte, bonnes pratiques, support |
| 2.0 | Février 2026 | Intégration des captures d'écran, descriptions des affichages conditionnels, refonte complète |
| 3.0 | Mars 2026 | Ajout modules : Doublons & Fusion, Vente Directe, Tableau Financier, Journal Pharmacie, Analyse & Visualisation. Restructuration complète de la numérotation |

---

**Document version :** 3.0
**Dernière mise à jour :** Mars 2026
**Validé par :** [Nom du responsable]
**Distribution :** Tous les utilisateurs eCMIS

---

**© 2026 AIBEF - Tous droits réservés**

*Ce document est la propriété de l'Association Ivoirienne pour le Bien-Être Familial.*
*Sa reproduction est interdite sans autorisation écrite.*
