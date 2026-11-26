import { useMemo } from "react";
import { Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Line } from "./items";
import { popAt } from "./motion";
import { scribble } from "./Paper";
import { C, FPS, HATCH } from "./tokens";
import { Caption, Plan, Run, Split } from "./types";

const W = 1080;
const H = 1920;
export const SEAM = 960;
const MOVE = 16; // frames for the layout change, like the card move in the reference

/** 0 = speaker full screen, 1 = speaker in the bottom half. */
export const splitProgress = (frame: number, splits: Split[]) => {
  let p = 0;
  for (const s of splits) {
    const a = s.in * FPS;
    const b = s.out * FPS;
    const ease = Easing.bezier(0.5, 0, 0.2, 1);
    const v =
      frame < b
        ? interpolate(frame, [a, a + MOVE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })
        : interpolate(frame, [b, b + MOVE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
    p = Math.max(p, v);
  }
  return p;
};

/** The footage itself never zooms or shakes. Only its window moves down to make room for the paper. */
export const Speaker: React.FC<{ plan: Plan; p: number }> = ({ plan, p }) => {
  const scale = W / plan.video.width;
  const winTop = SEAM * p;
  const videoTop = p * (SEAM - plan.splitSrcTop * scale);
  return (
    <div style={{ position: "absolute", left: 0, top: winTop, width: W, height: H - winTop, overflow: "hidden", background: C.ink }}>
      <OffthreadVideo
        src={staticFile(plan.video.src)}
        style={{ position: "absolute", left: 0, top: videoTop - winTop, width: W, height: plan.video.height * scale, maxWidth: "none" }}
      />
    </div>
  );
};

/** Torn-paper edge where the page meets the footage: ragged ink line, hatched shadow and two tapes. */
export const Seam: React.FC<{ p: number }> = ({ p }) => {
  if (p <= 0) return null;
  const y = SEAM * p;
  let d = `M-20 ${y}`;
  for (let x = 0; x <= W + 40; x += 40) d += ` L${x} ${y + (x % 80 === 0 ? -5 : 5)}`;
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: y, width: W, height: 16, backgroundImage: HATCH, opacity: 0.55 }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "url(#boil)" }}>
        <path d={d} fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", top: y - 22, left: -18, width: 120, height: 44, rotate: "-8deg", background: C.tape, opacity: 0.88 }} />
      <div style={{ position: "absolute", top: y - 22, right: -18, width: 120, height: 44, rotate: "7deg", background: C.tape, opacity: 0.88 }} />
    </>
  );
};

const toRuns = (c: Caption): Run[] => {
  if (!c.hl || !c.t.includes(c.hl)) return [{ t: c.t }];
  const i = c.t.indexOf(c.hl);
  const runs: Run[] = [];
  if (i > 0) runs.push({ t: c.t.slice(0, i) });
  runs.push({ t: c.hl, hl: true });
  if (i + c.hl.length < c.t.length) runs.push({ t: c.t.slice(i + c.hl.length) });
  return runs;
};

/** Captions as torn note-paper strips: on the chest in full screen, taped across the seam in split. */
export const Captions: React.FC<{ captions: Caption[]; p: number; end: number }> = ({ captions, p, end }) => {
  const frame = useCurrentFrame();
  const texture = useMemo(() => scribble("cap", 420, 0.3, 5, 9), []);
  const idx = captions.findIndex((c, i) => frame >= c.at * FPS && frame < (captions[i + 1]?.at ?? end) * FPS);
  // While the layout slides, any fixed spot would cross the face, so the strip sits out the move.
  if (idx < 0 || (p > 0 && p < 1)) return null;
  const c = captions[idx];
  const start = Math.round(c.at * FPS);
  const pose = popAt(frame, start) ?? { scale: 1, rotate: 0 };
  const cy = p === 1 ? SEAM : 1430;
  const tilt = idx % 2 ? -1.4 : 1;
  return (
    <div style={{ position: "absolute", left: 0, width: W, top: cy, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", translate: "0 -50%", scale: String(pose.scale), rotate: `${tilt + pose.rotate}deg` }}>
        <div style={{ position: "absolute", inset: 0, translate: "7px 8px", borderRadius: 14, backgroundImage: HATCH }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            backgroundColor: C.note,
            backgroundImage: texture,
            border: `3.5px solid ${C.ink}`,
            filter: "url(#boil)",
          }}
        />
        <div style={{ position: "relative", padding: "4px 34px 8px" }}>
          <Line runs={toRuns(c)} start={start} size={56} dir="rtl" />
        </div>
      </div>
    </div>
  );
};
