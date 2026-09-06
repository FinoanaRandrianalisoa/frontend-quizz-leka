# QuizMada

React + Vite + Tailwind CSS v4 app — a real-time multiplayer quiz platform dedicated to Malagasy culture (French-language UI). Built inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - App shell and state-based navigation (see "Navigation" below)
- `src/pages/` - One file per screen: `AuthPage`, `HomePage`, `LobbyPage`, `GameRoomPage`, `MatchResultsPage`, `LeaderboardPage`, `ProfilePage`, `CommunityPage`, `WalletPage`, `NotificationsPage`, `SettingsPage`, `SpectatorPage`
- `src/components/ui/index.tsx` - Design-system primitives (named exports: Button, Card, Badge, Avatar, Input, Tabs, Dialog, Sheet, Toast, RadioGroup, etc.)
- `src/components/game/` - Game-room building blocks (default exports): `GameHeader`, `QuestionCard`, `AnswerOption`, `QuizTimer`, `ScoreFeedback`
- `src/components/navigation/` - `TopNav` and `BottomNav` (default exports)
- `src/components/chat/ChatPanel.tsx` - Spectator chat (default export)
- `src/index.css` - Tailwind CSS v4 import, `@theme` design tokens, animations, and helpers
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite dev, build, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Navigation

There is no router library. `src/App.tsx` owns a `Page` union state and renders the matching screen. Screens receive an `onNavigate: (page: string) => void` prop to move between pages.

- Unauthenticated users are restricted to the auth pages (`login`, `register`)
- `game` and `spectator` render fullscreen, without `TopNav`/`BottomNav`

## Dependencies

- Runtime: React 19, React DOM 19, and lucide-react
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';` and defines the design tokens in an `@theme inline` block. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Component conventions

- Export screens and feature components as **default exports**.
- UI primitives go in `src/components/ui/index.tsx` as **named exports**.
- Reuse the primitives from `components/ui` (Button, Card, Badge, Avatar, Dialog, Sheet, Toast, Tabs, RadioGroup, …) instead of hand-rolling markup.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.