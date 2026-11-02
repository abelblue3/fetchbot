/* =========================================================================
   VIDEO CONFIG — every video on the site is declared here.
   A page places a slot with:  <div data-media="slotName"></div>

   Each entry is one of:
     { kind: "youtube", id: "VIDEO_ID", title: "…" }          YouTube embed
     { kind: "mp4", src: "assets/video/file.mp4", poster: "…" } local file (keep < 50 MB)
     { kind: "none", todo: "what to record" }                  dashed TODO box

   placeholder: true  → shows a "Placeholder video from …" badge.
   Every placeholder:true entry MUST be replaced before submission.
   ========================================================================= */
window.MEDIA = {
  // Full-bleed looping background on the home hero. Use a short (10–20 s),
  // muted, H.264 .mp4 under ~10 MB. Until then the animated grid is shown.
  heroLoop: { kind: "none", todo: "10–20 s muted loop of the robot fetching an object" },

  // Main end-to-end demo (home + results)
  demoMain: {
    kind: "youtube",
    id: "CL-KuPaDHxg",
    title: "Full demo: detect → navigate → grasp → deliver",
    placeholder: true,
    credit: "CarromBot · EECS 106A Sp26",
    creditUrl: "https://carrombot.github.io/",
  },

  // Vertical / phone-shot clip (results grid)
  demoShort: {
    kind: "youtube",
    id: "gUvkJyTCKFg",
    vertical: true,
    title: "Close-up of a grasp",
    placeholder: true,
    credit: "KnotBot · EECS 106A Sp26",
    creditUrl: "https://joshuarmata.github.io/_knotbot/",
  },

  // Results video grid
  demoStartPoses: { kind: "none", todo: "Trials from 3+ different starting poses (montage)" },
  demoPerception: { kind: "none", todo: "Screen capture: camera feed with detection boxes + estimated floor position" },
  demoRviz:       { kind: "none", todo: "RViz: costmap, Nav2 path and approach pose" },

  // Failure reel (results → failure modes)
  failDetect: { kind: "none", todo: "Clip: missed / false detection" },
  failNav:    { kind: "none", todo: "Clip: robot stops out of arm reach" },
  failGrasp:  { kind: "none", todo: "Clip: gripper closes on air / object slips" },

  // Hardware page
  mountTest: { kind: "none", todo: "Clip: arm sweeping full range on the mount, LiDAR still unobstructed" },

  // Synced three-view player (results). The three clips must be trimmed to start
  // on the same frame. Chapter times are seconds into the clips.
  synced: {
    duration: 60, // used only while no clips exist, so the controls still work
    panes: [
      { label: "External camera", src: "", todo: "External view of the whole run" },
      { label: "Robot camera + detections", src: "", todo: "Onboard camera with bounding boxes drawn" },
      { label: "RViz", src: "", todo: "RViz screen recording (map, costmap, path, TF)" },
    ],
    chapters: [
      { name: "SEARCH", t: 0 },
      { name: "DETECT", t: 8 },
      { name: "NAVIGATE", t: 14 },
      { name: "GRASP", t: 32 },
      { name: "DELIVER", t: 44 },
    ],
  },
};
