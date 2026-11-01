# Art direction

Read this before choosing an item, a style or a mood for someone. The goal is a graphic that looks
designed for their video, not a template with their name typed in.

## Start from the job, not the catalogue

Ask (or infer from the request) three things before `volito list`:

1. **Where it plays.** Over footage (an `overlay` item: lower thirds, callouts, tickers) or on its own
   (a `full` item: title cards, stats, end cards). Overlays need to read on busy footage; full items own
   the frame and can be bolder.
2. **Where it ends up.** An editor timeline (ProRes 4444 with alpha), a social feed (9:16 MP4), a web page
   (WebM or the player). This fixes aspect and format before any design choice.
3. **What it must say.** The exact words. Count them: a lower third holds a name and a role, not a
   sentence. If the words do not fit an item's `maxLength`, pick another item or split the message.

## One graphic, one idea

- One accent. `$.c.accent` marks the single thing that matters in a frame (the number, the name, the
  button). A second accent (`accent2`) is a marker or underline, never a second hero.
- One entrance gesture per part. Five parts each doing something clever reads as noise; let the plate
  carry the motion and the text follow it.
- Hold long enough to read: about 0.3 s per word on screen, never under 1.5 s for anything with text.

## Match the video's register

| The video is… | Styles that fit | Mood | Avoid |
|---|---|---|---|
| Talking head, interview, podcast | ember, cream, studio, mono | elegant, minimal | slams, glitch, confetti |
| Tutorial, explainer, product demo | studio, swiss, blueprint, mint | minimal, kinetic | heavy textures behind text |
| Creator, social, Reels/Shorts | cobalt, tomato, candy, pop, lime | energetic, playful | small type, long holds |
| News, sport, live | sport, mono, ember | punchy defaults, kinetic | soft pastel styles |
| Luxury, fashion, film | luxe, editorial, forest | cinematic, elegant | bouncy springs |
| Gaming, tech, retro | terminal, scifi, vapor, pixel, retro | glitchy, retro | serif editorial faces |

When the person has a brand, never pick a built-in style over it: write or reuse their DESIGN.md
(see `brand.md`). A built-in style is a starting point for people without one.

## Explore, then commit

Show options before rendering video. Two or three takes are enough:

```bash
volito sheet lower-third --prop name="Priya Sharma" --prop role="Product designer" --style ember --mood elegant --seed 3 --out a.png
volito sheet lower-third --prop name="Priya Sharma" --prop role="Product designer" --style ember --mood elegant --seed 11 --out b.png
volito sheet lower-third --prop name="Priya Sharma" --prop role="Product designer" --style cream --out c.png
```

Look at every sheet yourself before showing it (`self-review.md`). Say what differs between the takes in
one line each, recommend one, and render only the chosen one.

## Restraint checklist

- Is there exactly one thing the eye goes to first in each frame?
- Does the motion explain something (what arrives, what matters), or is it decoration?
- Would the graphic still work with the sound off and the video at half size on a phone?
- Is anything moving that does not need to? Idles (`idle: float`) are for long holds, not every part.
