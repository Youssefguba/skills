import { C } from "./tokens";

const line = { fill: "none", stroke: C.ink, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const hatch = { fill: "none", stroke: C.ink, strokeWidth: 1.4, opacity: 0.55 } as const;

// Each doodle is drawn in a 240-wide box: ink outline, one or two flat accents, hatch for shade.
export const doodles = {
  plane: (
    <g>
      <path d="M12 96 C60 78 150 62 214 52 C226 50 232 60 222 66 C170 84 90 108 34 118 C10 122 0 104 12 96 Z" fill={C.white} {...{ stroke: C.ink, strokeWidth: 4, strokeLinejoin: "round" }} />
      <path d="M30 96 l18 16 M46 92 l18 16 M62 88 l16 15 M16 104 l12 12" {...hatch} />
      <path d="M100 82 L150 34 L166 38 L142 76 Z" fill={C.blue} {...{ stroke: C.ink, strokeWidth: 4, strokeLinejoin: "round" }} />
      <path d="M92 104 L128 132 L146 130 L126 94 Z" fill={C.blue} {...{ stroke: C.ink, strokeWidth: 4, strokeLinejoin: "round" }} />
      <path d="M196 56 L206 6 L226 8 L222 50 Z" fill={C.red} {...{ stroke: C.ink, strokeWidth: 4, strokeLinejoin: "round" }} />
      <circle cx="64" cy="98" r="5" {...line} /><circle cx="86" cy="92" r="5" {...line} /><circle cx="162" cy="74" r="5" {...line} /><circle cx="184" cy="68" r="5" {...line} />
    </g>
  ),
  phone: (
    <g transform="translate(62 0)">
      <rect x="4" y="4" width="112" height="212" rx="20" fill={C.white} stroke={C.ink} strokeWidth={4} />
      <rect x="16" y="26" width="88" height="160" rx="6" fill={C.blue} stroke={C.ink} strokeWidth={3} />
      <path d="M26 48 h44 M26 66 h62 M26 84 h34" {...line} stroke={C.white} />
      <rect x="26" y="116" width="68" height="50" rx="6" fill={C.red} stroke={C.ink} strokeWidth={3} />
      <path d="M46 201 h28" {...line} />
    </g>
  ),
  bulb: (
    <g transform="translate(46 0)">
      <path d="M74 8 C30 8 8 42 14 76 C18 100 40 112 44 138 L104 138 C108 112 130 100 134 76 C140 42 118 8 74 8 Z" fill={C.highlight} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M40 40 l18 18 M34 58 l18 18 M104 66 l16 16 M92 80 l16 16" {...hatch} />
      <path d="M50 150 h48 M54 164 h40 M62 178 h24" {...line} />
    </g>
  ),
  car: (
    <g>
      <path d="M12 150 C10 124 28 116 52 112 L84 66 C90 58 98 54 108 54 L168 54 C178 54 186 58 192 68 L214 112 C230 118 236 130 232 150 Z" fill={C.red} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M100 72 L82 110 L132 110 L132 72 Z M146 72 L146 110 L196 110 L178 72 Z" fill={C.white} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M20 134 l14 12 M34 128 l18 16 M204 128 l18 16" {...hatch} />
      <circle cx="66" cy="152" r="24" fill={C.white} stroke={C.ink} strokeWidth={4} /><circle cx="66" cy="152" r="8" fill={C.ink} />
      <circle cx="182" cy="152" r="24" fill={C.white} stroke={C.ink} strokeWidth={4} /><circle cx="182" cy="152" r="8" fill={C.ink} />
    </g>
  ),
  cart: (
    <g>
      <path d="M14 34 L50 34 L82 142 L192 142" {...line} strokeWidth={5} />
      <path d="M58 56 L222 56 L200 120 L76 120 Z" fill={C.highlight} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M100 58 L108 118 M144 58 L146 118 M186 58 L178 118 M68 88 L212 88" {...line} strokeWidth={3} />
      <circle cx="100" cy="176" r="16" fill={C.white} stroke={C.ink} strokeWidth={4} /><circle cx="176" cy="176" r="16" fill={C.white} stroke={C.ink} strokeWidth={4} />
    </g>
  ),
  noWifi: (
    <g>
      <path d="M26 86 C80 30 160 30 214 86" {...line} strokeWidth={8} />
      <path d="M62 122 C96 88 144 88 178 122" {...line} strokeWidth={8} />
      <path d="M94 156 C110 142 130 142 146 156" {...line} strokeWidth={8} />
      <circle cx="120" cy="184" r="11" fill={C.ink} />
      <path d="M40 200 L204 24" {...line} stroke={C.red} strokeWidth={11} />
    </g>
  ),
  arrow: (
    <g>
      <path d="M10 92 C70 30 140 30 214 74" {...line} strokeWidth={5} />
      <path d="M186 40 L218 76 L172 92" {...line} strokeWidth={5} />
    </g>
  ),
};
