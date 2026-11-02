/* Three-pane synced player (external / onboard camera / RViz) with chapter buttons
   tied to the mission state machine. Config lives in MEDIA.synced (media.js).
   Works with no clips yet: a virtual clock drives the scrubber and chapters. */
(function () {
  const root = document.getElementById("synced-player");
  const cfg = window.MEDIA && window.MEDIA.synced;
  if (!root || !cfg) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  root.innerHTML = `
    <div class="synced-grid">
      ${cfg.panes.map((p) => `<div class="pane">${p.src
        ? `<video muted playsinline preload="metadata" src="${esc(p.src)}"></video>`
        : `<div class="placeholder" data-todo="${esc(p.todo)}"></div>`}<span class="pane-label">${esc(p.label)}</span></div>`).join("")}
    </div>
    <div class="synced-controls">
      <button class="play" type="button" aria-label="Play">▶</button>
      <input type="range" min="0" step="0.1" value="0" aria-label="Seek">
      <span class="time">0:00 / 0:00</span>
    </div>
    <div class="tabs fsm chapters">
      ${cfg.chapters.map((c, i) => `<button class="tab" type="button" data-i="${i}" aria-pressed="false">${esc(c.name)} <span class="muted">${fmt(c.t)}</span></button>`).join("")}
    </div>`;

  const videos = [...root.querySelectorAll("video")];
  const master = videos[0];
  const playBtn = root.querySelector(".play");
  const range = root.querySelector('input[type="range"]');
  const timeEl = root.querySelector(".time");
  const chapterBtns = [...root.querySelectorAll(".chapters .tab")];

  // virtual clock used when no clips exist
  let vt = 0, vPlaying = false, last = 0;
  const duration = () => (master && isFinite(master.duration) ? master.duration : cfg.duration);
  const now = () => (master ? master.currentTime : vt);
  const playing = () => (master ? !master.paused : vPlaying);

  function seek(t) {
    t = Math.max(0, Math.min(duration(), t));
    if (master) videos.forEach((v) => (v.currentTime = t));
    else vt = t;
    update();
  }
  function play() {
    if (master) videos.forEach((v) => v.play().catch(() => {}));
    else { vPlaying = true; last = performance.now(); requestAnimationFrame(tick); }
    update();
  }
  function pause() {
    if (master) videos.forEach((v) => v.pause());
    else vPlaying = false;
    update();
  }
  function tick(ts) {
    if (!vPlaying) return;
    vt += (ts - last) / 1000;
    last = ts;
    if (vt >= cfg.duration) { vt = cfg.duration; vPlaying = false; }
    update();
    requestAnimationFrame(tick);
  }
  function update() {
    const t = now(), d = duration();
    range.max = d;
    range.value = t;
    timeEl.textContent = `${fmt(t)} / ${fmt(d)}`;
    playBtn.textContent = playing() ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", playing() ? "Pause" : "Play");
    let cur = 0;
    cfg.chapters.forEach((c, i) => { if (t >= c.t) cur = i; });
    chapterBtns.forEach((b, i) => b.setAttribute("aria-pressed", i === cur));
    // keep followers within 0.15 s of the master
    if (master) videos.slice(1).forEach((v) => { if (Math.abs(v.currentTime - t) > 0.15) v.currentTime = t; });
  }

  playBtn.addEventListener("click", () => (playing() ? pause() : play()));
  range.addEventListener("input", () => seek(parseFloat(range.value)));
  chapterBtns.forEach((b) => b.addEventListener("click", () => seek(cfg.chapters[b.dataset.i].t)));
  if (master) {
    master.addEventListener("timeupdate", update);
    master.addEventListener("loadedmetadata", update);
    master.addEventListener("ended", update);
  }
  update();
})();
