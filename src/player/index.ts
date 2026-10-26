/**
 * volito/player: the <volito-player> element. Importing this module registers it.
 *
 *   import "volito/player";
 *   // <volito-player item="essentials/lower-third" props='{"name":"Ada"}' aspects="all" controls autoplay loop></volito-player>
 *
 * Or straight from a CDN, with no build step:
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/volito/dist/player.js"></script>
 */
import { VolitoPlayer, defineVolitoPlayer } from "./element.js";

export { VolitoPlayer, defineVolitoPlayer, type VolitoPlayerEventMap } from "./element.js";
export { CDN_BASE, VERSION, type MotionPlayer, type PlayerOptions } from "../browser/index.js";

declare global {
  interface HTMLElementTagNameMap {
    "volito-player": VolitoPlayer;
  }
}

defineVolitoPlayer();
