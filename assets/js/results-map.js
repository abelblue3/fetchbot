/* Results page: renders the trial map, the trial table, and the per-stage funnel
   from window.TRIALS / window.ARENA (assets/js/trials.js). */
(function () {
  const trials = window.TRIALS || [];
  const arena = window.ARENA;
  const STAGES = [
    { key: "detect", label: "Detect", color: "--fail-detect" },
    { key: "nav", label: "Navigate", color: "--fail-nav" },
    { key: "grasp", label: "Grasp", color: "--fail-grasp" },
    { key: "deliver", label: "Deliver", color: "--fail-deliver" },
  ];
  const col = (v) => Site.css(v);
  const firstFail = (t) => STAGES.find((s) => !t[s.key]);
  const outcomeColor = (t) => { const f = firstFail(t); return f ? col(f.color) : col("--ok"); };
  const outcomeText = (t) => { const f = firstFail(t); return f ? `Failed at ${f.label.toLowerCase()}` : "Delivered"; };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const stats = Site.trialStats(trials);
  document.querySelectorAll(".sample-flag").forEach((el) => (el.hidden = !stats.isSample));

  /* ---- map ---- */
  const wrap = document.getElementById("results-map");
  if (wrap && arena) {
    const S = 100, pad = 30;
    const W = arena.width * S, H = arena.height * S;
    const px = (x) => pad + x * S, py = (y) => pad + (arena.height - y) * S;
    let g = "";
    for (let x = 0; x <= arena.width + 1e-9; x += 0.5) g += `<line x1="${px(x)}" y1="${py(0)}" x2="${px(x)}" y2="${py(arena.height)}" stroke="rgba(255,255,255,${x % 1 === 0 ? 0.08 : 0.04})"/>`;
    for (let y = 0; y <= arena.height + 1e-9; y += 0.5) g += `<line x1="${px(0)}" y1="${py(y)}" x2="${px(arena.width)}" y2="${py(y)}" stroke="rgba(255,255,255,${y % 1 === 0 ? 0.08 : 0.04})"/>`;
    for (let x = 0; x <= arena.width; x += 1) g += `<text x="${px(x)}" y="${py(0) + 18}" fill="${col("--muted")}" font-size="11" text-anchor="middle">${x} m</text>`;
    for (let y = 1; y <= arena.height; y += 1) g += `<text x="${pad - 8}" y="${py(y) + 4}" fill="${col("--muted")}" font-size="11" text-anchor="end">${y}</text>`;
    g += `<rect x="${px(0)}" y="${py(arena.height)}" width="${W}" height="${H}" fill="none" stroke="${col("--line-strong")}" stroke-width="1.5"/>`;
    const d = arena.delivery;
    g += `<circle cx="${px(d.x)}" cy="${py(d.y)}" r="${d.r * S}" fill="rgba(200,255,46,0.06)" stroke="${col("--accent")}" stroke-dasharray="5 5"/>`;
    g += `<text x="${px(d.x)}" y="${py(d.y) - d.r * S - 6}" fill="${col("--accent")}" font-size="11" text-anchor="middle">${esc(d.label)}</text>`;
    g += `<circle cx="${px(d.x)}" cy="${py(d.y)}" r="4" fill="${col("--accent")}"/>`;

    trials.forEach((t) => {
      const c = outcomeColor(t);
      const sx = px(t.start.x), sy = py(t.start.y), ox = px(t.object.x), oy = py(t.object.y);
      g += `<line x1="${sx}" y1="${sy}" x2="${ox}" y2="${oy}" stroke="${c}" stroke-opacity="0.3" stroke-dasharray="3 4"/>`;
      // robot start pose: a small arrow pointing along theta (SVG y is flipped)
      g += `<g transform="translate(${sx} ${sy}) rotate(${-t.start.theta})" opacity="0.75">
              <rect x="-9" y="-8" width="16" height="16" rx="3" fill="#1b1f28" stroke="${col("--line-strong")}"/>
              <path d="M2 -5 L11 0 L2 5 Z" fill="${col("--text-2")}"/></g>`;
      g += `<g class="trial-dot" tabindex="0" role="img" aria-label="Trial ${t.id}: ${outcomeText(t)}" data-id="${t.id}">
              <circle cx="${ox}" cy="${oy}" r="9" fill="${c}"/>
              <text x="${ox}" y="${oy + 3.5}" font-size="9.5" font-weight="700" fill="#0a0b0e" text-anchor="middle">${t.id}</text></g>`;
    });
    wrap.innerHTML = `<svg viewBox="0 0 ${W + 2 * pad} ${H + 2 * pad}" role="group" aria-label="Top-down map of all trials" font-family="JetBrains Mono, monospace">${g}</svg><div class="map-tip" hidden></div>`;

    const tip = wrap.querySelector(".map-tip");
    const show = (el) => {
      const t = trials.find((x) => String(x.id) === el.dataset.id);
      const r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      tip.innerHTML = `<strong>Trial ${t.id}${t.sample ? " · sample" : ""}</strong>
        ${esc(t.objectType)} · <span style="color:${outcomeColor(t)}">${outcomeText(t)}</span><br>
        start (${t.start.x}, ${t.start.y}) m, ${t.start.theta}° · ${t.time} s${t.note ? `<br><em>${esc(t.note)}</em>` : ""}`;
      tip.hidden = false;
      const left = Math.min(r.left - wr.left + 16, wr.width - tip.offsetWidth - 4);
      tip.style.left = `${Math.max(4, left)}px`;
      tip.style.top = `${r.top - wr.top - tip.offsetHeight - 8 < 0 ? r.bottom - wr.top + 8 : r.top - wr.top - tip.offsetHeight - 8}px`;
    };
    wrap.querySelectorAll(".trial-dot").forEach((el) => {
      el.addEventListener("mouseenter", () => show(el));
      el.addEventListener("focus", () => show(el));
      el.addEventListener("mouseleave", () => (tip.hidden = true));
      el.addEventListener("blur", () => (tip.hidden = true));
    });
  }

  const legend = document.getElementById("results-legend");
  if (legend) {
    legend.innerHTML =
      `<li><span class="swatch" style="background:${col("--ok")}"></span>Delivered</li>` +
      STAGES.map((s) => `<li><span class="swatch" style="background:${col(s.color)}"></span>Failed at ${s.label.toLowerCase()}</li>`).join("") +
      `<li><span class="swatch" style="background:#1b1f28;border:1px solid ${col("--line-strong")};border-radius:3px"></span>Robot start pose</li>`;
  }

  /* ---- table ---- */
  const body = document.querySelector("#trials-table tbody");
  if (body) {
    body.innerHTML = trials.map((t) => {
      const f = firstFail(t);
      const cell = (s) => (t[s.key] ? '<td class="yes">✓</td>' : f && f.key === s.key ? '<td class="no">✗</td>' : '<td class="skip">–</td>');
      return `<tr><td class="num">${t.id}</td><td class="mono">(${t.start.x}, ${t.start.y}, ${t.start.theta}°)</td><td class="mono">(${t.object.x}, ${t.object.y})</td>
        <td>${esc(t.objectType)}</td>${STAGES.map(cell).join("")}<td class="num">${t.time}</td><td>${esc(t.note)}</td></tr>`;
    }).join("");
    const pct = (k) => (stats.n ? `${stats.passed[k]}/${stats.n}` : "–");
    document.querySelector("#trials-table tfoot").innerHTML =
      `<tr><td colspan="4">${stats.n} trials</td>${STAGES.map((s) => `<td>${pct(s.key)}</td>`).join("")}<td class="num">${stats.avgTime.toFixed(0)}</td><td>avg time of delivered runs</td></tr>`;
  }

  /* ---- stage funnel ---- */
  const bars = document.getElementById("stage-bars");
  if (bars) {
    bars.innerHTML = STAGES.map((s) => {
      const p = stats.n ? (100 * stats.passed[s.key]) / stats.n : 0;
      return `<div class="bar-row"><span class="bar-label">${s.label}</span><div class="bar-track"><div class="bar-fill" data-w="${p}"></div></div><span class="bar-val">${p.toFixed(0)}%</span></div>`;
    }).join("");
    const fill = () => bars.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = `${b.dataset.w}%`));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { fill(); io.disconnect(); } });
      io.observe(bars);
    } else fill();
  }
})();
