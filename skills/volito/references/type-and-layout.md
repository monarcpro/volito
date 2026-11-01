# Type and layout

## Fitting words

- Every text prop has a `maxLength` (`volito info <item>`). It is the most the design holds at its
  largest size; fewer words always look better. Shorten copy before shrinking type.
- Long names: use the person's preferred short form ("Dr. Priya Sharma" → "Priya Sharma"), move titles
  to the role line.
- Line breaks: `longtext` props keep `\n`; plain `text` props wrap on their own. Break lines at phrase
  boundaries, never between an adjective and its noun.
- Numbers: give the number as a number prop (`--prop value=3.2 --prop suffix=×`) so it can count up.

## Every aspect from one item

Items lay out from the frame, so 16:9, 9:16, 1:1 and 4:5 come from the same props. Still check each
aspect you will deliver: a role line that fits at 16:9 may wrap at 9:16.

```bash
volito check lower-third --prop name="Priya Sharma" --prop role="Head of product design, EMEA"
```

`check` renders every aspect and reports text off the frame or running past its box.

## Safe zones

- 16:9: keep text 5% in from the left and right edges.
- 9:16 for Reels, Shorts and TikTok: keep the top ~13% and the bottom ~22% clear of text (platform UI:
  captions, usernames, the like and share column on the right). Volito's items already lay out inside
  this; your own programs should use `safeArea($)`.
- Lower thirds sit low in the frame, where captions also go. If the video has burned-in captions, check a
  still over a captioned frame; when they collide, move the captions up in the edit or use an item that
  sits elsewhere (callout, location pin, social handle).

## Contrast on footage

- Overlays render transparent. Text sitting straight on footage needs either a plate (most lower thirds
  have a `look` or plate option) or a scrim. Light text on bright footage is the most common failure.
- Check the sheet over something like the real footage, not over black: render a still with
  `--bg "#808080"` or over a frame of the video when you have one.

## Hierarchy

One size jump between levels (name vs role, title vs kicker) of at least 1.6×. Two weights, not three.
Mono for labels and numbers that should line up; the display face for the one thing that matters.
