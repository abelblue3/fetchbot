/* Top-down reach map. Which floor points can the gripper grasp from where Nav2 parks
   the robot, and does Nav2's goal tolerance keep the object inside that region? */
(function () {
  const canvas = document.getElementById("reach-canvas");
  if (!canvas) return;
  const R = window.ROBOT;
  const A = R.arm;
  const C = {
    accent: Site.css("--accent"), cyan: Site.css("--cyan"), strong: Site.css("--line-strong"),
    muted: Site.css("--muted"), text: Site.css("--text"), bad: Site.css("--fail-detect"),
    warn: Site.css("--fail-nav"), surface: Site.css("--surface-2"),
  };
  const rad = (d) => (d * Math.PI) / 180;

  // horizontal distance from the pan axis at which a straight-down gripper touches the floor
  const dz = A.L3 - A.shoulderZ;
  const rFar = Math.sqrt(Math.max(0, (A.L1 + A.L2) ** 2 - dz * dz));
  const rNear = Math.max(A.minReach, Math.sqrt(Math.max(0, (A.L1 - A.L2) ** 2 - dz * dz)));
  const sweet = A.mountX + (rNear + rFar) / 2;

  let d = Math.round(sweet * 200) / 200;
  let tol = R.navTolerance;

  const inBody = (x, y) => x > R.body.xMin && x < R.body.xMax + 0.01 && Math.abs(y) < R.body.yHalf + 0.01;
  function inReach(x, y) {
    const dx = x - A.mountX;
    const r = Math.hypot(dx, y);
    const ang = Math.abs((Math.atan2(y, dx) * 180) / Math.PI);
    return r >= rNear && r <= rFar && ang <= A.panLimit && !inBody(x, y);
  }
  function coverage() {
    const pts = [[d, 0]];
    for (let ring = 1; ring <= 3; ring++)
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2, r = (tol * ring) / 3;
        pts.push([d + r * Math.cos(a), r * Math.sin(a)]);
      }
    const okCount = pts.filter(([x, y]) => inReach(x, y)).length;
    return { center: inReach(d, 0), frac: okCount / pts.length };
  }

  const view = { xMin: -0.2, xMax: 0.56, yMin: -0.3, yMax: 0.3 };
  function draw(ctx, w, h) {
    const s = Math.min(w / (view.xMax - view.xMin), h / (view.yMax - view.yMin));
    const ox = (w - s * (view.xMax - view.xMin)) / 2, oy = (h - s * (view.yMax - view.yMin)) / 2;
    const X = (x) => ox + (x - view.xMin) * s, Y = (y) => oy + (view.yMax - y) * s;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let x = -0.2; x <= view.xMax; x += 0.05) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); ctx.stroke(); }
    for (let y = -0.3; y <= view.yMax; y += 0.05) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); ctx.stroke(); }

    // reachable annular sector
    const mx = X(A.mountX), my = Y(0), lim = rad(A.panLimit);
    ctx.beginPath();
    ctx.arc(mx, my, rFar * s, -lim, lim);
    ctx.arc(mx, my, rNear * s, lim, -lim, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(200,255,46,0.14)"; ctx.fill();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.stroke();

    // robot body (drawn over the sector = unreachable)
    const b = R.body;
    ctx.fillStyle = "#1b1f28"; ctx.strokeStyle = C.strong; ctx.lineWidth = 1.5;
    ctx.fillRect(X(b.xMin), Y(b.yHalf), (b.xMax - b.xMin) * s, 2 * b.yHalf * s);
    ctx.strokeRect(X(b.xMin), Y(b.yHalf), (b.xMax - b.xMin) * s, 2 * b.yHalf * s);
    ctx.fillStyle = "#2a303c";
    [1, -1].forEach((sg) => ctx.fillRect(X(-R.wheelRadius), Y(sg * R.wheelTrack / 2 + 0.009), 2 * R.wheelRadius * s, 0.018 * s));
    ctx.beginPath(); ctx.arc(X(-0.032), Y(0), 0.035 * s, 0, Math.PI * 2); ctx.strokeStyle = C.strong; ctx.stroke();
    ctx.beginPath(); ctx.arc(X(R.caster.x), Y(0), 0.008 * s, 0, Math.PI * 2); ctx.stroke();
    // mount
    ctx.fillStyle = C.cyan;
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();

    // sweet-spot tick
    ctx.strokeStyle = C.muted; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(sweet), Y(view.yMax)); ctx.lineTo(X(sweet), Y(view.yMin)); ctx.stroke(); ctx.setLineDash([]);

    // object + tolerance disc
    const cov = coverage();
    const col = cov.frac === 1 ? C.accent : cov.center ? C.warn : C.bad;
    ctx.strokeStyle = col; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(X(d), Y(0), Math.max(tol * s, 0.5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.fillRect(X(d) - 6, Y(0) - 6, 12, 12);
    if (cov.center) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(X(d) - 8, Y(0)); ctx.stroke();
    }

    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = C.muted;
    ctx.fillText("forward →", X(view.xMax) - 72, Y(view.yMin) - 8);
    ctx.fillText("sweet spot", X(sweet) + 4, Y(view.yMax) + 14);
    readout(cov);
  }

  const status = document.getElementById("reach-status");
  const out = document.getElementById("reach-readout");
  function readout(cov) {
    status.innerHTML = cov.frac === 1
      ? '<span class="status-pill good">Always reachable</span>'
      : cov.center
      ? `<span class="status-pill warn">Reachable ${Math.round(cov.frac * 100)}% of the time</span>`
      : '<span class="status-pill bad">Out of reach</span>';
    const rows = [
      ["reach band", `${((A.mountX + rNear) * 100).toFixed(0)}–${((A.mountX + rFar) * 100).toFixed(0)} cm`],
      ["sweet spot d*", `${(sweet * 100).toFixed(1)} cm`],
      ["max tolerance", `±${(((rFar - rNear) / 2) * 100).toFixed(1)} cm`],
    ];
    out.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const v = Site.canvas(canvas, draw);
  const dInput = document.getElementById("reach-d");
  dInput.value = d;
  Site.slider("reach-d", (x) => { d = x; v.redraw(); }, (x) => `${(x * 100).toFixed(1)} cm`);
  const tInput = document.getElementById("reach-tol");
  tInput.value = tol;
  Site.slider("reach-tol", (x) => { tol = x; v.redraw(); }, (x) => `±${(x * 100).toFixed(1)} cm`);
})();
