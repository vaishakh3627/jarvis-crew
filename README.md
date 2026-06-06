# Jarvis

A multi-agent coding CLI. Talk to **Atlas**, who orchestrates a crew —
**Iris** (UI/UX), **Volt** (frontend), **Forge** (backend), **Sentry** (QA) —
and watch them work, in parallel, in your terminal.

Jarvis runs on **your Claude Code (Max/Pro) login** — it drives Claude Code
headless under the hood, so there's **no API key and no per-token billing**.

## Requirements

- Node.js 20+
- [Claude Code](https://claude.com/claude-code) installed and logged in
  (`claude` on your PATH). Verify with `claude --version`.

## Quick start

```bash
npm install
npm run build
node dist/cli.js        # or, after `npm link`, just: jarvis
```

Run it from whatever project directory you want Jarvis to work in — it edits
files in the current working directory.

If you're not signed in, Jarvis says so on launch — type `/login` and it runs
Claude Code's own sign-in for you.

## Commands

- `/login` — sign in to Claude Code (runs `claude auth login`)
- `/help` — list commands
- `/clear` — clear the transcript
- **Ctrl-C** — interrupt the current run, or quit when idle

Tool actions (write/edit/bash) currently run under Claude Code's `acceptEdits`
mode — every action streams into the timeline as it happens. A live y/n
approval prompt is a planned follow-up.

## Development

```bash
npm run dev     # tsx src/cli.tsx (uses your Claude Code login)
npm test        # vitest
```
