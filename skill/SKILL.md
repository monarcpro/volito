---
name: volito
description: Make motion graphics for videos — lower thirds, title cards, kinetic headlines, subscribe/follow calls to action, social handles, callouts, stats, bar charts, step lists, quotes, news banners, end screens, logo stings, brand wipes — in the creator's brand and aspect, and render them to ProRes 4444 / HEVC with alpha, WebM, MP4, GIF or PNG frames with Volito (npx volito), by MONARC STUDIOS. Use when someone asks for an animated overlay, a graphic for their video, a title or name plate, animated text, or a render of one; also to write a new motion graphic as code.
---

# Volito

Motion graphics as code: each graphic is a small `frame(t, $)` program that draws one SVG frame. Packs of
ready-made items take props (the words), a brand style (colours, faces, motion feel) and an aspect, and
render with alpha so the result drops straight onto footage in any editor.

Everything below runs through the CLI (`npx -y volito …`, or just `volito …` once installed). If the
`volito` MCP server is connected, its tools do the same: `motion_list`, `motion_info`,
`motion_preview`, `motion_check`, `motion_render`, `motion_moves`, `motion_api` — each takes `motion`, `mood`,
`seed` and `speed`.

## The loop

1. **Find the item.** `volito list` (or `volito list --search "name plate"`). 96 items in ten packs:
   `essentials/…`, `broadcast/…` (lower thirds, ticker, live badge, score bug, location, countdown),
   `social/…` (follow card, notifications, comments, chat, post, now playing, rating), `data/…` (line,
   donut, bar race, goals, versus, timeline, funnel, world map, flight route) and `3d/…` (3D logo, title,
   number, card flip, word cube, 3D bars, globe), `transitions/…` (iris, blinds, doors, glitch, ink, clock,
   tiles, pixels, stripes, slices, whip — cut your clips at the midpoint), `annotate/…` (arrow, circle,
   spotlight, focus, highlight, stamp, reactions, pointer, emphasis, numbered markers — places in % of the
   frame), `type/…` (typewriter, word swap, split-flap, marquee, echo, liquid fill, decode, word by word,
   key phrase, editorial stack), `backdrops/…` (any pattern, aurora, Bauhaus field, synthwave grid, lava
   blobs, colour sweep, starfield, bokeh, topographic) and `promo/…` (sale badge, price card, coupon, offer
   countdown, feature list, call to action, launch, tape ribbons).
2. **Read its props.** `volito info lower-third` — every prop's type, default and length limit.
3. **Fill it in.** Repeat `--prop name=value`. Lists take `"a; b; c"`; chart rows take `"Label: 42; Other: 17"`.
4. **Pick the look.** `--style <name>` (`volito styles` lists all 36: the editor's ember, cream, mono, neon, pop,
   studio and eight explainer art styles, plus colour fields and modern looks — cobalt, tomato, acid, candy,
   riso, aurora, sunset, lime, sport, retro, diner, blueprint, forest, luxe, capsule, memphis, swiss, terminal,
   vapor, scifi, mint, editorial — each with an animated pattern ground), or `--style path/to/DESIGN.md` for
   the creator's own brand (its `texture:` can name a pattern: halftone, dither, bauhaus, mesh, …).
   Fine-tune with `--accent "#hex" --display "Poppins:800"`.
5. **Pick the frame.** `--aspect 16:9 | 9:16 | 1:1 | 4:5` (or `WIDTHxHEIGHT`) and `--duration <s>`.
6. **Choreograph it.** Motion is open-ended: `volito info <item>` lists its parts, and any part takes any
   move — `--motion name.in=typewriter --motion plate.in=iris --motion "*.ease=bouncy" --motion role.emphasis=pulse@2`.
   `volito moves` lists every move, ease, idle loop, hit and mood. For fresh ideas, `--mood playful --seed 7`
   (any number is a new take; try several and show the user the sheets), `--speed` to retime it.
7. **Look before rendering.** `volito sheet <item> … --out sheet.png`, then **open the PNG and look at it**:
   does the text fit, read on footage, land in time? `volito check <item> …` reports text off the frame.
8. **Render.** `volito render <item> … --out name.mov` (ProRes 4444 with alpha — the default for editors).
   `.webm` for the web, `.mp4` for a flat file (add `--bg "#000000"`), `--format hevc` for small alpha
   files on Apple, `--format png --out frames/` for a frame sequence. Tell the user the file path.

```bash
npx -y volito render lower-third --prop name="Priya Sharma" --prop role="Product designer" --style ember --aspect 16:9 --out priya.mov
```

## Voice sync

Give a transcript and items land their text on the spoken words: `--words transcript.json` (`[{w, s, e}]`
or Whisper JSON; `--offset 12.5` when the graphic starts 12.5 s into it). Without one, `--beat in=0.4`
and `--beat out=-0.6` move the entrance and exit.

## When no item fits: write one

`volito api` prints the whole runtime (timing, springs, text, cards, charts, icons, brand colours and faces)
and the libraries: layout helpers, `scene3d` for real 3D (extruded text, cards, boxes, spheres, a camera
and light) and `worldMap` / `worldGlobe` for maps.
Write `function frame(t, $) { … return svg; }` in a `.js` file and use it anywhere an item goes:
`volito check my.js`, `volito sheet my.js`, `volito render my.js --duration 4 --out my.mov`. Draw elements through the
motion kit (`const M = motion($, t); M.part("card", { at, in: "pop", box }, markup)`, `M.text(...)`) and
they take every move, mood and seed too. For a reusable item
with props, `volito new my-item` scaffolds `item.json` + `frame.js`; `volito guide` explains the format.

Rules that keep a program renderable: a pure function of `t` (no `Date`, `Math.random`, timers, network,
DOM); size everything by `$.k`; colours from `$.c` (bg, fg, accent, accent2, surface, mute) and faces from
`$.font(role)` so a DESIGN.md re-skins it; escape text you put in raw markup with `$.esc()`.

## Good to know

- Overlays render transparent; `full` items draw their own ground. MP4 has no alpha.
- Hindi (Devanagari), Cyrillic, Greek, Vietnamese and Latin-extended text are supported.
- Video needs ffmpeg on PATH (or `VOLITO_FFMPEG`); stills, sheets and PNG frames do not.
- Packs are free to use in any video; they may not be resold as templates.
