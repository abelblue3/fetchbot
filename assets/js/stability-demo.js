/* Static tip-over check. The robot is stable while the combined center of mass,
   projected onto the floor, stays inside the support polygon of its contact points.
   Three views: top-down, side elevation (leans when it tips), margin-vs-extension chart. */
(function (root) {
  const G = 9.81;

  function hull(points) {
    const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [], upper = [];
    for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q); }
    for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q); }
    return lower.slice(0, -1).concat(upper.slice(0, -1)); // counter-clockwise
  }

  // signed distance (+ inside, − outside), the closest edge, and that edge's outward normal
  function margin(poly, c) {
    let best = Infinity, edge = 0, inside = true;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ex = b.x - a.x, ey = b.y - a.y;
      if (ex * (c.y - a.y) - ey * (c.x - a.x) < 0) inside = false;
      const t = Math.max(0, Math.min(1, ((c.x - a.x) * ex + (c.y - a.y) * ey) / (ex * ex + ey * ey)));
      const dist = Math.hypot(c.x - (a.x + t * ex), c.y - (a.y + t * ey));
      if (dist < best) { best = dist; edge = i; }
    }
    const a = poly[edge], b = poly[(edge + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    return { m: inside ? best : -best, edge, normal: { x: (b.y - a.y) / len, y: -(b.x - a.x) / len } };
  }

  function tipDirection(r) {
    if (r.m > 0.01) return "none";
    if (Math.abs(r.normal.x) > 0.75) return r.normal.x > 0 ? "forward" : "backward";
    return r.normal.y > 0 ? "left" : "right";
  }

  // p = { ext, pan (deg), payload (kg), caster (bool) }
  function compute(R, p) {
    const A = R.arm;
    const contacts = [{ x: 0, y: R.wheelTrack / 2 }, { x: 0, y: -R.wheelTrack / 2 }, { x: R.caster.x, y: R.caster.y }];
    if (p.caster) contacts.push({ x: R.addedCaster.x, y: R.addedCaster.y });
    const poly = hull(contacts);

    // arm in its own vertical plane: r = horizontal distance from the pan axis, z = height.
    // The wrist sits holdHeight + L3 above the floor (gripper down, object just lifted). Elbow-up branch.
    const wz = A.holdHeight + A.L3;
    const sol = Kin.ik2(A.L1, A.L2, p.ext, wz - A.shoulderZ, -1);
    const k = Kin.fk2({ x: 0, y: A.shoulderZ }, A.L1, A.L2, sol.t1, sol.t2);
    const arm = {
      S: { r: 0, z: A.shoulderZ },
      E: { r: k.E.x, z: k.E.y },
      W: { r: k.W.x, z: k.W.y },
      T: { r: k.W.x, z: k.W.y - A.L3 },
    };
    const a = (p.pan * Math.PI) / 180;
    const at = (r, z) => ({ x: A.mountX + r * Math.cos(a), y: r * Math.sin(a), z });
    const mid = (P, Q) => at((P.r + Q.r) / 2, (P.z + Q.z) / 2);
    const parts = [
      { name: "robot", m: R.baseMass, ...R.baseCom },
      { name: "arm base", m: A.baseMass, x: A.mountX, y: 0, z: A.shoulderZ - 0.04 },
      { name: "upper arm", m: A.linkMass / 2, ...mid(arm.S, arm.E) },
      { name: "forearm", m: A.linkMass / 2, ...mid(arm.E, arm.W) },
      { name: "gripper + payload", m: A.gripperMass + p.payload, ...mid(arm.W, arm.T) },
    ];
    const M = parts.reduce((s, q) => s + q.m, 0);
    const com = {};
    for (const key of ["x", "y", "z"]) com[key] = parts.reduce((s, q) => s + q.m * q[key], 0) / M;
    const mg = margin(poly, com);
    const out = { contacts, poly, parts, M, com, arm, at, reachable: sol.reachable, ...mg };
    out.aMax = mg.m > 0 ? (G * mg.m) / com.z : 0;
    out.tip = tipDirection(out);
    return out;
  }

  root.StabilityModel = { compute, hull, margin, tipDirection };
  if (typeof document === "undefined") return;

  /* ===================== DOM ===================== */
  const topCanvas = document.getElementById("stab-canvas");
  const sideCanvas = document.getElementById("stab-side");
  const chartCanvas = document.getElementById("stab-chart");
  if (!topCanvas || !sideCanvas || !chartCanvas) return;
  const R = window.ROBOT;
  const A = R.arm;
  const C = {
    accent: Site.css("--accent"), cyan: Site.css("--cyan"), strong: Site.css("--line-strong"),
    muted: Site.css("--muted"), text: Site.css("--text"), bad: Site.css("--fail-detect"), warn: Site.css("--fail-nav"),
    surface: Site.css("--surface-2"),
  };
  const state = { ext: 0.12, pan: 0, payload: 0.05, caster: false };
  let res = compute(R, state);
  const statusColor = (r) => (r.m > 0.01 ? C.accent : r.m > 0 ? C.warn : C.bad);
  const grid = (ctx, w, h, X, Y, x0, x1, y0, y1) => {
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let x = Math.ceil(x0 / 0.05) * 0.05; x <= x1; x += 0.05) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); ctx.stroke(); }
    for (let y = Math.ceil(y0 / 0.05) * 0.05; y <= y1; y += 0.05) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); ctx.stroke(); }
  };
  const fit = (w, h, v, pad = 8) => {
    const s = Math.min((w - 2 * pad) / (v.x1 - v.x0), (h - 2 * pad) / (v.y1 - v.y0));
    const ox = (w - s * (v.x1 - v.x0)) / 2, oy = (h - s * (v.y1 - v.y0)) / 2;
    return { s, X: (x) => ox + (x - v.x0) * s, Y: (y) => oy + (v.y1 - y) * s };
  };

  /* ---------- top-down ---------- */
  const topView = { x0: -0.14, x1: 0.36, y0: -0.27, y1: 0.27 };
  function drawTop(ctx, w, h) {
    const { s, X, Y } = fit(w, h, topView);
    ctx.clearRect(0, 0, w, h);
    grid(ctx, w, h, X, Y, topView.x0, topView.x1, topView.y0, topView.y1);
    const r = res, col = statusColor(r);

    const b = R.body;
    ctx.strokeStyle = C.strong; ctx.lineWidth = 1.5; ctx.fillStyle = "#151920";
    ctx.fillRect(X(b.xMin), Y(b.yHalf), (b.xMax - b.xMin) * s, 2 * b.yHalf * s);
    ctx.strokeRect(X(b.xMin), Y(b.yHalf), (b.xMax - b.xMin) * s, 2 * b.yHalf * s);
    ctx.fillStyle = "#2a303c";
    ctx.fillRect(X(b.xMax), Y(0.025), (A.mountX + 0.02 - b.xMax) * s, 0.05 * s);

    // support polygon + tipping edge
    ctx.beginPath();
    r.poly.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.closePath();
    ctx.fillStyle = "rgba(58,214,255,0.10)"; ctx.fill();
    ctx.strokeStyle = "rgba(58,214,255,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    const e0 = r.poly[r.edge], e1 = r.poly[(r.edge + 1) % r.poly.length];
    ctx.strokeStyle = col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(X(e0.x), Y(e0.y)); ctx.lineTo(X(e1.x), Y(e1.y)); ctx.stroke();
    r.contacts.forEach((p) => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 5, 0, Math.PI * 2); ctx.fillStyle = C.cyan; ctx.fill(); });

    // arm, projected onto the floor
    const pts = ["S", "E", "W"].map((k) => r.at(r.arm[k].r, 0));
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke();

    r.parts.forEach((p) => {
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3 + 6 * Math.sqrt(p.m), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(238,240,244,0.18)"; ctx.fill(); ctx.strokeStyle = "rgba(238,240,244,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    });
    crosshair(ctx, X(r.com.x), Y(r.com.y), col);
    ctx.fillStyle = C.muted; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("forward →", w - 70, h - 10);
  }

  function crosshair(ctx, x, y, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 15); ctx.stroke();
    ctx.fillStyle = col; ctx.font = "10px JetBrains Mono, monospace"; ctx.fillText("COM", x + 12, y - 11);
  }

  /* ---------- side view (x forward, z up) ---------- */
  const sideView = { x0: -0.16, x1: 0.37, y0: -0.05, y1: 0.42 };
  let lean = 0, leanTarget = 0, leanPivot = 0, leanRaf = 0;

  function sideLeanTarget(r) {
    if (r.tip !== "forward" && r.tip !== "backward") return { angle: 0, pivot: 0 };
    const xs = r.contacts.map((c) => c.x);
    const pivot = r.tip === "forward" ? Math.max(...xs) : Math.min(...xs);
    let angle = Math.min(14, 6 + 1.5 * Math.abs(r.m) * 100) * (Math.PI / 180);
    // whatever is ahead of the pivot touches the floor first and props the robot up
    const proj = Math.cos((state.pan * Math.PI) / 180);
    const low = [{ x: A.mountX + r.arm.T.r * proj, z: r.arm.T.z - (state.payload > 0 ? 0.01 : 0) }, { x: R.body.xMax, z: 0.01 }];
    for (const q of low) {
      const dx = (q.x - pivot) * (r.tip === "forward" ? 1 : -1);
      if (dx > 0.005) angle = Math.min(angle, Math.atan2(Math.max(q.z, 0.002), dx));
    }
    return { angle: Math.max(angle, 2 * (Math.PI / 180)) * (r.tip === "forward" ? 1 : -1), pivot };
  }

  function drawSide(ctx, w, h) {
    const { s, X, Y } = fit(w, h, sideView);
    ctx.clearRect(0, 0, w, h);
    grid(ctx, w, h, X, Y, sideView.x0, sideView.x1, 0, sideView.y1);
    const r = res, col = statusColor(r);
    const b = R.body;

    // floor + support span
    ctx.strokeStyle = C.strong; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
    const xs = r.contacts.map((c) => c.x);
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 4; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(X(Math.min(...xs)), Y(0)); ctx.lineTo(X(Math.max(...xs)), Y(0)); ctx.stroke();
    ctx.globalAlpha = 1;

    // everything attached to the robot leans about the pivot
    ctx.save();
    ctx.translate(X(leanPivot), Y(0));
    ctx.rotate(lean);
    ctx.translate(-X(leanPivot), -Y(0));

    ctx.fillStyle = C.surface; ctx.strokeStyle = C.strong; ctx.lineWidth = 1.5;
    [0.035, 0.09, 0.145].forEach((z) => ctx.fillRect(X(b.xMin), Y(z + 0.006), (b.xMax - b.xMin) * s, 0.006 * s));
    ctx.strokeRect(X(b.xMin), Y(0.17), (b.xMax - b.xMin) * s, 0.14 * s);
    ctx.fillStyle = "#222730"; ctx.fillRect(X(-0.06), Y(b.height + 0.006), 0.07 * s, 0.025 * s);
    ctx.beginPath(); ctx.arc(X(0), Y(R.wheelRadius), R.wheelRadius * s, 0, Math.PI * 2);
    ctx.fillStyle = "#1b1f28"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(R.caster.x), Y(0.008), 0.008 * s, 0, Math.PI * 2); ctx.stroke();
    if (state.caster) {
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(b.xMax), Y(0.03)); ctx.lineTo(X(R.addedCaster.x), Y(0.03)); ctx.lineTo(X(R.addedCaster.x), Y(0.016)); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(R.addedCaster.x), Y(0.008), 0.008 * s, 0, Math.PI * 2); ctx.stroke();
    }
    // mount + arm base
    ctx.fillStyle = "#2a303c";
    ctx.fillRect(X(b.xMax), Y(0.072), (A.mountX + 0.02 - b.xMax) * s, 0.012 * s);
    ctx.fillRect(X(A.mountX - 0.02), Y(A.shoulderZ), 0.04 * s, (A.shoulderZ - 0.05) * s);

    // arm (foreshortened by the pan angle)
    const proj = Math.cos((state.pan * Math.PI) / 180);
    const P = (k) => ({ x: X(A.mountX + r.arm[k].r * proj), y: Y(r.arm[k].z) });
    const S = P("S"), E = P("E"), W = P("W"), T = P("T");
    ctx.lineCap = "round";
    ctx.strokeStyle = "#d9dde5"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(E.x, E.y); ctx.lineTo(W.x, W.y); ctx.stroke();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(W.x, W.y); ctx.lineTo(T.x, T.y); ctx.stroke();
    if (state.payload > 0) {
      const sz = (0.016 + 0.03 * (state.payload / 0.3)) * s;
      ctx.fillStyle = "rgba(255,92,92,0.85)";
      ctx.fillRect(T.x - sz / 2, T.y - sz * 0.6, sz, sz);
    }
    [S, E, W].forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0e12"; ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.stroke();
    });

    // center of mass + plumb line
    const cx = X(r.com.x), cy = Y(r.com.z);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    crosshair(ctx, cx, cy, col);
    ctx.restore();

    ctx.font = "10px JetBrains Mono, monospace";
    if (r.tip === "forward" || r.tip === "backward") {
      ctx.fillStyle = C.bad;
      ctx.beginPath(); ctx.arc(X(leanPivot), Y(0), 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillText("pivot", X(leanPivot) - 14, Y(0) + 18);
    } else if (r.tip !== "none") {
      ctx.fillStyle = C.bad;
      ctx.fillText(`tips ${r.tip}: see top-down`, 10, h - 10);
    }
    ctx.fillStyle = C.muted;
    ctx.fillText("forward →", w - 70, h - 10);
  }

  function animateLean() {
    leanRaf = 0;
    const d = leanTarget - lean;
    lean = Math.abs(d) < 0.0005 ? leanTarget : lean + d * 0.18;
    side.redraw();
    if (lean !== leanTarget) leanRaf = requestAnimationFrame(animateLean);
  }

  /* ---------- chart: margin vs. extension ---------- */
  const EXT_MIN = 0.02, EXT_MAX = 0.25, N = 60;
  function drawChart(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 46, r: 28, t: 16, b: 28 };
    const series = [false, true].map((caster) => {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const ext = EXT_MIN + ((EXT_MAX - EXT_MIN) * i) / N;
        pts.push({ ext, m: compute(R, { ...state, ext, caster }).m * 100 });
      }
      return { caster, pts };
    });
    const all = series.flatMap((sr) => sr.pts.map((p) => p.m)).concat([0]);
    let lo = Math.min(...all), hi = Math.max(...all);
    const span = Math.max(hi - lo, 1);
    lo -= span * 0.12; hi += span * 0.12;
    const X = (e) => pad.l + ((e - EXT_MIN) / (EXT_MAX - EXT_MIN)) * (w - pad.l - pad.r);
    const Y = (m) => pad.t + ((hi - m) / (hi - lo)) * (h - pad.t - pad.b);

    // "tips over" region
    ctx.fillStyle = "rgba(255,92,92,0.07)";
    ctx.fillRect(pad.l, Y(0), w - pad.l - pad.r, Y(lo) - Y(0));
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(255,92,92,0.75)";
    if (Y(lo) - Y(0) > 18) ctx.fillText("tips over", pad.l + 8, Y(lo) - 8);

    // y ticks
    const step = [0.5, 1, 2, 5, 10, 20].find((st) => (hi - lo) / st <= 6) || 50;
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.textAlign = "right";
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke();
      ctx.fillText(`${+v.toFixed(1)}`, pad.l - 8, Y(v) + 3);
    }
    ctx.textAlign = "center";
    for (let e = 0.05; e <= EXT_MAX + 1e-9; e += 0.05) ctx.fillText(`${Math.round(e * 100)} cm`, X(e), h - 9);
    ctx.textAlign = "left";
    ctx.fillText("margin (cm)", 6, 11);

    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.strong; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke(); ctx.setLineDash([]);

    // curves (inactive first)
    const styleOf = (sr) => ({ color: sr.caster ? C.accent : "#9aa3b2", width: sr.caster === state.caster ? 3 : 1.5, alpha: sr.caster === state.caster ? 1 : 0.55 });
    const ordered = series.filter((sr) => sr.caster !== state.caster).concat(series.filter((sr) => sr.caster === state.caster));
    ordered.forEach((sr) => {
      const st = styleOf(sr);
      ctx.globalAlpha = st.alpha; ctx.strokeStyle = st.color; ctx.lineWidth = st.width; ctx.lineJoin = "round";
      ctx.beginPath(); sr.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.ext), Y(p.m)) : ctx.moveTo(X(p.ext), Y(p.m)))); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // current setting
    const ce = Math.min(EXT_MAX, Math.max(EXT_MIN, state.ext));
    ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(238,240,244,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(ce), pad.t); ctx.lineTo(X(ce), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(X(ce), Y(res.m * 100), 6, 0, Math.PI * 2);
    ctx.fillStyle = statusColor(res); ctx.fill(); ctx.strokeStyle = "#0c0e12"; ctx.lineWidth = 2; ctx.stroke();

    // legend
    const lg = [["with front caster", C.accent], ["without", "#9aa3b2"]];
    ctx.textAlign = "left";
    let lx = w - pad.r - 230;
    lg.forEach(([label, color]) => {
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx, pad.t + 4); ctx.lineTo(lx + 18, pad.t + 4); ctx.stroke();
      ctx.fillStyle = C.text; ctx.fillText(label, lx + 24, pad.t + 8);
      lx += 24 + ctx.measureText(label).width + 18;
    });
  }

  /* ---------- readouts + wiring ---------- */
  const status = document.getElementById("stab-status");
  const out = document.getElementById("stab-readout");
  function readout() {
    const r = res;
    status.innerHTML = r.m > 0.01
      ? '<span class="status-pill good">Stable</span>'
      : r.m > 0
      ? '<span class="status-pill warn">Marginal: any bump tips it</span>'
      : '<span class="status-pill bad">Tips over</span>';
    const rows = [
      ["total mass", `${r.M.toFixed(2)} kg`],
      ["COM x, y, z", `${(r.com.x * 100).toFixed(1)}, ${(r.com.y * 100).toFixed(1)}, ${(r.com.z * 100).toFixed(1)} cm`],
      ["margin", `${(r.m * 100).toFixed(1)} cm`],
      ["max decel", r.m > 0 ? `${r.aMax.toFixed(2)} m/s²` : "–"],
      ["tip direction", r.tip === "none" ? "–" : r.tip],
    ];
    out.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const top = Site.canvas(topCanvas, drawTop);
  const side = Site.canvas(sideCanvas, drawSide);
  const chart = Site.canvas(chartCanvas, drawChart);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function update() {
    res = compute(R, state);
    const lt = sideLeanTarget(res);
    leanTarget = lt.angle;
    if (lt.angle !== 0) leanPivot = lt.pivot;
    if (reduce) lean = leanTarget;
    top.redraw(); side.redraw(); chart.redraw();
    readout();
    if (!reduce && !leanRaf && lean !== leanTarget) leanRaf = requestAnimationFrame(animateLean);
  }

  Site.slider("stab-ext", (x) => { state.ext = x; update(); }, (x) => `${(x * 100).toFixed(0)} cm`);
  Site.slider("stab-pan", (x) => { state.pan = x; update(); }, (x) => `${x}°`);
  Site.slider("stab-payload", (x) => { state.payload = x; update(); }, (x) => `${(x * 1000).toFixed(0)} g`);
  document.getElementById("stab-caster").addEventListener("change", (e) => { state.caster = e.target.checked; update(); });
})(typeof window !== "undefined" ? window : globalThis);
