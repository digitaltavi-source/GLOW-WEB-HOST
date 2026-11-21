const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const runtimeStatus = $("#runtime-status");
const readyState = $("#ready-state");
const progress = $("#progress");
const cursor = $(".cursor-glow");
const siteHeader = $("#site-header");

const form = $("#intake-form");
const steps = $$(".wizard-step");
const dots = $$(".wizard-progress span");
const back = $("#back");
const next = $("#next");
const launch = $("#launch");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let isReducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener?.("change", (e) => {
  isReducedMotion = e.matches;
});

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
/* 3. Scroll Progress, Header Depth, Reveal & Luminous 4-Stage River          */
/* -------------------------------------------------------------------------- */
const riverShell = $("#river-shell");
const riverFill = $("#river-fill");
const riverStages = $$("[data-river-step]");
let riverManualLock = false;

function setRiverStage(activeStep) {
  const clamped = Math.max(1, Math.min(4, activeStep));
  if (riverFill) riverFill.style.width = `${clamped * 25}%`;
  riverStages.forEach((btn) => {
    const num = Number(btn.dataset.riverStep || 1);
    btn.classList.toggle("is-lit", num <= clamped);
    btn.setAttribute("aria-pressed", String(num === clamped));
  });
}

riverStages.forEach((btn) => {
  btn.addEventListener("click", () => {
    riverManualLock = true;
    setRiverStage(Number(btn.dataset.riverStep || 1));
  });
});

function updateScrollTelemetry() {
  const h = document.documentElement;
  const max = h.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 36);

  if (riverShell && !riverManualLock) {
    const rect = riverShell.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const ratio = (vh * 0.78 - rect.top) / Math.max(240, rect.height + vh * 0.25);
    if (ratio > 0) {
      const autoStep = Math.min(4, Math.max(1, Math.ceil(ratio * 4)));
      setRiverStage(autoStep);
    }
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
  { threshold: 0.12, rootMargin: "0px 0px -5%" }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

window.addEventListener("scroll", updateScrollTelemetry, { passive: true });
updateScrollTelemetry();

/* Subtle cursor aura + hero stage pointer parallax */
if (window.matchMedia("(pointer: fine)").matches && !isReducedMotion) {
  window.addEventListener(
    "pointermove",
    (e) => {
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    },
    { passive: true }
  );

  const heroSection = $(".hero");
  const heroMedia = $(".hero-media");
  heroSection?.addEventListener(
    "pointermove",
    (e) => {
      if (isReducedMotion || !heroMedia) return;
      const r = heroSection.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      heroMedia.style.transform = `scale(1.04) translate3d(${(-x * 14).toFixed(1)}px, ${(-y * 10).toFixed(1)}px, 0)`;
    },
    { passive: true }
  );
  heroSection?.addEventListener("pointerleave", () => {
    if (heroMedia) heroMedia.style.transform = "";
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Vertical Monolith Accordion (3 Reels) + Full-Cinema Modal               */
/* -------------------------------------------------------------------------- */
const monolithPanels = $$(".monolith-panel");

function activatePanel(panel) {
  monolithPanels.forEach((p) => {
    const active = p === panel;
    p.classList.toggle("is-active", active);
    p.setAttribute("aria-expanded", String(active));
  });
}

monolithPanels.forEach((panel) => {
  panel.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-cinema]")) return;
    activatePanel(panel);
  });
  panel.addEventListener("mouseenter", () => {
    if (window.innerWidth > 900) activatePanel(panel);
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target.closest("[data-open-cinema]")) return;
      e.preventDefault();
      activatePanel(panel);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Coordinate-Locked Cinematic Motion Engine (16:9 coverRect Projection)   */
/* -------------------------------------------------------------------------- */
function coverRect(cw, ch, imgRatio = 16 / 9, posX = 0.5, posY = 0.5) {
  const cRatio = cw / Math.max(1, ch);
  if (cRatio > imgRatio) {
    const drawW = cw;
    const drawH = cw / imgRatio;
    return { x: 0, y: (ch - drawH) * posY, w: drawW, h: drawH };
  }
  const drawH = ch;
  const drawW = ch * imgRatio;
  return { x: (cw - drawW) * posX, y: 0, w: drawW, h: drawH };
}

function renderHeroWater(ctx, w, h, t) {
  const rect = coverRect(w, h, 16 / 9, 0.62, 0.48);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  /* Soft lunar silver-jade water caustics across the ocean surface (y: 0.66..0.98) */
  const waterCount = 18;
  for (let i = 0; i < waterCount; i++) {
    const frac = i / waterCount;
    const ny = 0.665 + frac * 0.31;
    const wave = Math.sin(t * 0.85 + i * 0.9) * 0.018;
    const nx = 0.665 + wave + Math.cos(t * 0.45 + i * 1.7) * 0.09 * frac;
    const halfSpan = (0.045 + frac * 0.14) * rect.w;
    const px = rect.x + nx * rect.w;
    const py = rect.y + ny * rect.h;
    const alpha = (0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.1))) * (1 - frac * 0.35);

    const grad = ctx.createLinearGradient(px - halfSpan, py, px + halfSpan, py);
    grad.addColorStop(0, "rgba(78, 214, 165, 0)");
    grad.addColorStop(0.35, `rgba(167, 243, 208, ${(alpha * 0.65).toFixed(3)})`);
    grad.addColorStop(0.5, `rgba(242, 247, 250, ${alpha.toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(78, 214, 165, ${(alpha * 0.6).toFixed(3)})`);
    grad.addColorStop(1, "rgba(78, 214, 165, 0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2 + frac * 1.4;
    ctx.beginPath();
    ctx.moveTo(px - halfSpan, py);
    ctx.quadraticCurveTo(px, py + Math.sin(t * 1.1 + i) * 2.2, px + halfSpan, py);
    ctx.stroke();
  }

  /* Ethereal silver light sweep gliding along the brushed platinum ring */
  const cx = rect.x + 0.665 * rect.w;
  const cy = rect.y + 0.455 * rect.h;
  const rx = 0.186 * rect.w;
  const ry = 0.331 * rect.h;
  const sweepAngle = (t * 0.42) % (Math.PI * 2);

  for (let s = 0; s < 2; s++) {
    const base = sweepAngle + s * Math.PI;
    const arcLen = 0.65;
    ctx.beginPath();
    const segs = 28;
    for (let k = 0; k <= segs; k++) {
      const a = base - arcLen + (k / segs) * arcLen;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = s === 0 ? "rgba(242, 247, 250, 0.34)" : "rgba(78, 214, 165, 0.24)";
    ctx.lineWidth = s === 0 ? 2.4 : 3.6;
    ctx.lineCap = "round";
    ctx.stroke();

    const tipX = cx + Math.cos(base) * rx;
    const tipY = cy + Math.sin(base) * ry;
    const flare = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, rect.w * 0.032);
    flare.addColorStop(0, "rgba(242, 247, 250, 0.42)");
    flare.addColorStop(0.4, "rgba(78, 214, 165, 0.16)");
    flare.addColorStop(1, "rgba(78, 214, 165, 0)");
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(tipX, tipY, rect.w * 0.032, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderReel01Botanical(ctx, w, h, t) {
  const rect = coverRect(w, h, 16 / 9, 0.5, 0.5);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  /* Concentric silver-jade water ripples around the emerald vessel & platinum pebble */
  const cx = rect.x + 0.49 * rect.w;
  const cy = rect.y + 0.77 * rect.h;
  for (let i = 0; i < 4; i++) {
    const phase = (t * 0.22 + i * 0.25) % 1;
    const rX = (0.08 + phase * 0.27) * rect.w;
    const rY = (0.022 + phase * 0.075) * rect.h;
    const alpha = Math.sin(phase * Math.PI) * 0.28;
    ctx.strokeStyle = i % 2 === 0 ? `rgba(167, 243, 208, ${alpha.toFixed(3)})` : `rgba(242, 247, 250, ${(alpha * 0.85).toFixed(3)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rX, rY, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* Drifting morning mist veils in upper sanctuary */
  for (let m = 0; m < 3; m++) {
    const mx = rect.x + (0.34 + 0.32 * Math.sin(t * 0.18 + m * 2.1)) * rect.w;
    const my = rect.y + (0.24 + m * 0.11 + Math.cos(t * 0.15 + m) * 0.03) * rect.h;
    const rad = rect.w * (0.16 + m * 0.04);
    const mist = ctx.createRadialGradient(mx, my, 0, mx, my, rad);
    mist.addColorStop(0, "rgba(167, 243, 208, 0.09)");
    mist.addColorStop(0.5, "rgba(200, 218, 230, 0.04)");
    mist.addColorStop(1, "rgba(200, 218, 230, 0)");
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.arc(mx, my, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderReel02Coastal(ctx, w, h, t) {
  const rect = coverRect(w, h, 16 / 9, 0.5, 0.5);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  /* Tranquil saltwater infinity-pool light reflections */
  for (let i = 0; i < 12; i++) {
    const frac = i / 12;
    const y = rect.y + (0.63 + frac * 0.29) * rect.h;
    const shift = Math.sin(t * 0.7 + i * 0.85) * rect.w * 0.015;
    const x1 = rect.x + (0.29 + frac * 0.03) * rect.w + shift;
    const x2 = rect.x + (0.69 - frac * 0.03) * rect.w + shift;
    const alpha = 0.06 + 0.08 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.3));
    const grad = ctx.createLinearGradient(x1, y, x2, y);
    grad.addColorStop(0, "rgba(200, 218, 230, 0)");
    grad.addColorStop(0.5, `rgba(220, 242, 248, ${alpha.toFixed(3)})`);
    grad.addColorStop(1, "rgba(78, 214, 165, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }

  /* Subtle architectural glass sheen sweeping across pavilion windows */
  const sheenPos = ((t * 0.14) % 1.4) - 0.2;
  const sx = rect.x + (0.3 + sheenPos * 0.42) * rect.w;
  const sy1 = rect.y + 0.35 * rect.h;
  const sy2 = rect.y + 0.55 * rect.h;
  const sheenAlpha = Math.max(0, Math.sin(Math.min(1, Math.max(0, sheenPos)) * Math.PI)) * 0.16;
  if (sheenAlpha > 0.005) {
    const sheenGrad = ctx.createLinearGradient(sx - rect.w * 0.04, sy1, sx + rect.w * 0.04, sy2);
    sheenGrad.addColorStop(0, "rgba(242, 247, 250, 0)");
    sheenGrad.addColorStop(0.5, `rgba(242, 247, 250, ${sheenAlpha.toFixed(3)})`);
    sheenGrad.addColorStop(1, "rgba(167, 243, 208, 0)");
    ctx.strokeStyle = sheenGrad;
    ctx.lineWidth = rect.w * 0.035;
    ctx.beginPath();
    ctx.moveTo(sx + rect.w * 0.02, sy1);
    ctx.lineTo(sx - rect.w * 0.02, sy2);
    ctx.stroke();
  }

  ctx.restore();
}

function infinityPoint(u, rect, yOffset = 0, scaleX = 1, scaleY = 1) {
  const nx = 0.5 + 0.34 * scaleX * Math.cos(u);
  const ny = 0.47 + yOffset + (0.145 * Math.sin(2 * u) + 0.04 * Math.sin(u)) * scaleY;
  return { x: rect.x + nx * rect.w, y: rect.y + ny * rect.h, nx, ny };
}

function renderReel03Infinity(ctx, w, h, t) {
  const rect = coverRect(w, h, 16 / 9, 0.5, 0.5);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  /* Seamless perpetual loop t mod 2pi */
  const phase = (t * 0.72) % (Math.PI * 2);

  /* 1. Layered Parametric Infinity (figure-8) Flowing Ribbons */
  const streams = [
    { offset: 0, yOff: 0, sx: 1.0, sy: 1.0, span: 1.85, color: [235, 246, 252], peak: 0.72, width: 3.4 },
    { offset: 2.09, yOff: 0.014, sx: 0.96, sy: 1.06, span: 1.65, color: [78, 214, 165], peak: 0.68, width: 4.2 },
    { offset: 4.18, yOff: -0.012, sx: 1.03, sy: 0.94, span: 1.5, color: [20, 184, 166], peak: 0.55, width: 3.0 },
  ];

  const crestPositions = [];
  for (const st of streams) {
    const headU = phase + st.offset;
    const segments = 34;
    const headPt = infinityPoint(headU, rect, st.yOff, st.sx, st.sy);
    crestPositions.push(headPt.nx);

    for (let i = 0; i < segments; i++) {
      const f0 = i / segments;
      const f1 = (i + 1) / segments;
      const u0 = headU - (1 - f0) * st.span;
      const u1 = headU - (1 - f1) * st.span;
      const p0 = infinityPoint(u0, rect, st.yOff, st.sx, st.sy);
      const p1 = infinityPoint(u1, rect, st.yOff, st.sx, st.sy);
      const envelope = Math.sin(f1 * Math.PI);
      const alpha = envelope * st.peak;

      /* Soft outer aura pass */
      ctx.strokeStyle = `rgba(${st.color[0]}, ${st.color[1]}, ${st.color[2]}, ${(alpha * 0.24).toFixed(3)})`;
      ctx.lineWidth = (st.width * 3.4) * (0.45 + 0.55 * envelope);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      /* Crisp core fluid filament */
      ctx.strokeStyle = `rgba(${st.color[0]}, ${st.color[1]}, ${st.color[2]}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = st.width * (0.35 + 0.65 * envelope);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    /* Specular luminous droplet gliding on the contour head */
    const dropR = rect.w * 0.018;
    const dropGrad = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, dropR);
    dropGrad.addColorStop(0, "rgba(242, 247, 250, 0.82)");
    dropGrad.addColorStop(0.35, `rgba(${st.color[0]}, ${st.color[1]}, ${st.color[2]}, 0.42)`);
    dropGrad.addColorStop(1, "rgba(78, 214, 165, 0)");
    ctx.fillStyle = dropGrad;
    ctx.beginPath();
    ctx.arc(headPt.x, headPt.y, dropR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* 2. Three Vertical Emerald-Jade Prism Pulses (exact x = 0.362, 0.443, 0.634) */
  const pillars = [
    { nx: 0.362, yTop: 0.14, yBot: 0.76, speed: 0.62, dir: 1 },
    { nx: 0.443, yTop: 0.23, yBot: 0.68, speed: 0.54, dir: -1 },
    { nx: 0.634, yTop: 0.11, yBot: 0.75, speed: 0.68, dir: 1 },
  ];

  for (let p = 0; p < pillars.length; p++) {
    const pil = pillars[p];
    let proximity = 0;
    for (const cnx of crestPositions) {
      const dist = Math.abs(cnx - pil.nx);
      proximity = Math.max(proximity, Math.max(0, 1 - dist / 0.14));
    }

    const px = rect.x + pil.nx * rect.w;
    const y1 = rect.y + pil.yTop * rect.h;
    const y2 = rect.y + pil.yBot * rect.h;
    const travel = 0.5 + 0.5 * Math.sin(t * pil.speed * 2.1 * pil.dir + p * 1.9);
    const pulseY = y1 + (y2 - y1) * travel;
    const intensity = 0.26 + proximity * 0.52;

    const beam = ctx.createLinearGradient(px, y1, px, y2);
    beam.addColorStop(0, "rgba(78, 214, 165, 0)");
    beam.addColorStop(Math.max(0.05, travel - 0.22), `rgba(31, 168, 122, ${(intensity * 0.28).toFixed(3)})`);
    beam.addColorStop(travel, `rgba(167, 243, 208, ${intensity.toFixed(3)})`);
    beam.addColorStop(Math.min(0.95, travel + 0.22), `rgba(78, 214, 165, ${(intensity * 0.28).toFixed(3)})`);
    beam.addColorStop(1, "rgba(78, 214, 165, 0)");

    ctx.strokeStyle = beam;
    ctx.lineWidth = 2.6 + proximity * 2.2;
    ctx.beginPath();
    ctx.moveTo(px, y1);
    ctx.lineTo(px, y2);
    ctx.stroke();

    const nodeR = rect.w * (0.015 + proximity * 0.014);
    const nodeGrad = ctx.createRadialGradient(px, pulseY, 0, px, pulseY, nodeR);
    nodeGrad.addColorStop(0, `rgba(242, 247, 250, ${(0.45 + proximity * 0.4).toFixed(3)})`);
    nodeGrad.addColorStop(0.45, `rgba(78, 214, 165, ${(0.24 + proximity * 0.25).toFixed(3)})`);
    nodeGrad.addColorStop(1, "rgba(78, 214, 165, 0)");
    ctx.fillStyle = nodeGrad;
    ctx.beginPath();
    ctx.arc(px, pulseY, nodeR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* 3. Floor Caustic Shimmer (y: 0.76..0.93) */
  for (let c = 0; c < 9; c++) {
    const frac = c / 9;
    const ny = 0.77 + frac * 0.15;
    const py = rect.y + ny * rect.h;
    const centerShift = Math.sin(t * 0.9 + c * 1.1) * 0.06;
    const xStart = rect.x + (0.2 + centerShift) * rect.w;
    const xEnd = rect.x + (0.8 + centerShift) * rect.w;
    const alpha = 0.07 + 0.13 * (0.5 + 0.5 * Math.sin(t * 1.35 + c * 0.9));

    const cGrad = ctx.createLinearGradient(xStart, py, xEnd, py);
    cGrad.addColorStop(0, "rgba(78, 214, 165, 0)");
    cGrad.addColorStop(0.3, `rgba(78, 214, 165, ${(alpha * 0.75).toFixed(3)})`);
    cGrad.addColorStop(0.5, `rgba(242, 247, 250, ${alpha.toFixed(3)})`);
    cGrad.addColorStop(0.7, `rgba(167, 243, 208, ${(alpha * 0.7).toFixed(3)})`);
    cGrad.addColorStop(1, "rgba(78, 214, 165, 0)");

    ctx.strokeStyle = cGrad;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(xStart, py);
    ctx.quadraticCurveTo(
      (xStart + xEnd) * 0.5,
      py + Math.sin(t * 1.2 + c * 1.6) * 4.5,
      xEnd,
      py
    );
    ctx.stroke();
  }

  ctx.restore();
}

const reelRenderers = {
  hero: renderHeroWater,
  reel01: renderReel01Botanical,
  reel02: renderReel02Coastal,
  reel03: renderReel03Infinity,
};

const activeCanvases = new Map();
let rafId = null;

function syncCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w: rect.width, h: rect.height, dpr };
}

function tickMotion(nowMs) {
  if (isReducedMotion) {
    rafId = null;
    return;
  }
  const t = nowMs * 0.001;
  let running = false;

  activeCanvases.forEach((entry, canvas) => {
    if (!entry.visible) return;
    running = true;
    const { w, h, dpr } = syncCanvasSize(canvas);
    if (w < 4 || h < 4) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    entry.render(ctx, w, h, t);
    ctx.restore();
  });

  if (running) {
    rafId = requestAnimationFrame(tickMotion);
  } else {
    rafId = null;
  }
}

function ensureMotionLoop() {
  if (!isReducedMotion && !rafId) {
    rafId = requestAnimationFrame(tickMotion);
  }
}

const canvasVisibilityObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      const record = activeCanvases.get(e.target);
      if (!record) return;
      record.visible = e.isIntersecting;
      if (e.isIntersecting) ensureMotionLoop();
    });
  },
  { threshold: 0.04 }
);

function registerCanvas(selector, rendererKey) {
  const canvas = $(selector);
  const render = reelRenderers[rendererKey];
  if (!canvas || !render) return;
  activeCanvases.set(canvas, { render, visible: false });
  canvasVisibilityObserver.observe(canvas);
}

registerCanvas("#hero-water-canvas", "hero");
registerCanvas("#reel01-canvas", "reel01");
registerCanvas("#reel02-canvas", "reel02");
registerCanvas("#reel03-infinity-canvas", "reel03");

/* Full-Cinema Modal Controller (ESC close + guaranteed focus return) */
const cinemaModal = $("#cinema-modal");
const cinemaImg = $("#cinema-stage-img");
const cinemaCanvas = $("#cinema-stage-canvas");
const cinemaTitle = $("#cinema-title");
const cinemaSubtitle = $("#cinema-subtitle");
const cinemaCloseBtn = $("#cinema-close");
let lastCinemaTrigger = null;

function openCinemaModal(reelKey, triggerEl) {
  const panel = $(`.monolith-panel[data-reel="${reelKey}"]`);
  if (!panel || !cinemaModal) return;
  lastCinemaTrigger = triggerEl || document.activeElement;
  if (cinemaImg) {
    cinemaImg.src = panel.dataset.src || "/assets/reel-03-liquid-prism.webp";
    cinemaImg.alt = panel.dataset.title || "GLOW Showcase";
  }
  if (cinemaTitle) cinemaTitle.textContent = panel.dataset.title || "GLOW Showcase";
  if (cinemaSubtitle) cinemaSubtitle.textContent = panel.dataset.subtitle || "";

  cinemaModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (cinemaCanvas && reelRenderers[reelKey]) {
    activeCanvases.set(cinemaCanvas, { render: reelRenderers[reelKey], visible: true });
    ensureMotionLoop();
  }
  cinemaCloseBtn?.focus();
}

function closeCinemaModal() {
  if (!cinemaModal || cinemaModal.classList.contains("hidden")) return;
  cinemaModal.classList.add("hidden");
  document.body.style.overflow = "";
  if (cinemaCanvas) {
    activeCanvases.delete(cinemaCanvas);
    const ctx = cinemaCanvas.getContext("2d");
    ctx?.clearRect(0, 0, cinemaCanvas.width, cinemaCanvas.height);
  }
  if (lastCinemaTrigger && typeof lastCinemaTrigger.focus === "function") {
    lastCinemaTrigger.focus();
  }
  lastCinemaTrigger = null;
}

$$("[data-open-cinema]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openCinemaModal(btn.dataset.openCinema, btn);
  });
});

cinemaCloseBtn?.addEventListener("click", closeCinemaModal);
$("[data-close-cinema]")?.addEventListener("click", closeCinemaModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCinemaModal();
});

setStep(1);
refreshRuntime();
