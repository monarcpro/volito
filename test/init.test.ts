import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MCP_SERVER, SKILL_DIR, applyInit, detectAgents, mergeMcpConfig, parseAgents, planInit, skillSource } from "../src/node/init.js";

const none = () => false;
const dirs: string[] = [];
const project = (files: Record<string, string> = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "volito-init-"));
  dirs.push(dir);
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(join(dir, p, ".."), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  return dir;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("volito init", () => {
  it("adds the server to an MCP config and keeps everything else", () => {
    const before = JSON.stringify({ mcpServers: { other: { command: "x" } }, extra: 1 });
    const r = mergeMcpConfig(before, "mcpServers", { ...MCP_SERVER })!;
    expect(r.changed).toBe(true);
    expect(JSON.parse(r.text)).toEqual({ mcpServers: { other: { command: "x" }, volito: { command: "npx", args: ["-y", "volito", "mcp"] } }, extra: 1 });
  });

  it("leaves an existing volito server alone unless forced, and refuses files it cannot read", () => {
    const mine = JSON.stringify({ servers: { volito: { command: "node", args: ["mine.js"] } } });
    expect(mergeMcpConfig(mine, "servers", { ...MCP_SERVER })).toMatchObject({ changed: false, had: true });
    expect(mergeMcpConfig(mine, "servers", { ...MCP_SERVER }, true)).toMatchObject({ changed: true, had: true });
    expect(mergeMcpConfig("{ not json", "servers", {})).toBeNull();
    expect(mergeMcpConfig("[1]", "servers", {})).toBeNull();
    expect(mergeMcpConfig(JSON.stringify({ servers: [] }), "servers", {})).toBeNull();
    expect(mergeMcpConfig(null, "servers", { a: 1 })).toMatchObject({ changed: true, had: false });
  });

  it("reads --agent", () => {
    expect(parseAgents("all")).toEqual(["claude", "cursor", "vscode", "codex"]);
    expect(parseAgents("vscode, Claude")).toEqual(["claude", "vscode"]);
    expect(() => parseAgents("emacs")).toThrow(/--agent/);
  });

  it("finds the agents a project uses from its files", () => {
    expect(detectAgents(project({ "CLAUDE.md": "", ".cursor/rules.mdc": "" }), none)).toEqual(["claude", "cursor"]);
    expect(detectAgents(project({ ".vscode/settings.json": "{}", "AGENTS.md": "" }), none)).toEqual(["vscode", "codex"]);
    expect(detectAgents(project(), none)).toEqual([]);
  });

  it("sets up Claude Code with no agent found, and writes nothing on a dry run", () => {
    const dir = project();
    const plan = planInit(dir, {}, none);
    expect(plan.agents).toEqual(["claude"]);
    expect(plan.detected).toBe(false);
    expect(plan.actions.map((a) => a.kind)).toEqual(["write", "copy"]);
    expect(existsSync(join(dir, ".mcp.json"))).toBe(false);
  });

  it("writes each agent's config, copies the skill, and only prints the Codex command", () => {
    const dir = project({ ".vscode/mcp.json": JSON.stringify({ servers: { git: { type: "stdio", command: "git-mcp" } } }) });
    const plan = planInit(dir, { agents: ["claude", "cursor", "vscode", "codex"] }, none);
    applyInit(plan.actions);
    expect(JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8")).mcpServers.volito).toEqual({ command: "npx", args: ["-y", "volito", "mcp"] });
    expect(JSON.parse(readFileSync(join(dir, ".cursor/mcp.json"), "utf8")).mcpServers.volito.command).toBe("npx");
    const vscode = JSON.parse(readFileSync(join(dir, ".vscode/mcp.json"), "utf8"));
    expect(Object.keys(vscode.servers)).toEqual(["git", "volito"]);
    expect(vscode.servers.volito.type).toBe("stdio");
    expect(readFileSync(join(dir, SKILL_DIR, "SKILL.md"), "utf8")).toBe(readFileSync(join(skillSource(), "SKILL.md"), "utf8"));
    expect(plan.actions.some((a) => a.kind === "note" && a.detail.includes("codex mcp add volito"))).toBe(true);
    expect(existsSync(join(dir, ".codex"))).toBe(false);
    // A second run changes nothing.
    expect(planInit(dir, { agents: ["claude", "cursor", "vscode"] }, none).actions.filter((a) => a.kind === "write" || a.kind === "copy")).toEqual([]);
  });
});
