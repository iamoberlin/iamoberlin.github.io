/**
 * Browser compare UI. Expects window.COMPARE_DATA and four chart mounts.
 */
import { failByChart, passEdgeChart, signalChart, tiltChart } from "./charts.js";

function selectedIds() {
  return [...document.querySelectorAll("[data-protocol-option]:checked")].map((el) => el.value);
}

function setStatus(text) {
  const el = document.querySelector("[data-compare-status]");
  if (el) el.textContent = text;
}

function renderCharts(rows) {
  const mounts = {
    edge: passEdgeChart,
    signals: signalChart,
    tilt: tiltChart,
    failby: failByChart,
  };
  for (const [key, draw] of Object.entries(mounts)) {
    const node = document.querySelector(`[data-chart-mount="${key}"]`);
    if (!node) continue;
    node.innerHTML = rows.length ? draw(rows) : "<p class='compare-empty'>Select at least one scored protocol.</p>";
  }

  const list = document.querySelector("[data-selected-cards]");
  if (list) {
    list.innerHTML = rows
      .map((row) => {
        const href = row.replayHref || `../replay/${row.id}/index.html`;
        return `<a class="card" href="${href}">
          <div class="idx">${row.slug || row.id}</div>
          <h3>${row.name || row.id}</h3>
          <p class="meta">${row.kind === "published" ? "Published forensics" : "Contrast fixture"} · ${row.classification}</p>
          <div class="pill-row"><span class="tag ${row.classification === "HIGH-RISK" ? "high" : "ok"}">${row.classification}</span><span class="tag">${row.firedCount}/${row.signalCount} signals</span></div>
        </a>`;
      })
      .join("");
  }
}

function syncChips() {
  const ids = selectedIds();
  const data = window.COMPARE_DATA || { replays: [] };
  const scored = new Set(data.replays.map((r) => r.id));
  const rows = data.replays.filter((r) => ids.includes(r.id));
  const unknown = ids.filter((id) => !scored.has(id));
  const label = document.querySelector("[data-picker-label]");
  if (label) {
    label.textContent = ids.length === 0 ? "Select protocols" : `${ids.length} selected`;
  }
  if (unknown.length && rows.length === 0) {
    setStatus("No scored replay for that protocol yet — pick one with a fixture, or score it via --json.");
  } else if (unknown.length) {
    setStatus(`Showing ${rows.length} scored ${rows.length === 1 ? "protocol" : "protocols"}. Catalog-only picks have no chart series.`);
  } else {
    setStatus(`Comparing ${rows.length} ${rows.length === 1 ? "protocol" : "protocols"}.`);
  }
  renderCharts(rows);
}

function togglePanel(open) {
  const panel = document.querySelector("[data-picker-panel]");
  const btn = document.querySelector("[data-picker-toggle]");
  if (!panel || !btn) return;
  const next = open ?? panel.hidden;
  panel.hidden = !next;
  btn.setAttribute("aria-expanded", String(next));
}

export function bindCompare() {
  const root = document.querySelector("[data-compare]");
  if (!root || !window.COMPARE_DATA) return;
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-protocol-option]")) syncChips();
  });
  const toggle = document.querySelector("[data-picker-toggle]");
  if (toggle) {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      togglePanel();
    });
  }
  document.addEventListener("click", (event) => {
    const wrap = document.querySelector("[data-picker]");
    if (wrap && !wrap.contains(event.target)) togglePanel(false);
  });
  syncChips();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindCompare);
  } else {
    bindCompare();
  }
}
