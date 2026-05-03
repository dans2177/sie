# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

SIE Master is a single-page React app that helps users study for the Securities Industry Essentials (SIE) exam. It provides an AI tutor powered by Claude, an equation cheatsheet, and an AI-generated quiz mode.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript check + Vite production build → dist/
npm run lint      # ESLint on all .ts/.tsx files
npm run preview   # Serve the production build locally
```

There are no tests in this project.

## Environment

Copy `.env.example` to `.env` and set:
```
VITE_ANTHROPIC_API_KEY=your-api-key-here
```

The API key is exposed to the browser via Vite's `import.meta.env.VITE_*` mechanism. This is intentional — the app runs entirely client-side.

## Architecture

The app has no backend. All AI calls go directly from the browser to the Anthropic API using `@anthropic-ai/sdk`. Vercel Blob write calls (`@vercel/blob`) are also made from the browser, but the current implementation falls back silently to `localStorage` when Blob is unavailable.

**Data flow:**
1. `MainLayout` owns all chat state (`messages`, `isLoading`, `mode`, `darkMode`)
2. On user message: `MainLayout.handleSendMessage` → `sendMessageToClaudeStream` (streams chunks back via callback) → state updates cause re-renders of `ChatPanel`
3. Quiz flow: `QuizMode` handles its own state (setup → loading → quiz → results) and calls `generateQuizQuestions` (non-streaming `sendMessage`) then `addQuizResult` to persist to storage

**Key source files:**

| File | Purpose |
|------|---------|
| `src/lib/api/claudeClient.ts` | All Claude API calls. System prompt is built here by embedding the entire `sieContent` JSON at module load time. Two exported functions: `sendMessageToClaudeStream` (streaming, used by chat) and `sendMessage` (non-streaming, used by quiz generator). |
| `src/lib/api/quizGenerator.ts` | Calls `sendMessage` with a prompt asking Claude to return a JSON array of quiz questions. Parses the response with a regex match on `[...]`. Falls back to placeholder questions on parse failure. |
| `src/lib/content/sieContent.ts` | Static data: arrays of `Equation`, `ConceptCard`, and `ToughSpot` objects. This is the entire SIE knowledge base — equations use LaTeX strings. Adding content here automatically makes it available to the AI tutor (it's serialized into the system prompt). |
| `src/lib/storage/blobStorage.ts` | Persists user data (quiz history, progress, notes) to `localStorage` first, then attempts a Vercel Blob `put`. The `get` side is not yet implemented — only `put` is called. |
| `src/types/index.ts` | All TypeScript interfaces. Central source of truth for data shapes. |

## Content Conventions

- **Equations** in `sieContent.ts` use LaTeX for the `formula` field (rendered via `react-katex`)
- Equation `category` must match an `ExamCategory` union type defined in `src/types/index.ts`
- `difficulty` is always one of `'basic' | 'intermediate' | 'advanced'`
- The system prompt in `claudeClient.ts` instructs Claude to wrap math in `$...$` (inline LaTeX)

## Styling

- TailwindCSS v4 via `@tailwindcss/postcss` — uses the new CSS-first config (not `tailwind.config.js` plugin system)
- Dark mode is class-based (`dark:` prefix); the `dark` class is toggled on `document.documentElement` by `MainLayout`
- No component library — all UI is hand-built with Tailwind utility classes

## Deployment

Deploys to Vercel. `vercel.json` sets `VITE_ANTHROPIC_API_KEY` as a required environment variable. The build output is `dist/`.
