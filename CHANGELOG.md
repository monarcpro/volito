# Changelog

## 0.1.1 — 2026-10-26

Security patch: two dependency updates and nothing else. Volito's code, graphics and MCP tools are
unchanged from 0.1.0.

- `@modelcontextprotocol/sdk` 1.30.0 → 1.32.2, for GHSA-6qxp-vccf-f47h, GHSA-22jm-h49p-29qw,
  GHSA-6prh-2h8m-c8cw, GHSA-46jr-4wx8-v453 and GHSA-rvq5-wwqv-78pq. `volito mcp` runs over stdio and
  uses none of the OAuth, HTTP transport, bearer auth or tasks code these cover, but installs no
  longer pull in the affected versions.
- `zod` 4.6.2 → 4.6.7, for GHSA-mrhx-c7xc-m3w5.

## 0.1.0 — 2026-10-24

First release as `volito` (it was first published as `@monarcpro/motion` 0.1.0, now deprecated).

- 96 graphics in 10 packs: Essentials, Broadcast, Social, Data, 3D, Transitions, Annotate, Type,
  Backdrops and Promo.
- 36 brand styles, or your own `DESIGN.md`; 16 animated patterns; 16:9, 9:16, 1:1 and 4:5 from one item.
- The motion kit: 38 moves for any part, eases and springs, idles, hits on beats or spoken words,
  keyframes, moods and seeds.
- Real 3D (extruded type, lit meshes, a globe) and world maps, drawn as SVG with no GPU.
- Renders in Node to ProRes 4444 or HEVC with alpha, WebM, MP4, GIF, PNG frames or SVG.
- CLI (`volito`), Node API, browser player (`volito/browser`) and an MCP server (`volito mcp`) for
  Claude Code, Cursor and other agents.
