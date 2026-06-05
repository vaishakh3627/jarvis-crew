# Jarvis — Multi-Agent Coding CLI — Design Spec

**Date:** 2026-06-05
**Status:** Approved design → ready for implementation planning
**Author:** Vaishakh K (with Jarvis)

---

## 1. Summary

**Jarvis** is a terminal CLI, built in **TypeScript + Ink**, that edits code like Claude Code but presents its work as a **crew of named AI agents** you watch operate — including in parallel. You log in with a browser-based `/login`, then talk to **Atlas**, the orchestrator, who plans the work and delegates to a curated squad of specialist agents — each with its own persona, an elite skill set, and a live presence in the UI.

The product's distinctive value is the **multi-agent experience layer**: visible thinking, a calm crew status line that blooms into detail on focus, and an adaptive layout that splits into live panes the moment two or more agents work at once.

---

## 2. Goals & Non-Goals

### Goals (v1 — "vertical slice")
- A real, usable coding CLI: browser `/login`, then edit local code via natural language.
- The fixed 5-agent crew, each as a distinct subagent with a curated skill set and persona.
- **Visible thinking** — Atlas's reasoning streams live (summarized).
- **Adaptive UI** — conversation timeline by default; auto-splits into live panes when ≥2 agents run in parallel; focusing an agent expands it into a detail card.
- Real code-editing tools executed **locally** on the user's machine (read/write/edit/bash/glob/grep), with permission prompts for destructive actions.

### Non-Goals (deferred to later versions)
- User-defined agents via config (architecture will leave a seam for it, but no v1 UI/loader).
- ASCII-avatar animations and visual flourish beyond the status bars.
- Session persistence / resume across restarts.
- MCP server management UI.
- Reusing a Claude.ai Pro/Max **subscription** for model access (not available to third-party CLIs; see §5).

---

## 3. The Crew

Five agents. Atlas is the orchestrator; the other four are specialist subagents. Each is defined by: a **persona** (name, emoji, color), a **role**, a curated **skill pack** (system-prompt context that makes it elite in its domain), an allowed **tool set**, and a **model**.

| Agent | Emoji | Role | Skill pack (themes) | Default model |
|---|---|---|---|---|
| **Atlas** | 🧠 | Orchestrator | Task decomposition, delegation, planning, synthesis | Opus 4.8 |
| **Iris** | 🎨 | UI/UX Designer | Design systems, accessibility, layout, visual hierarchy | Sonnet 4.6 |
| **Volt** | ⚡ | Frontend Engineer | React/TS, components, state, styling, responsive | Sonnet 4.6 |
| **Forge** | 🛠️ | Backend Engineer | APIs, data modeling, auth, queries, services | Sonnet 4.6 |
| **Sentry** | 🔍 | QA / Testing | Test strategy, edge cases, regression, verification | Sonnet 4.6 |

Models are configurable; the table is the default. Subagents default to Sonnet 4.6 for cost/latency; Atlas runs on Opus 4.8 for planning quality. (Model IDs verified current: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`.)

---

## 4. Architecture

Four layers, each with one clear purpose and a well-defined interface.

```
┌──────────────────────────────────────────────────────────────┐
│ ① UI Layer — Ink (React for the terminal)                     │
│   ConversationTimeline · CrewStatusLine · AgentPanes (split)  │
│   AgentCard (focus) · ThinkingView · PermissionPrompt · Input │
└───────────────▲───────────────────────────┬──────────────────┘
                │ renders UI events          │ dispatches user input
┌───────────────┴───────────────────────────▼──────────────────┐
│ ② Crew Engine — orchestration core                            │
│   EventBus (typed UI events) · AgentRegistry (5 personas)     │
│   ActivityTracker (per-agent status/file/progress)            │
│   Orchestrator (Atlas: plan → delegate → run → synthesize)    │
└───────────────▲───────────────────────────┬──────────────────┘
                │ loop/agent events          │ queries
┌───────────────┴───────────────────────────▼──────────────────┐
│ ③ Agent Loop — Messages API (@anthropic-ai/sdk) + tool use    │
│   Streaming (text + summarized thinking + tool events)        │
│   Local tool execution · permission gating (canUseTool-style) │
└───────────────▲───────────────────────────┬──────────────────┘
                │                            │ auth + model
┌───────────────┴───────────────────────────▼──────────────────┐
│ ④ Auth — browser OAuth (mirrors `ant auth login`)             │
│   /login opens browser → short-lived token stored locally     │
│   API-key fallback (ANTHROPIC_API_KEY) · model selection      │
└──────────────────────────────────────────────────────────────┘
```

### Module breakdown

- **`auth/`** — `login()` opens the browser OAuth flow against the Anthropic platform, exchanges for a short-lived token, stores it under the user's config dir (the SDK then resolves it automatically). Falls back to `ANTHROPIC_API_KEY`. Exposes `getCredentials()` and `isAuthenticated()`.
- **`core/agentLoop.ts`** — Runs the Messages API tool-use loop for **one** agent: streams `thinking_delta` (adaptive, `display: "summarized"`) and `text_delta`, detects `tool_use`, executes tools locally, feeds `tool_result` back, loops until `end_turn`. Emits typed events for every meaningful moment (thinking, text, tool start/result). Accepts a `canUseTool` callback for permission gating and an `AbortSignal` for interrupts.
- **`core/crew.ts`** — The **AgentRegistry**: the 5 persona definitions (system prompt + skill pack + allowed tools + model + persona meta). One place to read an agent's full config.
- **`core/orchestrator.ts`** — **Atlas.** Runs as an agent loop whose system prompt knows the crew and can call a `delegate(agent, task)` tool. Delegation spawns one subagent loop per task; independent tasks run **concurrently** (`Promise.all`), and Atlas synthesizes results. This concurrency is what the UI renders as parallel work.
- **`core/tools/`** — Local tool implementations: `read`, `write`, `edit`, `bash`, `glob`, `grep`, plus the `delegate` tool for Atlas. Each tool declares whether it's destructive (drives permission policy).
- **`core/skills/`** — Loads each agent's curated skill pack (bundled markdown) into its system prompt. v1 packs are static and bundled; the loader is the seam for future user-defined skills.
- **`core/events.ts`** — The **EventBus** (typed events: `thinking`, `text`, `toolStart`, `toolResult`, `permissionRequest`, `agentStarted`, `agentFinished`, `activity`) and the **ActivityTracker** (current status / file / progress per agent, feeding the crew status line).
- **`ui/`** — Ink components, each subscribing to the EventBus: `App`, `ConversationTimeline`, `CrewStatusLine`, `AgentPanes`, `AgentCard`, `ThinkingView`, `PermissionPrompt`, `Input`.
- **`cli.ts`** — Entry point, slash-command router (`/login`, `/agents`, `/help`, `/clear`, `/model`), arg parsing, Ink mount.
- **`config.ts`** — Config + model overrides; stub seam for future user-defined agents.

### Data flow (a typical request)
1. User types a request → `Input` → Orchestrator (Atlas loop) starts.
2. Atlas streams **summarized thinking** → `ThinkingView` shows it reason; `CrewStatusLine` shows Atlas "thinking."
3. Atlas decides a plan and calls `delegate` for each needed specialist. Independent delegations run concurrently.
4. As 2+ subagents become active, the UI **auto-splits** the timeline into **live panes (layout B)**; each pane streams that agent's text + current tool/file. `ActivityTracker` drives each agent's progress bar.
5. A destructive tool (`write`/`edit`/`bash`) raises a `permissionRequest`; `PermissionPrompt` renders allow/deny; the agent loop blocks on the response.
6. Subagents finish; Atlas synthesizes a final answer into the **ConversationTimeline**; panes collapse back to the calm single timeline.
7. Focusing an agent (keyboard) expands its **AgentCard (layout C)** with avatar, role, live progress, and skill chips.

---

## 5. Authentication (honest design)

**What the user wanted:** "`/login` opens browser," like Claude Code.

**Reality:** Claude Code's browser login authenticates a first-party Claude.ai subscription via Anthropic's private OAuth; a third-party CLI cannot reuse it for model access.

**What we do instead:** Mirror the Anthropic **developer-platform** OAuth flow (the same one `ant auth login` uses). `/login` opens the browser, the user authorizes, and a short-lived token is stored under the user's config directory; the SDK picks it up automatically. This delivers the exact `/login`-opens-browser UX the user pictured. Usage is billed to that platform account.

**Fallback:** If a user prefers, `ANTHROPIC_API_KEY` in the environment works with zero login.

---

## 6. The "brain": why a local agent loop (not server-hosted agents)

The Anthropic platform offers a server-hosted **Managed Agents** product with first-class multi-agent coordination. We deliberately **do not** use it for v1, because Jarvis edits the **user's local files** and should run with minimal moving parts. Instead we build a **local agent loop on the Messages API + tool use** (the "host-your-own-compute" path), where:
- Tools execute on the user's machine against their real project.
- We fully own and emit the typed events the multi-agent UI needs.
- Auth is just the browser token or an API key — no server-side agent/environment/worker provisioning.
- This is the closest analog to how Claude Code itself works.

The "crew" is therefore implemented as multiple Messages-API conversations (one per agent persona), orchestrated and parallelized by our Orchestrator. (A future version could swap the brain for Managed Agents + a self-hosted sandbox worker without changing the UI layer — the EventBus is the seam.)

**Verified SDK facts that this relies on:**
- Streaming exposes `thinking_delta` and `text_delta`; adaptive thinking with `display: "summarized"` yields live, user-visible reasoning.
- Tool use streams `tool_use` blocks; we execute locally and return `tool_result` (with `is_error` on failure).
- Default model `claude-opus-4-8` (adaptive thinking only — no `budget_tokens`/sampling params); subagents on `claude-sonnet-4-6`.
- Permission gating is done in our loop (human-in-the-loop before executing a destructive tool).

---

## 7. Error handling

- **Auth:** expired/missing token → prompt to `/login`; surface a clear message, never a raw stack trace.
- **API:** use the SDK's typed errors (`RateLimitError`, `APIError`, etc.); the SDK auto-retries 429/5xx. Surface rate-limit waits in the UI.
- **Tools:** failures return `tool_result` with `is_error: true` so the agent can adapt; the UI shows the error inline on the agent's timeline/pane.
- **Streaming:** on stream interruption, mark the agent errored and let Atlas decide to retry or report.
- **Interrupts:** Ctrl-C / Esc triggers an `AbortController` that cancels all in-flight agent loops cleanly and returns control to the prompt.
- **Parallel partial failure:** if one subagent fails, the others continue; Atlas synthesizes from what succeeded and reports the gap (no silent truncation).

---

## 8. Testing strategy (TDD)

- **agentLoop:** drive with a **mock Anthropic client** emitting canned stream events; assert it emits the right typed events, executes tool calls, and gates destructive tools via `canUseTool`.
- **tools:** run `read`/`write`/`edit`/`bash`/`glob`/`grep` against a temp directory; assert behavior and the destructive-flag → permission path.
- **orchestrator:** mock subagent loops; assert delegation, **concurrent** execution of independent tasks, synthesis, and partial-failure handling.
- **EventBus / ActivityTracker:** assert event ordering and that per-agent status/file/progress update correctly.
- **UI:** render Ink components with `ink-testing-library` against scripted event states — timeline rendering, crew status line, the auto-split to panes at ≥2 active agents, focus → card, and the permission prompt.
- **integration:** a recorded-fixture / fake-server run of an end-to-end "build a login page" request exercising plan → parallel delegation → permissioned writes → synthesis.

---

## 9. Open seams for later (not built in v1)
- User-defined agents (config loader stub exists).
- Animations and richer avatars.
- Session persistence/resume.
- MCP UI.
- Swappable "brain" (Managed Agents + self-hosted sandbox) behind the same EventBus.
