# QuizMada

Plateforme de quiz multijoueur en temps réel dédiée à la culture malgache : histoire, géographie, traditions, proverbes, sport, sciences et divertissement. Défie tes amis, suis les parties en direct et grimpe au classement.

Application web (SPA) React + Vite + Tailwind CSS v4, développée dans Figma Make, avec une interface 100 % en français.

## Fonctionnalités

- **Compte** — connexion, création de compte et mot de passe oublié (`AuthPage`)
- **Accueil** — parties en direct, catégories populaires, top joueurs et statistiques (`HomePage`)
- **Salon (lobby)** — préparation avant le match (`LobbyPage`)
- **Salle de jeu** — quiz 1v1 en temps réel avec minuteur, cartes de question et feedback de score (`GameRoomPage`)
- **Spectateur** — regarder les parties en direct avec score en temps réel et chat (`SpectatorPage`)
- **Résultats** — récapitulatif et rematch après chaque partie (`MatchResultsPage`)
- **Classement**, **Profil**, **Communauté**, **Portefeuille**, **Notifications**, **Paramètres**

## Stack technique

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- lucide-react (icônes)
- pnpm via mise (Node 22, pnpm 10.34)

## Démarrage

```bash
pnpm install
pnpm dev
```

Le serveur de développement tourne sur `http://localhost:8443` (port configurable via `$PORT`).

## Scripts

| Commande           | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Serveur de développement Vite (8443) |
| `pnpm build`       | Build de production                  |
| `pnpm preview`     | Prévisualisation du build            |
| `pnpm format`      | Formatage avec oxfmt                 |

## Structure du projet

```text
src/
  App.tsx              # navigation par état (pas de routeur)
  index.css            # tokens de thème Tailwind v4, animations, helpers
  main.tsx             # point d'entrée React
  pages/               # une page par écran
    AuthPage.tsx         HomePage.tsx          LobbyPage.tsx
    GameRoomPage.tsx     SpectatorPage.tsx     MatchResultsPage.tsx
    LeaderboardPage.tsx  ProfilePage.tsx       CommunityPage.tsx
    WalletPage.tsx       NotificationsPage.tsx SettingsPage.tsx
  components/
    ui/                # primitives UI (Button, Card, Dialog, Toast, Sheet…)
    game/              # GameHeader, QuestionCard, AnswerOption, QuizTimer, ScoreFeedback
    navigation/        # TopNav, BottomNav
    chat/              # ChatPanel
```

### Navigation

La navigation est gérée par l'état dans `src/App.tsx` via une union `Page`. Chaque écran reçoit `onNavigate` et appelle `(page: string) => void` pour changer d'écran. Les écrans `game` et `spectator` s'affichent en plein écran, sans barres de navigation.

### Thème

Les tokens de design (primaire, secondaire, succès, danger, gold, fonds et surfaces) ainsi que les classes utilitaires (dégradés, glassmorphism, animations) sont définis dans `src/index.css` avec la directive `@theme` de Tailwind v4.