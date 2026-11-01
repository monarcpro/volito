# Voice and timing

A graphic that lands on the word that says it feels edited by a person; one that lands at a fixed
second feels pasted on.

## With a transcript

`--words transcript.json` takes `[{ "w": "word", "s": 1.20, "e": 1.48 }, …]` or Whisper's JSON. Items land
their text 0.04–0.12 s before the spoken word. When the graphic starts partway into the transcript, give
`--offset 12.5` (seconds into the transcript where the graphic's time 0 is).

```bash
volito render stat --prop value=3.2 --prop suffix=× --prop label="more reach in 90 days" \
  --words talk.json --offset 41.2 --out stat.mov
```

Emphasis can hit a spoken word: `--motion number.emphasis=pulse@reach` pulses the number when "reach" is
said.

## Without one

Use beats. Every pack item reads `in` (when the entrance starts) and `out` (when the exit starts):
`--beat in=0.4 --beat out=-0.6` (negative counts from the end). Some items name more beats;
`volito info <item>` lists them.

## Placing it in an edit

- Start a lower third 0.3–0.5 s after the person starts speaking, not on the cut.
- Hold it for at least 3 s and through a full sentence; take it out before the next cut, not on it.
- Title cards and stats sit on the beat of the music or the start of the sentence that introduces them.
- Give the editor the in and out you designed for: render the exact duration (`--duration`) so the clip's
  head and tail are the graphic's own.

## Music

When the video has music, line the biggest landing up with a downbeat. Volito does not detect beats
itself; take the time from the editor (or a beat detector) and pass it as a beat or an emphasis time.
