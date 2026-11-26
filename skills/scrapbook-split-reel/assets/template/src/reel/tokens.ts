import { loadFont as loadArabic } from "@remotion/google-fonts/PlaypenSansArabic";
import { loadFont as loadLatin } from "@remotion/google-fonts/PlaypenSans";

const arabic = loadArabic("normal", { weights: ["700", "800"], subsets: ["arabic"] });
const latin = loadLatin("normal", { weights: ["700", "800"], subsets: ["latin"] });

export const FONT = `"${latin.fontFamily}", "${arabic.fontFamily}", sans-serif`;

// Sampled from the reference reel.
export const C = {
  paper: "#f0e9d4",
  note: "#f6f2e2",
  grid: "#e2d9c0",
  ink: "#2c1c0d",
  highlight: "#e5bd58",
  red: "#c83528",
  tape: "#e4d9b6",
  muted: "#7c6f5d",
  hatch: "#6b5d4f",
  cardShadow: "#c9c1ae",
  white: "#fffdf6",
  blue: "#5b93c7",
};

export const FPS = 30;
export const GRID = 55;
export const BOIL_HOLD = 8; // frames each wobble pose is held
export const EXIT_FRAMES = 15;

export const CARD_WIDE = { x: 38, y: 998, w: 1004, h: 866 };
export const CARD_MINI = { x: 618, y: 58, w: 424, h: 424 };
export const CARD_MOVE_FRAMES = 20;

export const HATCH = `repeating-linear-gradient(135deg, ${C.hatch} 0 2px, transparent 2px 5px)`;
