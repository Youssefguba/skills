import { useMemo } from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { BOIL_HOLD, C, GRID } from "./tokens";

/** Faint handwriting-like pen strokes, tileable. `density` is the stroke count per 220px tile. */
export const scribble = (seed: string, density: number, opacity: number, minLen = 8, spread = 12) => {
  const size = 220;
  let paths = "";
  for (let i = 0; i < density; i++) {
    const x = random(`${seed}x${i}`) * size;
    const y = random(`${seed}y${i}`) * size;
    const len = minLen + random(`${seed}l${i}`) * spread;
    const bend = (random(`${seed}b${i}`) - 0.5) * 12;
    paths += `<path d="M${x} ${y} q${len / 2} ${bend - len / 2} ${len} ${-len * 0.8}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><g fill="none" stroke="#a8946a" stroke-width="1" stroke-linecap="round" opacity="${opacity}">${paths}</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

export const Paper: React.FC = () => {
  const texture = useMemo(() => scribble("paper", 60, 0.16), []);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.paper,
        backgroundImage: `${texture}, linear-gradient(${C.grid} 1.5px, transparent 1.5px), linear-gradient(90deg, ${C.grid} 1.5px, transparent 1.5px)`,
        backgroundSize: `220px 220px, ${GRID}px ${GRID}px, ${GRID}px ${GRID}px`,
      }}
    />
  );
};

/** Shared wobble: every hand-drawn line references #boil, and the seed steps on a hold. */
export const BoilFilter: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = (Math.floor(frame / BOIL_HOLD) % 4) + 1;
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <filter id="ragged" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed={7} />
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
      </defs>
    </svg>
  );
};
