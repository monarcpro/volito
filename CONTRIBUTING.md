# Contributing to Volito

Thanks for helping. Bug reports, new graphics, styles and fixes are all welcome.

## Set up

```bash
pnpm install          # Node 22.18 or newer for development (the package itself runs on Node 20.10+)
pnpm build            # fonts/ from Fontsource, then dist/
pnpm typecheck
pnpm test
```

Video formats need [ffmpeg](https://ffmpeg.org) on your `PATH` (WebM needs one built with libvpx);
stills, sheets and PNG frames do not.

## Look at what you change

Graphics are judged by eye, so check them before you open a pull request:

```bash
node dist/cli.js check lower-third                     # errors and warnings at every aspect
node dist/cli.js sheet lower-third --style cobalt      # frames across time, one PNG
node scripts/review.mjs 9:16 ember pack:essentials     # contact sheets for a whole pack in out/
```

Attach a sheet or a still to the pull request when it changes how something looks.

## Where things live

- `packs/<pack>/<item>/` — one graphic: `item.json` (props, parts, duration, aspects) and `frame.js`
  (`function frame(t, $)`). `volito guide` explains the layout and `volito api` the runtime.
- `src/kit.ts` — the motion kit (moves, eases, idles, hits), `src/three.ts` the 3D kit,
  `src/patterns.ts` the animated patterns, `src/styles-extra.ts` the styles, `src/fonts-extra.ts` the faces.
- `src/engine/` — a copy of the runtime from MONARC PRO's core. Don't edit it here: changes go to MONARC PRO
  first and come over with `pnpm sync-engine` (`src/engine/SOURCE.json` names the commit).

A program is a pure function of `t`: no `Date`, `Math.random` (use `$.hash`), timers, network or DOM. Size
by `$.k`, colour from `$.c` and faces from `$.font(role)`, so every brand style and aspect works.

## Pull requests

- Keep each one to one change, with a sentence on what it fixes or adds and how you checked it.
- `pnpm typecheck` and `pnpm test` pass (CI runs them, plus an install-and-render check).
- New items check clean at 16:9, 9:16, 1:1 and 4:5 in the built-in styles.

## Licence of contributions

Contributions are accepted under the licence of the part they change: MIT for the engine, CLI and tools
([LICENSE](LICENSE)), the MONARC Packs License for anything in `packs/` ([PACKS-LICENSE.md](PACKS-LICENSE.md)).
