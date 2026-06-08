# Jarvis

A multi-agent coding CLI for your terminal. You talk to **Atlas**, the orchestrator,
who delegates to a crew of specialists — **Iris** (UI/UX), **Volt** (frontend),
**Edith** (backend), and **Friday** (QA) — and you watch them work, in parallel,
each in their own color.

Jarvis runs on **your own [Claude Code](https://claude.com/claude-code) login**
(Pro/Max) under the hood — there's **no API key to manage and no per-token billing**.

## See the crew work in parallel

When a task fans out, **Atlas** delegates to the specialists and they run **at the
same time** — each in their own color, with a live spinner and progress:

![Jarvis — the crew working in parallel](https://raw.githubusercontent.com/vaishakh3627/jarvis-crew/main/media/parallel-ui.png)

## Requirements

- **Node.js 20+**
- **Claude Code** installed and signed in (`claude` on your PATH). Check with
  `claude --version` and `claude auth status`. If you're not signed in, Jarvis
  will prompt you — just type `/login`.
- *(optional)* `pngpaste` for pasting clipboard images: `brew install pngpaste`

## Install

```bash
npm install -g jarvis-crew
```

## Use

From inside any project you want to work on:

```bash
cd ~/path/to/your-project
jarvis
```

Jarvis edits files in the **current directory**. Describe what you want and the
crew gets to work.

### In the prompt

- **↑ / ↓** — recall previous inputs
- **Cmd+V** — paste text · **drag a file in** — attach it by path
- **Ctrl+V** — paste a clipboard image (needs `pngpaste`)
- **Ctrl+C** — interrupt the current run, or quit when idle

### Commands

- `/login` — sign in to Claude Code
- `/help` — list commands
- `/clear` — clear the transcript

## How it works

Jarvis drives Claude Code headless (`claude -p --output-format stream-json`) and
renders its stream — thinking, tool calls, and per-agent activity — as a live
crew UI. The specialists are Claude Code subagents; Atlas coordinates them. Each
run is **self-contained** — it ignores the host project's `CLAUDE.md`, settings,
skills, plugins, and MCP servers, so only the crew and their charters apply.

### Token usage

Jarvis is multi-agent, so it can use more of your Max quota than a single chat.
To keep it lean:

- Atlas and the specialists run on **Sonnet** by default (fast, strong, far
  cheaper than Opus).
- Atlas only **delegates when it actually helps** — simple or one-file tasks it
  handles itself, no extra agents.
- A **QA verification pass runs only when there's real risk**, not for trivial edits.

For maximum depth on a hard task, run with `JARVIS_MODEL=opus jarvis`.

## Develop

```bash
git clone https://github.com/vaishakh3627/jarvis-crew.git
cd jarvis-crew
npm install
npm run dev     # tsx src/cli.tsx (uses your Claude Code login)
npm test        # vitest
```

## License

MIT © Vaishakh K
