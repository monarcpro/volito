// MCP smoke test: start `monarc-motion mcp` over stdio, list tools, call each one the way an agent would.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const cwd = process.argv[2];
const transport = new StdioClientTransport({ command: process.execPath, args: [join(import.meta.dirname, "../dist/cli.js"), "mcp"], cwd });
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);
const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));
const call = async (name, args) => {
  const t0 = performance.now();
  const r = await client.callTool({ name, arguments: args });
  const parts = r.content.map((c) => (c.type === "text" ? c.text.split("\n")[0].slice(0, 120) : `[${c.type} ${c.mimeType} ${Math.round(c.data.length * 0.75 / 1024)} KB]`));
  console.log(`${name}${r.isError ? " ERROR" : ""} (${Math.round(performance.now() - t0)} ms): ${parts.join(" | ")}`);
  return r;
};
await call("motion_list", { search: "name" });
await call("motion_info", { item: "stat" });
await call("motion_styles", {});
const prev = await call("motion_preview", { item: "lower-third", props: { name: "Ada Lovelace", role: "First programmer" }, style: "studio", aspect: "9:16" });
const img = prev.content.find((c) => c.type === "image");
if (img) writeFileSync(join(cwd, "preview.png"), Buffer.from(img.data, "base64"));
await call("motion_check", { code: "function frame(t, $) { return $.text('WAY TOO LONG A HEADLINE FOR THIS FRAME', { x: 20, y: 400, size: 200 }); }", aspect: "9:16" });
await call("motion_check", { code: "function frame(t, $) { return '<g>' + nope; }" });
await call("motion_render", { item: "headline", props: { text: "Agents can *render* now" }, format: "mov", duration: 2.5 });
await call("motion_render", { code: "function frame(t, $) { const k = $.k; return $.g($.enter(t, 0.2, { dy: 60 * k, ox: $.W / 2, oy: $.H / 2 }), $.card($.W / 2 - 300 * k, $.H / 2 - 120 * k, 600 * k, 240 * k), $.text('Hello from code', { ...$.font('display'), size: 64 * k, x: $.W / 2, y: $.H / 2 - 36 * k, anchor: 'middle' })); }", placement: "overlay", duration: 2, format: "png", out: "custom-frames" });
await call("motion_render", { item: "nope-not-real" });
await call("motion_api", {});
await client.close();
