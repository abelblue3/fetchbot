/* =========================================================================
   Shared site behaviour. Edit SITE and PAGES below; every page picks them up.
   ========================================================================= */
document.documentElement.classList.add("js");

const SITE = {
  name: "FetchBot", // TODO: final project name
  course: "EECS C106A / 206A · Fall 2026",
  repo: "https://github.com/abelblue3/fetchbot",
  slides: "materials.html#presentation",
  team: ["Abel Cisneros", "Charles (Chase) Ballentine", "Gloria Li", "Corey Won"],
};

// Order here = order in the nav and the prev/next pager.
const PAGES = [
  { href: "index.html", label: "Home" },
  { href: "design.html", label: "Design" },
  { href: "implementation.html", label: "Implementation" },
  { href: "results.html", label: "Results" },
  { href: "conclusion.html", label: "Conclusion" },
  { href: "team.html", label: "Team" },
  { href: "log.html", label: "Build Log" },
  { href: "materials.html", label: "Materials" },
];

const LIBS = {
  katexCss: "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css",
  katexJs: "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js",
  katexAuto: "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js",
  prismCss: "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css",
  prismJs: "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js",
  prismLangs: ["python", "bash", "yaml"].map(
    (l) => `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${l}.min.js`
  ),
};

const BRAND_SVG = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="17" width="18" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="28" r="2.4" fill="#c8ff2e"/><circle cx="17" cy="28" r="2.4" fill="#c8ff2e"/><path d="M15 17 L19 9 L27 11 L28 17" fill="none" stroke="#c8ff2e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 17 l0 4 M30 17 l0 4" stroke="#c8ff2e" stroke-width="2" stroke-linecap="round"/></svg>`;

const Site = (window.Site = {});

function currentPage() {
  const file = location.pathname.split("/").pop();
  return file === "" ? "index.html" : file;
}

/* ---------- nav + footer ---------- */
function renderChrome() {
  const here = currentPage();
  const nav = document.getElementById("site-nav");
  if (nav) {
    nav.className = "site-nav";
    nav.innerHTML = `
      <div class="container">
        <a class="brand" href="index.html">${BRAND_SVG}<span>${SITE.name}</span></a>
        <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav-links"><span></span><span></span><span></span></button>
        <ul class="nav-links" id="nav-links">
          ${PAGES.map(
            (p) => `<li><a href="${p.href}"${p.href === here ? ' aria-current="page"' : ""}>${p.label}</a></li>`
          ).join("")}
        </ul>
      </div>`;
    const toggle = nav.querySelector(".nav-toggle");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    nav.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => nav.classList.remove("open"))
    );
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container footer-grid">
        <div>
          <p><strong>${SITE.name}</strong>: autonomous mobile manipulation with a TurtleBot3 and SO-101 arm.</p>
          <p class="muted">${SITE.course} · ${SITE.team.join(", ")}</p>
        </div>
        <ul class="footer-links">
          ${PAGES.map((p) => `<li><a href="${p.href}">${p.label}</a></li>`).join("")}
          <li><a href="${SITE.repo}">GitHub ↗</a></li>
          <li><a href="#top">Back to top ↑</a></li>
        </ul>
      </div>`;
  }

  // prev / next pager
  const pager = document.getElementById("pager");
  if (pager) {
    const i = PAGES.findIndex((p) => p.href === here);
    const prev = PAGES[i - 1];
    const next = PAGES[i + 1];
    pager.className = "pager";
    pager.innerHTML =
      (prev ? `<a class="prev" href="${prev.href}"><small>← Previous</small><span>${prev.label}</span></a>` : "") +
      (next ? `<a class="next" href="${next.href}"><small>Next →</small><span>${next.label}</span></a>` : "");
  }

  document.querySelectorAll("[data-site]").forEach((el) => {
    const key = el.dataset.site;
    if (el.tagName === "A") el.href = SITE[key];
    else el.textContent = SITE[key];
  });
}

/* ---------- media slots (see media.js) ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function renderMedia() {
  const MEDIA = window.MEDIA || {};
  document.querySelectorAll("[data-media]").forEach((slot) => {
    const m = MEDIA[slot.dataset.media];
    const caption = slot.dataset.caption || (m && m.title) || "";
    const vertical = m && m.vertical;
    let inner;
    if (!m || m.kind === "none") {
      const todo = (m && m.todo) || `video slot "${slot.dataset.media}"`;
      inner = `<div class="placeholder" data-todo="${esc(todo)}"></div>`;
    } else if (m.kind === "youtube") {
      inner = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(m.id)}?rel=0" title="${esc(m.title || "Video")}" loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    } else if (m.kind === "mp4") {
      inner = `<video controls playsinline preload="metadata" src="${esc(m.src)}"${m.poster ? ` poster="${esc(m.poster)}"` : ""}></video>`;
    }
    const badge = m && m.placeholder
      ? `<a class="media-credit" href="${esc(m.creditUrl || "#")}" target="_blank" rel="noopener">Placeholder video from ${esc(m.credit || "another team")}</a>`
      : "";
    slot.classList.add("media");
    if (vertical) slot.classList.add("vertical");
    slot.innerHTML = `<div class="media-frame">${badge}${inner}</div>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}`;
  });

  const heroBg = document.querySelector(".hero-bg");
  const loop = MEDIA.heroLoop;
  if (heroBg && loop && loop.kind === "mp4" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    heroBg.insertAdjacentHTML("afterbegin", `<video autoplay muted loop playsinline src="${esc(loop.src)}"></video>`);
  }
}

/* ---------- tabs ([data-tabs] container with .tab buttons + .tab-panel) ---------- */
function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus();
        select(n);
      });
    });
    select(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
  });
}

/* ---------- scroll reveal + counters ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

Site.countUp = function (el, value, decimals = 0) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (v) => v.toFixed(decimals);
  if (reduce || !("IntersectionObserver" in window)) {
    el.textContent = fmt(value);
    return;
  }
  el.textContent = fmt(0);
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1200);
      el.textContent = fmt(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  io.observe(el);
};

/* ---------- copy buttons on code blocks ---------- */
function initCopy() {
  document.querySelectorAll(".code-block").forEach((block) => {
    const pre = block.querySelector("pre");
    if (!pre) return;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Select + Ctrl+C";
      }
      setTimeout(() => (btn.textContent = "Copy"), 1600);
    });
    block.appendChild(btn);
  });
}

/* ---------- lazy-load KaTeX / Prism only on pages that need them ---------- */
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
function loadCss(href) {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

async function initLibs() {
  if (document.body.hasAttribute("data-math")) {
    loadCss(LIBS.katexCss);
    try {
      await loadScript(LIBS.katexJs);
      await loadScript(LIBS.katexAuto);
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "canvas"],
        throwOnError: false,
      });
    } catch (e) {
      console.warn("KaTeX failed to load (offline?)", e);
    }
  }
  if (document.querySelector('code[class*="language-"]')) {
    loadCss(LIBS.prismCss);
    window.Prism = window.Prism || {};
    window.Prism.manual = true;
    try {
      await loadScript(LIBS.prismJs);
      await Promise.all(LIBS.prismLangs.map(loadScript));
      window.Prism.highlightAll();
    } catch (e) {
      console.warn("Prism failed to load (offline?)", e);
    }
  }
}

/* ---------- helpers shared by the canvas widgets ---------- */
Site.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Sizes a canvas to its CSS box at device-pixel resolution and calls draw(ctx, w, h)
// on every resize. Returns { redraw }.
Site.canvas = function (canvas, draw) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = r.width;
    h = r.height;
    draw(ctx, w, h);
  };
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);
  resize();
  return { redraw: () => w && draw(ctx, w, h) };
};

Site.pointer = (canvas, e) => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

// Binds an <input type=range> to an <output> and a callback.
Site.slider = function (id, onInput, fmt = (v) => v) {
  const input = document.getElementById(id);
  const out = document.querySelector(`output[for="${id}"]`);
  const update = () => {
    const v = parseFloat(input.value);
    if (out) out.textContent = fmt(v);
    onInput(v);
  };
  input.addEventListener("input", update);
  update();
  return input;
};

/* ---------- trial statistics (used by home stats + results page) ---------- */
Site.trialStats = function (trials = window.TRIALS || []) {
  const n = trials.length;
  const stages = ["detect", "nav", "grasp", "deliver"];
  const passed = Object.fromEntries(stages.map((s) => [s, trials.filter((t) => t[s]).length]));
  const done = trials.filter((t) => t.deliver);
  const avgTime = done.length ? done.reduce((a, t) => a + t.time, 0) / done.length : 0;
  return {
    n,
    passed,
    successRate: n ? (100 * passed.deliver) / n : 0,
    avgTime,
    isSample: trials.some((t) => t.sample),
  };
};

function initHomeStats() {
  const box = document.getElementById("home-stats");
  if (!box || !window.TRIALS) return;
  const s = Site.trialStats();
  const set = (key, v, d = 0) => {
    const el = box.querySelector(`[data-stat="${key}"]`);
    if (el) Site.countUp(el, v, d);
  };
  set("success", s.successRate);
  set("trials", s.n);
  set("time", s.avgTime);
  set("grasp", s.passed.nav ? (100 * s.passed.grasp) / s.passed.nav : 0);
  if (s.isSample) document.getElementById("home-stats-sample").hidden = false;
}

/* ---------- build-log progress bar ---------- */
function initLogProgress() {
  const bar = document.getElementById("log-progress");
  if (!bar) return;
  const entries = [...document.querySelectorAll(".log-entry")];
  const count = (s) => entries.filter((e) => e.dataset.status === s).length;
  const n = entries.length || 1;
  const done = count("done"), doing = count("in-progress");
  bar.querySelector(".progress-done").style.width = `${(100 * done) / n}%`;
  bar.querySelector(".progress-doing").style.width = `${(100 * doing) / n}%`;
  bar.querySelector(".progress-meta").innerHTML =
    `<span>${done} done</span><span>${doing} in progress</span><span>${n - done - doing} planned</span>`;
  entries.forEach((e) => {
    const chip = e.querySelector(".chip[data-status-chip]");
    if (chip) {
      chip.textContent = e.dataset.status.replace("-", " ");
      chip.classList.add(e.dataset.status);
    }
  });
}

/* ---------- 3D model: the TODO overlay stays until the .glb actually loads ---------- */
function initModelViewer() {
  document.querySelectorAll(".model-wrap").forEach((wrap) => {
    const mv = wrap.querySelector("model-viewer");
    const fallback = wrap.querySelector(".placeholder");
    if (mv && fallback) mv.addEventListener("load", () => (fallback.hidden = true));
  });
}

renderChrome();
renderMedia();
initTabs();
initReveal();
initCopy();
initHomeStats();
initLogProgress();
initModelViewer();
initLibs();
