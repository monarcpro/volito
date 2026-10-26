/**
 * The player's shadow styles. Theme it from outside with these custom properties, or style any
 * piece through ::part() (root, bar, tabs, tab, stage, frame, poster, canvas, status, controls,
 * play, scrub, time).
 *
 *   --volito-accent         scrubber fill and focus rings (#2433e8)
 *   --volito-ink            text and the selected tab (#15140f)
 *   --volito-paper          tab and control surfaces (#ffffff)
 *   --volito-button         the play button (#dfff4f)
 *   --volito-stage          around the frame (#15140f); set transparent for a bare frame
 *   --volito-stage-padding  (clamp(10px, 2.4vw, 24px))
 *   --volito-radius         stage corners (18px)
 *   --volito-max-height     the frame's tallest size (480px)
 *   --volito-font, --volito-mono
 */
export const PLAYER_CSS = `
:host{display:block;position:relative;font-family:var(--volito-font,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--volito-ink,#15140f);-webkit-tap-highlight-color:transparent}
:host([hidden]){display:none}
*{box-sizing:border-box}
button{font:inherit}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:10px}
.bar[hidden],.controls[hidden]{display:none}
.tabs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:4px;border:1.5px solid var(--volito-ink,#15140f);border-radius:999px;background:var(--volito-paper,#fff)}
.tab{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 13px;border:0;border-radius:999px;background:transparent;color:inherit;font-family:var(--volito-mono,ui-monospace,"SF Mono",Menlo,monospace);font-size:13px;font-weight:700;cursor:pointer;opacity:.78}
.tab:hover{opacity:1}
.tab[aria-selected="true"]{background:var(--volito-ink,#15140f);color:var(--volito-paper,#fff);opacity:1}
.shape{display:inline-block;height:12px;border:1.5px solid currentColor;border-radius:2px}
.stage{position:relative;display:flex;justify-content:center;padding:var(--volito-stage-padding,clamp(10px,2.4vw,24px));border-radius:var(--volito-radius,18px);background:var(--volito-stage,#15140f)}
.frame{position:relative;width:min(100%,calc(var(--volito-max-height,480px) * var(--ar,1.7778)));aspect-ratio:var(--ar,1.7778);overflow:hidden;border-radius:8px;outline:none}
.frame[data-ground="footage"]{background:radial-gradient(circle at 28% 22%,rgba(255,255,255,.18),rgba(255,255,255,0) 70%),linear-gradient(135deg,#7a7d84 0%,#4a4d54 55%,#26282d 100%)}
.frame[data-ground="checker"]{background:repeating-conic-gradient(#d9d6cf 0 25%,#f4f1ea 0 50%) 0 0/24px 24px}
.frame[data-ground="none"]{background:transparent}
.frame:focus-visible{box-shadow:0 0 0 3px var(--volito-accent,#2433e8)}
.frame.clickable{cursor:pointer}
.poster,canvas{position:absolute;inset:0;display:block;width:100%;height:100%;transition:opacity .2s}
.poster{object-fit:cover}
.poster:not([src]),.hide{opacity:0}
.status{position:absolute;left:10px;bottom:10px;max-width:calc(100% - 20px);padding:6px 10px;border-radius:8px;background:rgba(21,20,15,.82);color:#fff;font-size:12px;line-height:1.35}
.status:empty{display:none}
.controls{display:flex;align-items:center;gap:12px;margin-top:10px}
.play{display:grid;place-items:center;flex:none;width:40px;height:40px;padding:0;border:1.5px solid var(--volito-ink,#15140f);border-radius:40px;background:var(--volito-button,#dfff4f);color:var(--volito-ink,#15140f);cursor:pointer}
.play:disabled{opacity:.5;cursor:default}
.play:focus-visible,.tab:focus-visible,.scrub:focus-visible{outline:3px solid var(--volito-accent,#2433e8);outline-offset:2px}
.scrub{flex:1;min-width:0;height:24px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer;--p:0%}
.scrub::-webkit-slider-runnable-track{height:6px;border-radius:6px;background:linear-gradient(to right,var(--volito-accent,#2433e8) var(--p),rgba(127,127,127,.35) var(--p))}
.scrub::-moz-range-track{height:6px;border-radius:6px;background:linear-gradient(to right,var(--volito-accent,#2433e8) var(--p),rgba(127,127,127,.35) var(--p))}
.scrub::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;margin-top:-5px;border:2px solid var(--volito-paper,#fff);border-radius:16px;background:var(--volito-ink,#15140f);box-shadow:0 0 0 1.5px var(--volito-ink,#15140f)}
.scrub::-moz-range-thumb{width:12px;height:12px;border:2px solid var(--volito-paper,#fff);border-radius:12px;background:var(--volito-ink,#15140f)}
.scrub:disabled{cursor:default}
.time{flex:none;min-width:100px;text-align:right;font-family:var(--volito-mono,ui-monospace,"SF Mono",Menlo,monospace);font-size:13px;font-variant-numeric:tabular-nums}
@media (max-width:520px){.tab{padding:0 9px}.time{min-width:0;font-size:12px}}
@media (prefers-reduced-motion:reduce){.poster,canvas{transition:none}}
`;

export const PLAY_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.2v11.6a.8.8 0 0 0 1.2.7l9.4-5.8a.8.8 0 0 0 0-1.4L5.2 1.5A.8.8 0 0 0 4 2.2Z" fill="currentColor"/></svg>`;
export const PAUSE_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>`;
