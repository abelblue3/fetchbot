# FetchBot: EECS C106A Final Project Website

Static site for our TurtleBot3 + SO-101 mobile manipulation project. It's plain HTML/CSS/JS with **no build step**: edit a file, refresh the browser, push.

## Preview locally

Opening `index.html` directly works for most things. To get everything working (YouTube embeds, the 3D model viewer), use a local server, which also matches how GitHub Pages serves the site:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Where things live

| What you want to change | File |
|---|---|
| Project name, GitHub link, team list in the footer | `assets/js/site.js` → `SITE` |
| Nav order / adding a page | `assets/js/site.js` → `PAGES` |
| **Any video** (swap a placeholder for ours) | `assets/js/media.js` |
| **Trial results** (map, table, funnel, home-page stats) | `assets/js/trials.js` |
| Arm link lengths, masses, camera intrinsics (all widgets) | `assets/js/robot-params.js` |
| Colors, fonts, spacing | top of `assets/css/style.css` (`:root` tokens) |
| Page text | the `.html` file for that page |
| Home-page robot (intro timing, drag rules, art) | `assets/js/hero-robot.js` |
| 2-link IK/FK math shared by the hero robot and the widgets | `assets/js/kinematics.js` |

Pages: `index` (home) · `design` · `implementation` · `results` · `conclusion` · `team` · `log` (build log) · `materials`.

## The home-page robot

The hero robot is interactive: drag the elbow or wrist knob to rotate a joint, drag the gripper to move the whole arm (inverse kinematics), or drag the TurtleBot body to drive. Lower the gripper onto the cube to pick it up, lift it, and set it back on the floor to let go. Keyboard works too: Tab to a part, use the arrow keys, and press Enter to release.

On the first visit in a browser tab, a ~2.6 s intro plays in sync with the headline. The robot drives in, "See it." appears with the camera cone, "Grab it." appears as the arm unfolds, and "Bring it back." appears as it settles. Later visits in the same tab skip it, and **↻ Replay** plays it again. Visitors with "reduce motion" turned on never see it. Without JavaScript, `assets/img/robot-hero.svg` shows instead. Keep that file in sync with `hero-robot.js` if you change the art.

## Placeholder convention

Everything still missing is marked so it's easy to find and **visibly orange on the page**:

- `<div class="placeholder" data-todo="what goes here">`: a dashed box for missing photos, plots and embeds
- `<span class="todo">what goes here</span>`: inline missing text
- `placeholder: true` in `media.js`: a borrowed video from a past 106A team (shows a credit badge)
- `sample: true` in `trials.js`: fake trial data (shows a "SAMPLE DATA" badge)

List everything left to do:

```bash
grep -rn --include=*.html -E 'class="todo"|data-todo' .
grep -n 'placeholder: true' assets/js/media.js
grep -c 'sample: true' assets/js/trials.js
```

**Before submitting, all of these must return nothing.**

## Adding media

- **Videos:** upload long demos to YouTube (unlisted is fine) and set `{ kind: "youtube", id: "…" }` in `media.js`. Short clips can go in `assets/video/` as H.264 `.mp4` with `{ kind: "mp4", src: "assets/video/clip.mp4" }`.
- **Hero background loop:** a 10–20 s muted clip under ~10 MB, set as `heroLoop` in `media.js`.
- **Synced three-view player:** trim the three clips so they start on the same frame, then set `synced.panes[i].src` and the chapter times in `media.js`.
- **Images:** WebP or JPG under ~500 KB in `assets/img/`. Replace a placeholder div with `<figure><img src="assets/img/x.webp" alt="…"><figcaption>…</figcaption></figure>`.
- **3D mount:** export the CAD as glTF binary and save it as `assets/models/mount.glb`. The viewer on the implementation page picks it up automatically.
- **Limits:** GitHub rejects files over 100 MB, and Pages sites should stay under 1 GB total.

## Math and code

- Math is rendered by KaTeX on pages whose `<body>` has `data-math` (design, implementation). Use `$…$` inline and `$$…$$` for display. On those pages, write a literal dollar sign as `\$`.
- Code blocks: `<pre><code class="language-python">…</code></pre>` (python, bash and yaml are loaded). Escape `<` as `&lt;`.

## Logging a trial

Add a row to `assets/js/trials.js`:

```js
{ id: 13, start: { x: 1.2, y: 0.8, theta: 90 }, object: { x: 2.5, y: 1.9 }, objectType: "red cube",
  detect: true, nav: true, grasp: true, deliver: true, time: 54, note: "" },
```

The map, table, funnel and home-page numbers all update from this one list.

## Deploying

The site will be hosted on GitHub Pages. `.nojekyll` is already in place, and all paths are relative, so the site works at `username.github.io/repo-name/`. Deployment steps to be added.
