# Frontend QuizMada — Explication générale

Ce document présente le frontend du projet de manière claire et structurielle. Il explique comment l’interface est organisée, comment les pages fonctionnent, comment l’application communique avec le backend, et comment les jeux et notifications sont affichés en temps réel.

---

## 1. Vue d’ensemble

Le frontend est une application React + TypeScript construite avec Vite.

Il sert de couche client de l’application QuizMada :
- connexion et inscription
- navigation entre les pages
- gestion des profils et classements
- création et participation à une partie
- affichage des notifications
- interaction avec les jeux multijoueurs
- affichage des résultats et du suivi de session

Le frontend ne se contente pas d’afficher des écrans statiques : il orchestre aussi la logique métier côté client, en interagissant avec le backend GraphQL et les WebSockets.

---

## 2. Stack technique

Les technologies principales sont :
- React : base de l’interface utilisateur
- TypeScript : sécurité et typage des données
- Vite : outil de build et de dev server
- Tailwind CSS : style des composants
- Lucide React : icônes
- GraphQL via `fetch` dans un client local
- WebSockets pour les notifications et les évenements temps réel

Le projet est donc conçu comme une app web moderne orientée “experience de jeu” avec une forte interaction dynamique.

---

## 3. Structure du frontend

Le dossier principal du frontend contient plusieurs zones fonctionnelles.

### Dossier principal

- `src/` : source principale de l’application
- `src/App.tsx` : point d’entrée de l’application et gestion de la navigation
- `src/main.tsx` : bootstrap React/Vite
- `src/index.css` : styles globaux et variables visuelles
- `src/lib/` : utilitaires, API, auth, formatage, hooks
- `src/pages/` : écrans principaux de l’application
- `src/components/` : composants réutilisables UI et structure du site

### Sous-dossiers importants

#### `src/lib/`
Ce dossier contient la logique transversale :
- `api.ts` : client GraphQL, toutes les requêtes/mutations
- `auth.tsx` : contexte d’authentification et gestion du token JWT
- `graphql.ts` : helper de requête GraphQL
- `format.ts` : formatage de données utilisateur, dates, ratios
- `hooks.ts` : hooks personnalisés
- `usePageTitle.tsx` : mise à jour du titre de page

#### `src/pages/`
Chaque fichier correspond à une page de navigation.

Exemples :
- `AuthPage.tsx` : connexion/inscription
- `HomePage.tsx` : accueil et aperçu du site
- `PlayCategoriesPage.tsx` : sélection d’un mode de jeu
- `CategoryThemesPage.tsx` : sélection d’un thème
- `GameRoomPage.tsx` : salle de partie active
- `RabbitRacePage.tsx` : mini-jeu Rabbit Race
- `SquidGamePage.tsx` : jeu défi / pierre-feuille-ciseaux multijoueur
- `NotificationsPage.tsx` : liste des notifications
- `ProfilePage.tsx`, `WalletPage.tsx`, `CommunityPage.tsx`, etc.

#### `src/components/`
Les composants sont découpés pour être réutilisables.

On y retrouve :
- `ui/` : boutons, cards, badges, avatar, skeletons, toasts
- `navigation/` : barre de navigation principale
- `chat/` : composant de messagerie ou de discussion
- `game/` : composants liés à l’expérience de jeu

---

## 4. Le point d’entrée : `App.tsx`

Le fichier `src/App.tsx` est le cœur de la navigation.

### Rôle principal
Il centralise :
- l’état de la page courante
- l’état du match actif
- les paramètres de navigation
- la logique d’accès selon l’utilisateur connecté
- l’affichage des écrans selon le contexte

### Navigation
Le type `Page` déclare les écrans disponibles :
- `login`, `register`
- `home`, `game`, `results`
- `rabbitRace`, `squidGame`
- `categories`, `categoryThemes`
- `leaderboard`, `profile`, `community`
- `wallet`, `notifications`, `messages`, `settings`
- `spectator`, `admin`

La fonction `navigate` sert à changer de page et éventuellement à passer un `matchId` ou un paramètre de catégorie.

### Authentification
L’application vérifie si l’utilisateur est connecté.
- si non, elle force l’affichage de l’écran d’authentification
- si oui, elle affiche la navigation normale de l’application

---

## 5. Authentification côté frontend

### `src/lib/auth.tsx`

Ce fichier gère le contexte d’authentification avec React.

Il permet de :
- lire le token JWT dans le `localStorage`
- récupérer l’utilisateur courant via `api.moi()`
- gérer la connexion et l’inscription
- déconnecter l’utilisateur
- rafraîchir les informations du profil

### Flux principal
1. le client charge le token stocké
2. le frontend appelle l’API GraphQL pour récupérer le profil
3. si le token est valide, l’utilisateur est connecté
4. sinon le token est supprimé et l’utilisateur est redirigé vers la page login

C’est le point central pour sécuriser les accès à toutes les pages.

---

## 6. Client GraphQL : `api.ts`

### `src/lib/api.ts`

C’est probablement le fichier le plus important du frontend après `App.tsx`.

Il centralise toutes les requêtes GraphQL utilisées par l’application.

### Ce qu’il contient
- authentification : `login`, `register`, `moi`
- profil : `profil`, `updateProfil`
- statistiques : `statsPlateforme`, `classement`
- thèmes et questions : `themes`, `questions`
- parties : `creerPartie`, `rejoindrePartie`, `partiesEnCours`, `partiesDisponibles`
- messages : `envoyerMessageAmi`, `messagesAmi`, `nbMessagesNonLus`
- notifications : `mesNotifications`, `marquerNotificationLue`
- amis : `demandesAmisRecues`, `repondreDemandeAmi`, `mesAmis`
- jeux RPS : `mesDefisRps`, `defierJoueurRps`, `accepterDefiRps`, `jouerCoupRps`

### Exemple de logique
Le client utilise une fonction `gql()` dans `src/lib/graphql.ts` pour envoyer des requêtes GraphQL et gérer les erreurs.

Cela permet :
- un point unique de gestion des requêtes
- le rajout automatique du token d’authentification
- une gestion claire des erreurs GraphQL

---

## 7. Le helper GraphQL

### `src/lib/graphql.ts`

Ce fichier contient la logique de communication avec le backend.

Il fait :
- une requête `fetch` vers `/graphql/`
- ajoute le header `Authorization: Bearer ...` si un token existe
- parse la réponse JSON
- lève une `GraphqlError` si le backend renvoie une erreur

### Pourquoi c’est important
C’est la couche qui relie le frontend à l’API Django / Strawberry.

Sans ce helper, chaque composant devrait gérer lui-même les appels HTTP, les erreurs et le JWT.

---

## 8. Les pages principales

### 8.1. `HomePage.tsx`
La page d’accueil affiche :
- statistiques globales du site
- thèmes disponibles
- parties en direct
- classements
- publications récentes

Elle sert de page d’entrée dans l’expérience utilisateur.

Elle contient aussi la logique de démarrage rapide d’une partie :
- choisir un thème
- créer une partie
- naviguer vers `game`

### 8.2. `PlayCategoriesPage.tsx`
Cette page propose une sélection de catégories de jeu.

Elle permet à l’utilisateur de choisir :
- mode de jeu
- thème ou catégorie
- lancer une partie ou accéder à un mini-jeu

### 8.3. `CategoryThemesPage.tsx`
Elle affiche les thèmes disponibles pour une catégorie donnée.

Cette étape est importante car la création de partie dépend souvent du thème choisi.

### 8.4. `GameRoomPage.tsx`
Il s’agit de la salle principale d’une partie active.

Elle comprend :
- gestion de la partie en cours
- affichage du tour actuel
- questions et choix de réponses
- score du joueur et de l’adversaire
- fin de partie et résultats

### 8.5. `RabbitRacePage.tsx`
Page dédiée à un mini-jeu du projet : Rabbit Race.

Le frontend affiche ici une interface dédiée à un mode de jeu spécifique, distinct du quiz standard.

### 8.6. `SquidGamePage.tsx`
C’est la page dédiée aux jeux de type “Squid Game” et notamment au défi multijoueur en pierre / papier / ciseaux.

Elle gère :
- l’état de la partie RPS
- la liste des joueurs
- les défis lancés
- l’acceptation d’un défi
- l’envoi d’un coup
- le rendu du duel

C’est un des composants clés pour la logique de défi temps réel.

### 8.7. `NotificationsPage.tsx`
La page de notifications centralise les éléments suivants :
- notifications de défi reçues
- confirmations de jeu
- demandes d’ami
- messages avec un statut lu / non lu

Elle a une logique très importante :
- si une notification est un défi, elle déclenche la bonne action
- si l’utilisateur clique sur la notification, le frontend tente d’accepter le défi et d’ouvrir le duel automatiquement

C’est une page très liée à la gestion de l’expérience utilisateur en temps réel.

---

## 9. Les composants de navigation

### `src/components/navigation/TopNav.tsx`
La barre de navigation principale est la structure transversale pour la plupart des pages.

Elle affiche :
- logo du projet
- menu principal
- accès aux pages d’accueil, jouer, classement, communauté, wallet, messages
- badge de notifications
- badge de messages non lus
- menu utilisateur
- invitations / demandes d’amis

### Fonctionnement
Cette barre est dynamique :
- elle charge les notifications non lues
- elle écoute les événements WebSocket pour rafraîchir le compteur
- elle affiche les demandes d’amis reçues
- elle permet d’accepter ou refuser les invitations

La barre est donc un composant central de l’expérience interactive.

---

## 10. Le design système

### `src/components/ui/`
Le projet utilise un système de composants UI cohérent pour garder un style uniforme.

Les composants présents peuvent inclure :
- `Button`
- `Card`
- `Badge`
- `Avatar`
- `Skeleton`
- `Toast`

Cela permet :
- de standardiser les interfaces
- de gagner du temps de développement
- d’avoir une UI homogène sur toutes les pages

---

## 11. Gestion des notifications temps réel

Le frontend ne se contente pas d’afficher les notifications en base : il reçoit aussi des événements WebSocket.

### Exemple logic
Dans `TopNav.tsx`, l’application ouvre un WebSocket sur l’endpoint notifications :
- `ws/notifications/`
- avec le token JWT dans la query string

À chaque message reçu :
- si le message est une notification standard, le compteur de notifications augmente
- si c’est un message privé, le compteur de messages augmente
- le UI rafraîchit sans recharger la page

Cela donne une vraie sensation de plateforme live, où les événements sont synchronisés en temps réel.

---

## 12. Jeu et défi multijoueur

### `SquidGamePage.tsx`
C’est la page qui reçoit la logique de défi en temps réel.

Le workflow est généralement :
1. l’utilisateur choisit un adversaire
2. le frontend envoie une mutation GraphQL pour défier le joueur
3. le backend crée un défi RPS
4. le destinataire reçoit une notification
5. le destinataire clique sur la notification ou sur le bouton associé
6. le frontend appelle `accepterDefiRps`
7. le backend crée la partie active
8. la page `SquidGamePage` charge l’état du match
9. les joueurs envoient leurs coups
10. le backend compare et détermine le vainqueur

### Souci fonctionnel important
Le frontend doit distinguer :
- l’écran générique de Squid Game
- le vrai duel actif
- les notifications non traitées
- l’état “en attente” et l’état “match accepté”

C’est précisément pour cette raison que les composants et les états de session sont cruciaux.

---

## 13. Les données et leur typage

### Types TypeScript
Le projet utilise des types explicites pour les entités métier.

Par exemple :
- `Utilisateur`
- `Theme`
- `Question`
- `Match`
- `Publication`
- `Portefeuille`
- `MessageAmi`
- `LedgerEntry`

Cela permet de sécuriser les données dans les appels GraphQL et d’éviter les erreurs liées aux structures de réponses incohérentes.

---

## 14. Gestion de l’état local et de session

Le frontend utilise plusieurs mécanismes pour gérer le state.

### `useState`
Pour les états locaux de composants :
- page courante
- menu ouvert / fermé
- comptage de notifications
- lecture de notification

### `localStorage`
Pour le token d’authentification et la persistance de session locale.

### `sessionStorage`
Pour des états de jeu ou de défi temporaires, comme un match RPS en attente ou un duel ouvert depuis une notification.

### `Context` React
Avec `AuthProvider`, on garde l’utilisateur connecté et accessible dans toute l’application.

---

## 15. Flux typique d’un utilisateur

### Cas 1 : connexion
1. l’utilisateur ouvre l’application
2. le frontend vérifie le token dans le `localStorage`
3. si présent, `api.moi()` charge les infos de profil
4. l’utilisateur est redirigé vers l’accueil

### Cas 2 : création d’une partie
1. l’utilisateur clique sur “Jouer”
2. le frontend sélectionne un thème ou une catégorie
3. `api.creerPartie` est appelé
4. l’ID du match est reçu
5. `navigate'