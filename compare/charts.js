/**
 * SVG charts for protocol compare. Numbers are caller-supplied
 * (from scoreProposal) — this module only draws.
 */

export const SERIES_COLORS = ["#4a5f80", "#1b191c", "#9b2335", "#2f6f4e", "#8a5a2b", "#758696"];

export function colorFor(index) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/**
 * Flatten a scored replay into the compare payload.
 * @param {{ name: string, result: object }} entry
 */
export function serializeReplay(entry) {
  const result = entry.result;
  return {
    id: entry.name,
    slug: result.projectSlug,
    name: result.project,
    kind: result.kind,
    classification: result.classification,
    passEdge: result.passEdge,
    failByMargin: result.failByMargin,
    twapThresholdPct: result.twapThresholdPct,
    passAlignedShare: result.passAlignedShare,
    failAlignedShare: result.failAlignedShare,
    firedCount: result.firedCount,
    signalCount: result.signalCount,
    passed: result.passed,
    requestedUsd: result.requestedUsd,
    treasuryShare: result.treasuryShare,
    passTWAP: result.passTWAP,
    failTWAP: result.failTWAP,
    treasuryUsd: result.snapshot?.treasuryUsd ?? null,
    premiumPct: result.snapshot?.premiumPct ?? null,
    navAsUsd: result.snapshot?.navAsUsd ?? null,
    spotUsd: result.snapshot?.spotUsd ?? null,
    replayHref: `replay/${entry.name}/index.html`,
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
}

function niceMax(values) {
  const peak = Math.max(0, ...values.map((v) => Math.abs(v)));
  if (peak === 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(peak));
  return Math.ceil(peak / pow) * pow;
}

/**
 * Horizontal bar chart. Each row is { label, value, color, id }.
 * @param {{ title: string, unit?: string, rows: Array<{label:string,value:number,color?:string,id?:string}>, width?: number }} opts
 */
export function barChart(opts) {
  const rows = opts.rows || [];
  const width = opts.width || 640;
  const rowH = 36;
  const padL = 120;
  const padR = 56;
  const padT = 8;
  const height = padT + rows.length * rowH + 8;
  const inner = width - padL - padR;
  const max = niceMax(rows.map((r) => r.value));

  const bars = rows
    .map((row, i) => {
      const y = padT + i * rowH;
      const w = max === 0 ? 0 : (Math.abs(row.value) / max) * inner;
      const color = row.color || colorFor(i);
      const label =
        typeof opts.format === "function"
          ? opts.format(row.value)
          : opts.unit === "%"
            ? `${Number(row.value).toFixed(2)}%`
            : String(row.value);
      return `<g data-series="${esc(row.id || row.label)}" data-value="${row.value}">
        <text x="0" y="${y + 18}" fill="#1b191c" font-size="13">${esc(row.label)}</text>
        <rect x="${padL}" y="${y + 6}" width="${Math.max(w, 0)}" height="16" rx="4" fill="${color}"></rect>
        <text x="${padL + w + 8}" y="${y + 18}" fill="#898989" font-size="12">${esc(label)}</text>
      </g>`;
    })
    .join("");

  return `<svg class="chart" data-chart="${esc(opts.title)}" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${esc(opts.title)}">${bars}</svg>`;
}

/**
 * Grouped vertical bars. groups: [{ label, values: [{ key, value, color }] }]
 */
export function groupedBarChart(opts) {
  const groups = opts.groups || [];
  const width = opts.width || 640;
  const height = 220;
  const pad = { t: 16, r: 16, b: 36, l: 40 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const all = groups.flatMap((g) => g.values.map((v) => v.value));
  const max = niceMax(all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const zeroY = pad.t + ((max - 0) / span) * innerH;
  const gw = groups.length ? innerW / groups.length : innerW;
  const keys = groups[0] ? groups[0].values : [];
  const bw = Math.max(8, (gw - 16) / Math.max(keys.length, 1));

  const bars = groups
    .map((group, gi) => {
      const gx = pad.l + gi * gw;
      const series = group.values
        .map((item, vi) => {
          const x = gx + 8 + vi * bw;
          const yVal = pad.t + ((max - item.value) / span) * innerH;
          const y = Math.min(yVal, zeroY);
          const h = Math.abs(zeroY - yVal);
          return `<rect data-series="${esc(group.id || group.label)}" data-key="${esc(item.key)}" data-value="${item.value}" x="${x}" y="${y}" width="${bw - 3}" height="${Math.max(h, 1)}" rx="3" fill="${item.color || colorFor(vi)}"></rect>`;
        })
        .join("");
      return `${series}<text x="${gx + gw / 2}" y="${height - 12}" text-anchor="middle" fill="#1b191c" font-size="12">${esc(group.label)}</text>`;
    })
    .join("");

  return `<svg class="chart" data-chart="${esc(opts.title)}" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${esc(opts.title)}">
    <line x1="${pad.l}" x2="${width - pad.r}" y1="${zeroY}" y2="${zeroY}" stroke="#e8e8e8"></line>
    ${bars}
  </svg>`;
}

export function passEdgeChart(rows) {
  return groupedBarChart({
    title: "Pass edge vs threshold",
    groups: rows.map((row, i) => ({
      id: row.id,
      label: row.name || row.id,
      values: [
        { key: "edge", value: row.passEdge, color: colorFor(i) },
        { key: "threshold", value: row.twapThresholdPct, color: "#c8c8c8" },
      ],
    })),
  });
}

export function signalChart(rows) {
  return barChart({
    title: "Attack-pattern signals fired",
    unit: "",
    rows: rows.map((row, i) => ({
      id: row.id,
      label: row.name || row.id,
      value: row.firedCount,
      color: row.classification === "HIGH-RISK" ? "#9b2335" : colorFor(i),
    })),
  });
}

export function tiltChart(rows) {
  return groupedBarChart({
    title: "Volume alignment",
    groups: rows.map((row) => ({
      id: row.id,
      label: row.name || row.id,
      values: [
        { key: "pass", value: row.passAlignedShare * 100, color: "#4a5f80" },
        { key: "fail", value: row.failAlignedShare * 100, color: "#c8c8c8" },
      ],
    })),
  });
}

export function failByChart(rows) {
  return barChart({
    title: "Fail-by margin",
    unit: "%",
    rows: rows.map((row, i) => ({
      id: row.id,
      label: row.name || row.id,
      value: row.failByMargin,
      color: colorFor(i),
    })),
  });
}

export function treasuryChart(rows) {
  const series = rows.filter((row) => row.treasuryUsd != null);
  return barChart({
    title: "Treasury value (31 Jul 2026)",
    format: (n) => `$${(Number(n) / 1_000_000).toFixed(2)}M`,
    rows: series.map((row, i) => ({
      id: row.id,
      label: row.name || row.id,
      value: row.treasuryUsd,
      color: colorFor(i),
    })),
  });
}

export function premiumChart(rows) {
  const series = rows.filter((row) => row.premiumPct != null);
  return barChart({
    title: "Premium / discount to NAV",
    unit: "%",
    rows: series.map((row, i) => ({
      id: row.id,
      label: row.name || row.id,
      value: row.premiumPct,
      color: row.premiumPct < 0 ? "#9b2335" : colorFor(i),
    })),
  });
}
