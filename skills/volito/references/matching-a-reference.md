# Matching a reference

When someone shows a graphic they like (a screenshot, a clip, a link) and asks for "this, but ours".

## Read the reference in four layers

1. **Layout.** Where it sits (lower left, centre, full frame), what shapes hold the text (plate, pill,
   bar, none), how much of the frame it takes.
2. **Type.** Case, weight, the face's class (geometric sans, grotesque, serif, mono), size jump between
   levels.
3. **Colour.** Ground, text, the one accent; whether it is flat, glassy, textured.
4. **Motion.** What arrives first, the entrance gesture (wipe, slide, pop, type-on), the ease (snappy,
   springy, smooth), how long it holds, how it leaves.

Write those down in four short lines before touching Volito.

## Map it

- **Layout → item.** `volito list --search "<what it is>"`; pick the item whose structure matches, not
  the one whose colours do. Colours are the easy part.
- **Type and colour → style.** The person's DESIGN.md if they have one (their brand wins over the
  reference's palette); otherwise the closest built-in style plus `--accent`, `--display` overrides.
- **Motion → parts.** `volito info <item>` lists its parts; set each part's move and ease to match:
  `--motion plate.in=wipe --motion plate.from=left --motion name.in=rise --motion "*.ease=snappy"`.

## Compare side by side

Render a sheet and put it next to the reference. Name the differences that matter (layout, order,
gesture) and fix those; ignore differences that are only the brand's.

## When no item matches

Write one (`writing-items.md`): `volito new my-item`, then build the reference's layout with the motion
kit so every part still takes moves, moods and the brand.

## Respect the source

Match the idea, not the artwork. Do not copy another brand's logo, characters or exact illustrations into
someone's graphic.
