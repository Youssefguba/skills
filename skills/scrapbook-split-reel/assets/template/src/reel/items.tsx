import { Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useMemo } from "react";
import { doodles } from "./doodles";
import { onTwos, popAt } from "./motion";
import { scribble } from "./Paper";
import { C, FONT, FPS, HATCH } from "./tokens";
import { DoodleItem, FlightItem, Item, NoteItem, Mark, PhotoItem, PillItem, Run, StickerItem, TextItem } from "./types";

const FRAMES_PER_CHAR = 0.9;
const HIGHLIGHT_LEAD = 4;

const wipe = (p: number, dir: "rtl" | "ltr") => {
  const hidden = (1 - Math.min(Math.max(p, 0), 1)) * 100;
  return dir === "rtl" ? `inset(-30% 0 -30% ${hidden}%)` : `inset(-30% ${hidden}% -30% 0)`;
};

const runFrames = (r: Run) => Math.max(5, r.t.length * FRAMES_PER_CHAR);

/** Wipes runs in reading order. A highlighted run's band sweeps first and its word follows. */
export const Line: React.FC<{ runs: Run[]; start: number; size: number; dir: "rtl" | "ltr"; color?: string; leading?: number }> = ({ runs, start, size, dir, color, leading = 1.5 }) => {
  const frame = onTwos(useCurrentFrame());
  let cursor = start;
  return (
    <div dir={dir} style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: leading, color: color ?? C.ink, whiteSpace: "pre" }}>
      {runs.map((run, i) => {
        const dur = runFrames(run);
        const lead = run.hl ? HIGHLIGHT_LEAD : 0;
        const s = cursor + lead;
        cursor = s + dur;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block" }}>
            {run.hl ? (
              <span
                style={{
                  position: "absolute",
                  inset: "10% -0.14em 6% -0.14em",
                  background: C.highlight,
                  filter: "url(#ragged)",
                  clipPath: wipe((frame - (s - lead)) / dur, dir),
                }}
              />
            ) : null}
            <span style={{ position: "relative", color: run.color, clipPath: wipe((frame - s) / dur, dir), display: "inline-block" }}>{run.t}</span>
          </span>
        );
      })}
    </div>
  );
};

export const lineFrames = (runs: Run[]) =>
  runs.reduce((sum, r) => sum + runFrames(r) + (r.hl ? HIGHLIGHT_LEAD : 0), 0);

const Text: React.FC<{ item: TextItem }> = ({ item }) => {
  const dir = item.dir ?? "rtl";
  return (
    <div style={{ position: "absolute", top: item.y, ...(dir === "rtl" ? { right: 1080 - item.x } : { left: item.x }) }}>
      <Line runs={item.runs} start={item.at * FPS} size={item.size ?? 64} dir={dir} color={item.color} />
    </div>
  );
};

export const Pop: React.FC<{ at: number; x: number; y: number; rotate?: number; origin?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, x, y, rotate = 0, origin = "center", style, children }) => {
  const frame = useCurrentFrame();
  const pose = popAt(frame, at * FPS);
  if (!pose) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, scale: String(pose.scale), rotate: `${rotate + pose.rotate}deg`, transformOrigin: origin, ...style }}>
      {children}
    </div>
  );
};

export const HatchShadow: React.FC<{ radius?: number; dx?: number; dy?: number }> = ({ radius = 4, dx = 10, dy = 12 }) => (
  <div style={{ position: "absolute", inset: 0, translate: `${dx}px ${dy}px`, borderRadius: radius, backgroundImage: HATCH }} />
);

const InkBorder: React.FC<{ w: number; h: number; radius: number; width?: number }> = ({ w, h, radius, width = 3.5 }) => (
  <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "url(#boil)" }}>
    <rect x={1} y={1} width={w - 2} height={h - 2} rx={radius} fill="none" stroke={C.ink} strokeWidth={width} />
  </svg>
);

const Tape: React.FC<{ left: string; rotate: number }> = ({ left, rotate }) => (
  <div style={{ position: "absolute", top: -26, left, width: 92, height: 42, rotate: `${rotate}deg`, background: C.tape, opacity: 0.88, outline: `1px solid ${C.muted}55` }} />
);

const Pill: React.FC<{ item: PillItem }> = ({ item }) => {
  const size = item.size ?? 30;
  return (
    <Pop at={item.at} x={item.x} y={item.y}>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, translate: "5px 6px", borderRadius: 999, backgroundImage: HATCH }} />
        <div dir="rtl" style={{ position: "relative", padding: `${size * 0.1}px ${size * 0.62}px`, borderRadius: 999, background: C.red, border: `4px solid ${C.ink}`, color: C.white, fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.45, whiteSpace: "pre" }}>
          {item.text}
        </div>
      </div>
    </Pop>
  );
};

/** A red marker loop that draws itself around a cell, then keeps boiling. */
const MarkCircle: React.FC<{ mark: Mark }> = ({ mark }) => {
  const frame = onTwos(useCurrentFrame());
  const start = mark.at * FPS;
  if (frame < start) return null;
  const t = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: "clamp" });
  const { cx, cy, w, h } = mark;
  const rx = w / 2, ry = h / 2;
  // Slightly overshooting loop, like a quick pen circle.
  const d = `M${cx + rx * 0.9} ${cy - ry * 0.75} C${cx + rx * 1.25} ${cy + ry * 0.4} ${cx + rx * 0.5} ${cy + ry * 1.15} ${cx} ${cy + ry * 1.05} C${cx - rx * 0.75} ${cy + ry} ${cx - rx * 1.1} ${cy + ry * 0.3} ${cx - rx * 1.05} ${cy - ry * 0.1} C${cx - rx} ${cy - ry * 0.9} ${cx - rx * 0.2} ${cy - ry * 1.15} ${cx + rx * 0.3} ${cy - ry * 1.1} C${cx + rx * 0.9} ${cy - ry * 1.05} ${cx + rx * 1.15} ${cy - ry * 0.6} ${cx + rx * 1.1} ${cy - ry * 0.2}`;
  return (
    <svg width={2000} height={2000} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: "url(#boil)", pointerEvents: "none" }}>
      <path d={d} pathLength={1} fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${t} 1`} />
    </svg>
  );
};

const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

const Photo: React.FC<{ item: PhotoItem }> = ({ item }) => {
  const media = { width: "100%", height: "100%", objectFit: item.fit ?? "cover", display: "block" } as const;
  return (
  <Pop at={item.at} x={item.x} y={item.y} rotate={item.rotate ?? 1}>
    <div style={{ position: "relative", width: item.w, height: item.h }}>
      <HatchShadow radius={2} />
      <div style={{ position: "absolute", inset: 0, background: C.white, padding: 15 }}>
        {isVideo(item.src) ? (
          // Recordings start playing when the photo lands, at full frame rate like the footage.
          <Sequence from={Math.round(item.at * FPS)} layout="none">
            <OffthreadVideo src={staticFile(item.src)} muted style={media} />
          </Sequence>
        ) : (
          <Img src={staticFile(item.src)} style={media} />
        )}
      </div>
      <InkBorder w={item.w} h={item.h} radius={2} width={3} />
      {item.marks?.map((m, i) => <MarkCircle key={i} mark={m} />)}
      <Tape left="10%" rotate={-28} />
      <Tape left="68%" rotate={24} />
    </div>
  </Pop>
  );
};

const die = (px: number) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]
    .map(([a, b]) => `drop-shadow(${a * px}px ${b * px}px 0 ${C.white})`)
    .join(" ");

const Sticker: React.FC<{ item: StickerItem }> = ({ item }) => {
  const src = staticFile(item.src);
  return (
    <Pop at={item.at} x={item.x} y={item.y}>
      <div style={{ position: "relative", width: item.w, scale: item.flip ? "-1 1" : undefined }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            translate: "22px 20px",
            backgroundImage: HATCH,
            backgroundColor: `${C.hatch}33`,
            WebkitMaskImage: `url("${src}")`,
            maskImage: `url("${src}")`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
        <Img src={src} style={{ position: "relative", width: "100%", display: "block", filter: die(5) }} />
      </div>
    </Pop>
  );
};

const Note: React.FC<{ item: NoteItem }> = ({ item }) => {
  const frame = useCurrentFrame();
  const texture = useMemo(() => scribble("note", 420, 0.3, 5, 9), []);
  const size = item.size ?? 54;
  const start = (item.at + (item.textDelay ?? 0.3)) * FPS;
  let cursor = start;
  const starts = item.lines.map((runs) => {
    const s = cursor;
    cursor += lineFrames(runs) + 3;
    return s;
  });
  const attrOpacity = interpolate(frame, [cursor, cursor + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Pop at={item.at} x={item.x} y={item.y}>
      <div style={{ position: "relative", width: item.w, height: item.h }}>
        <HatchShadow radius={14} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, backgroundColor: C.note, backgroundImage: texture }} />
        <InkBorder w={item.w} h={item.h} radius={14} />
        {item.quote ? (
          <svg width={50} height={42} viewBox="0 0 50 42" style={{ position: "absolute", top: 8, right: 20 }}>
            <path d="M15 1 C24 0 26 9 22 17 C19 25 12 35 6 40 C3 42 1 39 3 35 C6 29 7 24 6 18 C4 9 8 2 15 1 Z M39 1 C48 0 50 9 46 17 C43 25 36 35 30 40 C27 42 25 39 27 35 C30 29 31 24 30 18 C28 9 32 2 39 1 Z" fill={C.red} />
          </svg>
        ) : null}
        <div style={{ position: "absolute", top: item.quote ? 82 : (item.h - size * 1.85 * item.lines.length) / 2, right: 60, left: 40 }}>
          {item.lines.map((runs, i) => (
            <Line key={i} runs={runs} start={starts[i]} size={size} dir="rtl" leading={1.85} />
          ))}
        </div>
        {item.attribution ? (
          <div dir="rtl" style={{ position: "absolute", bottom: 24, left: 60, opacity: attrOpacity, fontFamily: FONT, fontWeight: 700, fontSize: 33, color: C.muted }}>
            {item.attribution}
          </div>
        ) : null}
      </div>
    </Pop>
  );
};

const Doodle: React.FC<{ item: DoodleItem }> = ({ item }) => (
  <Pop at={item.at} x={item.x} y={item.y} rotate={item.rotate ?? 0}>
    <svg width={item.w} height={(item.w * 220) / 240} viewBox="0 0 240 220" style={{ overflow: "visible", filter: "url(#boil)" }}>
      {doodles[item.name]}
    </svg>
  </Pop>
);

let measure: SVGPathElement | null = null;
const pathPoint = (d: string, t: number) => {
  measure ??= document.createElementNS("http://www.w3.org/2000/svg", "path");
  measure.setAttribute("d", d);
  const len = measure.getTotalLength();
  const a = measure.getPointAtLength(len * t);
  return { x: a.x, y: a.y, len };
};

const Flight: React.FC<{ item: FlightItem }> = ({ item }) => {
  const frame = onTwos(useCurrentFrame());
  const t = interpolate(frame, [item.at * FPS, (item.at + item.duration) * FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < item.at * FPS) return null;
  const p = pathPoint(item.path, t);
  const from = pathPoint(item.path, 0);
  const to = pathPoint(item.path, 1);
  const heading = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  // The drawing's nose points left at 168deg. It banks a little and stays near level.
  const goingLeft = Math.cos((heading * Math.PI) / 180) < 0;
  const bank = goingLeft ? (((heading + 360) % 360) - 168) * 0.3 : (heading - 12) * 0.3;
  const w = item.w ?? 240;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <mask id={`trail-${item.at}`}>
            <path d={item.path} fill="none" stroke="#fff" strokeWidth={12} strokeDasharray={`${p.len * t} ${p.len}`} />
          </mask>
        </defs>
        <path d={item.path} fill="none" stroke={C.red} strokeWidth={4} strokeDasharray="18 13" strokeLinecap="round" mask={`url(#trail-${item.at})`} />
      </svg>
      <svg width={w} height={(w * 140) / 240} viewBox="0 0 240 140" style={{ position: "absolute", left: p.x - w / 2, top: p.y - (w * 70) / 240, rotate: `${bank}deg`, scale: goingLeft ? "1 1" : "-1 1", overflow: "visible", filter: "url(#boil)" }}>
        {doodles.plane}
      </svg>
    </>
  );
};

export const renderItem = (item: Item, key: number) => {
  switch (item.type) {
    case "text": return <Text key={key} item={item} />;
    case "pill": return <Pill key={key} item={item} />;
    case "photo": return <Photo key={key} item={item} />;
    case "sticker": return <Sticker key={key} item={item} />;
    case "note": return <Note key={key} item={item} />;
    case "doodle": return <Doodle key={key} item={item} />;
    case "flight": return <Flight key={key} item={item} />;
  }
};
