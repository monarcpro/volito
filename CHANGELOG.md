# Changelog

## 0.4.0 — 2026-11-07

- A captions pack, timed to the voice from a transcript (`--words`, Whisper JSON or `[{w, s, e}]`):
  `captions/camera-follow` writes each sentence across a canvas far bigger than the frame while a camera
  follows the words — every word a step bigger with the camera pulling back to keep it the same size, or
  lines of text the camera glides along — with motion blur on its moves and a pull-back to show each
  sentence whole; `captions/karaoke` shows a line or two with the spoken word lit by a sliding pill, the
  accent colour or an underline; `captions/pop` lands a few big words at a time; `captions/subtitles` sets
  clean, balanced two-line subtitles on a box or a shadow; and fifty-three more styles — `marker` (a highlighter
  swipes under each word and stays lit), `neon-tubes` (unlit tubes that flicker on with a glow), `scramble`
  (scrambled characters settle into the word), `slam` (one huge word at a time from alternating sides with
  motion blur), `typed` (letters across the spoken time, a blinking caret), `editorial` (key words far
  bigger in the accent face), `stacked` (lines stacking up, older ones shrinking and fading), `blur-in` (calm
  blur-to-sharp rise), `gradient-fill` (gradient-filled words with an elastic bounce), `wipe-on` (each word wiped on
  behind an accent edge), `rgb-split` (RGB split, jitter and a torn slice as each word lands), `burst` (particle
  bursts on the key words), `boxes` (every word on its own block), `sticker` (die-cut white borders, slapped on
  at a tilt), `focus-pull` (the spoken word sharp, the rest blurred), `wave` (letters rise and ride a wave),
  `outline` (hollow words that fill as they are said), `bubble` (speech bubbles that alternate sides),
  `crawl` (a news crawl with the spoken word at the reading point), `extrude` (retro 3D words),
  `two-tone` (each word split white over accent), `drop` (words fall and bounce onto the line), `punch-in`
  (phrases zoom in out of a blur), `flipboard` (split-flap tiles that flip to each letter), `progress` (a bar
  that fills with the voice), `lyrics` (the sung line big in the middle, the view scrolling), `messages` (a chat
  thread taking turns), `striped` (moving stripes in the brand's accents), `icons` (an icon pops above words
  that have one) and `scribble` (handwritten, key words underlined or circled); 23 social caption looks
  on a shared look engine — line styles (`index-card`, `weight-shift`, `italic-aside`, `tile-step`, `soft-rise`,
  `ember-caps`, `aura-caps`, `tape-bars`, `punch-outline`, `wide-pair`, `signed-line`, `spaced-serif`,
  `night-script`) and lockups built around each phrase's key word (`headline-word`, `flare-word`, `zine-stack`,
  `type-medley`, `tube-light`, `tide-poster`, `block-justify`, `circled-word`, `notebook`, `loop-script`); and ten
  script captions — `pen-write` (a signature script written on as it is said, a glowing nib leading), `cursive-neon`
  (script neon tubes that buzz on, words still to come in dark glass), `groovy-script` (seventies script with
  stacked offset shadows), `script-sandwich` (a huge formal script key word between spaced capitals and fine rules),
  `swash-mark` (the key word in script on a paint swash), `vow-script` (fine lowercase script out of a soft blur over
  a hairline rule), `brush-ribbon` (brush script on a ragged painted ribbon), `script-fill` (outlined script that
  fills as it is said), `doodle-script` (handwriting with scribbled underlines and sparks) and `script-duet` (every
  other word in script) — each in its own colours or, with `palette: brand`, the brand's accents: 67 styles in all. Each takes the
  transcript's own words, or `text`
  timed to it (or paced evenly without one), with *starred* or listed accent words, in the brand's faces.
  The item category list gains `captions`.
- Thirty more items in six packs, and a redesign of the ones that looked thin. Essentials: `chapter`,
  `logo-wall`, `progress-bar`, `before-after`, `agenda`. Data: `heatmap`, `gauge`, `kpi-grid`, `waffle`,
  `leaderboard`. Social: `poll`, `milestone`, `story`, `live-chat`, `joined`. Annotate: `bracket`, `box-label`,
  `cursor`, `measure`, `check`. Type: `slot`, `outline-draw`, `flex`, `shimmer`, `stream`. Backdrops: `halftone`,
  `waves`, `orbits`, `dot-grid`, `paper-cut`. `data/world-map` is now a full choropleth (one colour scale from a
  pale tint to the accent, countries filling west to east, a gradient legend, `subtitle` and `source`, and a ranked
  list under the map on tall frames); `data/timeline` puts each milestone on a card and lights the newest;
  `data/flight` marks the destination from the start and ends on a boarding-pass card; `essentials/end-card`
  draws designed tiles when no pictures are given; `backdrops/starfield` and `backdrops/bokeh` use the accents
  (not ink) on light grounds.
- A pack's `style` is now the default for its items, as `pack.json` always said (items were shown in the
  engine's default, ember, unless a style was passed). Essentials, Data, Social, Annotate, Type and Backdrops
  default to light styles: studio, cream, pastel, candy, pop and memphis. Pass `--style` for any other.
- Two new packs. `carousels/…`: `ring-carousel` (cards round a ring, sized by depth, swinging card to card),
  `orbit-carousel` (cards orbiting a title), `path-carousel` (a conveyor along an S-curve), `text-ring` (words
  set round a circle, a second ring inside turning the other way) and `cover-flow` — each card your picture
  (`image1` … `image8`) or a designed tile in the brand's colours. `cursors/…`: `agent-cursor` (an AI agent's
  cursor whose name tag types each step as it clicks through them), `multiplayer` (several named cursors at once),
  `drag-drop` (a file card carried to a drop zone), `text-select` (an I-beam selection and its toolbar) and
  `context-menu` (a right-click menu, an item chosen). And `3d/exploded-stack` (isometric layers that spread apart
  with labels, light up in turn and close again), `3d/iso-blocks` (an isometric block chart) and `type/tile-flip`
  (a headline that flips tile by tile to a second one).
- The README's pack image shows all 217 graphics in 15 packs.
- Twelve more bundled faces for them (SIL Open Font License, from Fontsource): Instrument Sans, Instrument Serif
  (with italic), Kaushan Script, Parisienne, Michroma, Great Vibes, Dancing Script, Yellowtail, Mr Dafoe,
  Sacramento, Homemade Apple and Allura.

## 0.3.1 — 2026-11-01

- The MCP server's instructions, which an agent reads before its first call, named only five of the
  twelve packs. They now list every pack the server can render with its item count, read from the
  library (so packs added with `--packs` or `VOLITO_PACKS` are named too), and mention `motion_review`,
  Graphic specs and `motion_validate`.
- The README says which MCP tools take `item`, `code` or `spec` (the preview, still, check, review,
  render and sound tools; not every tool), and its pack image shows all 107 graphics in 12 packs.
- The MCP Registry listing (`io.github.monarcpro/volito`) is published by a GitHub Actions workflow
  with GitHub OIDC once a version is on npm.

## 0.3.0 — 2026-11-01

One-step agent setup, Graphic specs, a review before rendering, interactive states, and two new packs.

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
