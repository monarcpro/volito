# Motion craft

How to set and change motion so a graphic feels intentional. `volito moves` lists every value; this is
about choosing among them.

## Timing

- **Enter fast, leave faster.** Entrances finish in the first 0.6–0.8 s; exits take 0.3–0.45 s. Nobody
  waits for a graphic to arrive.
- **Stagger, don't synchronise.** Parts that land together look like one blob. 60–150 ms between related
  parts (plate, then name, then role) reads as a sequence; more than 250 ms reads as separate events.
- **Lead with the container.** Cards, plates and spines arrive first; text lands on them. Text that arrives
  before its plate floats in mid-air.
- **Never a dead freeze.** A hold over ~3 s gets a quiet idle on one part (`--motion plate.idle=breathe`)
  or nothing at all on overlays; a full-frame graphic can drift its ground (patterns move by default).

## Choosing moves

| Want | Moves | Ease |
|---|---|---|
| Calm, editorial | rise, fade, blur, unfold, wipe | out, smooth, calm |
| Confident, product | slide, wipe, grow, push, iris | snappy, expo |
| Playful, social | pop, bounce, squash, elastic, swing | bouncy, back, spring(4, 0.5) |
| Loud, sport, news | slam, smear, stamp-like slam, shutter | punchy, steps(4) for hard cuts |
| Glitch, tech | glitch, scramble, flicker, skew, typewriter | linear, steps(n) |

- Text by unit: `--motion title.split=words --motion title.stagger=0.06`. Letters only for short words
  (logos, one-word titles); a sentence split into letters takes too long to read.
- Direction means something: things that are new come from the right or below; things that are leaving go
  the way they came (`out` plays the move backwards) unless the story says otherwise.
- `blur: true` adds motion blur to fast moves (slides, smears, whips); leave it off slow ones.

## Moods and seeds

`--mood <m> --seed <n>` choreographs every part at once: the mood picks the move pool and pacing, the
seed picks one take from it. Use them to explore, then pin what you like:

```bash
volito sheet title-card --prop title="Depth over reach" --mood cinematic --seed 4 --out take4.png
# like take 4 but want the title to type on:
volito render title-card --prop title="Depth over reach" --mood cinematic --seed 4 --motion title.in=typewriter --out title.mov
```

Your own `--motion` settings always win over the mood.

## Emphasis and beats

- `--motion number.emphasis=pulse@1.6` hits a part at 1.6 s; `@beatName` hits it on a named beat; with a
  transcript, `@word` hits it on a spoken word.
- One emphasis per graphic is usually right. Pulse the number when it is said, not every second.
- `--beat in=0.4 --beat out=-0.6` moves the whole entrance and exit without touching the moves.

## Speed

`--speed 1.25` tightens a graphic that feels slow without changing its character; below 0.8 most
graphics start to drag. Match speed to the edit: fast-cut social video wants 1.2–1.5, interviews 0.9–1.
