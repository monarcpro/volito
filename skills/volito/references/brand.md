# Brand: DESIGN.md

Every item takes `--style <name>` (a built-in) or `--style path/to/DESIGN.md` (anyone's brand). A
DESIGN.md is the one place a brand is written down; every graphic re-skins from it.

## The format

Front matter with tokens, then prose. Volito also reads Google's design.md tokens, CSS custom properties
and plain prose that names hex colours and fonts, but this front matter is the precise form:

```markdown
---
name: acme
title: Acme
description: Warm paper ground, ink type, one orange signal colour
mode: light
colors: { accent: "#FF5A1F", accent2: "#FFD23F", ink: "#14110F", paper: "#FBF7F0", surface: "#FFFFFF" }
fonts: { display: "Fraunces:900", text: "Inter:600", mono: "Space Mono:700" }
case: sentence
motion: snappy
surface: flat
texture: none
radius: 16
rules: ["Orange marks the one thing that matters in a frame.", "Numbers are set in the display face."]
---

# Acme

Prose about the brand: what it feels like, where each colour goes, what to avoid.
```

| Field | Values |
|---|---|
| mode | `dark` (ink is the ground) or `light` (paper is the ground) |
| colors | accent, accent2, ink (darkest), paper (lightest), surface (cards) |
| fonts | display, text, mono (optional accent) as `"Family:weight"`; `volito api` lists the bundled faces |
| case | `sentence`, `upper`, `title` |
| motion | `snappy`, `punchy`, `bouncy`, `smooth`, `calm` (the default spring feel) |
| surface | `soft`, `flat`, `glass`, `bold`, `sketch`, `paper`, `clay`, `pixel` |
| texture | `none`, `grid`, `glow`, `grain`, `paper`, `board`, `parchment`, `pixel`, `studio`, or any pattern: halftone, dither, bauhaus, mesh, dots, waves… |
| radius | card corner radius in px at 1080 |
| rules | up to 16 short do/don't lines |

## Building one from a website or brand guide

1. Collect the real values: colours from the site's CSS variables or the brand guide, faces from
   `@font-face` or the guide, the logo. Write down where each came from.
2. Map roles honestly: the colour the brand uses for buttons or links is usually `accent`; its darkest
   text colour is `ink`; its page background is `paper`. Do not invent a colour the brand does not use.
3. Faces: use the bundled face that matches. If the brand's face is not bundled, pick the closest one by
   class (geometric sans, grotesque, humanist, serif, mono) and say so in the prose.
4. Pick `mode` from where the brand lives (most product sites are light; most creator channels are dark).
5. Write two or three `rules` from what the brand actually does, then render one item at 16:9 and 9:16
   and look at it before using the style everywhere.

## Overrides without a file

`--accent "#hex" --accent2 "#hex" --ink "#hex" --paper "#hex" --mode dark --display "Syne:800"` adjust a
style for one render. If you find yourself repeating overrides, write a DESIGN.md.
