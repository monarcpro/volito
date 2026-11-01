# Changelog

## Unreleased

- `volito init` sets a project up for coding agents in one step: it adds the Volito MCP server to
  Claude Code's `.mcp.json`, Cursor's `.cursor/mcp.json` and VS Code's `.vscode/mcp.json` (merged,
  never replacing another server; `--force` replaces an existing volito entry), puts the Volito skill
  in `.claude/skills/volito`, and prints the `codex mcp add` line for Codex, whose config is global.
  It picks the agents a project already uses (`--agent` chooses), and `--dry-run` shows the changes.
- `volito doctor` says what is ready: Node, FFmpeg, the encoders behind each format, HEVC with alpha,
  the bundled fonts, and each agent's MCP config and skill, with the fix for anything missing.
- The agent skill moved to `skills/volito/SKILL.md`, where `npx skills add monarcpro/volito` finds it;
  the item template for `volito new` moved to `templates/item`. It gained nine craft references (art
  direction, motion craft, brand, type and layout, voice and timing, self-review, matching a reference,
  writing items, delivery) that an agent loads only when a task needs them.
- Graphic specs: one JSON document for one graphic (`{ "volito": 1, "item": …, "props": …, "style": …,
  "aspect": …, "motion": …, "sound": … }`). Every command takes a spec file in place of an item, with
  command-line options on top. `volito spec <item> [options]` writes one, `volito validate` checks it
  against its item (shape, props, parts, files, aspect, length; unknown fields get a "did you mean"),
  and `volito schema` prints its JSON Schema. The MCP tools take `spec`, and `motion_validate` checks one.
  Node: `parseSpec`, `validateSpec`, `loadSpecFile`, `specToOptions`, `specJsonSchema`.
- `volito review` measures a graphic before anyone renders it: the check at each aspect, when it settles,
  how long it holds still and when it leaves (read from the frames themselves, so it works for any
  program), a warning when the entrance is slow or the hold too short for its words, how much of an
  overlay sits under Instagram Reels', YouTube Shorts' and TikTok's interface at 9:16, and a contact sheet
  per aspect written beside a review.md. The MCP tool `motion_review` returns the sheets as images.
- Interactive states in `<volito-player>`: a graphic's timeline cut into named stretches (enter, idle,
  hover, press, loading, done…), each played once (then held, or handed on to `next`), looped or held,
  with times as seconds or the item's beat names. The `on` attribute maps page events to states
  (`"pointerenter(idle): hover; pointerleave(hover): idle; click: press"`, with optional guards), code sets
  `player.state`, and a `statechange` event reports every change. Items can declare `states` and `on` in
  item.json so they work with no setup; readers who prefer reduced motion see each state's resting frame.
- A new pack, MONARC UI (`ui`): a button that breathes, lifts on hover, presses, spins while it loads and
  lands on a check; a toggle; a like with a rolling count; a loader that succeeds or fails; and a
  notification bell. Each declares its states, plays live in a page and renders to video like any item.
- A new pack, MONARC Effects (`effects`): film grain that re-rolls every film frame, a light leak, a frosted
  glass card over drifting colour, a chromatic split title, a liquid warp title and a neon sign. All are
  SVG filters (turbulence, displacement, blur, colour matrices), so the live player and a render match
  with no GPU.
- `.volito` bundles: `volito bundle spec.json` packs a spec with every file it uses (a DESIGN.md, a
  program, a transcript, images) into one file; every command and MCP tool takes a bundle where it takes a
  spec, and renders it byte for byte the same anywhere.

## 0.2.0 — 2026-10-26

Sound, a web component, and a much faster browser player.

- Sound: every render can carry a stereo track Volito synthesises itself, with no samples. `--sound`
  reads the graphic's motion and gives each move its sound (a spring pops, a move across the frame
  whooshes, letters tick, a slam hits, a glitch zaps); `--bed Dm` lays a pad in a key that ducks under
  hits; `--sound-level` sets the level; `--sound-out file.wav` also writes the track alone for an
  editor's timeline. A program can design its own cues with `function sound($)` beside `frame`
  (17 kinds: whoosh, hit, stamp, pop, tick, click, riser, fall, sub, shimmer, ding, swell, zap, type,
  scratch, tone, chord). ProRes `.mov` carries PCM, MP4 and HEVC carry AAC, WebM Opus or Vorbis; PNG
  and GIF none. New: `volito sound <item>` (the track alone, with its cue list), `renderSoundFile()`
  and the `motion_sound` MCP tool; `renderVideo`, `volito render` and `motion_render` take the sound
  options. Every one of the 96 items has a track; transitions, the wipe, word by word, reactions,
  emphasis and the gradient backdrop got cues of their own. Renders without sound are byte-identical
  to 0.1.x. Example: `examples/volito-intro` (32 cues).
- `<volito-player>`, a web component for any page: `import "volito/player"`, or one
  `<script type="module">` from a CDN (`dist/player.js`, self-contained). Aspect tabs, controls,
  autoplay, loop, playback rate, a play range, posters, events (`ready`, `play`, `pause`, `ended`,
  `timeupdate`, `aspectchange`, `warnings`, `error`), keyboard control and CSS theming. It loads
  near the screen, pauses off screen, and respects reduced motion. Example: `examples/player.html`.
- The browser player embeds only the font faces each frame draws with (matched as CSS matching
  would, in latin plus the scripts its text needs) instead of every face of every family, and
  fetches each font file once for the worker, the frames and 3D glyphs. Across all 96 items: font
  downloads before the first frame 30 files / 1.7 MB → 4 files / 209 KB, each frame's SVG 2.3 MB →
  118 KB, and 18.4 → 3.3 ms per frame, with every frame pixel-identical (`bench/`).
- The MCP server can be listed in the official MCP Registry as `io.github.monarcpro/volito`:
  `package.json` carries `mcpName`, and `server.json` at the repo root describes the server
  (`npx -y volito mcp` over stdio).

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
