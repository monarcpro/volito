/** The ffmpeg MONARC Motion encodes video with: MONARC_MOTION_FFMPEG, else the one on PATH. */
import { execFileSync } from "node:child_process";

let probed: { path: string; encoders: Set<string> } | null | undefined;

export function ffmpegPath(): string {
  return process.env.MONARC_MOTION_FFMPEG || "ffmpeg";
}

/** ffmpeg and the encoders it was built with; null when there is no ffmpeg. */
export function probeFfmpeg(): { path: string; encoders: Set<string> } | null {
  if (probed !== undefined) return probed;
  const path = ffmpegPath();
  try {
    const out = execFileSync(path, ["-hide_banner", "-encoders"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15000 });
    const encoders = new Set<string>();
    for (const line of out.split("\n")) {
      const m = /^\s*[VAS][A-Z.]{5}\s+(\S+)/.exec(line);
      if (m) encoders.add(m[1]!);
    }
    probed = { path, encoders };
  } catch {
    probed = null;
  }
  return probed;
}

export class FfmpegMissing extends Error {
  constructor(what: string) {
    super(`${what} needs ffmpeg — install it (macOS: brew install ffmpeg · Debian/Ubuntu: apt install ffmpeg · Windows: winget install ffmpeg) or set MONARC_MOTION_FFMPEG to its path. PNG sequences and stills need no ffmpeg.`);
    this.name = "FfmpegMissing";
  }
}
