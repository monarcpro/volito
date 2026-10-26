/** How motion works — for creators setting it and for code using the kit. */
export const MOTION_GUIDE = `Motion: any part, any move

Every graphic is made of named parts (volito info <item> lists them). Each part enters, may idle
while it holds, may take emphasis hits, and leaves — and every one of those is yours to change:

  in / out      any move (volito moves): rise, slam, wipe, iris, glitch, scramble, typewriter,
                spin, swing, stretch, smear, blur, flip, bounce … An exit plays the move backwards.
  ease          brand, out, inOut, expo, back, elastic, bounce, snappy, punchy, bouncy, calm, wobbly,
                spring(freq, damping), steps(n), cubic(x1,y1,x2,y2)
  from          the side a move comes from (left, right, up, down, up-left …); outFrom for the exit
  dur, delay    seconds; at / outAt replace the item's own times (outAt negative = from the end)
  distance      how far it travels (px at 1080) · intensity 0–2 scales distance, size and rotation
  blur          true: motion blur on the way in and out · origin: the pivot (center, top-left, bottom …)
  idle          a loop while it holds: float, bob, pulse, breathe, wiggle, sway, drift, jitter, spin, heartbeat, shimmer
  emphasis      hits: "pulse@1.2, shake@now, jump@beatName" (a time, a beat, or a spoken word)
  split         text by lines, words or letters · order forward | reverse | center | edges | random · stagger s
  keys          your own keyframes: [{"t":0,"x":-300,"op":0},{"t":0.8,"x":0,"op":1,"ease":"bouncy"}]
                (t in clip seconds, x/y px at 1080, s scale, r degrees, skx, op, blur) — any path you like

Set them per part, or for every part with "*":
  CLI   --motion name.in=typewriter --motion "*.ease=bouncy" --motion plate.out=wipe --motion role.emphasis=pulse@2
  API   { motion: { "*": { ease: "bouncy" }, name: { in: "typewriter" } } }

Or let a mood choreograph it: --mood energetic | elegant | playful | cinematic | glitchy | minimal | retro | kinetic,
and --seed <n> for a new take every number (a seed alone picks a mood too). Your own settings still win.
--speed 2 plays every move twice as fast.

In your own code the same kit is there: const M = motion($, t);
  M.part(name, { at, box: {x,y,w,h}, in, out, … }, ...markup)   a part, posed by its motion
  M.text(name, { ...$.text options, at, in, split, … }, text)    text, whole or by unit
  M.layout(text, textOptions, split) → { units: [{text, x, y, w, h, line, index, box}], box }
  M.progress(name, { at, in, dur, ease }) → { in, out, at, end, outAt }  for things you draw yourself
Give every part a box when you can: wipes, iris, shutter and blinds need it, and moods pick from more moves.`;

/** The libraries and helpers every program can use besides the $ runtime. */
export const LIBRARY_GUIDE = `Libraries: layout, patterns, 3D and maps

Layout (always there)
  safeArea($) → {x, y, w, h, tall, square, wide}: the title-safe box (on 9:16 it clears the platforms' buttons)
  fitFont($, str, role, size, maxW, extra) → a font in the brand's role, shrunk until str fits maxW
  fitLines($, str, font, maxW, maxSize, minSize, maxLines) → {size, lines, font}: the biggest size that sets in ≤ maxLines
  landOn($, str, fallback, after) → when the first spoken word of str starts (0.08 s early), else fallback
  widest($, lines, font) · avatar($, imageProp, cx, cy, r, {name, fill, ring}) · appIcon($, icon, x, y, size, {fill}) · initials(name)

Patterns (always there) — sixteen animated grounds in the brand's colours, pure functions of t:
  $.pattern(t, kind, {box, color, color2, a (strength), scale, speed, angle, at: [x, y], count, seed, r}) → markup
  kinds: dots · plus · graph · hatch · stripes · checker · halftone · dither · waves · rings · mesh · confetti · bauhaus · tiles · pills · sunburst
  A style whose texture names one draws it on every $.panel / $.texture ground. confetti, bauhaus and pills keep to the edges.

Faces: Inter, Space Grotesk, Space Mono, Poppins, Playfair Display, Montserrat, Anton, Outfit, Gabarito, Caveat, Press Start 2P,
  Permanent Marker, Patrick Hand, Fredoka, IM Fell English, Bebas Neue, DM Serif Display, Archivo Black, Syne, Unbounded,
  Righteous, Orbitron, Pacifico, Fraunces, Bricolage Grotesque — name them "Family:weight" (e.g. "Fraunces:900", "Syne:800").

3D — real depth, light and a camera, drawn as SVG paths (no GPU). Call it and the library comes with your program:
  const S = scene3d($, { camera: { fov: 35, distance, yaw, pitch, roll, target: [x, y, z], x, y }, light: { dir: [x, y, z], ambient, spec, shine } });
  Coordinates: x right, y down, z away from you, px at the target's depth (z = 0 draws at 1 px per unit by default).
  Meshes: S.text(str, {face: $.font("display"), size, depth, color, side, back, anchor, ls, each: (i, n, ch) => ({rotate, offset, scale, hide})})
          S.box(w, h, d, {color, side, back, radius}) · S.card(w, h, {depth, radius, color, back}) · S.disc(r, d, {...})
          S.shape(loops | "M… path data", depth, {scale, color, side}) · S.sphere(r, {color}) (smooth) or {colorAt(lat, lon)}
  Place: S.add(mesh, {position, rotate: [x°, y°, z°], scale, parent: {position, rotate, parent}, opacity, flat, decal, twoSided})
          — parent moves text with the card it is printed on; decal draws it over that card's face.
  Also: S.line(points3d, {stroke, width}) · S.at(point3d, (x, y, scale) => markup) flat labels at 3D points · S.project(p) → {x, y, z, s}
        S.measure(str, {face, size}) · S.clip(poly, normal, point)
  Finish with: return S.render();   3D text uses the brand's display face (an item lists others in "faces3d").

Maps (Natural Earth, 177 countries). Call one and the library comes with your program:
  worldFind("India" | "UK" | "USA" | 356) → {name, id, c: [lon, lat], rings}
  const m = worldMap($, { x, y, w, h, center: [lon, lat], zoom });  m.path(country | name) → path data · m.project(lon, lat) → [x, y]
        m.countries · m.outline (the map's edge) · m.clipId() (clip to it) · m.ring(points)
  worldGlobe(S, { r, spin, tilt, colorOf: (country) => colour }) countries on a 3D globe · worldOnSphere(lon, lat, r, spin, tilt) → a 3D point`;

/** Sound design: what a program may return from sound($), and what --sound does to a graphic that returns none. */
export const SOUND_GUIDE = `Sound: every graphic can carry its own

A render with --sound (API: sound: true, MCP: sound) gets a stereo track synthesised by Volito itself — no
samples, no files to find — muxed into the .mp4 / .mov / .webm (PNG frames and GIF carry none; --sound-out
file.wav writes the track alone, for an editor's timeline). Two sources, both deterministic:

  1. The graphic's own motion. Every part's move leaves a mark the sound design reads: a spring pops, a move
     across the frame whooshes (louder the further it travels), a slam hits, letters tick, a typewriter types,
     a glitch zaps, a burst sparkles. Items nobody wrote sound for sound right out of the box.
  2. A program's sound($). Beside frame(t, $) a program may define

       function sound($) {
         return {
           cues: [
             { at: 0.2, kind: "riser", dur: 1.1 },               // seconds into the clip; -1 counts from the end
             { at: $.beat("in", 1.3), kind: "hit", level: 1.1 },  // lands with the motion: use the same times
             { at: 1.5, kind: "shimmer", dur: 1.2, pan: 0.3 },
             { at: 2.0, kind: "ding", note: "A5", level: 0.6 },
           ],
           bed: { key: "D", mode: "minor", from: 0.8, to: -0.4, level: 0.5, tone: 0.4 },  // a pad under it all (true, "Dm", or none)
           auto: false,      // true adds the cues read from the motion on top (the default only when no cues are given)
           level: 1,         // master, 0–2
           room: 0.25,       // the reverb, 0 dry … 1 wet
         };
       }

     It runs once with $ at t = 0, so $.dur, $.beat(name), $.at(word), $.data and $.words are all there — time
     the sound off the same beats the picture uses. Returning just an array of cues is fine too.

Cues: { at, kind, dur, level (0–2, 1 = the kind's own), pitch (semitones), note ("A4", tone/chord/ding), pan (-1…1), seed }
Kinds: whoosh (air past, dur .45) · hit (impact) · stamp (heavy slam) · pop (bubble) · tick (tiny click) · click (UI)
       riser (climbs into a moment, dur 1) · fall (downlifter, dur .8) · sub (low drop) · shimmer (sparkle, dur 1.2)
       ding (bell) · swell (soft air, dur .8) · zap (glitch, dur .28) · type (keys for dur) · scratch (pencil for dur)
       tone (a note for dur) · chord (the bed's chord for dur)
The bed steps back under every hit, stamp, sub and pop and comes back on its own. Keep a graphic's sound honest:
one riser into its biggest moment, a hit or a sub when it lands, ticks for the small things, silence between.

CLI   volito render <item> --sound [--bed Dm] [--sound-level 1.2] [--sound-out track.wav]
      volito sound <item> --out track.wav     the track alone, with its cue list
API   renderVideo(item, { sound: true, bed: "Dm" })  ·  renderSoundFile(item, { out: "track.wav" })`;

/** How Volito items and packs are written — what `volito guide` and the MCP motion_api tool print after the API. */
export const AUTHORING_GUIDE = `Writing Volito graphics

A graphic is a program: plain JavaScript that defines function frame(t, $) and returns the SVG markup of
one frame (no <svg> root). It is a pure function of t — any frame can be drawn alone, in any order — so it
renders the same in MONARC PRO, in a browser and from this CLI.

Props and moments
  An item's props arrive as $.data (const p = $.data; p.name, p.role …). Never hard-code text a creator
  would change: make it a prop with a default and a maxLength the design can hold.
  Named moments come from $.beat(name, fallback). Pack items read "in" (when the entrance starts) and
  "out" (when the exit starts) so a creator can move them: --beat in=0.4 --beat out=-0.6.
  When words are given (a transcript), land each element 0.04–0.12 s before the word that says it:
  $.words.length ? $.atOr(firstWord, fallback) : fallback. Without words, use the beats.

Parts
  Draw each element through the motion kit (const M = motion($, t)) as a named part, with the item's own
  motion as defaults: M.part("plate", { at, in: "wipe", box }, markup), M.text("name", { ...font, at, in: "rise" }, text).
  List the parts in item.json ("parts": { "plate": "the card" }) so creators know what they can move.
  Backgrounds (scrims, panels) pass vary: false so a mood leaves them still.

Shape of a good item
  - Enter in the first ~0.8 s, hold, leave in the last ~0.4 s (or hold to the end when out ≥ duration).
  - Lay out from $.W, $.H and scale every size by $.k (= min(W, H) / 1080): one design fits 16:9, 9:16, 1:1, 4:5.
  - Keep text inside the title-safe area: ~5% of the width at the sides on 16:9; on 9:16 leave ~13% at the
    top and ~22% at the bottom for platform UI (captions, buttons).
  - Size text to fit: measure it ($.measure) and shrink the size until it fits the box it owns; wrap long
    text with maxW. The check reports any line that runs off the frame.
  - Colour comes from the brand: $.c.bg / $.c.fg for ground and text, $.c.accent for the one thing that
    matters, $.c.accent2 for markers, $.c.surface for cards. Faces from $.font("display" | "text" | "mono").
    $.case(str) applies the brand's case. Never invent colours — a creator's DESIGN.md re-skins the item.
  - overlay items draw nothing behind themselves (footage shows through); put a $.scrim under text that sits
    on footage. full items draw their own ground with $.panel(t, { box: { x: 0, y: 0, w: $.W, h: $.H } }).
  - Escape any text you put in raw markup with $.esc(); $.text, $.chip and friends escape for you.

An item on disk
  my-item/item.json   { "id": "my-item", "name": "…", "description": "…", "category": "title",
                        "placement": "overlay" | "full", "duration": { "default": 5, "min": 2, "max": 20 },
                        "aspects": ["16:9", "9:16", "1:1", "4:5"],
                        "props": { "title": { "type": "text", "default": "Hello", "maxLength": 28 } },
                        "beats": { "in": 0.15, "out": -0.45 } }
  my-item/frame.js    function frame(t, $) { const p = $.data; … return svg; }
  Prop types: text, longtext (line breaks kept), number (min, max, step), boolean, choice (options),
  color (#hex, "" = the brand's), list (rows of text, or of {field: "text" | "number"}; maxItems),
  image (a path or URL the caller loads; draw it with $.image(propName, x, y, w, h)), icon (an icon name).

A pack
  my-pack/pack.json   { "format": 1, "id": "my-pack", "name": "…", "version": "1.0.0", "description": "…",
                        "author": "…", "license": "…", "style": "ember", "shared": "shared.js",
                        "items": ["my-item", …] }
  my-pack/shared.js   helpers prepended to every item's code (function declarations only).
  Load extra packs with --packs <dir> or VOLITO_PACKS=<dir>.

The loop
  volito new my-item          a template to start from
  volito check ./my-item      errors and warnings at every aspect
  volito sheet ./my-item      frames across time in one PNG — look at it
  volito render ./my-item --format mov
  Agents: motion_check, then motion_preview, fix what you see, then motion_render.`;
