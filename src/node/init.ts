/**
 * `volito init` and `volito doctor`: set a project up for coding agents, and say what is ready.
 *
 * init adds the Volito MCP server to each agent's project config (merged, never replacing a server
 * someone else put there unless forced), puts the Volito skill where Claude Code reads skills, and
 * prints what to ask for. It never edits files outside the project: for Codex, whose MCP config is
 * global, it prints the one command to run. Planning is pure (planInit) and separate from writing
 * (applyInit), so --dry-run shows exactly what would change.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { probeFfmpeg, ffmpegPath } from "./ffmpeg.js";
import { packageRoot, packageVersion } from "./paths.js";

export const AGENTS = ["claude", "cursor", "vscode", "codex"] as const;
export type AgentId = (typeof AGENTS)[number];

export const AGENT_NAMES: Record<AgentId, string> = { claude: "Claude Code", cursor: "Cursor", vscode: "VS Code", codex: "Codex" };

/** The server every agent runs: the published package over stdio, so nothing has to be installed first. */
export const MCP_SERVER = { command: "npx", args: ["-y", "volito", "mcp"] } as const;
export const CODEX_COMMAND = "codex mcp add volito -- npx -y volito mcp";

/** Where each agent reads a project's MCP servers, and the key it keeps them under. */
const MCP_FILES: Partial<Record<AgentId, { path: string; key: "mcpServers" | "servers"; entry: Record<string, unknown> }>> = {
  claude: { path: ".mcp.json", key: "mcpServers", entry: { ...MCP_SERVER } },
  cursor: { path: join(".cursor", "mcp.json"), key: "mcpServers", entry: { ...MCP_SERVER } },
  vscode: { path: join(".vscode", "mcp.json"), key: "servers", entry: { type: "stdio", ...MCP_SERVER } },
};

export const SKILL_DIR = join(".claude", "skills", "volito");

export type InitAction =
  | { kind: "write"; agent?: AgentId; path: string; content: string; detail: string }
  | { kind: "copy"; agent?: AgentId; from: string; path: string; detail: string }
  | { kind: "skip"; agent?: AgentId; path?: string; detail: string }
  | { kind: "note"; agent?: AgentId; detail: string };

export type InitOptions = { agents?: AgentId[]; force?: boolean; skill?: boolean };

/** Agents a project already shows signs of, from its files alone. */
export function detectAgents(cwd: string, onPath: (bin: string) => boolean = binOnPath): AgentId[] {
  const has = (p: string) => existsSync(join(cwd, p));
  const found = new Set<AgentId>();
  if (has(".claude") || has("CLAUDE.md") || has(".mcp.json") || onPath("claude")) found.add("claude");
  if (has(".cursor") || has(".cursorrules")) found.add("cursor");
  if (has(".vscode")) found.add("vscode");
  if (has("AGENTS.md") || has(".codex") || onPath("codex")) found.add("codex");
  return AGENTS.filter((a) => found.has(a));
}

/** Parse --agent: "all", or a comma list of claude, cursor, vscode, codex. */
export function parseAgents(arg: string): AgentId[] {
  const words = arg
    .split(/[\s,]+/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  if (words.includes("all")) return [...AGENTS];
  const bad = words.filter((w) => !(AGENTS as readonly string[]).includes(w));
  if (bad.length || !words.length) throw new Error(`--agent takes all or any of ${AGENTS.join(", ")} (got "${arg}")`);
  return AGENTS.filter((a) => words.includes(a));
}

/**
 * Merge the volito server into an MCP config's text. Keeps every other server and key; leaves an existing
 * volito entry alone unless `force`. Returns null when the file is not a JSON object we can safely edit.
 */
export function mergeMcpConfig(text: string | null, key: "mcpServers" | "servers", entry: Record<string, unknown>, force = false): { text: string; changed: boolean; had: boolean } | null {
  let doc: Record<string, unknown> = {};
  if (text && text.trim()) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      doc = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const servers = doc[key] ?? {};
  if (typeof servers !== "object" || servers === null || Array.isArray(servers)) return null;
  const map = servers as Record<string, unknown>;
  const had = "volito" in map;
  if (had && !force) return { text: text ?? "", changed: false, had };
  const next = { ...doc, [key]: { ...map, volito: entry } };
  return { text: `${JSON.stringify(next, null, 2)}\n`, changed: true, had };
}

/** Everything init would do in `cwd`, without touching the disk. */
export function planInit(cwd: string, opts: InitOptions = {}, onPath: (bin: string) => boolean = binOnPath): { agents: AgentId[]; detected: boolean; actions: InitAction[] } {
  const detected = detectAgents(cwd, onPath);
  const agents = opts.agents?.length ? opts.agents : detected.length ? detected : (["claude"] as AgentId[]);
  const actions: InitAction[] = [];
  for (const agent of agents) {
    const file = MCP_FILES[agent];
    if (!file) {
      actions.push({ kind: "note", agent, detail: `${AGENT_NAMES[agent]} keeps MCP servers in its global config. Add Volito with:\n    ${CODEX_COMMAND}` });
      continue;
    }
    const path = join(cwd, file.path);
    const merged = mergeMcpConfig(existsSync(path) ? readFileSync(path, "utf8") : null, file.key, file.entry, opts.force);
    if (!merged) actions.push({ kind: "skip", agent, path, detail: `${file.path} is not a JSON object with a "${file.key}" map — left alone. Add "volito": ${JSON.stringify(file.entry)} under "${file.key}" yourself.` });
    else if (!merged.changed) actions.push({ kind: "skip", agent, path, detail: `${file.path} already has a volito server (--force replaces it)` });
    else actions.push({ kind: "write", agent, path, content: merged.text, detail: `${merged.had ? "replaced" : "added"} the volito MCP server in ${file.path}` });
  }
  if (opts.skill !== false && agents.includes("claude")) {
    const from = skillSource();
    const path = join(cwd, SKILL_DIR);
    if (existsSync(join(path, "SKILL.md")) && !opts.force) actions.push({ kind: "skip", agent: "claude", path, detail: `${SKILL_DIR} already exists (--force replaces it)` });
    else actions.push({ kind: "copy", agent: "claude", from, path, detail: `put the Volito skill in ${SKILL_DIR}` });
  }
  if (agents.some((a) => a !== "claude")) actions.push({ kind: "note", detail: "For the skill in other agents: npx skills add monarcpro/volito" });
  return { agents, detected: detected.length > 0, actions };
}

/** Do what planInit planned. */
export function applyInit(actions: InitAction[]): void {
  for (const a of actions) {
    if (a.kind === "write") {
      mkdirSync(dirname(a.path), { recursive: true });
      writeFileSync(a.path, a.content);
    } else if (a.kind === "copy") {
      mkdirSync(a.path, { recursive: true });
      cpSync(a.from, a.path, { recursive: true, force: true });
    }
  }
}

/** The skill folder that ships in the package. */
export function skillSource(): string {
  return join(packageRoot(), "skills", "volito");
}

export function binOnPath(bin: string): boolean {
  const exts = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) if (existsSync(join(dir, bin + ext))) return true;
  }
  return false;
}

export function describeInit(plan: ReturnType<typeof planInit>, dryRun: boolean): string {
  const lines: string[] = [];
  lines.push(`${dryRun ? "Would set up" : "Set up"} Volito ${packageVersion()} for ${plan.agents.map((a) => AGENT_NAMES[a]).join(", ")}${plan.detected ? "" : " (no agent found in this folder, so Claude Code; pick with --agent)"}`);
  for (const a of plan.actions) {
    const doing = a.kind === "write" || a.kind === "copy";
    const mark = doing ? (dryRun ? "·" : "✓") : a.kind === "skip" ? "–" : "→";
    const detail = doing && dryRun ? a.detail.replace(/^(added|replaced|put)\b/, (w) => `would ${{ added: "add", replaced: "replace", put: "put" }[w]}`) : a.detail;
    lines.push(`  ${mark} ${detail}`);
  }
  lines.push("");
  lines.push(dryRun ? "Nothing was written (--dry-run)." : 'Restart your agent, then ask it: "Make a lower third for Priya Sharma, product designer, 9:16 for Reels, in our brand."');
  return lines.join("\n");
}

export type DoctorCheck = { name: string; ok: boolean; detail: string; fix?: string };

/** What is ready for rendering and for agents, in `cwd`. */
export function runDoctor(cwd: string, onPath: (bin: string) => boolean = binOnPath): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  const nodeOk = major > 20 || (major === 20 && minor >= 10);
  checks.push({ name: "Node", ok: nodeOk, detail: `${process.versions.node}${nodeOk ? "" : " — Volito needs 20.10 or newer"}`, fix: nodeOk ? undefined : "install Node.js 20.10 or newer" });

  const probe = probeFfmpeg();
  if (!probe) {
    checks.push({ name: "FFmpeg", ok: false, detail: `not found (${ffmpegPath()}) — stills, sheets and PNG frames still work`, fix: "macOS: brew install ffmpeg · Debian/Ubuntu: apt install ffmpeg · Windows: winget install ffmpeg · or set VOLITO_FFMPEG" });
  } else {
    const want: [string, string][] = [
      ["prores_ks", "MOV ProRes 4444"],
      ["libx264", "MP4"],
      ["libvpx-vp9", "WebM"],
      ["libopus", "WebM sound"],
      ["aac", "MP4 sound"],
    ];
    const missing = want.filter(([enc]) => !probe.encoders.has(enc)).map(([, what]) => what);
    const hevc = probe.encoders.has("hevc_videotoolbox") || probe.encoders.has("libx265");
    checks.push({ name: "FFmpeg", ok: true, detail: probe.path });
    checks.push({ name: "Formats", ok: missing.length === 0, detail: missing.length ? `missing encoders for ${missing.join(", ")}` : "MOV, MP4, WebM and their sound", fix: missing.length ? "install an FFmpeg built with libvpx, libopus and libx264" : undefined });
    checks.push({ name: "HEVC with alpha", ok: hevc, detail: hevc ? "available" : "needs VideoToolbox (macOS) or libx265", fix: hevc ? undefined : "optional: render ProRes 4444 or WebM for alpha instead" });
  }

  const fonts = join(packageRoot(), "fonts");
  const faces = existsSync(fonts) ? readdirSync(fonts).filter((f) => f.endsWith(".ttf")).length : 0;
  checks.push({ name: "Fonts", ok: faces > 0, detail: `${faces} bundled faces` });

  const agents = detectAgents(cwd, onPath);
  for (const agent of AGENTS) {
    const file = MCP_FILES[agent];
    if (!file) {
      if (agents.includes(agent)) checks.push({ name: AGENT_NAMES[agent], ok: true, detail: "found; its MCP config is global", fix: CODEX_COMMAND });
      continue;
    }
    const path = join(cwd, file.path);
    if (!existsSync(path)) {
      if (agents.includes(agent)) checks.push({ name: AGENT_NAMES[agent], ok: false, detail: `no ${file.path}`, fix: `volito init --agent ${agent}` });
      continue;
    }
    const merged = mergeMcpConfig(readFileSync(path, "utf8"), file.key, file.entry);
    checks.push({ name: AGENT_NAMES[agent], ok: !!merged?.had, detail: merged?.had ? `volito server in ${file.path}` : `${file.path} has no volito server`, fix: merged?.had ? undefined : `volito init --agent ${agent}` });
  }
  if (agents.includes("claude")) {
    const has = existsSync(join(cwd, SKILL_DIR, "SKILL.md"));
    checks.push({ name: "Skill", ok: has, detail: has ? SKILL_DIR : `no ${SKILL_DIR}`, fix: has ? undefined : "volito init" });
  }
  return checks;
}

export function describeDoctor(checks: DoctorCheck[]): string {
  const width = Math.max(...checks.map((c) => c.name.length));
  const lines = [`Volito ${packageVersion()}`];
  for (const c of checks) {
    lines.push(`  ${c.ok ? "✓" : "✗"} ${c.name.padEnd(width)}  ${c.detail}`);
    if (!c.ok && c.fix) lines.push(`    ${" ".repeat(width)}  → ${c.fix}`);
  }
  return lines.join("\n");
}
