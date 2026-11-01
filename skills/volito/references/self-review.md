# Self-review

Never hand over a render you have not looked at. The loop is fast (a still or sheet takes a fraction of a
second), so look every time.

## The loop

1. `volito review <item> …` (MCP: `motion_review`) — the check at each aspect, measured timing (when it
   settles, how long it holds, when it leaves) and 9:16 platform safe zones, with a sheet per aspect. Fix
   every error; read every warning. `volito check` alone is the quicker pass while you iterate on code.
2. `volito sheet <item> … --out sheet.png` — then open the PNG and look at it. With MCP,
   `motion_preview` returns the sheet as an image.
3. Fix what you see, run the sheet again, compare.
4. Render once it passes, then tell the person the file path and what you checked.

## What to look for in a sheet

Go frame by frame, top-left to bottom-right:

- **Text fits.** No line clipped by its plate or the frame; nothing wrapped onto an orphan word.
- **It reads.** Text contrast against its ground; on overlays, imagine bright footage behind it.
- **Order.** The container arrives before the text it holds; the eye goes to one thing first.
- **Landing.** The last entrance frame and the first hold frame look settled, with no overshoot frozen
  mid-bounce.
- **Exit.** The last frames are clean: no half-faded element stuck on screen at the end.
- **Aspect.** If you deliver 9:16, look at a 9:16 sheet. Text that fits 16:9 can collide at 9:16.
- **Brand.** Colours and faces are the brand's; nothing in a default colour that should be the accent.

## Common problems and fixes

| You see | Fix |
|---|---|
| Name runs off the plate | Shorten the copy, or pick an item with a wider plate |
| Text unreadable on footage | Use the item's plate look, or a style with a surface; check over grey |
| Everything lands at once | Delay the later parts (`--motion name.delay=0.1 --motion role.delay=0.2`) or pick a mood with staggered pacing |
| Feels slow | `--speed 1.25`, or `--beat in=0.2` to start sooner |
| Feels busy | Remove idles; switch the mood to minimal or elegant |
| Overshoot looks sloppy | Ease `snappy` or `out` instead of `bouncy`/`elastic` |
| Wrong colours | Pass the person's DESIGN.md; check `mode` (dark vs light) |

## Say what you checked

When you hand over a render, say in a line what you looked at ("checked at 16:9 and 9:16, name fits,
reads on grey"). If something is a judgement call (a long name shrunk to fit), say that too.
