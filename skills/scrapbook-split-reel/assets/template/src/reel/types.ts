export type Run = { t: string; hl?: boolean; color?: string };

type Base = { at: number; x: number; y: number };

export type TextItem = Base & {
  type: "text";
  runs: Run[];
  size?: number;
  dir?: "rtl" | "ltr";
  color?: string;
};
export type PillItem = Base & { type: "pill"; text: string; size?: number };
export type PhotoItem = Base & {
  type: "photo";
  /** An image, or an .mp4/.webm screen recording that plays muted from `at`. */
  src: string;
  w: number;
  h: number;
  rotate?: number;
  /** "contain" keeps a whole screenshot visible on a white mat. Defaults to "cover". */
  fit?: "cover" | "contain";
  /** Hand-drawn red circles that draw themselves on the photo, in photo pixels. */
  marks?: Mark[];
};
export type Mark = { at: number; cx: number; cy: number; w: number; h: number };
/** A topic object with a transparent background. Never a person. */
export type StickerItem = Base & {
  type: "sticker";
  src: string;
  w: number;
  flip?: boolean;
};
export type NoteItem = Base & {
  type: "note";
  w: number;
  h: number;
  quote?: boolean;
  lines: Run[][];
  size?: number;
  attribution?: string;
  /** Seconds after `at` before the first line starts wiping in. */
  textDelay?: number;
};
export type DoodleItem = Base & {
  type: "doodle";
  name: "plane" | "phone" | "bulb" | "arrow" | "car" | "cart" | "noWifi";
  w: number;
  rotate?: number;
};
export type FlightItem = Base & {
  type: "flight";
  /** SVG path in page coordinates; the plane follows it end to end. */
  path: string;
  duration: number;
  w?: number;
};

export type Item =
  | TextItem
  | PillItem
  | PhotoItem
  | StickerItem
  | NoteItem
  | DoodleItem
  | FlightItem;

export type Panel = { in: number; out?: number; items: Item[] };

/** A stretch where the speaker drops to the bottom half and the paper takes the top half. */
export type Split = { in: number; out: number };
export type Caption = { at: number; t: string; hl?: string };

export type Plan = {
  duration: number;
  video: { src: string; width: number; height: number };
  /** Source row (px) that lands on the seam in split layout. */
  splitSrcTop: number;
  splits: Split[];
  captions: Caption[];
  panels: Panel[];
};
