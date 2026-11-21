const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const runtimeStatus = $("#runtime-status");
const readyState = $("#ready-state");
const progress = $("#progress");
const siteHeader = $("#site-header");

const form = $("#intake-form");
const steps = $$(".wizard-step");
const dots = $$(".wizard-progress span");
const back = $("#back");
const next = $("#next");
const launch = $("#launch");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let isReducedMotion = reducedMotionQuery.matches;

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
    if (runtimeStatus) runtimeStatus.textContent = profile.status_label || "Public Experience online";
    if (readyState) {
      readyState.textContent = ready.ok
        ? "Protected runtime reachable"
        : "Protected runtime in degraded mode";
    }
    document.body.dataset.runtime = ready.ok ? "ready" : "degraded";
  } catch {
    if (runtimeStatus) runtimeStatus.textContent = "Public experience online";
    if (readyState) readyState.textContent = "Runtime status unavailable";
    document.body.dataset.runtime = "unknown";
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Scroll Progress, Header Luminosity Transition & Editorial Reveal        */
/* -------------------------------------------------------------------------- */
function updateScrollTelemetry() {
  const h = document.documentElement;
  const max = h.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;

  const hero = $("#top");
  const threshold = hero ? Math.max(80, hero.offsetHeight - 96) : 80;
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > threshold);
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
  { threshold: 0.12, rootMargin: "0px 0px -4%" }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

window.addEventListener("scroll", updateScrollTelemetry, { passive: true });
window.addEventListener("resize", updateScrollTelemetry, { passive: true });
updateScrollTelemetry();

/* -------------------------------------------------------------------------- */
/* 4. Cinema Video Viewport Lifecycle & Reduced-Motion Controller             */
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
/* 5. Full-Screen Cinema Lightbox Modal (Real 1080p MP4 + ESC Focus Return)   */
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
