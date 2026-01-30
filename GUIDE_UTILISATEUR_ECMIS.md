# Guide d'Utilisation de l'Application eCMIS

## Système Électronique de Gestion des Informations Cliniques

**Version 1.1**
**AIBEF - Association Ivoirienne pour le Bien-Être Familial**

---

## Table des Matières

1. [Contexte général](#1-contexte-général)
2. [Objectif du guide](#2-objectif-du-guide)
3. [Présentation générale de l'application](#3-présentation-générale-de-lapplication)
4. [Accès à l'application](#4-accès-à-lapplication)
5. [Tableau de bord (Dashboard)](#5-tableau-de-bord-dashboard)
6. [Navigation générale (Menu latéral)](#6-navigation-générale-menu-latéral)
7. [Module Clients](#7-module-clients)
8. [Fiches Médicales](#8-fiches-médicales)
9. [Module Planning Familial](#9-module-planning-familial)
10. [Module Gynécologie](#10-module-gynécologie)
11. [Module Obstétrique](#11-module-obstétrique)
12. [Module VIH](#12-module-vih)
13. [Module Médecine Générale](#13-module-médecine-générale)
14. [Module Laboratoire](#14-module-laboratoire)
15. [Module Échographie](#15-module-échographie)
16. [Module Pharmacie](#16-module-pharmacie)
17. [Module Prestations](#17-module-prestations)
18. [Rapports et Listings](#18-rapports-et-listings)
19. [Gestion des Rendez-vous](#19-gestion-des-rendez-vous)
20. [Module Administration](#20-module-administration)
21. [Sauvegarde des Données](#21-sauvegarde-des-données)
22. [Bonnes Pratiques](#22-bonnes-pratiques)
23. [Assistance et Support](#23-assistance-et-support)
24. [Sécurité et Confidentialité](#24-sécurité-et-confidentialité)
25. [Annexes](#25-annexes)

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

**Son architecture technique** (Next.js 15, TypeScript, Prisma) garantit performance, sécurité et fiabilité, essentielles pour la gestion de données médicales sensibles.

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

### 2.2 Structure du guide

**Pour chaque fonctionnalité, le guide précise :**

| Symbole | Signification |
|---------|---------------|
| 🎯 **But** | Pourquoi la fonctionnalité existe |
| 👤 **Rôles concernés** | Qui peut l'utiliser |
| 📝 **Description** | Comment elle fonctionne |
| 🖼️ **Capture d'écran** | Emplacement pour illustration |

### 2.3 Conventions utilisées

| Symbole | Signification |
|---------|---------------|
| * | Champ obligatoire |
| ⚠️ | Attention / Avertissement |
| 💡 | Conseil / Astuce |
| 🔴 | Bouton rouge = Supprimer/Annuler |
| 🟢 | Bouton vert/bleu = Valider/Enregistrer |

---

## 3. Présentation générale de l'application

### 🎯 But
Centraliser toutes les activités médicales et administratives d'une structure de santé dans un seul outil.

### 👤 Rôles concernés
- Administrateur
- Prestataires de santé
- Agents d'accueil
- Gestionnaires

### 📝 Description

L'application permet la gestion complète :

| Module | Fonctionnalités |
|--------|-----------------|
| **Clients** | Dossiers patients, historique médical |
| **Consultations** | Visites, constantes, fiches médicales |
| **Examens** | Demandes, résultats, facturation |
| **Pharmacie** | Stock, ventes, inventaires |
| **Facturation** | Prestations, examens, produits |
| **Rapports** | Statistiques, exports, listings |

### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Page d'accueil / Dashboard principal]

---

## 4. Accès à l'application

### 4.1 Page de connexion

#### 🎯 But
Garantir un accès sécurisé à l'application.

#### 👤 Rôles concernés
Tous les utilisateurs.

#### 📝 Description

La page de connexion est le point d'entrée de l'application. L'utilisateur doit saisir :
- son **nom d'utilisateur**
- son **mot de passe**

**Fonctionnalités :**
- Vérification des identifiants
- Redirection automatique selon les permissions
- Message d'erreur en cas d'identifiants incorrects

**Étapes de connexion :**
1. Ouvrez votre navigateur et saisissez l'adresse fournie par votre administrateur
2. Saisissez votre **Nom d'utilisateur**
3. Saisissez votre **Mot de passe**
4. Cliquez sur le bouton **Se connecter**

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Page de connexion avec champs nom d'utilisateur et mot de passe]

### 4.2 Création de compte (Premier administrateur)

#### 🎯 But
Permettre la création du premier compte administrateur.

#### 📝 Description

Si vous êtes le premier administrateur, accédez à la page d'inscription administrateur.

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
[CAPTURE D'ÉCRAN: Formulaire de création de compte administrateur]

### 4.3 Déconnexion automatique

#### 🎯 But
Protéger les données sensibles en cas d'inactivité.

#### 📝 Description

Pour des raisons de sécurité, l'application vous déconnecte automatiquement après :

| Condition | Durée |
|-----------|-------|
| Session active | 8 heures maximum |
| Inactivité | 15 minutes |

💡 **Conseil** : Enregistrez régulièrement votre travail pour éviter toute perte de données.

---

## 5. Tableau de bord (Dashboard)

### 🎯 But
Offrir une vue d'ensemble rapide de l'activité de la structure.

### 👤 Rôles concernés
- Administrateur
- Prestataires de santé

### 📝 Description

Le Dashboard s'affiche après une connexion réussie et présente des indicateurs clés :

| Élément | Description |
|---------|-------------|
| **Nombre de clients** | Total des clients enregistrés |
| **Visites du jour** | Nombre de visites effectuées aujourd'hui |
| **Rendez-vous à venir** | Prochains rendez-vous planifiés |
| **Graphiques** | Évolution des consultations sur la période |
| **Accès rapides** | Liens vers les modules principaux |

### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Dashboard principal avec statistiques et graphiques]

---

## 6. Navigation générale (Menu latéral)

### 🎯 But
Faciliter l'accès rapide et structuré à toutes les fonctionnalités.

### 📝 Description

Le menu latéral gauche est toujours visible et organisé par modules fonctionnels :

| Icône | Module | Description |
|-------|--------|-------------|
| 📊 | **Dashboard** | Tableau de bord principal |
| 👥 | **Clients** | Gestion des clients/patients |
| 💊 | **Pharmacie** | Produits, stocks, ventes |
| 📋 | **Listings** | Listes et rapports |
| 🔬 | **Laboratoire** | Examens de laboratoire |
| 🫀 | **Échographie** | Examens échographiques |
| 🩺 | **Prestation** | Services médicaux |
| ⚙️ | **Paramètres** | Administration système |

### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Menu latéral (Sidebar) avec tous les modules]

---

## 7. Module Clients

### 7.1 Liste des clients

#### 🎯 But
Afficher et gérer l'ensemble des patients enregistrés.

#### 👤 Rôles concernés
- Administrateur
- Agents autorisés

#### 📝 Description

La page présente un tableau interactif contenant :

| Colonne | Description |
|---------|-------------|
| Nom et prénom | Identité du client |
| Âge | Calcul automatique depuis la date de naissance |
| Code client | Identifiant unique |
| Antenne | Clinique de rattachement |
| Téléphone | Numéro de contact |
| Code VIH | Si applicable |

**Fonctionnalités disponibles :**
- 🔍 Recherche dynamique (nom, code, téléphone)
- 🏥 Filtres par antenne (icône entonnoir)
- 📄 Pagination
- ➕ Ajouter un nouveau client
- 👁️ Voir les détails d'un client
- ✏️ Modifier un client

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Liste des clients avec tableau de données]

### 7.2 Actions sur un client

| Icône | Action | Description |
|-------|--------|-------------|
| 📂 | Ouvrir | Accéder au dossier médical |
| ✏️ | Modifier | Mettre à jour les informations |
| 🗑️ | Supprimer | Supprimer définitivement le client |

⚠️ **Attention** : Ces actions sont conditionnées par les permissions de l'utilisateur.

### 7.3 Création d'un nouveau client

#### 🎯 But
Créer un nouveau client/patient dans le système.

#### 👤 Rôles concernés
- Conseiller(ère)
- AMD
- Agents autorisés

#### 📝 Description

Le formulaire de création permet d'enregistrer un client dans la base de données.

**Informations personnelles :**

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Code | Texte | Oui * |
| Nom | Texte | Oui * |
| Prénom | Texte | Oui * |
| Date de naissance | Date | Oui * |
| Sexe | Sélection (M/F) | Oui * |
| Téléphone 1 | Téléphone | Oui * |
| Téléphone 2 | Téléphone | Non |

**Informations complémentaires :**

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Lieu de naissance | Texte | Non |
| Quartier | Texte | Non |
| Niveau scolaire | Sélection | Non |
| Profession | Texte | Non |
| État matrimonial | Sélection | Non |
| Ethnie | Texte | Non |
| Source d'information | Sélection | Oui * |
| Statut client | Sélection | Oui * |
| Clinique | Sélection | Oui * |

**Étapes :**
1. Cliquez sur **Nouveau client**
2. Remplissez tous les champs obligatoires (*)
3. Vérifiez les informations saisies
4. Cliquez sur **Enregistrer**

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de création de client - Partie 1]
[CAPTURE D'ÉCRAN: Formulaire de création de client - Partie 2]

### 7.4 Dossier médical du client

#### 🎯 But
Assurer un suivi médical complet et structuré.

#### 👤 Rôles concernés
- Prestataires de santé
- Médecins
- Sages-femmes

#### 📝 Description

Chaque client dispose d'un dossier médical composé de plusieurs catégories de fiches :

| Catégorie | Fiches incluses |
|-----------|-----------------|
| **Informations** | Données personnelles du client |
| **Visites & Constantes** | Historique des visites, signes vitaux |
| **Santé reproductive** | Planning familial, Gynécologie, Infertilité |
| **Maternité** | Test grossesse, Grossesse, CPN, Accouchement, CPON, SAA |
| **IST & VIH** | IST, Dépistage, PEC VIH, Examens PV VIH |
| **Médecine** | Consultations générales, VBG, Ordonnances |
| **Examens** | Demandes, Résultats, Échographies |
| **Référencement** | Références, Contre-références |
| **Facturation** | Historique des factures |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Fiche client avec onglets et fiches médicales]

### 7.5 Import de clients VIH

#### 🎯 But
Importer des clients VIH en masse depuis un fichier.

#### 👤 Rôles concernés
- Administrateur
- Agents autorisés

#### 📝 Description

Accédez à **Clients > Import clients VIH** pour importer en masse.

**Format du fichier :**
- Type : Excel (.xlsx) ou CSV
- Colonnes requises : Voir modèle téléchargeable

💡 **Conseil** : Téléchargez le modèle avant de préparer vos données.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface d'import de clients VIH]

### 7.6 Historique des visites

#### 🎯 But
Consulter l'historique complet des visites d'un client.

#### 📝 Description

L'historique affiche :
- Nombre total de visites
- Navigation par dates
- Résumé des fiches par visite
- Actions rapides sur chaque visite

---

## 8. Fiches Médicales

### 8.1 Créer une visite

#### 🎯 But
Enregistrer une nouvelle visite pour un client.

#### 👤 Rôles concernés
- Prestataires de santé
- Agents d'accueil

#### 📝 Description

Depuis la fiche client, cliquez sur **Nouvelle visite**.

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| Date de visite | Date et heure | Oui * |
| Motif de visite | Raison de la consultation | Oui * |
| Activité | Type d'activité | Non |
| Lieu | Lieu de consultation | Non |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de création de visite]

### 8.2 Enregistrer les constantes

#### 🎯 But
Documenter les signes vitaux du patient.

#### 👤 Rôles concernés
- Infirmier(e)
- Sage-femme
- Médecin

#### 📝 Description

Après création de la visite, enregistrez les signes vitaux :

| Constante | Unité | Valeurs normales |
|-----------|-------|------------------|
| Poids | kg | Variable |
| Taille | cm | Variable |
| Tension systolique | mmHg | 90-140 |
| Tension diastolique | mmHg | 60-90 |
| Température | °C | 36.5-37.5 |
| Pouls | bpm | 60-100 |
| Fréquence respiratoire | /min | 12-20 |
| Saturation O2 | % | 95-100 |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire des constantes]

### 8.3 Navigation entre les fiches

#### 📝 Description

Depuis une visite, vous pouvez accéder à toutes les fiches médicales via les boutons d'action.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Boutons d'action sur une visite]

---

## 9. Module Planning Familial

### 9.1 Créer une fiche Planning

#### 🎯 But
Enregistrer une consultation de planification familiale.

#### 👤 Rôles concernés
- Sage-femme
- Infirmier(e)
- Conseiller(e)

#### 📝 Description

Depuis la visite d'un client, cliquez sur **Planning familial**.

**Informations à saisir :**

| Champ | Description |
|-------|-------------|
| Statut | Nouveau/Ancien utilisateur |
| Type de contraception | Catégorie de méthode |
| Motif de visite | Raison de la consultation |
| Consultation | Case à cocher |
| Counselling PF | Case à cocher |
| Méthode prise | Case à cocher |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de planning familial]

### 9.2 Méthodes de contraception

#### 📝 Description

**Méthodes courte durée :**
- Pilules
- Injectables
- Préservatifs

**Méthodes longue durée :**

| Méthode | Options disponibles |
|---------|---------------------|
| Implanon | Pose / Retrait |
| Jadelle | Pose / Retrait |
| Stérilet (DIU) | Pose / Retrait |

**En cas de retrait :**
- Renseigner la raison du retrait
- Documenter les effets secondaires éventuels

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Options de contraception longue durée]

### 9.3 Rendez-vous de suivi

#### 📝 Description

Programmez le prochain rendez-vous en sélectionnant une date dans le champ **RDV PF**.

💡 **Conseil** : Les rendez-vous apparaîtront automatiquement dans le tableau de gestion des RDV.

---

## 10. Module Gynécologie

### 10.1 Consultation gynécologique

#### 🎯 But
Enregistrer une consultation de gynécologie.

#### 👤 Rôles concernés
- Médecin
- Sage-femme

#### 📝 Description

Créez une fiche gynécologique depuis la visite du client.

**Sections du formulaire :**
1. Motif de consultation
2. Antécédents gynécologiques
3. Examen clinique
4. Diagnostic
5. Traitement prescrit

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de consultation gynécologique]

### 10.2 Suivi d'infertilité

#### 🎯 But
Documenter les consultations d'infertilité.

#### 📝 Description

Pour les consultations d'infertilité, utilisez la fiche dédiée accessible depuis le dossier médical.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire d'infertilité]

### 10.3 Prise en charge IST

#### 🎯 But
Enregistrer les infections sexuellement transmissibles.

#### 📝 Description

**Informations requises :**
- Syndrome identifié
- Traitement syndromique
- Partenaire(s) notifié(s)
- Counselling réalisé

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire IST]

---

## 11. Module Obstétrique

### 11.1 Enregistrer une grossesse

#### 🎯 But
Initier le suivi prénatal d'une cliente.

#### 👤 Rôles concernés
- Sage-femme
- Médecin

#### 📝 Description

Créez une fiche grossesse pour initier le suivi prénatal.

| Champ | Description |
|-------|-------------|
| Date des dernières règles | Pour calcul du terme |
| Gestité | Nombre total de grossesses |
| Parité | Nombre d'accouchements |
| Enfants vivants | Nombre actuel |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de grossesse]

### 11.2 Consultations prénatales (CPN)

#### 🎯 But
Documenter le suivi prénatal.

#### 📝 Description

Enregistrez chaque consultation prénatale avec :

**Éléments à documenter :**
- Hauteur utérine
- Bruits du cœur fœtal
- Mouvements actifs du fœtus
- Présentation
- Examens prescrits

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de consultation prénatale]

### 11.3 Accouchement

#### 🎯 But
Documenter l'accouchement et ses détails.

#### 📝 Description

| Section | Éléments |
|---------|----------|
| **Travail** | Durée, complications |
| **Accouchement** | Mode (voie basse/césarienne), heure |
| **Nouveau-né** | Poids, score Apgar, état |
| **Délivrance** | Type, complications |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire d'accouchement]

### 11.4 Consultation post-natale (CPON)

#### 🎯 But
Assurer le suivi après l'accouchement.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire CPON]

### 11.5 Test de grossesse

#### 🎯 But
Enregistrer les résultats de test de grossesse.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire test de grossesse]

### 11.6 Soins après avortement (SAA)

#### 🎯 But
Documenter les soins post-avortement.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire SAA]

---

## 12. Module VIH

### 12.1 Dépistage VIH

#### 🎯 But
Enregistrer les tests de dépistage VIH.

#### 👤 Rôles concernés
- Conseiller(e)
- Prestataires de santé

#### 📝 Description

| Champ | Options |
|-------|---------|
| Type de dépistage | Volontaire / Prescrit |
| Counselling pré-test | Oui / Non |
| Résultat | Positif / Négatif / Indéterminé |
| Counselling post-test | Oui / Non |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de dépistage VIH]

### 12.2 Prise en charge VIH (PEC VIH)

#### 🎯 But
Suivre les clients séropositifs sous traitement.

#### 📝 Description

**Éléments de suivi :**
- Stade clinique OMS
- Traitement ARV
- Observance
- Effets secondaires

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire PEC VIH]

### 12.3 Examens biologiques VIH

#### 🎯 But
Documenter les examens de suivi (CD4, charge virale).

#### 📝 Description

| Examen | Fréquence recommandée |
|--------|----------------------|
| CD4 | Tous les 6 mois |
| Charge virale | Tous les 6-12 mois |
| NFS | Selon protocole |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire examens PV VIH]

---

## 13. Module Médecine Générale

### 13.1 Consultation de médecine

#### 🎯 But
Enregistrer les consultations de médecine générale.

#### 👤 Rôles concernés
- Médecin
- Infirmier(e)

#### 📝 Description

**Structure de la consultation :**
1. Motif de consultation
2. Histoire de la maladie
3. Examen physique
4. Diagnostic
5. Traitement

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de médecine générale]

### 13.2 Prise en charge VBG

#### 🎯 But
Documenter les cas de violences basées sur le genre.

#### 📝 Description

⚠️ **Confidentialité** : Ces informations sont strictement confidentielles et soumises au secret médical.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire VBG]

---

## 14. Module Laboratoire

### 14.1 Configuration des examens

#### 🎯 But
Configurer les examens disponibles dans l'application.

#### 👤 Rôles concernés
- Administrateur
- Laborantin(e)

#### 📝 Description

Accédez à **Laboratoire > Créer un examen** pour configurer :
- Nom de l'examen
- Unité de mesure
- Valeurs normales
- Type d'examen

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Liste des examens de laboratoire]

### 14.2 Tarification des examens

#### 🎯 But
Définir les prix des examens par clinique.

#### 📝 Description

Accédez à **Laboratoire > Tarif Examen**.

**Créer un tarif :**
1. Sélectionnez l'examen
2. Sélectionnez la clinique
3. Saisissez le prix
4. Cliquez sur **Enregistrer**

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Configuration des tarifs d'examens]

### 14.3 Demander un examen

#### 🎯 But
Créer une demande d'examen pour un client.

#### 📝 Description

Depuis une visite :
1. Cliquez sur **Demande d'examen**
2. Sélectionnez les examens souhaités
3. Cliquez sur **Ajouter**
4. Validez la demande

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Dialogue de demande d'examen]

### 14.4 Saisir les résultats

#### 🎯 But
Enregistrer les résultats des examens effectués.

#### 👤 Rôles concernés
- Laborantin(e)

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Dialogue de saisie des résultats]

---

## 15. Module Échographie

### 15.1 Configuration des échographies

#### 🎯 But
Configurer les types d'échographies disponibles.

#### 📝 Description

Accédez à **Échographie > Créer une Échographie**.

**Types d'échographies :**
- Abdominale
- Pelvienne
- Obstétricale
- Gynécologique
- Mammaire

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Configuration des échographies]

### 15.2 Tarification

#### 🎯 But
Définir les tarifs des échographies par clinique.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Tarifs des échographies]

### 15.3 Demander une échographie

#### 🎯 But
Créer une demande d'échographie pour un client.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Dialogue de demande d'échographie]

---

## 16. Module Pharmacie

### 16.1 Gestion des produits

#### 🎯 But
Gérer le catalogue des produits pharmaceutiques.

#### 👤 Rôles concernés
- Pharmacien(ne)
- Administrateur

#### 📝 Description

Accédez à **Pharmacie > Produits** pour gérer le catalogue.

**Types de produits :**

| Type | Exemples |
|------|----------|
| Contraceptifs | Pilules, implants, DIU |
| Médicaments | Antibiotiques, ARV |
| Consommables | Gants, seringues |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Liste des produits pharmaceutiques]

### 16.2 Créer un produit

#### 🎯 But
Ajouter un nouveau produit au catalogue.

#### 📝 Description

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| Nom du produit | Désignation | Oui * |
| Type | Catégorie | Oui * |
| Description | Détails | Non |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire de création de produit]

### 16.3 Tarification et stock

#### 🎯 But
Gérer les prix et le stock des produits.

#### 📝 Description

Accédez à **Pharmacie > Prix Produits**.

**Pour chaque produit :**
- Prix unitaire
- Quantité en stock
- Seuil d'alerte
- Clinique concernée

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de tarification des produits]

### 16.4 Gestion du stock

#### 🎯 But
Suivre les mouvements de stock.

#### 📝 Description

Accédez à **Pharmacie > Gestion de Stock**.

**Actions disponibles :**
- Entrée de stock
- Sortie de stock
- Ajustement d'inventaire

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de gestion du stock]

### 16.5 Fiche de vente

#### 🎯 But
Enregistrer les ventes de produits.

#### 📝 Description

Accédez à **Pharmacie > Fiche de vente**.

**Étapes de vente :**
1. Sélectionnez le client (optionnel)
2. Ajoutez les produits
3. Vérifiez les quantités
4. Validez la vente

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de vente]

### 16.6 Inventaire

#### 🎯 But
Réaliser des inventaires réguliers du stock.

#### 👤 Rôles concernés
- Pharmacien(ne)
- Gestionnaire

#### 📝 Description

Accédez à **Pharmacie > Inventaire**.

**Créer un inventaire :**
1. Cliquez sur **Nouvel inventaire**
2. Sélectionnez la clinique *
3. Sélectionnez la date *
4. Cliquez sur **Enregistrer**

**Saisie de l'inventaire :**
1. Pour chaque produit, saisissez la quantité réelle
2. Le système calcule automatiquement l'écart
3. Signalez les anomalies si nécessaire

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface d'inventaire]
[CAPTURE D'ÉCRAN: Dialogue de création d'inventaire]

### 16.7 Signaler une anomalie

#### 🎯 But
Documenter les écarts de stock constatés.

#### 📝 Description

En cas d'écart de stock, signalez une anomalie :

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| Produit | Produit concerné | Auto |
| Écart | Différence calculée | Auto |
| Description | Explication de l'écart | Oui * |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Dialogue d'anomalie d'inventaire]

### 16.8 Commandes fournisseur

#### 🎯 But
Gérer les commandes d'approvisionnement.

#### 📝 Description

Accédez à **Pharmacie > Historique commande**.

**Créer une commande :**
1. Cliquez sur **Nouvelle commande**
2. Sélectionnez la clinique *
3. Sélectionnez la date *
4. Cliquez sur **Enregistrer**

**Ajouter des produits à la commande :**
1. Ouvrez la commande créée
2. Ajoutez les produits et quantités
3. Validez

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de commandes fournisseur]
[CAPTURE D'ÉCRAN: Dialogue de création de commande]

---

## 17. Module Prestations

### 17.1 Configuration des prestations

#### 🎯 But
Configurer les services offerts par la structure.

#### 👤 Rôles concernés
- Administrateur

#### 📝 Description

Accédez à **Prestation > Prestation** pour gérer le catalogue des services.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Liste des prestations]

### 17.2 Tarification des prestations

#### 🎯 But
Définir les tarifs des prestations par clinique.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Configuration des tarifs de prestations]

### 17.3 Facturer une prestation

#### 🎯 But
Enregistrer une prestation pour facturation.

#### 📝 Description

Depuis une visite, ajoutez des prestations à facturer via le bouton dédié.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de facturation des prestations]

---

## 18. Rapports et Listings

### 18.1 Accéder aux rapports

#### 🎯 But
Générer des rapports statistiques pour le suivi et le reporting.

#### 👤 Rôles concernés
- Administrateur
- Gestionnaire
- Suivi-Évaluation

#### 📝 Description

Accédez à **Listings > Rapports**.

### 18.2 Types de rapports disponibles

| Rapport | Description |
|---------|-------------|
| Planning Familial | Statistiques PF par méthode |
| Gynécologie | Consultations gynéco |
| Obstétrique | Suivi grossesses et accouchements |
| Dépistage VIH | Tests effectués et résultats |
| PEC VIH | Patients sous traitement |
| Laboratoire | Examens réalisés |
| IST | Infections traitées |
| Médecine générale | Consultations |
| SAA | Soins post-avortement |
| Infertilité/VBG | Cas pris en charge |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface des rapports]

### 18.3 Générer un rapport

#### 📝 Description

**Étapes :**
1. Sélectionnez le type de rapport
2. Choisissez la période (mensuel, trimestriel, semestriel, annuel)
3. Sélectionnez la clinique
4. Cliquez sur **Générer**

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Filtres de génération de rapport]

### 18.4 Exporter un rapport

#### 📝 Description

**Formats disponibles :**
- Excel (.xlsx)
- PDF
- Impression directe

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Options d'export]

### 18.5 Listings

#### 🎯 But
Consulter des listes de données filtrées.

#### 📝 Description

Accédez à **Listings > Listings**.

**Listings disponibles :**
- Toutes les données
- Obstétrique
- PEC VIH
- Planning familial

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface des listings]

---

## 19. Gestion des Rendez-vous

### 19.1 Tableau des rendez-vous

#### 🎯 But
Consulter et gérer les rendez-vous programmés.

#### 👤 Rôles concernés
- Agents d'accueil
- Prestataires de santé

#### 📝 Description

Accédez à **Listings > Gestion RDV**.

**Filtres disponibles :**
- Période
- Clinique(s)
- Type de service

### 19.2 Types de rendez-vous

| Type | Source |
|------|--------|
| Contraception | Fiches Planning |
| Obstétrique | Fiches CPN |
| PEC VIH | Fiches PEC VIH |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Tableau de bord des rendez-vous]

### 19.3 Actions sur les rendez-vous

| Action | Description |
|--------|-------------|
| ✅ Confirmer | Marquer comme honoré |
| 📅 Reprogrammer | Changer la date |
| ❌ Annuler | Annuler le RDV |
| 📵 Injoignable | Client non contactable |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Actions disponibles sur un rendez-vous]

---

## 20. Module Administration

### 🎯 But
Permettre aux administrateurs de configurer et gérer les éléments de base du système eCMIS.

### 👤 Rôles concernés
- Administrateur uniquement

### 📝 Description

Le module Administration est accessible uniquement aux utilisateurs disposant des autorisations nécessaires.

**Avant l'affichage des pages d'administration, le système :**
- vérifie l'identité de l'utilisateur connecté
- contrôle ses permissions d'accès

⚠️ **Si l'utilisateur n'est pas autorisé, l'accès est automatiquement refusé.**

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Page Administration (menu principal)]

### 20.1 Création et gestion des régions

#### 🎯 But
Créer et gérer les régions administratives auxquelles sont rattachées les cliniques.

#### 📝 Description

Cette fonctionnalité permet de :
- créer une nouvelle région
- modifier une région existante
- consulter la liste des régions enregistrées

**Le formulaire comprend :**
- le nom de la région
- le code de la région

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire et liste des régions]

### 20.2 Création et gestion des cliniques

#### 🎯 But
Créer et gérer les cliniques rattachées à une région.

#### 📝 Description

**Pour chaque clinique, l'administrateur renseigne :**

| Champ | Description |
|-------|-------------|
| Nom de la clinique | Désignation officielle |
| Type de clinique | Centre AIBEF ou Centre franchisé |
| Numéro de la clinique | Identifiant unique |
| Région de rattachement | Région géographique |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire et liste des cliniques]

### 20.3 Création de comptes utilisateurs

#### 🎯 But
Créer des comptes utilisateurs pour l'accès à l'application.

#### 📝 Description

Cette fonctionnalité permet de :
- créer un compte utilisateur
- associer un rôle à l'utilisateur
- rattacher l'utilisateur à une ou plusieurs cliniques

**Rôles disponibles :**

| Rôle | Permissions |
|------|-------------|
| USER | Accès standard selon permissions |
| ADMIN | Accès complet à l'administration |

**Postes disponibles :**

| Poste | Code |
|-------|------|
| AMD | AMD |
| Infirmier(e) | INFIRMIER |
| Sage-femme | SAGE_FEMME |
| Conseiller(e) | CONSEILLER |
| Médecin | MEDECIN |
| Laborantin(e) | LABORANTIN |
| Caissier(e) | CAISSIERE |
| Comptable | COMPTABLE |
| Suivi-Évaluation | SUIVI_EVALUATION |
| Administrateur | ADMIN |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Création de compte utilisateur]

### 20.4 Gestion des permissions

#### 🎯 But
Contrôler et sécuriser les droits d'accès des utilisateurs.

#### 📝 Description

Cette fonctionnalité permet de :
- définir les permissions par module
- limiter l'accès aux pages sensibles
- sécuriser les actions selon le rôle

**Permissions disponibles par table :**

| Permission | Description |
|------------|-------------|
| Créer | Ajouter de nouvelles données |
| Lire | Consulter les données |
| Modifier | Mettre à jour les données |
| Supprimer | Supprimer les données |

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Gestion des permissions]

### 20.5 Création et gestion des activités

#### 🎯 But
Configurer les activités médicales utilisées dans la planification et les rapports.

#### 📝 Description

L'administrateur peut :
- créer une activité (ex. : planification familiale, obstétrique, PEC VIH)
- associer des lieux et des périodes à une activité
- rendre les activités disponibles dans les modules de rendez-vous et de rapports

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Gestion des activités]

### 20.6 Gestion des postes

#### 🎯 But
Créer et gérer les postes/fonctions des utilisateurs.

#### 📝 Description

**Les postes servent à :**
- structurer les profils des utilisateurs
- faciliter l'attribution des rôles et des permissions
- améliorer l'organisation et la gestion des ressources humaines

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Formulaire et liste des postes]

### 20.7 Désactivation de compte

#### 🎯 But
Désactiver un compte utilisateur sans le supprimer.

#### 📝 Description

Pour désactiver un compte utilisateur :
1. Accédez au compte concerné
2. Cliquez sur **Désactiver**
3. Confirmez l'action

⚠️ **Attention** : Un compte désactivé ne peut plus se connecter mais conserve son historique.

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de désactivation]

---

## 21. Sauvegarde des Données

### 21.1 Accéder aux sauvegardes

#### 🎯 But
Assurer la sécurité et la pérennité des données de l'application.

#### 👤 Rôles concernés
- Administrateur uniquement

#### 📝 Description

Accédez à **Administration > Sauvegarde**.

⚠️ **L'accès à cette fonction est strictement réservé aux administrateurs.**

#### 🖼️ Capture d'écran
[CAPTURE D'ÉCRAN: Interface de sauvegarde]

### 21.2 Créer une sauvegarde

#### 📝 Description

**Étapes :**
1. Cliquez sur **Nouvelle sauvegarde**
2. Attendez la fin du processus
3. Téléchargez le fichier de sauvegarde

⚠️ **Important** : Effectuez des sauvegardes régulières (quotidiennes recommandées).

### 21.3 Restaurer une sauvegarde

#### 📝 Description

En cas de besoin, restaurez les données :
1. Cliquez sur **Restaurer**
2. Sélectionnez le fichier de sauvegarde
3. Confirmez la restauration

⚠️ **Attention** : La restauration écrase les données actuelles. Cette action est irréversible.

---

## 22. Bonnes Pratiques

### Pour une utilisation optimale de eCMIS

| N° | Recommandation |
|----|----------------|
| 1 | **Toujours vérifier l'antenne sélectionnée** avant toute opération |
| 2 | **Respecter l'ordre chronologique** des visites et consultations |
| 3 | **Éviter les suppressions inutiles** - privilégier la désactivation |
| 4 | **Utiliser les filtres** pour gagner du temps dans les recherches |
| 5 | **Enregistrer régulièrement** les données lors de longues saisies |
| 6 | **Vérifier les permissions** avant d'entreprendre des actions sensibles |
| 7 | **Consulter l'historique client** avant toute nouvelle intervention |
| 8 | **Utiliser les templates et modèles** pour les rapports récurrents |
| 9 | **Se déconnecter** après chaque session de travail |
| 10 | **Signaler immédiatement** tout problème ou anomalie |

---

## 23. Assistance et Support

### 23.1 En cas de difficulté

| Étape | Action |
|-------|--------|
| 1 | **Contacter l'administrateur** système de votre clinique |
| 2 | **Vérifier vos permissions** dans le module Administration |
| 3 | **Actualiser la page** (F5) en cas de problème d'affichage |
| 4 | **Vider le cache** du navigateur si nécessaire |
| 5 | **Vérifier la connexion internet** |

### 23.2 Contacts support technique

| Type | Contact |
|------|---------|
| **Email support** | support.ecmis@aibef.ci |
| **Téléphone** | [Numéro à définir par l'administration] |
| **Heures de support** | [Périodes à définir] |

### 23.3 Ressources supplémentaires

- **Guide de référence rapide** (à imprimer)
- **Tutoriels vidéo** (disponibles sur l'intranet)
- **FAQ en ligne** (mise à jour régulièrement)
- **Formations périodiques** organisées par l'AIBEF

---

## 24. Sécurité et Confidentialité

### 24.1 Principes fondamentaux

| Principe | Description |
|----------|-------------|
| **Secret médical** | Les données sont strictement confidentielles |
| **Accès contrôlé** | Chaque utilisateur n'a accès qu'aux données nécessaires |
| **Traçabilité** | Toutes les actions sont enregistrées dans des logs |
| **Sauvegarde** | Les données sont sauvegardées régulièrement |
| **Conformité** | Respect des réglementations sur la protection des données |

### 24.2 Responsabilités de l'utilisateur

| Action | Consigne |
|--------|----------|
| Identifiants | **Ne jamais partager** vos identifiants de connexion |
| Session | **Se déconnecter** après chaque session |
| Anomalies | **Signaler immédiatement** toute activité suspecte |
| Procédures | **Respecter les procédures** établies pour la gestion des données |

---

## 25. Annexes

### A. Codes d'erreur courants

| Code | Signification | Action recommandée |
|------|---------------|-------------------|
| 401 | Non authentifié | Reconnectez-vous |
| 403 | Accès refusé | Vérifiez vos permissions ou contactez l'administrateur |
| 404 | Page non trouvée | Vérifiez l'URL |
| 500 | Erreur serveur | Contactez l'administrateur |

### B. Raccourcis clavier utiles

| Raccourci | Action |
|-----------|--------|
| Ctrl + S | Sauvegarder (dans les formulaires) |
| Ctrl + F | Rechercher |
| Échap | Fermer une fenêtre modale |
| Tab | Passer au champ suivant |
| Entrée | Valider un formulaire |
| F5 | Actualiser la page |

### C. Périodicité recommandée des tâches

| Tâche | Fréquence | Responsable |
|-------|-----------|-------------|
| Sauvegarde manuelle | Quotidienne | Administrateur |
| Vérification des stocks | Hebdomadaire | Pharmacien |
| Génération de rapports | Mensuelle | Gestionnaire |
| Revue des permissions | Trimestrielle | Administrateur |
| Archivage des données | Annuelle | Administrateur |

### D. Glossaire des termes techniques

| Terme | Définition |
|-------|------------|
| **AMD** | Agent de Marketing Social/Distributeur Communautaire |
| **ARV** | Antirétroviraux |
| **CD4** | Lymphocytes T CD4 |
| **CPN** | Consultation Prénatale |
| **CPON** | Consultation Post-Natale |
| **DIU** | Dispositif Intra-Utérin (stérilet) |
| **IST** | Infection Sexuellement Transmissible |
| **PEC** | Prise En Charge |
| **PF** | Planning Familial |
| **PV** | Post-Visite |
| **SAA** | Soins Après Avortement |
| **VBG** | Violences Basées sur le Genre |
| **VIH** | Virus de l'Immunodéficience Humaine |

### E. Configuration requise

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

---

**📘 Note importante**
Ce guide est destiné à être imprimé et complété par des captures d'écran réelles de l'application eCMIS. Les illustrations doivent être mises à jour régulièrement pour refléter les évolutions de l'interface.

---

**Document version :** 1.1
**Dernière mise à jour :** Janvier 2026
**Validé par :** [Nom du responsable]
**Distribution :** Tous les utilisateurs eCMIS

---

**© 2026 AIBEF - Tous droits réservés**

*Ce document est la propriété de l'Association Ivoirienne pour le Bien-Être Familial.*
*Sa reproduction est interdite sans autorisation écrite.*

---

*Document généré pour l'application eCMIS*
