import { Easing, interpolate } from "remotion";
import { EXIT_FRAMES } from "./tokens";

// Stop-motion pop: four poses, each held for two frames.
const POP = [
  { scale: 0.45, rotate: 0 },
  { scale: 1.06, rotate: 1.5 },
  { scale: 0.98, rotate: -0.6 },
  { scale: 1, rotate: 0 },
];

export const popAt = (frame: number, start: number) => {
  const step = Math.floor((frame - start) / 2);
  if (step < 0) return null;
  return POP[Math.min(step, POP.length - 1)];
};

/** Overlays animate on twos (15fps) over 30fps footage. */
export const onTwos = (frame: number) => frame - (frame % 2);

export const panelExitY = (frame: number, out: number) =>
  interpolate(onTwos(frame), [out, out + EXIT_FRAMES], [0, -1150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.6, 0, 0.9, 0.5),
  });
