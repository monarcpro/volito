/** The captions pack: words timed to a transcript, phrases that read, and four items that pass the check everywhere. */
import { describe, expect, it } from "vitest";
import { findItem, library, openSession } from "../src/index.js";
import { checkItem } from "../src/node/check.js";

// "Most videos lose people in the first three seconds. Captions keep them watching, so every word lands right on time."
const WORDS = [
  ["Most", 0, 0.33], ["videos", 0.33, 0.57], ["lose", 0.57, 0.8], ["people", 0.8, 1.14], ["in", 1.14, 1.26], ["the", 1.26, 1.42],
  ["first", 1.42, 1.72], ["three", 1.72, 1.98], ["seconds.", 1.98, 2.62], ["Captions", 3.05, 3.5], ["keep", 3.5, 3.72], ["them", 3.72, 3.9],
  ["watching,", 3.9, 4.45], ["so", 4.6, 4.75], ["every", 4.75, 5.0], ["word", 5.0, 5.22], ["lands", 5.22, 5.49], ["right", 5.49, 5.98],
  ["on", 5.98, 6.01], ["time.", 6.01, 6.56],
].map(([w, s, e]) => ({ w: w as string, s: s as number, e: e as number }));
const ITEMS = ["camera-follow", "karaoke", "pop", "subtitles", "marker", "neon-tubes", "scramble", "slam", "typed", "editorial", "stacked", "blur-in", "gradient-fill", "wipe-on", "rgb-split", "burst", "boxes", "sticker", "focus-pull", "wave", "outline", "bubble", "crawl", "extrude", "two-tone", "drop", "punch-in", "flipboard", "progress", "lyrics", "messages", "striped", "icons", "scribble", "index-card", "weight-shift", "italic-aside", "tile-step", "soft-rise", "ember-caps", "aura-caps", "tape-bars", "punch-outline", "wide-pair", "signed-line", "spaced-serif", "night-script", "headline-word", "flare-word", "zine-stack", "type-medley", "tube-light", "tide-poster", "block-justify", "circled-word", "notebook", "loop-script", "pen-write", "cursive-neon", "groovy-script", "script-sandwich", "swash-mark", "vow-script", "brush-ribbon", "script-fill", "doodle-script", "script-duet"];

/** Run one item's program and hand back its frame at t plus the helpers from its pack. */
async function at(item: string, t: number, props: Record<string, unknown> = {}, aspect: "16:9" | "9:16" = "9:16") {
  const s = await openSession(findItem(`captions/${item}`), { props: { text: "", ...props }, words: WORDS, duration: 7.2, aspect, width: 360 });
  return s.runner.frame(t).svg;
}

describe("captions pack", () => {
  it("ships sixty-seven items in its own category", () => {
    const pack = library().packs.find((p) => p.id === "captions")!;
    expect(pack.entries.map((e) => e.id)).toEqual(ITEMS);
    for (const e of pack.entries) expect(e.category).toBe("captions");
  });

  it("no caption item shares its name with another pack's item, so a bare name finds it", () => {
    const others = new Set(library().packs.filter((p) => p.id !== "captions").flatMap((p) => p.entries.map((e) => e.id)));
    expect(ITEMS.filter((id) => others.has(id))).toEqual([]);
    for (const id of ITEMS) expect(findItem(id).ref).toBe(`captions/${id}`);
  });

  it("every item passes the check at every aspect with a transcript, and without one", async () => {
    for (const id of ITEMS) {
      for (const words of [WORDS, []]) {
        const rep = await checkItem(findItem(`captions/${id}`), { props: words.length ? { text: "" } : {}, words, duration: 7.2 });
        expect(rep.ok, id).toBe(true);
        for (const a of rep.aspects) expect(a.warnings, `${id} ${a.aspect}`).toEqual([]);
      }
    }
  });

  it("keeps a transcript's own times, even for words before the entrance beat", async () => {
    expect(await at("karaoke", 0.1)).toContain(">Most<");
    expect(await at("pop", 0.1)).toContain(">MOST<");
  });

  it("shows the phrase being said and not the next one", async () => {
    const early = await at("karaoke", 1.0), late = await at("karaoke", 5.3);
    expect(early).toContain(">people<");
    expect(early).not.toContain(">Captions<");
    expect(late).toContain(">lands<");
    expect(late).not.toContain(">Most<");
  });

  it("keeps a sentence's last word with its line instead of leaving it alone", async () => {
    for (const aspect of ["16:9", "9:16"] as const) {
      const svg = await at("subtitles", 6.3, {}, aspect);
      expect(svg, aspect).toContain(">time.<");
      expect(svg, aspect).toContain(">every<");
    }
  });

  it("times text to the voice when both are given, and paces it evenly when there is no transcript", async () => {
    const synced = await openSession(findItem("captions/pop"), { props: { text: "Most videos *lose* people" }, words: WORDS, duration: 3, width: 360 });
    expect(synced.runner.frame(0.7).svg).toContain(">LOSE<");
    expect(synced.runner.frame(0.4).svg).not.toContain(">LOSE<");
    const paced = await openSession(findItem("captions/pop"), { props: { text: "One two three four", pace: 0.5 }, duration: 3, width: 360 });
    expect(paced.runner.frame(0.3).svg).toContain(">ONE<");
    expect(paced.runner.frame(0.3).svg).not.toContain(">TWO<");
    expect(paced.runner.frame(0.6).svg).toContain(">TWO<");
  });

  it("every item shows the word being said and not one far ahead", async () => {
    for (const id of ITEMS.filter((i) => i !== "camera-follow")) {
      const svg = await at(id, 5.3);
      // "lands" is said at 5.22 s; "Most" opened the first sentence and is long gone.
      expect(svg, id).toMatch(/>(l|la|lan|land|lands|L|LA|LAN|LAND|LANDS)</);
      // Threads and lyrics keep earlier lines on screen on purpose.
      if (id !== "messages" && id !== "lyrics") expect(svg, id).not.toMatch(/>(Most|MOST)</);
    }
  });

  it("types letter by letter, decodes before it settles, and stacks the lines before", async () => {
    const typed = await at("typed", 5.24);
    expect(typed).toMatch(/>(l|la|lan)</);
    expect(typed).not.toContain(">lands<");
    const settled = await at("scramble", 5.6);
    expect(settled).toContain(">S<");
    const stack = await at("stacked", 5.3);
    expect(stack).toContain(">every<");
    const ed = await at("editorial", 1.0, { accents: "three" });
    expect(ed).toContain(">three<");
  });

  it("fills, focuses and crawls on the voice", async () => {
    // Outline: the hollow word is drawn first; once said, a filled copy wipes in over it.
    const outline = await at("outline", 5.4);
    expect((outline.match(/>LANDS</g) ?? []).length).toBe(2);
    expect((outline.match(/>TIME\.</g) ?? []).length).toBe(1);
    // Ticker: the word being said is lit and the opening words have scrolled away.
    const ticker = await at("crawl", 5.3);
    expect(ticker).toContain(">lands<");
    expect(ticker).not.toContain(">Most<");
    // Bubble: a new bubble for the second sentence, on the other side.
    expect(await at("bubble", 3.6)).toContain(">Captions<");
  });

  it("pops icons, scrolls lyrics, threads messages and fills the progress bar", async () => {
    // Icons: "videos" has a built-in icon, so its badge is drawn once the word is said.
    expect(await at("icons", 0.6)).toMatch(/<circle/);
    expect(await at("icons", 0.2)).not.toMatch(/<circle/);
    // Lyrics: the line being sung and the ones around it are all on screen.
    const lyric = await at("lyrics", 5.4);
    expect(lyric).toContain(">lands<");
    expect(lyric).toContain(">watching,<");
    // Messages: the second sentence's bubble comes in under the first.
    const thread = await at("messages", 3.8);
    expect(thread).toContain(">Captions<");
    expect(thread).toContain(">Most<");
    // Progress: the bar's fill grows through the phrase.
    const fill = (svg: string) => Number(/<circle cx="([\d.]+)"/.exec(svg)![1]);
    expect(fill(await at("progress", 1.0))).toBeGreaterThan(fill(await at("progress", 0.4)));
  });

  it("builds lockups around the key word and swaps in the brand's colours on request", async () => {
    // The key word is the starred one, else the longest; lockups set it in its own face.
    const lock = await at("headline-word", 1.0, { text: "Most videos *lose* people", pace: 0.2 });
    expect(lock).toContain(">LOSE<");
    expect(lock).toContain("Anton");
    // Each look has its own colours; "brand" swaps the signature one for the brand's accent.
    const own = await at("tape-bars", 1.0, { text: "Hello and welcome", pace: 0.2 });
    const brand = await at("tape-bars", 1.0, { text: "Hello and welcome", pace: 0.2, palette: "brand" });
    expect(own).toContain("#2F5BFF");
    expect(brand).not.toContain("#2F5BFF");
    // A two-row look sets its rows in two faces.
    const duo = await at("weight-shift", 2.0, { text: "Hello and welcome to the show", pace: 0.2 });
    expect(duo).toContain("Montserrat");
    expect(duo).toContain("Inter");
  });

  it("writes script on as it is said, lights neon tubes and fills outlines", async () => {
    // Pen: "lands" (5.22 s) is half written at 5.3 — clipped — and whole, unclipped, by 5.9.
    const writing = await at("pen-write", 5.3), written = await at("pen-write", 5.9);
    expect(writing).toContain("Mr Dafoe");
    expect(writing).toMatch(/clip-path="url\(#[^"]+\)"><text[^>]*>(<tspan[^>]*>)?lands</);
    expect(written).not.toMatch(/clip-path="url\(#[^"]+\)"><text[^>]*>(<tspan[^>]*>)?lands</);
    // Neon: words still to come are bare glass (no fill); said ones are lit tubes.
    const neon = await at("cursive-neon", 5.3);
    expect(neon).toMatch(/fill="none"[^>]*>(<tspan[^>]*>)?time\.</);
    expect(neon).toMatch(/fill="#FFF6FB"[^>]*>(<tspan[^>]*>)?lands</);
    // Fill: every word has its outline; only the words said so far are filled.
    const fill = await at("script-fill", 5.6);
    expect((fill.match(/>time\.</g) ?? []).length).toBe(1);
    expect((fill.match(/>lands</g) ?? []).length).toBe(2);
    // Duet: every other word swaps from condensed capitals to the script.
    const duet = await at("script-duet", 1.0, { text: "One two three four", pace: 0.2 });
    expect(duet).toContain(">ONE<");
    expect(duet).toContain(">two<");
    expect(duet).toContain("Allura");
    // Swash: the key word in the script over a painted stroke; the brand palette swaps the paint.
    const swash = await at("swash-mark", 1.0, { text: "Most videos *lose* people", pace: 0.2 });
    expect(swash).toContain("Dancing Script");
    expect(swash).toContain("#C9B6FF");
    expect(await at("swash-mark", 1.0, { text: "Most videos *lose* people", pace: 0.2, palette: "brand" })).not.toContain("#C9B6FF");
  });

  it("the camera follows the words and pulls back on each sentence", async () => {
    const mid = await at("camera-follow", 1.0), whole = await at("camera-follow", 2.85);
    const scale = (svg: string) => Number(/scale\(([\d.e-]+)\)/.exec(svg)![1]);
    // Pulled back on the whole first sentence, the camera is further out than on one of its words.
    expect(scale(whole)).toBeLessThan(scale(mid));
    expect(whole).toContain(">SECONDS.<");
    expect(whole).toContain(">MOST<");
    const track = await at("camera-follow", 1.0, { camera: "track" });
    expect(track).toContain(">PEOPLE<");
  });
});
