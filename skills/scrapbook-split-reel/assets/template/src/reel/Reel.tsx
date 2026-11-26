import { AbsoluteFill, useCurrentFrame } from "remotion";
import { renderItem } from "./items";
import { panelExitY } from "./motion";
import { BoilFilter, Paper } from "./Paper";
import { Captions, Seam, Speaker, splitProgress } from "./Speaker";
import { EXIT_FRAMES, FPS } from "./tokens";
import { Plan } from "./types";

export const Reel: React.FC<{ plan: Plan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const p = splitProgress(frame, plan.splits);
  return (
    <AbsoluteFill>
      <BoilFilter />
      <Paper />
      <Speaker plan={plan} p={p} />
      <Seam p={p} />
      {plan.panels.map((panel, i) => {
        const out = panel.out === undefined ? Infinity : panel.out * FPS;
        if (frame < panel.in * FPS || frame > out + EXIT_FRAMES) return null;
        return (
          <AbsoluteFill key={i} style={{ translate: `0px ${out === Infinity ? 0 : panelExitY(frame, out)}px` }}>
            {panel.items.map(renderItem)}
          </AbsoluteFill>
        );
      })}
      <Captions captions={plan.captions} p={p} end={plan.duration} />
    </AbsoluteFill>
  );
};
