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
/* 3. GPU-Smooth Scroll-Driven Cinema Choreography & Chapter Rail             */
/* -------------------------------------------------------------------------- */
const kineticWords = $$(".kinetic-manifesto .k-word");
const expandStages = $$("[data-scroll-expand]");
const parallaxCards = $$("[data-parallax-card]");
const railItems = $$(".rail-item");
const tonedActs = $$("[data-act-tone]");

let scrollRafId = 0;

function updateChapterRail(vh) {
  if (!chapterRail || railItems.length === 0) return;
  const probeY = vh * 0.42;

  let activeTone = "dark";
  for (const sec of tonedActs) {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= probeY && rect.bottom >= probeY) {
      activeTone = sec.dataset.actTone || "dark";
      break;
    }
  }
  chapterRail.dataset.railTone = activeTone;

  let activeTarget = "top";
  for (const item of railItems) {
    const id = item.dataset.railTarget;
    const sec = id ? document.getElementById(id) : null;
    if (!sec) continue;
    const rect = sec.getBoundingClientRect();
    if (rect.top <= probeY) {
      activeTarget = id;
    }
  }
  railItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.railTarget === activeTarget);
  });
}

function updateScrollChoreography() {
  scrollRafId = 0;
  const vh = window.innerHeight || 900;
  const vw = window.innerWidth || 1440;
  const scrollY = window.scrollY || 0;

  // Scroll hairline progress
  const docEl = document.documentElement;
  const maxScroll = docEl.scrollHeight - vh;
  if (progress) {
    progress.style.width = `${maxScroll > 0 ? clamp01(scrollY / maxScroll) * 100 : 0}%`;
  }

  // Header luminosity transition
  const heroThreshold = heroSection ? Math.max(80, heroSection.offsetHeight - 180) : 80;
  siteHeader?.classList.toggle("is-scrolled", scrollY > heroThreshold);

  // Right-edge cinema chapter rail
  updateChapterRail(vh);

  // Reduced-motion static equivalence
  if (isReducedMotion) {
    heroSection?.style.setProperty("--hero-p", "0");
    kineticWords.forEach((w) => w.style.setProperty("--w-lit", "1"));
    expandStages.forEach((stage) => stage.style.setProperty("--expand", "1"));
    parallaxCards.forEach((card) => card.style.setProperty("--drift", "0"));
    craftThread?.style.setProperty("--craft-p", "1");
    return;
  }

  // ACT 0: Hero cinema curtain depth parallax
  if (heroSection) {
    const heroH = Math.max(heroSection.offsetHeight, 1);
    const heroP = clamp01(scrollY / heroH);
    heroSection.style.setProperty("--hero-p", heroP.toFixed(4));
  }

  // ACT 1: Word-by-word kinetic illumination (smooth forward & reverse)
  if (manifestoSection && kineticWords.length > 0) {
    const rect = manifestoSection.getBoundingClientRect();
    const start = vh * 0.88;
    const end = vh * 0.24;
    const raw = (start - rect.top) / Math.max(start - end + rect.height * 0.36, 1);
    const p = clamp01(raw);
    const total = kineticWords.length;
    for (let i = 0; i < total; i += 1) {
      const wordStart = (i / total) * 0.78;
      const wordSpan = 0.22;
      const lit = 0.18 + 0.82 * clamp01((p - wordStart) / wordSpan);
      kineticWords[i].style.setProperty("--w-lit", lit.toFixed(3));
    }
  }

  // ACT 2: Scroll-driven cinema frame expansion & overlapping glass card counter-drift
  const desktopStage = vw > 900;
  expandStages.forEach((stage) => {
    if (!desktopStage) {
      stage.style.setProperty("--expand", "1");
      return;
    }
    const rect = stage.getBoundingClientRect();
    const centerDelta = Math.abs(rect.top + rect.height * 0.5 - vh * 0.5);
    const norm = 1 - clamp01(centerDelta / (vh * 0.92));
    stage.style.setProperty("--expand", norm.toFixed(4));
  });

  parallaxCards.forEach((card) => {
    if (!desktopStage) {
      card.style.setProperty("--drift", "0");
      return;
    }
    const rect = card.getBoundingClientRect();
    const rel = clamp01((vh - rect.top) / (vh + rect.height));
    const drift = (rel - 0.5) * 1.4;
    card.style.setProperty("--drift", drift.toFixed(4));
  });

  // ACT 3: Scroll-illuminated luminous emerald progress thread
  if (craftSection && craftThread) {
    const rect = craftSection.getBoundingClientRect();
    const p = clamp01((vh * 0.84 - rect.top) / Math.max(vh * 0.62, 1));
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
  { threshold: 0.1, rootMargin: "0px 0px -3%" }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

window.addEventListener("scroll", scheduleScrollChoreography, { passive: true });
window.addEventListener("resize", scheduleScrollChoreography, { passive: true });
updateScrollChoreography();

/* -------------------------------------------------------------------------- */
/* 4. Pointer-Tracking Specular Glass Monoliths & Magnetic Pill Buttons       */
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

function syncToggleButton(key, paused) {
  const btn = $(`[data-toggle-video="${key}"]`);
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(paused));
  const label = $(".control-label", btn);
  if (label) label.textContent = paused ? "Phát phim" : "Tạm dừng";
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
  { threshold: 0.15 }
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
/* 6. Interactive 4-Reel IMAX Cinema Switcher                                 */
/* -------------------------------------------------------------------------- */
const imaxVideo = $("#imax-stage-video");
const imaxSource = $("#imax-stage-source");
const imaxEyebrow = $("#imax-eyebrow");
const imaxHeading = $("#chapter-03-heading");
const imaxFullscreenBtn = $("#imax-fullscreen-btn");
const imaxReelTabs = $$("[data-imax-reel]");
let imaxSwitchTimer = 0;

function switchImaxReel(tabBtn) {
  if (!tabBtn || !imaxVideo || !imaxSource) return;

  const src = tabBtn.dataset.src || "/assets/reel-03-liquid-prism.mp4";
  const poster = tabBtn.dataset.poster || "/assets/reel-03-liquid-prism.webp";
  const eyebrow = tabBtn.dataset.eyebrow || "04 · LIQUID PLATINUM EMERALD";
  const title = tabBtn.dataset.title || "Dòng chảy Vô cực · Ánh sáng Bạch kim & Ngọc lục bảo";
  const subtitle = tabBtn.dataset.subtitle || title;

  imaxReelTabs.forEach((btn) => {
    const active = btn === tabBtn;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });

  if (imaxEyebrow) imaxEyebrow.textContent = eyebrow;
  if (imaxHeading) imaxHeading.textContent = title;
  if (imaxFullscreenBtn) {
    imaxFullscreenBtn.dataset.src = src;
    imaxFullscreenBtn.dataset.poster = poster;
    imaxFullscreenBtn.dataset.title = eyebrow;
    imaxFullscreenBtn.dataset.subtitle = subtitle;
  }

  if (imaxSource.getAttribute("src") === src) return;

  window.clearTimeout(imaxSwitchTimer);
  const performSwap = () => {
    imaxVideo.poster = poster;
    imaxSource.setAttribute("src", src);
    imaxVideo.load();
    const shouldPlay = !isReducedMotion && manualOverrides.get("reel03") !== "paused";
    if (shouldPlay) {
      safePlay(imaxVideo);
      syncToggleButton("reel03", false);
    } else {
      imaxVideo.pause();
      syncToggleButton("reel03", true);
    }
    imaxVideo.classList.remove("is-switching");
  };

  if (isReducedMotion) {
    performSwap();
  } else {
    imaxVideo.classList.add("is-switching");
    imaxSwitchTimer = window.setTimeout(performSwap, 160);
  }
}

imaxReelTabs.forEach((tab, idx) => {
  tab.addEventListener("click", () => switchImaxReel(tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nextIdx = (idx + dir + imaxReelTabs.length) % imaxReelTabs.length;
    imaxReelTabs[nextIdx].focus();
    switchImaxReel(imaxReelTabs[nextIdx]);
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Full-Screen Cinema Lightbox Modal (Real 1080p MP4 + ESC Focus Return)   */
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

  const src = triggerEl.dataset.src || "/assets/reel-03-liquid-prism.mp4";
  const poster = triggerEl.dataset.poster || "/assets/reel-03-liquid-prism.webp";
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
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCinemaModal();
});

setStep(1);
refreshRuntime();
