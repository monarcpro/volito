# Delivery

Pick the format from where the file goes, render once, and tell the person exactly what they got.

| Goes to | Format | Command |
|---|---|---|
| Premiere Pro, DaVinci Resolve, Final Cut, After Effects | ProRes 4444 with alpha (.mov), the default | `--out name.mov` |
| Apple apps, small files with alpha | HEVC with alpha | `--format hevc --out name.mov` |
| The web, CapCut, OBS | WebM with alpha | `--format webm --out name.webm` |
| Upload as is (social, chat) | MP4, no alpha: give it a ground | `--format mp4 --bg "#000000" --out name.mp4` |
| Docs, READMEs, chat previews | GIF | `--format gif --out name.gif` |
| Compositing by frame | PNG sequence | `--format png --out frames/` |

- **Alpha** only survives in ProRes 4444, HEVC with alpha, WebM and PNG. MP4 and GIF are flat.
- **Sound.** `--sound` muxes Volito's own track into MOV (PCM), MP4 (AAC) and WebM (Opus). For an editor,
  `--sound-out name.wav` writes the track beside the video so it can sit on its own audio lane.
- **Sizes.** Width defaults to the frame (1920 for 16:9, 1080 for 9:16). `--width 3840` for 4K; ProRes
  files are large by design, so prefer HEVC or WebM when size matters and alpha is needed.
- **FFmpeg.** Video formats need FFmpeg (`volito doctor` says which formats this machine can write).
  Stills, sheets and PNG frames do not.

## Many versions

Render from data rather than by hand:

```bash
# one lower third per row of a CSV: name,role
tail -n +2 speakers.csv | while IFS=, read -r name role; do
  volito render lower-third --prop name="$name" --prop role="$role" --style ./DESIGN.md \
    --out "renders/$(echo "$name" | tr ' ' '-' | tr 'A-Z' 'a-z').mov"
done
```

Or from Node with `renderVideo(item, options)` in a loop. Keep the style and timing fixed and vary only
the props, so the set looks like one family.

## Hand-off message

Name the file, its format and length, its aspect, whether it has alpha and sound, and anything you
changed from what was asked ("shortened the role to fit").
