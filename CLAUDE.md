@AGENTS.md

# QuizMada — Claude Code notes

Real-time multiplayer quiz platform dedicated to Malagasy culture (French-language UI). `AGENTS.md` is the canonical reference; this file only adds Claude Code-specific guidance.

- **Navigation is state-based** in `src/App.tsx` — there is no router. Register new screens in the `Page` union, wire them into the render switch, and move between screens through the `onNavigate: (page: string) => void` prop.
- **New screens:** add `src/pages/<Name>Page.tsx` as a default export.
- **New reusable primitives:** add named exports to `src/components/ui/index.tsx`.
- **Game/chat/navigation components:** default exports in `src/components/{game,chat,navigation}/`, one component per file.
- **Theming:** use Tailwind utility classes in JSX; keep design tokens, gradients, animations, and CSS helpers in `src/index.css` (`@theme inline` block).
- **Verification:** run `pnpm build` before declaring work done.