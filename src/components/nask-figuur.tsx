import type { Figuur, OnderdeelSoort } from "@/lib/figuur";
import { figuurOmschrijving } from "@/lib/figuur";

const pen = {
  fill: "none",
  stroke: "#14233a",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Tekst({
  x,
  y,
  children,
  size = 12,
}: {
  x: number;
  y: number;
  children: string;
  size?: number;
}) {
  if (!children) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={size}
      fontFamily="Source Sans 3, sans-serif"
      fill="#14233a"
    >
      {children}
    </text>
  );
}

function Onderdeel({
  soort,
  x,
  y,
}: {
  soort: OnderdeelSoort;
  x: number;
  y: number;
}) {
  if (soort === "lamp") {
    return (
      <g>
        <circle cx={x} cy={y} r="13" {...pen} fill="#fff" />
        <path d={`M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}`} {...pen} />
      </g>
    );
  }
  if (soort === "weerstand") {
    return <rect x={x - 16} y={y - 8} width="32" height="16" {...pen} fill="#fff" />;
  }
  if (soort === "schakelaar") {
    return (
      <g>
        <circle cx={x - 14} cy={y} r="2.2" fill="#14233a" />
        <path d={`M${x - 12} ${y} L${x + 12} ${y - 12}`} {...pen} />
        <circle cx={x + 14} cy={y} r="2.2" fill="#14233a" />
      </g>
    );
  }
  if (soort === "zekering") {
    return (
      <g>
        <rect x={x - 14} y={y - 8} width="28" height="16" {...pen} fill="#fff" />
        <path d={`M${x - 8} ${y} H${x + 8}`} {...pen} />
      </g>
    );
  }
  const letter = soort === "stroommeter" ? "A" : soort === "spanningsmeter" ? "V" : "M";
  return (
    <g>
      <circle cx={x} cy={y} r="13" {...pen} fill="#fff" />
      <Tekst x={x} y={y + 4} size={12}>
        {letter}
      </Tekst>
    </g>
  );
}

function Bron({ soort, x, y }: { soort: "cel" | "wissel"; x: number; y: number }) {
  if (soort === "wissel") {
    return (
      <g>
        <circle cx={x} cy={y} r="12" {...pen} fill="#fff" />
        <path d={`M${x - 7} ${y} q 3.5 -7 7 0 t 7 0`} {...pen} />
      </g>
    );
  }
  return (
    <g>
      <path d={`M${x - 5} ${y - 12} V${y + 12}`} {...pen} strokeWidth={2.4} />
      <path d={`M${x + 5} ${y - 6} V${y + 6}`} {...pen} strokeWidth={2.4} />
    </g>
  );
}

function Schema({ figuur }: { figuur: Extract<Figuur, { type: "schakelschema" }> }) {
  const volt = figuur.onderdelen.find((o) => o.soort === "spanningsmeter");
  const rij = (figuur.onderdelen.some((o) => o.soort !== "spanningsmeter")
    ? figuur.onderdelen.filter((o) => o.soort !== "spanningsmeter")
    : figuur.onderdelen
  ).slice(0, 3);
  const parallel = figuur.schakeling === "parallel" && rij.length > 1;

  if (parallel) {
    const ys = rij.map((_, i) => 32 + i * 58);
    const bottom = ys[ys.length - 1] ?? 32;
    const h = bottom + 28;
    const mid = (ys[0]! + bottom) / 2;
    return (
      <svg viewBox={`0 0 340 ${h}`} className="block w-full" role="img" aria-label={figuurOmschrijving(figuur)}>
        <rect width="340" height={h} fill="#fff" />
        <path d={`M56 ${ys[0]} V${mid - 16}`} {...pen} />
        <path d={`M56 ${mid + 16} V${bottom}`} {...pen} />
        <Bron soort={figuur.bron} x={56} y={mid} />
        <path d={`M292 ${ys[0]} V${bottom}`} {...pen} />
        {rij.map((deel, i) => {
          const y = ys[i] ?? 32;
          return (
            <g key={`${deel.soort}-${i}`}>
              <path d={`M56 ${y} H150`} {...pen} />
              <path d={`M186 ${y} H292`} {...pen} />
              <Onderdeel soort={deel.soort} x={168} y={y} />
              <Tekst x={230} y={y + 4} size={12}>
                {deel.label}
              </Tekst>
            </g>
          );
        })}
      </svg>
    );
  }

  const y = 64;
  const y2 = 124;
  const xs = rij.map((_, i) => 120 + i * 78);
  const lamp = xs[Math.max(0, rij.findIndex((d) => d.soort === "lamp"))];
  const over = lamp || xs[0] || 120;
  return (
    <svg viewBox="0 0 340 156" className="block w-full" role="img" aria-label={figuurOmschrijving(figuur)}>
      <rect width="340" height="156" fill="#fff" />
      <path d={`M44 ${y} H${(xs[0] ?? 120) - 18}`} {...pen} />
      {xs.map((x, i) => {
        const rechts = i === xs.length - 1 ? 312 : (xs[i + 1] ?? 312) - 18;
        return <path key={`d-${i}`} d={`M${x + 18} ${y} H${rechts}`} {...pen} />;
      })}
      <path d={`M312 ${y} V${y2} H44 V${y + 18}`} {...pen} />
      <path d={`M44 ${y2 - 18} V${y2}`} {...pen} />
      <Bron soort={figuur.bron} x={44} y={(y + y2) / 2} />
      {rij.map((deel, i) => (
        <g key={`${deel.soort}-${i}`}>
          <Onderdeel soort={deel.soort} x={xs[i] ?? 120} y={y} />
          <Tekst x={xs[i] ?? 120} y={y + 30} size={12}>
            {deel.label}
          </Tekst>
        </g>
      ))}
      {volt ? (
        <g>
          <path d={`M${over - 18} ${y} V26 H${over - 14}`} {...pen} />
          <Onderdeel soort="spanningsmeter" x={over} y={26} />
          <path d={`M${over + 14} 26 H${over + 18} V${y}`} {...pen} />
        </g>
      ) : null}
    </svg>
  );
}

function Grafiek({ figuur }: { figuur: Extract<Figuur, { type: "grafiek" }> }) {
  const padL = 42;
  const padB = 32;
  const w = 340;
  const h = 190;
  const plotW = w - padL - 16;
  const plotH = h - padB - 16;
  const xs = figuur.punten.map((p) => p.x);
  const ys = figuur.punten.map((p) => p.y);
  const xMin = Math.min(0, ...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const px = (x: number) => padL + ((x - xMin) / xSpan) * plotW;
  const py = (y: number) => 12 + (1 - (y - yMin) / ySpan) * plotH;
  const lijn = figuur.punten.map((p) => `${px(p.x)},${py(p.y)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label={figuurOmschrijving(figuur)}>
      <rect width={w} height={h} fill="#fff" />
      <path d={`M${padL} 12 V${12 + plotH} H${padL + plotW}`} {...pen} />
      {figuur.lijn ? <polyline points={lijn} {...pen} /> : null}
      {figuur.punten.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r="3.2" fill="#14233a" />
      ))}
      <Tekst x={padL + plotW / 2} y={h - 8} size={12}>
        {figuur.xLabel}
      </Tekst>
      <text
        x={18}
        y={12 + plotH / 2}
        fontSize={12}
        fontFamily="Source Sans 3, sans-serif"
        fill="#14233a"
        transform={`rotate(-90 18 ${12 + plotH / 2})`}
        textAnchor="middle"
      >
        {figuur.yLabel}
      </text>
    </svg>
  );
}

function Krachten({ figuur }: { figuur: Extract<Figuur, { type: "krachten" }> }) {
  const cx = 150;
  const cy = 100;
  const lengte = { 1: 36, 2: 52, 3: 70 };
  return (
    <svg viewBox="0 0 300 200" className="block w-full" role="img" aria-label={figuurOmschrijving(figuur)}>
      <rect width="300" height="200" fill="#fff" />
      <rect x={cx - 28} y={cy - 22} width="56" height="44" rx="4" {...pen} />
      {figuur.voorwerp ? (
        <Tekst x={cx} y={cy + 4} size={11}>
          {figuur.voorwerp}
        </Tekst>
      ) : null}
      {figuur.pijlen.map((pijl, i) => {
        const L = lengte[pijl.sterkte];
        const tip =
          pijl.richting === "omhoog"
            ? [cx, cy - L]
            : pijl.richting === "omlaag"
              ? [cx, cy + L]
              : pijl.richting === "links"
                ? [cx - L, cy]
                : [cx + L, cy];
        const [tx, ty] = tip as [number, number];
        const label =
          pijl.richting === "omhoog"
            ? [tx + 18, ty + 12]
            : pijl.richting === "omlaag"
              ? [tx + 18, ty + 4]
              : pijl.richting === "links"
                ? [tx - 4, ty - 12]
                : [tx + 4, ty - 12];
        return (
          <g key={`${pijl.naam}-${i}`}>
            <line x1={cx} y1={cy} x2={tx} y2={ty} {...pen} strokeWidth={2} />
            <polygon
              points={pijlpunt(tx, ty, pijl.richting)}
              fill="#14233a"
            />
            <Tekst x={label[0]} y={label[1]} size={13}>
              {pijl.naam}
            </Tekst>
          </g>
        );
      })}
    </svg>
  );
}

function pijlpunt(x: number, y: number, richting: "omhoog" | "omlaag" | "links" | "rechts"): string {
  const s = 7;
  if (richting === "omhoog") return `${x},${y} ${x - s},${y + 10} ${x + s},${y + 10}`;
  if (richting === "omlaag") return `${x},${y} ${x - s},${y - 10} ${x + s},${y - 10}`;
  if (richting === "links") return `${x},${y} ${x + 10},${y - s} ${x + 10},${y + s}`;
  return `${x},${y} ${x - 10},${y - s} ${x - 10},${y + s}`;
}

function Meter({ figuur }: { figuur: Extract<Figuur, { type: "meter" }> }) {
  if (figuur.soort === "kwh") {
    const heel = Math.min(99999.9, figuur.waarde).toFixed(1).split(".");
    const cijfers = `${(heel[0] ?? "0").padStart(5, "0").slice(-5)}${heel[1] ?? "0"}`;
    return (
      <svg viewBox="0 0 320 110" className="block w-full" role="img" aria-label="kWh-meter">
        <rect width="320" height="110" fill="#fff" />
        <rect x="24" y="28" width="272" height="48" rx="6" {...pen} />
        {cijfers.split("").map((c, i) => (
          <g key={i}>
            {i === 5 ? <circle cx={36 + i * 34 - 6} cy={52} r="1.8" fill="#14233a" /> : null}
            <rect x={36 + i * 34} y="36" width="28" height="32" fill={i >= 5 ? "#f3d2d2" : "#fff"} stroke="#14233a" />
            <Tekst x={50 + i * 34} y={58} size={18}>
              {c}
            </Tekst>
          </g>
        ))}
        <Tekst x={160} y={96} size={12}>
          kWh
        </Tekst>
      </svg>
    );
  }
  const cx = 160;
  const cy = 118;
  const r = 78;
  const t = (figuur.waarde - figuur.min) / (figuur.max - figuur.min || 1);
  const hoek = Math.PI * (1 - Math.min(1, Math.max(0, t)));
  const nx = cx + Math.cos(hoek) * (r - 18);
  const ny = cy - Math.sin(hoek) * (r - 18);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox="0 0 320 150" className="block w-full" role="img" aria-label={figuurOmschrijving(figuur)}>
      <rect width="320" height="150" fill="#fff" />
      <path d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} {...pen} />
      {ticks.map((tick) => {
        const a = Math.PI * (1 - tick);
        const x1 = cx + Math.cos(a) * (r - 2);
        const y1 = cy - Math.sin(a) * (r - 2);
        const x2 = cx + Math.cos(a) * (r - 12);
        const y2 = cy - Math.sin(a) * (r - 12);
        return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} {...pen} />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} {...pen} strokeWidth={2.2} />
      <circle cx={cx} cy={cy} r="4" fill="#14233a" />
      <Tekst x={cx - r} y={cy + 16} size={11}>
        {String(figuur.min).replace(".", ",")}
      </Tekst>
      <Tekst x={cx + r} y={cy + 16} size={11}>
        {String(figuur.max).replace(".", ",")}
      </Tekst>
      <Tekst x={cx} y={58} size={12}>
        {String((figuur.min + figuur.max) / 2).replace(".", ",")}
      </Tekst>
      <Tekst x={cx} y={76} size={12}>
        {figuur.eenheid}
      </Tekst>
    </svg>
  );
}

export function NaskFiguur({ figuur }: { figuur: Figuur }) {
  return (
    <figure className="overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-border)]">
      {figuur.type === "schakelschema" ? <Schema figuur={figuur} /> : null}
      {figuur.type === "grafiek" ? <Grafiek figuur={figuur} /> : null}
      {figuur.type === "krachten" ? <Krachten figuur={figuur} /> : null}
      {figuur.type === "meter" ? <Meter figuur={figuur} /> : null}
    </figure>
  );
}
