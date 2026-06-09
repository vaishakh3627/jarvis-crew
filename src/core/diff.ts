/**
 * Turning Edit/Write tool inputs into renderable diffs — the data behind the
 * inline change view (file path, +/- counts, and the changed lines with
 * best-effort line numbers).
 */

export interface DiffLine {
  kind: 'add' | 'del' | 'ctx';
  text: string;
  oldNo?: number;
  newNo?: number;
}

export interface EditSummary {
  file: string;
  added: number;
  removed: number;
  startLine: number | null;
  lines: DiffLine[];
  more: number; // changed/context lines hidden by the cap
}

export interface FileChange {
  file: string;
  added: number;
  removed: number;
}

export interface ChangeSummary {
  files: FileChange[];
  totalAdded: number;
  totalRemoved: number;
}

/** The tools that produce a diff worth rendering. */
export function isEditTool(tool: string): boolean {
  return tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit';
}

/** A minimal LCS line diff: shared lines are context, the rest are add/del. */
export function diffLines(oldStr: string, newStr: string): { added: number; removed: number; lines: DiffLine[] } {
  const a = oldStr === '' ? [] : oldStr.split('\n');
  const b = newStr === '' ? [] : newStr.split('\n');
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      lines.push({ kind: 'ctx', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ kind: 'del', text: a[i] });
      i++;
      removed++;
    } else {
      lines.push({ kind: 'add', text: b[j] });
      j++;
      added++;
    }
  }
  while (i < m) {
    lines.push({ kind: 'del', text: a[i++] });
    removed++;
  }
  while (j < n) {
    lines.push({ kind: 'add', text: b[j++] });
    added++;
  }
  return { added, removed, lines };
}

/** 1-based line where `anchor` begins in `content`, or null if not found. */
export function locateStartLine(content: string, anchor: string): number | null {
  if (!anchor) return null;
  const idx = content.indexOf(anchor);
  if (idx === -1) return null;
  return content.slice(0, idx).split('\n').length;
}

/** Assign gutter line numbers, walking from `startLine` like a unified diff. */
export function numberLines(lines: DiffLine[], startLine: number): void {
  let oldNo = startLine;
  let newNo = startLine;
  for (const l of lines) {
    if (l.kind === 'ctx') {
      l.oldNo = oldNo++;
      l.newNo = newNo++;
    } else if (l.kind === 'del') {
      l.oldNo = oldNo++;
    } else {
      l.newNo = newNo++;
    }
  }
}

const MAX_DIFF_LINES = 14;

/**
 * Build the renderable summary for one Edit/Write/MultiEdit call. `readFile`
 * (best-effort, may return null) is used only to recover real line numbers.
 */
export function summarizeEdit(
  tool: string,
  input: unknown,
  readFile: (path: string) => string | null,
): EditSummary | null {
  const inp = input as Record<string, any> | null;
  const file = inp?.file_path;
  if (typeof file !== 'string') return null;

  let oldStr = '';
  let newStr = '';
  if (tool === 'Write') {
    newStr = String(inp?.content ?? '');
  } else if (tool === 'Edit') {
    oldStr = String(inp?.old_string ?? '');
    newStr = String(inp?.new_string ?? '');
  } else if (tool === 'MultiEdit' && Array.isArray(inp?.edits)) {
    oldStr = inp!.edits.map((e: any) => String(e?.old_string ?? '')).join('\n');
    newStr = inp!.edits.map((e: any) => String(e?.new_string ?? '')).join('\n');
  } else {
    return null;
  }

  const { added, removed, lines } = diffLines(oldStr, newStr);
  const content = readFile(file);
  const startLine = content != null ? locateStartLine(content, newStr) : null;
  if (startLine != null) numberLines(lines, startLine);

  let shown = lines;
  let more = 0;
  if (shown.length > MAX_DIFF_LINES) {
    more = shown.length - MAX_DIFF_LINES;
    shown = shown.slice(0, MAX_DIFF_LINES);
  }
  return { file, added, removed, startLine, lines: shown, more };
}

/** Merge per-edit changes by file into the end-of-run "what changed" summary. */
export function summarizeChanges(changes: FileChange[]): ChangeSummary {
  const byFile = new Map<string, FileChange>();
  for (const c of changes) {
    const cur = byFile.get(c.file) ?? { file: c.file, added: 0, removed: 0 };
    cur.added += c.added;
    cur.removed += c.removed;
    byFile.set(c.file, cur);
  }
  const files = [...byFile.values()];
  return {
    files,
    totalAdded: files.reduce((s, f) => s + f.added, 0),
    totalRemoved: files.reduce((s, f) => s + f.removed, 0),
  };
}
