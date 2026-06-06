# Jarvis

A multi-agent coding CLI. Talk to **Atlas**, who orchestrates a crew —
**Iris** (UI/UX), **Volt** (frontend), **Forge** (backend), **Sentry** (QA) —
and watch them work, in parallel, in your terminal.

## Quick start

```bash
npm install
npm run build
node dist/cli.js        # then type /login, or set ANTHROPIC_API_KEY
```

## Commands

- `/login` — browser sign-in (Anthropic developer platform; billed per-token)
- `/help` — list commands
- `/clear` — reset the notice line

Destructive actions (write/edit/bash) prompt for y/n approval before running.

## Development

```bash
npm run dev     # tsx src/cli.tsx
npm test        # vitest
```
