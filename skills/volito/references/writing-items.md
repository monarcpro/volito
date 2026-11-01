# Writing your own items

When no item fits. `volito api` prints the whole runtime and `volito guide` the item format; this is the
craft on top.

## Start right

```bash
volito new launch-badge --dir ./motion     # item.json + frame.js from the template
volito sheet ./motion/launch-badge          # look at it
volito check ./motion/launch-badge          # every aspect, errors and warnings
```

## Rules that keep it renderable everywhere

- `frame(t, $)` is a pure function of `t`: no `Date`, `Math.random`, timers, network or DOM. When you need
  variety (scattered dots, jitter), derive it from a fixed number such as the element's index; the same
  `t` must always draw the same frame.
- Size everything by `$.k` (= min(W, H) / 1080) and lay out from `$.W` and `$.H`, so one design fits every
  aspect. Use `safeArea($)` for text.
- Colours only from `$.c` (bg, fg, accent, accent2, surface, mute) and faces only from
  `$.font("display" | "text" | "mono")`, so any DESIGN.md re-skins it.
- Escape text you put into raw markup with `$.esc()`; `$.text` and friends escape for you.

## Make it a good item, not just a working one

- **Parts.** Draw every element through the motion kit (`const M = motion($, t)`) as a named part with a
  `box`, and list the parts in `item.json`. Then creators (and agents) can change any part's move, and
  moods have more moves to choose from. Grounds and scrims take `vary: false`.
- **Props.** Every word a creator would change is a prop with a default and a `maxLength` the design
  holds. Numbers are `number` props so they can count.
- **Beats.** Read `$.beat("in", …)` and `$.beat("out", …)` so the entrance and exit can be moved; land text
  on spoken words when `$.words` is given.
- **Fit.** Measure text (`$.measure`, `fitFont`, `fitLines`) and shrink to the box it owns.
- **Sound.** A `function sound($)` beside `frame` designs its cues off the same beats as the picture; with
  none, Volito reads the motion.

## Test like a pack item

- `volito check` passes at 16:9, 9:16, 1:1 and 4:5 with the defaults and with the longest allowed text.
- The sheet reads at every aspect you list in `aspects`.
- It renders identically twice (determinism).
- Frames that do not change are drawn once, so a long hold costs almost nothing; keep idles off parts
  that do not need them.
