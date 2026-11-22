const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const runtimeStatus = $("#runtime-status");
const readyState = $("#ready-state");
const progress = $("#progress");
const siteHeader = $("#site-header");
const heroSection = $("#top");
const manifestoSection = $("#manifesto");
const craftSection = $("#craft");
const craftThread = $("#craft-thread");
const chapterRail = $("#chapter-rail");
const sanctuaryWorld = $("#sanctuary-world");
const sanctuarySculpture = $("#sanctuary-sculpture");

const form = $("#intake-form");
const steps = $$(".wizard-step");
const dots = $$(".wizard-progress span");
const back = $("#back");
const next = $("#next");
const launch = $("#launch");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
let isReducedMotion = reducedMotionQuery.matches;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* -------------------------------------------------------------------------- */
/* 1. Preserved 4-Step Intake Wizard & Public Capsule Contract                */
/* -------------------------------------------------------------------------- */
let step = 1;
let lastCapsule = null;

function setStep(n) {
  step = Math.max(1, Math.min(4, n));
  steps.forEach((el, i) => el.classList.toggle("active", i === step - 1));
  dots.forEach((el, i) => {
    el.classList.toggle("active", i === step - 1);
    el.classList.toggle("done", i < step - 1);
  });
  if (back) back.disabled = step === 1;
  if (next) next.classList.toggle("hidden", step === 4);
  if (launch) launch.classList.toggle("hidden", step !== 4);
}

function choose(group, hiddenId, value) {
  $$(group).forEach((b) => {
    b.classList.toggle("selected", b.dataset.choice === value || b.dataset.feeling === value);
  });
  const hidden = $(hiddenId);
  if (hidden) hidden.value = value;
}

$$("[data-choice]").forEach((b) =>
  b.addEventListener("click", () => choose("[data-choice]", "#site-type", b.dataset.choice))
);
$$("[data-feeling]").forEach((b) =>
  b.addEventListener("click", () => choose("[data-feeling]", "#feeling", b.dataset.feeling))
);

function validCurrent() {
  if (step === 1 && !$("#site-type")?.value) return false;
  if (step === 2 && !$("#goal")?.value.trim()) return false;
  if (step === 3 && !$("#feeling")?.value) return false;
  return true;
}

next?.addEventListener("click", () => {
  if (!validCurrent()) {
    if (!isReducedMotion && steps[step - 1]?.animate) {
      steps[step - 1].animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-8px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 260 }
      );
    }
    return;
  }
  setStep(step + 1);
});

back?.addEventListener("click", () => setStep(step - 1));

function makeCapsule() {
  return {
    schema: "GLOW_WEB_PUBLIC_INTAKE_V1",
    registration_id: crypto.randomUUID ? crypto.randomUUID() : `gw-${Date.now()}`,
    intent: "START_GLOW_WEB_MISSION",
    website_type: $("#site-type").value,
    goal: $("#goal").value.trim(),
    desired_feeling: $("#feeling").value,
    name_or_brand: $("#name").value.trim() || null,
    language: $("#language").value,
    public_origin: location.origin,
    mcp_resource: new URL("/mcp-v2", location.origin).toString(),
    privacy: "PUBLIC_INTAKE_ONLY_NO_PRIVATE_FACTORY_STATE",
    execution_profile: "DEMO_BOUNDED",
    next_action:
      "Open ChatGPT and use the connected GLOW Web plugin to start the protected Factory mission from this capsule.",
  };
}

async function copyCapsule(value) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    return true;
  } catch {
    return false;
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validCurrent()) return;
  lastCapsule = makeCapsule();
  const preview = $("#capsule-preview");
  const result = $("#capsule-result");
  if (preview) preview.textContent = JSON.stringify(lastCapsule, null, 2);
  if (result) result.classList.remove("hidden");
  await copyCapsule(lastCapsule);
  result?.scrollIntoView({ behavior: isReducedMotion ? "auto" : "smooth", block: "center" });
  setTimeout(() => window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer"), 220);
});

$("#copy-capsule")?.addEventListener("click", async () => {
  if (!lastCapsule) return;
  const btn = $("#copy-capsule");
  const ok = await copyCapsule(lastCapsule);
  if (btn) {
    btn.textContent = ok ? "Đã copy ✓" : "Copy lại capsule";
    setTimeout(() => {
      btn.textContent = "Copy lại capsule";
    }, 1400);
  }
});

/* -------------------------------------------------------------------------- */
/* 2. Live Public Runtime Signal (/api/public/profile & /readyz)              */
/* -------------------------------------------------------------------------- */
async function refreshRuntime() {
  try {
    const [profile, ready] = await Promise.all([
      fetch("/api/public/profile", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("profile"))
      ),
      fetch("/readyz", { cache: "no-store" }).then(async (r) => ({
        ok: r.ok,
        body: await r.json().catch(() => ({})),
      })),
    ]);
    const rawLabel = typeof profile.status_label === "string" ? profile.status_label.trim() : "";
    const localizedStatus =
      !rawLabel || /^public experience/i.test(rawLabel)
        ? "Không gian trải nghiệm trực tuyến"
        : rawLabel;
    if (runtimeStatus) runtimeStatus.textContent = localizedStatus;
    if (readyState) {
      readyState.textContent = ready.ok
        ? "Hệ thống xưởng sẵn sàng"
        : "Chế độ kết nối giới hạn";
    }
    document.body.dataset.runtime = ready.ok ? "ready" : "degraded";
  } catch {
    if (runtimeStatus) runtimeStatus.textContent = "Không gian trải nghiệm trực tuyến";
    if (readyState) readyState.textContent = "Chế độ kết nối giới hạn";
    document.body.dataset.runtime = "unknown";
  }
}

/* -------------------------------------------------------------------------- */
/* 3. GPU-Smooth Scroll Choreography, 5-Stop Micro-Rail & World Atmosphere    */
/* -------------------------------------------------------------------------- */
const kineticWords = $$(".kinetic-manifesto .k-word");
const railItems = $$(".rail-item");
const parallaxEditorials = $$("[data-parallax-editorial]");
let scrollRafId = 0;

const WORLD_SCENE_MAP = {
  top: "ocean",
  "chapter-botanical": "botanical",
  "chapter-villa": "coastal",
  craft: "sanctuary",
  intake: "sanctuary",
};

function updateChapterRail(vh, scrollY, maxScroll) {
  if (!chapterRail || railItems.length === 0) return;
  const probeY = vh * 0.44;

  let activeTarget = "top";
  if (maxScroll > 0 && scrollY >= maxScroll - 24) {
    activeTarget = "intake";
  } else {
    for (const item of railItems) {
      const id = item.dataset.railTarget;
      const sec = id ? document.getElementById(id) : null;
      if (!sec) continue;
      const rect = sec.getBoundingClientRect();
      if (rect.top <= probeY) {
        activeTarget = id;
      }
    }
  }

  railItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.railTarget === activeTarget);
  });

  const targetScene = WORLD_SCENE_MAP[activeTarget] || "ocean";
  if (document.body.dataset.worldScene !== targetScene) {
    document.body.dataset.worldScene = targetScene;
  }
}

function updateScrollChoreography() {
  scrollRafId = 0;
  const vh = window.innerHeight || 900;
  const scrollY = window.scrollY || 0;
  const docEl = document.documentElement;
  const maxScroll = Math.max(0, docEl.scrollHeight - vh);

  if (progress) {
    progress.style.width = `${maxScroll > 0 ? clamp01(scrollY / maxScroll) * 100 : 0}%`;
  }

  const heroThreshold = heroSection ? Math.max(80, heroSection.offsetHeight - 220) : 80;
  siteHeader?.classList.toggle("is-scrolled", scrollY > heroThreshold);

  updateChapterRail(vh, scrollY, maxScroll);

  if (isReducedMotion) {
    heroSection?.style.setProperty("--hero-p", "0");
    kineticWords.forEach((w) => w.style.setProperty("--w-lit", "1"));
    parallaxEditorials.forEach((el) => el.style.setProperty("--ch-drift", "0"));
    craftThread?.style.setProperty("--craft-p", "1");
    return;
  }

  if (heroSection) {
    const heroH = Math.max(heroSection.offsetHeight, 1);
    const heroP = clamp01(scrollY / heroH);
    heroSection.style.setProperty("--hero-p", heroP.toFixed(4));
  }

  parallaxEditorials.forEach((el) => {
    const sec = el.closest(".cinema-chapter");
    if (!sec) return;
    const rect = sec.getBoundingClientRect();
    const centerOffset = (rect.top + rect.height * 0.5 - vh * 0.5) / Math.max(vh, 1);
    const clamped = Math.max(-0.85, Math.min(0.85, centerOffset));
    el.style.setProperty("--ch-drift", clamped.toFixed(4));
  });

  if (manifestoSection && kineticWords.length > 0) {
    const rect = manifestoSection.getBoundingClientRect();
    const start = vh * 0.94;
    const end = vh * 0.2;
    const raw = (start - rect.top) / Math.max(start - end + rect.height * 0.35, 1);
    const p = clamp01(raw);
    const total = kineticWords.length;
    for (let i = 0; i < total; i += 1) {
      const wordStart = (i / total) * 0.72;
      const wordSpan = 0.28;
      const lit = 0.28 + 0.72 * clamp01((p - wordStart) / wordSpan);
      kineticWords[i].style.setProperty("--w-lit", lit.toFixed(3));
    }
  }

  if (craftSection && craftThread) {
    const rect = craftSection.getBoundingClientRect();
    const p = clamp01((vh * 0.88 - rect.top) / Math.max(vh * 0.56, 1));
    craftThread.style.setProperty("--craft-p", p.toFixed(4));
  }
}

function scheduleScrollChoreography() {
  if (!scrollRafId) {
    scrollRafId = window.requestAnimationFrame(updateScrollChoreography);
  }
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px -2%" }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

window.addEventListener("scroll", scheduleScrollChoreography, { passive: true });
window.addEventListener("resize", scheduleScrollChoreography, { passive: true });
updateScrollChoreography();

/* -------------------------------------------------------------------------- */
/* 4. Pointer-Tracking Specular Glass, Magnetic Buttons & Sanctuary Caustics  */
/* -------------------------------------------------------------------------- */
function initPointerCraft() {
  if (!finePointerQuery.matches) return;

  $$("[data-specular]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      if (isReducedMotion) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mx", `${x.toFixed(1)}px`);
      card.style.setProperty("--my", `${y.toFixed(1)}px`);
    });
  });

  if (sanctuaryWorld && sanctuarySculpture) {
    sanctuaryWorld.addEventListener("pointermove", (e) => {
      if (isReducedMotion) return;
      const rect = sanctuaryWorld.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
      const py = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
      sanctuarySculpture.style.setProperty("--sanctuary-mx", `${px.toFixed(2)}%`);
      sanctuarySculpture.style.setProperty("--sanctuary-my", `${py.toFixed(2)}%`);
    });
  }

  $$(".btn-magnetic").forEach((btn) => {
    const maxShift = 4.5;
    btn.addEventListener("pointermove", (e) => {
      if (isReducedMotion) return;
      const rect = btn.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const relY = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      btn.style.setProperty("--mag-x", `${(relX * maxShift * 2).toFixed(2)}px`);
      btn.style.setProperty("--mag-y", `${(relY * maxShift * 2).toFixed(2)}px`);
    });
    const resetMagnet = () => {
      btn.style.setProperty("--mag-x", "0px");
      btn.style.setProperty("--mag-y", "0px");
    };
    btn.addEventListener("pointerleave", resetMagnet);
    btn.addEventListener("blur", resetMagnet);
  });
}

initPointerCraft();

/* -------------------------------------------------------------------------- */
/* 5. Cinema Video Viewport Lifecycle & Reduced-Motion Controller             */
/* -------------------------------------------------------------------------- */
const cinemaVideos = $$("video[data-cinema-video]");
const manualOverrides = new Map();

function setButtonPausedState(btn, paused) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(paused));
  const label = $(".control-label", btn);
  if (label) label.textContent = paused ? "Phát phim" : "Tạm dừng";
}

function syncToggleButton(key, paused) {
  const directBtn = $(`[data-toggle-video="${key}"]`);
  if (directBtn) setButtonPausedState(directBtn, paused);
}

function safePlay(video) {
  const promise = video.play();
  if (promise && typeof promise.catch === "function") {
    promise.catch(() => {
      syncToggleButton(video.dataset.cinemaVideo, true);
    });
  }
}

function applyReducedMotionState() {
  cinemaVideos.forEach((video) => {
    const key = video.dataset.cinemaVideo;
    if (isReducedMotion) {
      video.pause();
      manualOverrides.set(key, "paused");
      syncToggleButton(key, true);
    } else if (manualOverrides.get(key) !== "paused") {
      syncToggleButton(key, video.paused);
    }
  });
  updateScrollChoreography();
}

const videoVisibilityObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      const key = video.dataset.cinemaVideo;
      const override = manualOverrides.get(key);

      if (entry.isIntersecting) {
        if (isReducedMotion && override !== "playing") {
          video.pause();
          syncToggleButton(key, true);
          return;
        }
        if (override === "paused") {
          video.pause();
          syncToggleButton(key, true);
          return;
        }
        safePlay(video);
        syncToggleButton(key, false);
      } else {
        video.pause();
      }
    });
  },
  { threshold: 0.1 }
);

cinemaVideos.forEach((video) => {
  const key = video.dataset.cinemaVideo;
  if (isReducedMotion) {
    video.removeAttribute("autoplay");
    video.pause();
    syncToggleButton(key, true);
  } else {
    syncToggleButton(key, false);
  }
  videoVisibilityObserver.observe(video);
});

$$("[data-toggle-video]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.toggleVideo;
    const video = $(`video[data-cinema-video="${key}"]`);
    if (!video) return;
    if (video.paused) {
      manualOverrides.set(key, "playing");
      safePlay(video);
      syncToggleButton(key, false);
    } else {
      manualOverrides.set(key, "paused");
      video.pause();
      syncToggleButton(key, true);
    }
  });
});

reducedMotionQuery.addEventListener?.("change", (e) => {
  isReducedMotion = e.matches;
  applyReducedMotionState();
});

/* -------------------------------------------------------------------------- */
/* 6. Full-Screen Cinema Lightbox Modal (Real 1080p MP4 + ESC Focus Return)   */
/* -------------------------------------------------------------------------- */
const cinemaModal = $("#cinema-modal");
const cinemaVideo = $("#cinema-stage-video");
const cinemaSource = $("#cinema-stage-source");
const cinemaTitle = $("#cinema-title");
const cinemaSubtitle = $("#cinema-subtitle");
const cinemaCloseBtn = $("#cinema-close");
let lastCinemaTrigger = null;

function openCinemaModal(triggerEl) {
  if (!cinemaModal || !triggerEl) return;
  lastCinemaTrigger = triggerEl;

  const src = triggerEl.dataset.src || "/assets/reel-01-botanical.mp4";
  const poster = triggerEl.dataset.poster || "/assets/reel-01-botanical.webp";
  const title = triggerEl.dataset.title || "GLOW Showcase";
  const subtitle = triggerEl.dataset.subtitle || "";

  if (cinemaTitle) cinemaTitle.textContent = title;
  if (cinemaSubtitle) cinemaSubtitle.textContent = subtitle;

  if (cinemaVideo && cinemaSource) {
    cinemaVideo.poster = poster;
    if (cinemaSource.getAttribute("src") !== src) {
      cinemaSource.setAttribute("src", src);
      cinemaVideo.load();
    }
    if (!isReducedMotion) {
      const p = cinemaVideo.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }

  cinemaModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  cinemaCloseBtn?.focus();
}

function closeCinemaModal() {
  if (!cinemaModal || cinemaModal.classList.contains("hidden")) return;
  cinemaModal.classList.add("hidden");
  document.body.style.overflow = "";

  if (cinemaVideo) {
    cinemaVideo.pause();
  }

  if (lastCinemaTrigger && typeof lastCinemaTrigger.focus === "function") {
    lastCinemaTrigger.focus();
  }
  lastCinemaTrigger = null;
}

$$("[data-open-cinema]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openCinemaModal(btn);
  });
});

cinemaCloseBtn?.addEventListener("click", closeCinemaModal);
$("[data-close-cinema]")?.addEventListener("click", closeCinemaModal);

/* -------------------------------------------------------------------------- */
/* 7. Collapsible 4-Step Intake Modal Controller (Closed by Default + ESC)    */
/* -------------------------------------------------------------------------- */
const intakeModal = $("#intake-modal");
const openIntakeDrawerBtn = $("#open-intake-drawer");
const closeIntakeModalBtn = $("#close-intake-modal");
let lastIntakeTrigger = null;

function openIntakeModal(triggerEl) {
  if (!intakeModal) return;
  lastIntakeTrigger = triggerEl || openIntakeDrawerBtn || null;
  intakeModal.classList.remove("hidden");
  intakeModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeIntakeModalBtn?.focus();
}

function closeIntakeModal() {
  if (!intakeModal || intakeModal.classList.contains("hidden")) return;
  intakeModal.classList.add("hidden");
  intakeModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastIntakeTrigger && typeof lastIntakeTrigger.focus === "function") {
    lastIntakeTrigger.focus();
  }
  lastIntakeTrigger = null;
}

openIntakeDrawerBtn?.addEventListener("click", () => openIntakeModal(openIntakeDrawerBtn));
closeIntakeModalBtn?.addEventListener("click", closeIntakeModal);
$("[data-close-intake]")?.addEventListener("click", closeIntakeModal);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCinemaModal();
    closeIntakeModal();
  }
});

setStep(1);
refreshRuntime();
