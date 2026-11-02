/* Side-view planar IK for the SO-101 doing a top-down floor grasp.
   Drag (or arrow-key) the target; the gripper stays pointed straight down,
   so the wrist must sit L3 above the target and a 2-link solve places it. */
(function () {
  const canvas = document.getElementById("ik-canvas");
  if (!canvas) return;
  const R = window.ROBOT;
  const A = R.arm;
  const C = {
    accent: Site.css("--accent"), cyan: Site.css("--cyan"), line: Site.css("--line"),
    strong: Site.css("--line-strong"), muted: Site.css("--muted"), text: Site.css("--text"),
    bad: Site.css("--fail-detect"), surface: Site.css("--surface-2"),
  };
  const view = { xMin: -0.17, xMax: 0.46, zMin: -0.04, zMax: 0.37 };
  const deg = (r) => (r * 180) / Math.PI;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let target = { x: A.mountX + 0.17, z: 0 };
  let elbowDown = false;
  let tf = null;

  function solve(t) {
    // gripper points straight down, so the wrist sits L3 above the target
    const { t1, t2, reachable } = Kin.ik2(A.L1, A.L2, t.x - A.mountX, t.z + A.L3 - A.shoulderZ, elbowDown ? 1 : -1);
    const t3 = -Math.PI / 2 - t1 - t2;
    const S = { x: A.mountX, z: A.shoulderZ };
    const p = Kin.fk2({ x: S.x, y: S.z }, A.L1, A.L2, t1, t2);
    const E = { x: p.E.x, z: p.E.y };
    const W = { x: p.W.x, z: p.W.y };
    const T = { x: W.x, z: W.z - A.L3 };
    const inBody = (p) => p.x > R.body.xMin && p.x < R.body.xMax + 0.01 && p.z < R.body.height;
    const collides = [E, W, T].some(inBody) || E.z < 0 || T.z < -1e-3 || T.x - A.mountX < A.minReach;
    return { t1, t2, t3, S, E, W, T, reachable, collides };
  }

  function floorBand() {
    const z = A.L3 - A.shoulderZ;
    const max = A.L1 + A.L2, min = Math.abs(A.L1 - A.L2);
    return {
      near: A.mountX + Math.max(A.minReach, Math.sqrt(Math.max(0, min * min - z * z))),
      far: A.mountX + Math.sqrt(Math.max(0, max * max - z * z)),
    };
  }

  function draw(ctx, w, h) {
    const pad = 14;
    const s = Math.min((w - 2 * pad) / (view.xMax - view.xMin), (h - 2 * pad) / (view.zMax - view.zMin));
    const ox = (w - s * (view.xMax - view.xMin)) / 2, oy = (h - s * (view.zMax - view.zMin)) / 2;
    const X = (x) => ox + (x - view.xMin) * s;
    const Y = (z) => oy + (view.zMax - z) * s;
    tf = { X, Y, s, ox, oy };
    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = -0.15; x <= view.xMax; x += 0.05) { ctx.beginPath(); ctx.moveTo(X(x), Y(view.zMin)); ctx.lineTo(X(x), Y(view.zMax)); ctx.stroke(); }
    for (let z = 0; z <= view.zMax; z += 0.05) { ctx.beginPath(); ctx.moveTo(X(view.xMin), Y(z)); ctx.lineTo(X(view.xMax), Y(z)); ctx.stroke(); }

    // floor + hatching
    ctx.strokeStyle = C.strong;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(view.xMin), Y(0)); ctx.lineTo(X(view.xMax), Y(0)); ctx.stroke();
    ctx.lineWidth = 1;
    for (let x = view.xMin; x < view.xMax; x += 0.02) { ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x - 0.015), Y(-0.015)); ctx.stroke(); }

    // reachable floor band
    const band = floorBand();
    ctx.strokeStyle = C.accent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(X(band.near), Y(0)); ctx.lineTo(X(band.far), Y(0)); ctx.stroke();
    ctx.globalAlpha = 1;

    // wrist workspace circles
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = C.strong;
    ctx.lineWidth = 1;
    [A.L1 + A.L2, Math.abs(A.L1 - A.L2)].forEach((rad) => {
      ctx.beginPath(); ctx.arc(X(A.mountX), Y(A.shoulderZ), rad * s, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.setLineDash([]);

    // TurtleBot (side view)
    const b = R.body;
    ctx.fillStyle = C.surface;
    ctx.strokeStyle = C.strong;
    ctx.lineWidth = 1.5;
    [0.035, 0.09, 0.145].forEach((z) => {
      ctx.fillRect(X(b.xMin), Y(z + 0.006), (b.xMax - b.xMin) * s, 0.006 * s);
    });
    ctx.strokeRect(X(b.xMin), Y(0.17), (b.xMax - b.xMin) * s, 0.14 * s);
    ctx.fillStyle = "#222730";
    ctx.fillRect(X(-0.06), Y(b.height), 0.07 * s, 0.025 * s); // LiDAR
    ctx.beginPath(); ctx.arc(X(0), Y(R.wheelRadius), R.wheelRadius * s, 0, Math.PI * 2);
    ctx.fillStyle = "#1b1f28"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(R.caster.x), Y(0.008), 0.008 * s, 0, Math.PI * 2); ctx.stroke();
    // mount + arm base
    ctx.fillStyle = "#2a303c";
    ctx.fillRect(X(b.xMax), Y(0.06), (A.mountX - b.xMax) * s, 0.012 * s);
    ctx.fillRect(X(A.mountX - 0.02), Y(A.shoulderZ), 0.04 * s, (A.shoulderZ - 0.05) * s);

    const sol = solve(target);
    const ok = sol.reachable && !sol.collides;

    // arm links
    ctx.lineCap = "round";
    const link = (p, q, width, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.z)); ctx.lineTo(X(q.x), Y(q.z)); ctx.stroke();
    };
    link(sol.S, sol.E, 10, "#d9dde5");
    link(sol.E, sol.W, 9, "#d9dde5");
    link(sol.W, sol.T, 5, ok ? C.accent : C.bad);
    // fingers
    ctx.strokeStyle = ok ? C.accent : C.bad; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(sol.T.x - 0.015), Y(sol.T.z + 0.02)); ctx.lineTo(X(sol.T.x - 0.015), Y(sol.T.z)); ctx.moveTo(X(sol.T.x + 0.015), Y(sol.T.z + 0.02)); ctx.lineTo(X(sol.T.x + 0.015), Y(sol.T.z)); ctx.stroke();
    [sol.S, sol.E, sol.W].forEach((p) => {
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.z), 6, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0e12"; ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2.5; ctx.stroke();
    });

    // target
    const tc = ok ? C.accent : C.bad;
    if (!sol.reachable) {
      ctx.setLineDash([3, 4]); ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(sol.T.x), Y(sol.T.z)); ctx.lineTo(X(target.x), Y(target.z)); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = tc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(target.x), Y(target.z), 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(target.x) - 17, Y(target.z)); ctx.lineTo(X(target.x) + 17, Y(target.z)); ctx.moveTo(X(target.x), Y(target.z) - 17); ctx.lineTo(X(target.x), Y(target.z) + 17); ctx.stroke();

    // scale bar
    ctx.fillStyle = C.muted; ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    ctx.font = "11px JetBrains Mono, monospace";
    const sx = X(view.xMax - 0.13), sy = Y(view.zMax - 0.02);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 0.1 * s, sy); ctx.stroke();
    ctx.fillText("10 cm", sx + 0.1 * s + 6, sy + 4);
    ctx.fillText("reachable floor", X(band.near), Y(0) + 22);

    readout(sol, ok);
  }

  const status = document.getElementById("ik-status");
  const out = document.getElementById("ik-readout");
  function readout(sol, ok) {
    status.innerHTML = !sol.reachable
      ? '<span class="status-pill bad">Out of reach</span>'
      : sol.collides
      ? '<span class="status-pill warn">Collides (robot, floor or arm base)</span>'
      : '<span class="status-pill good">Reachable</span>';
    const rows = [
      ["θ₁ shoulder", `${deg(sol.t1).toFixed(1)}°`],
      ["θ₂ elbow", `${deg(sol.t2).toFixed(1)}°`],
      ["θ₃ wrist", `${deg(sol.t3).toFixed(1)}°`],
      ["target x", `${((target.x - A.mountX) * 100).toFixed(1)} cm`],
      ["target z", `${(target.z * 100).toFixed(1)} cm`],
    ];
    out.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const view2d = Site.canvas(canvas, draw);

  const toWorld = (p) => ({
    x: clamp(view.xMin + (p.x - tf.ox) / tf.s, R.body.xMax + 0.02, view.xMax - 0.01),
    z: clamp(view.zMax - (p.y - tf.oy) / tf.s, 0, view.zMax - 0.02),
  });
  let dragging = false;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    target = toWorld(Site.pointer(canvas, e));
    view2d.redraw();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    target = toWorld(Site.pointer(canvas, e));
    view2d.redraw();
  });
  canvas.addEventListener("pointerup", () => (dragging = false));
  canvas.addEventListener("keydown", (e) => {
    const d = 0.005;
    const moves = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (!moves[e.key]) return;
    e.preventDefault();
    target = { x: target.x + moves[e.key][0], z: Math.max(0, target.z + moves[e.key][1]) };
    view2d.redraw();
  });
  document.getElementById("ik-elbow").addEventListener("change", (e) => {
    elbowDown = e.target.checked;
    view2d.redraw();
  });
})();
