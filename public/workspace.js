'use strict';
const byId = (id) => document.getElementById(id);
const BASE_PATH =
  window.location.pathname === '/web' || window.location.pathname.startsWith('/web/')
    ? '/web'
    : '';
const withBasePath = (p) => {
  if (!p || !p.startsWith('/')) return p;
  if (!BASE_PATH) return p;
  if (p === BASE_PATH || p.startsWith(BASE_PATH + '/')) return p;
  return p === '/' ? BASE_PATH : BASE_PATH + p;
};

const query = new URLSearchParams(window.location.search);
const VALID_TEMPLATE_ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;
const storedLang = (() => {
  try {
    return window.localStorage.getItem('glow_web_lang');
  } catch {
    return null;
  }
})();
const rawLangParam = (query.get('lang') || storedLang || 'vi').trim().toLowerCase();
const activeLang = rawLangParam === 'en' ? 'en' : 'vi';
document.documentElement.lang = activeLang;

const form = byId('brief');
const result = byId('result');
const output = byId('capsule');
const feedback = byId('feedback');
const goal = byId('goal');
const brandInput = byId('brand');
const langSelect = byId('language');
const templateSelect = byId('template-select');
const templateIframe = byId('studio-template-iframe');
const stageMeta = byId('stage-meta');
const previewUrlLabel = byId('studio-preview-url');
const mcpEndpointCode = byId('mcp-endpoint-code');
const studioIframeFrame = byId('studio-iframe-frame');
const pinOverlay = byId('studio-pin-overlay');
const inspectorToggleBtn = byId('inspector-toggle');
const pinCounterBadge = byId('pin-counter-badge');
const clearStalePinsBtn = byId('clear-stale-pins-btn');
const clearPinsBtn = byId('clear-pins-btn');
const pinListPanel = byId('pin-list-panel');
const pinListEl = byId('pin-list');
const chromeBudgetSelect = byId('chrome-budget');
const studioLoopSelect = byId('studio-loop-mode');
const visualDnaNotesInput = byId('visual-dna-notes');

const MAX_REFINEMENT_PINS = 8;
const ALLOWED_VIEWPORTS = new Set(['desktop_1440', 'laptop_1366', 'mobile_390']);
const ALLOWED_CHROME_BUDGETS = new Set(['GALLERY_ZERO_CHROME', 'EDITORIAL_MINIMAL', 'APP_DASHBOARD']);
const ALLOWED_STUDIO_LOOPS = new Set(['FAST_CREATIVE_STUDIO', 'RELEASE_HARDENING']);

let activeViewport = 'desktop_1440';
let inspectorActive = false;
let refinementPins = [];
let pinSeq = 1;
let keyboardReticleX = 50;
let keyboardReticleY = 50;

let templatesCatalog = [];
let activeTemplateId = 'coastal-glass-architecture';
const requestedTemplate = (query.get('template') || '').trim();
if (VALID_TEMPLATE_ID_RE.test(requestedTemplate)) {
  activeTemplateId = requestedTemplate;
}

const requestedBrand = (query.get('brand') || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 80);
if (requestedBrand && brandInput) {
  brandInput.value = requestedBrand;
}
if (activeLang === 'en' && langSelect) {
  langSelect.value = 'English';
}

if (BASE_PATH) {
  const homeA = byId('ws-brand-home');
  const navHome = byId('ws-nav-home');
  const regLink = byId('ws-register-link');
  const privLink = byId('ws-privacy-link');
  if (homeA) homeA.setAttribute('href', BASE_PATH);
  if (navHome) navHome.setAttribute('href', BASE_PATH);
  if (regLink) regLink.setAttribute('href', `${BASE_PATH}/#register`);
  if (privLink) privLink.setAttribute('href', `${BASE_PATH}/privacy${activeLang === 'en' ? '?lang=en' : ''}`);
} else if (activeLang === 'en') {
  const privLink = byId('ws-privacy-link');
  if (privLink) privLink.setAttribute('href', '/privacy?lang=en');
}

if (mcpEndpointCode) {
  mcpEndpointCode.textContent = `${window.location.origin}${withBasePath('/mcp-v2')}`;
}

const EN_COPY = {
  skip: 'Skip to main content',
  subbrand: 'Studio Workspace',
  navHome: 'Home',
  navStage: 'Templates',
  navBrief: 'Brief',
  navAi: 'AI Connect',
  navStatus: 'Status',
  introEyebrow: 'START YOUR DIGITAL EXPERIENCE',
  stageEyebrow: '00 · LIVE EDITORIAL TEMPLATE STAGE',
  stageTitle: 'Preview & customize 12 cleanroom website templates',
  stageSelectLabel: 'Choose website template',
  inspectorToggle: 'Visual Feedback Pins (Draft)',
  clearStalePinsBtn: 'Clear other-view pins',
  clearPinsBtn: 'Clear all pins',
  inspectorHint: 'Enable Visual Feedback Pins and click (or press Arrow keys + Enter/Space) to drop up to 8 scoped draft feedback pins bound to the current template, locale, and viewport (draft annotation only — does not hot-patch live DOM; iframe sandbox stays untouched).',
  pinListTitle: 'Draft feedback annotation pins',
  pinListSub: 'Attached only to your browser-local brief JSON draft — does not hot-patch live DOM or source',
  formEyebrow: '01 · YOUR PROJECT BRIEF',
  draftBadge: 'Browser-local draft',
  formTitle: 'Tell GLOW about the website you want to build',
  formMuted: 'Your brief stays in this browser tab until you copy and share it through an authenticated channel. Never enter passwords or secrets here.',
  typeLegend: 'Website focus',
  goalLabel: 'Primary outcome your website should achieve',
  goalHint: 'Write in your preferred language',
  brandLabel: 'Personal or brand name',
  langLabel: 'Website language',
  chromeBudgetLabel: 'Interface chrome budget',
  chromeOptEditorial: 'EDITORIAL_MINIMAL — Editorial minimal standard',
  chromeOptGallery: 'GALLERY_ZERO_CHROME — Pure cinema gallery showcase',
  chromeOptApp: 'APP_DASHBOARD — Application / operational console',
  studioLoopLabel: 'Studio workflow mode',
  loopOptFast: 'FAST_CREATIVE_STUDIO — Rapid creative iteration & visual review',
  loopOptHardening: 'RELEASE_HARDENING — Strict pre-release verification',
  visualDnaLabel: 'Visual DNA & material notes (optional)',
  visualDnaPlaceholder: 'Example: Ivory porcelain & celadon glaze, natural daylight, generous breathing room.',
  submitBtn: 'Prepare structured brief',
  altLink: 'Other intake options',
  resultEyebrow: 'STRUCTURED BRIEF READY',
  resultTitle: 'Your website brief has been compiled',
  resultDesc: 'No project has been created on the server yet. Copy this structured brief to continue in ChatGPT or Google Gemini connected to GLOW WEBSITE.',
  copyBtn: 'Copy brief JSON',
  aiEyebrow: 'AI CONNECTOR (MCP)',
  aiTitle: 'ChatGPT & Gemini MCP Endpoint',
  aiNote: 'Use this OAuth 2.1 protected MCP resource URL when connecting GLOW Web in ChatGPT or compatible AI assistants:',
  copyMcpBtn: 'Copy MCP URL',
  connEyebrow: '02 · SERVICE CONNECTIVITY',
  connTitle: 'Service status',
  svcLabel: 'Protected runtime',
  refreshBtn: 'Re-check connectivity',
  connNote: 'Reachable status confirms transport health only and does not create or approve a project.',
  guideEyebrow: 'PROPOSED JOURNEY',
  guideTitle: 'What happens next?',
  guideNote: 'Informational overview only — not live project execution progress.',
};

if (activeLang === 'en') {
  document.querySelectorAll('[data-ws-i18n]').forEach((node) => {
    const key = node.getAttribute('data-ws-i18n');
    if (key && Object.prototype.hasOwnProperty.call(EN_COPY, key)) {
      node.textContent = EN_COPY[key];
    }
  });
  if (visualDnaNotesInput) {
    visualDnaNotesInput.placeholder = EN_COPY.visualDnaPlaceholder;
  }
}

const counter = () => {
  byId('remaining').textContent = goal.value.length + ' / 700';
};
goal.addEventListener('input', counter);
counter();

let lastDraft = null;
const show = (message) => {
  feedback.textContent = message;
};

function inferSemanticRegion(yPct) {
  if (yPct <= 14) return 'header_nav';
  if (yPct <= 44) return 'hero_above_fold';
  if (yPct <= 70) return 'primary_media_stage';
  if (yPct <= 88) return 'detail_panel';
  return 'footer';
}

function defaultPinNote(region) {
  if (activeLang === 'en') {
    return `Refine ${region.replace(/_/g, ' ')} visual hierarchy and spacing`;
  }
  return `Tinh chỉnh bố cục và khoảng thở tại vùng ${region.replace(/_/g, ' ')}`;
}

function isPinMatchingActiveView(pin) {
  return (
    pin.template_id === activeTemplateId &&
    pin.locale === activeLang &&
    pin.viewport === activeViewport
  );
}

function addRefinementPinAt(xPct, yPct) {
  if (refinementPins.length >= MAX_REFINEMENT_PINS) {
    show(
      activeLang === 'en'
        ? `Maximum ${MAX_REFINEMENT_PINS} draft feedback pins reached.`
        : `Đã đạt giới hạn tối đa ${MAX_REFINEMENT_PINS} điểm ghim góp ý.`
    );
    return null;
  }
  const clampedX = Math.round(Math.min(100, Math.max(0, xPct)) * 10) / 10;
  const clampedY = Math.round(Math.min(100, Math.max(0, yPct)) * 10) / 10;
  const region = inferSemanticRegion(clampedY);
  const pinId = `pin-${String(pinSeq++).padStart(2, '0')}`;
  const pin = {
    pin_id: pinId,
    template_id: activeTemplateId,
    locale: activeLang,
    viewport: activeViewport,
    region,
    x_pct: clampedX,
    y_pct: clampedY,
    note: defaultPinNote(region),
  };
  refinementPins.push(pin);
  renderRefinementPins();
  const noteField = byId(`pin-note-${pinId}`);
  if (noteField) noteField.focus();
  return pin;
}

function setViewportPreset(viewportKey) {
  if (!ALLOWED_VIEWPORTS.has(viewportKey)) return;
  activeViewport = viewportKey;
  if (studioIframeFrame) {
    studioIframeFrame.classList.remove(
      'viewport-desktop-1440',
      'viewport-laptop-1366',
      'viewport-mobile-390'
    );
    studioIframeFrame.classList.add(`viewport-${viewportKey.replace(/_/g, '-')}`);
    studioIframeFrame.setAttribute('data-viewport', viewportKey);
  }
  document.querySelectorAll('.vp-btn').forEach((btn) => {
    const isMatch = btn.getAttribute('data-viewport') === viewportKey;
    btn.classList.toggle('is-active', isMatch);
    btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
  });
  renderRefinementPins();
}

function renderRefinementPins() {
  const activePins = refinementPins.filter(isPinMatchingActiveView);
  const staleCount = refinementPins.length - activePins.length;

  if (pinCounterBadge) {
    pinCounterBadge.textContent =
      staleCount > 0
        ? `${activePins.length} (${refinementPins.length}/${MAX_REFINEMENT_PINS})`
        : `${refinementPins.length} / ${MAX_REFINEMENT_PINS}`;
  }
  if (clearPinsBtn) {
    clearPinsBtn.disabled = refinementPins.length === 0;
  }
  if (clearStalePinsBtn) {
    clearStalePinsBtn.disabled = staleCount === 0;
  }
  if (pinOverlay) {
    const overlayFrag = document.createDocumentFragment();
    const reticle = document.createElement('span');
    reticle.id = 'studio-pin-reticle';
    reticle.className = 'studio-pin-reticle';
    reticle.setAttribute('aria-hidden', 'true');
    reticle.style.setProperty('--reticle-x', `${keyboardReticleX}%`);
    reticle.style.setProperty('--reticle-y', `${keyboardReticleY}%`);
    overlayFrag.appendChild(reticle);

    refinementPins.forEach((pin, idx) => {
      if (!isPinMatchingActiveView(pin)) return;
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'studio-pin-marker';
      marker.setAttribute('data-pin-id', pin.pin_id);
      marker.setAttribute('data-template-id', pin.template_id);
      marker.setAttribute('data-viewport', pin.viewport);
      marker.textContent = String(idx + 1);
      marker.style.setProperty('--pin-x', `${pin.x_pct}%`);
      marker.style.setProperty('--pin-y', `${pin.y_pct}%`);
      marker.setAttribute(
        'aria-label',
        activeLang === 'en'
          ? `Pin ${idx + 1} on ${pin.template_id} ${pin.viewport} at ${pin.region} (${pin.x_pct}%, ${pin.y_pct}%)`
          : `Ghim số ${idx + 1} trên ${pin.template_id} ${pin.viewport} tại ${pin.region} (${pin.x_pct}%, ${pin.y_pct}%)`
      );
      marker.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const noteField = byId(`pin-note-${pin.pin_id}`);
        if (noteField) noteField.focus();
      });
      overlayFrag.appendChild(marker);
    });
    pinOverlay.replaceChildren(overlayFrag);
  }
  if (pinListPanel && pinListEl) {
    pinListPanel.hidden = refinementPins.length === 0;
    const listFrag = document.createDocumentFragment();
    refinementPins.forEach((pin, idx) => {
      const isActiveView = isPinMatchingActiveView(pin);
      const li = document.createElement('li');
      li.className = isActiveView ? 'pin-item' : 'pin-item is-stale';
      li.setAttribute('data-pin-state', isActiveView ? 'active' : 'stale');

      const meta = document.createElement('div');
      meta.className = 'pin-item-meta';

      const badge = document.createElement('span');
      badge.className = 'pin-item-badge';
      badge.textContent = `#${idx + 1} · ${pin.region}`;

      const coords = document.createElement('span');
      coords.className = 'pin-item-coords';
      coords.textContent = `${pin.template_id} · ${pin.locale} · ${pin.viewport} · (${pin.x_pct}%, ${pin.y_pct}%)`;

      meta.appendChild(badge);
      meta.appendChild(coords);

      if (!isActiveView) {
        const staleTag = document.createElement('span');
        staleTag.className = 'pin-stale-badge';
        staleTag.textContent = activeLang === 'en' ? 'Other view' : 'Khác khung xem';
        meta.appendChild(staleTag);
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `pin-note-${pin.pin_id}`;
      input.className = 'pin-note-input';
      input.maxLength = 240;
      input.value = pin.note;
      input.placeholder =
        activeLang === 'en'
          ? 'Concise draft feedback note (max 240 chars)'
          : 'Ghi chú góp ý ngắn gọn (tối đa 240 ký tự)';
      input.setAttribute(
        'aria-label',
        activeLang === 'en' ? `Feedback note for pin ${idx + 1}` : `Ghi chú góp ý cho ghim ${idx + 1}`
      );
      input.addEventListener('input', () => {
        pin.note = input.value.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, 240);
      });

      const actions = document.createElement('div');
      actions.className = 'pin-item-actions';

      if (!isActiveView && pin.locale === activeLang) {
        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.className = 'pin-jump-btn';
        jumpBtn.textContent = activeLang === 'en' ? 'Jump to view' : 'Xem khung này';
        jumpBtn.addEventListener('click', () => {
          if (VALID_TEMPLATE_ID_RE.test(pin.template_id) && pin.template_id !== activeTemplateId) {
            activeTemplateId = pin.template_id;
            if (templateSelect) templateSelect.value = activeTemplateId;
            renderLiveTemplateStage();
          }
          setViewportPreset(pin.viewport);
        });
        actions.appendChild(jumpBtn);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'pin-remove-btn';
      removeBtn.textContent = activeLang === 'en' ? 'Remove' : 'Xóa';
      removeBtn.addEventListener('click', () => {
        refinementPins = refinementPins.filter((item) => item.pin_id !== pin.pin_id);
        renderRefinementPins();
      });
      actions.appendChild(removeBtn);

      li.appendChild(meta);
      li.appendChild(input);
      li.appendChild(actions);
      listFrag.appendChild(li);
    });
    pinListEl.replaceChildren(listFrag);
  }
}

function setInspectorActive(nextActive) {
  inspectorActive = Boolean(nextActive);
  if (inspectorToggleBtn) {
    inspectorToggleBtn.classList.toggle('is-active', inspectorActive);
    inspectorToggleBtn.setAttribute('aria-pressed', inspectorActive ? 'true' : 'false');
  }
  if (pinOverlay) {
    pinOverlay.classList.toggle('is-active', inspectorActive);
    pinOverlay.setAttribute('aria-hidden', inspectorActive ? 'false' : 'true');
    pinOverlay.tabIndex = inspectorActive ? 0 : -1;
    if (!inspectorActive) {
      pinOverlay.classList.remove('kb-reticle-visible');
    }
  }
}

document.querySelectorAll('.vp-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const vp = btn.getAttribute('data-viewport') || 'desktop_1440';
    setViewportPreset(vp);
  });
});

if (inspectorToggleBtn) {
  inspectorToggleBtn.addEventListener('click', () => {
    setInspectorActive(!inspectorActive);
    show(
      inspectorActive
        ? activeLang === 'en'
          ? 'Visual Feedback Pins enabled (draft annotation only). Click or press Arrow keys + Enter/Space on the preview.'
          : 'Đã bật chế độ Ghim Góp Ý Trực Quan (chỉ lưu bản nháp). Nhấp chuột hoặc dùng phím mũi tên + Enter/Space.'
        : activeLang === 'en'
          ? 'Visual Feedback Pins paused.'
          : 'Đã tạm tắt chế độ Ghim Góp Ý Trực Quan.'
    );
  });
}

if (clearStalePinsBtn) {
  clearStalePinsBtn.addEventListener('click', () => {
    refinementPins = refinementPins.filter(isPinMatchingActiveView);
    renderRefinementPins();
    show(
      activeLang === 'en'
        ? 'Cleared feedback pins belonging to other templates or viewports.'
        : 'Đã xóa các điểm ghim thuộc mẫu hoặc khung hiển thị khác.'
    );
  });
}

if (clearPinsBtn) {
  clearPinsBtn.addEventListener('click', () => {
    refinementPins = [];
    renderRefinementPins();
    show(activeLang === 'en' ? 'Cleared all draft feedback pins.' : 'Đã xóa toàn bộ điểm ghim góp ý.');
  });
}

if (pinOverlay) {
  pinOverlay.addEventListener('click', (event) => {
    if (!inspectorActive) return;
    const rect = pinOverlay.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;
    addRefinementPinAt(rawX, rawY);
  });

  pinOverlay.addEventListener('keydown', (event) => {
    if (!inspectorActive) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (event.key === 'ArrowLeft') keyboardReticleX = Math.max(0, keyboardReticleX - 5);
      if (event.key === 'ArrowRight') keyboardReticleX = Math.min(100, keyboardReticleX + 5);
      if (event.key === 'ArrowUp') keyboardReticleY = Math.max(0, keyboardReticleY - 5);
      if (event.key === 'ArrowDown') keyboardReticleY = Math.min(100, keyboardReticleY + 5);
      pinOverlay.classList.add('kb-reticle-visible');
      const reticle = byId('studio-pin-reticle');
      if (reticle) {
        reticle.style.setProperty('--reticle-x', `${keyboardReticleX}%`);
        reticle.style.setProperty('--reticle-y', `${keyboardReticleY}%`);
      }
      show(
        activeLang === 'en'
          ? `Pin reticle at (${keyboardReticleX}%, ${keyboardReticleY}%) — press Enter or Space to drop pin.`
          : `Tâm ghim bàn phím tại (${keyboardReticleX}%, ${keyboardReticleY}%) — nhấn Enter hoặc Space để thả ghim.`
      );
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pinOverlay.classList.add('kb-reticle-visible');
      addRefinementPinAt(keyboardReticleX, keyboardReticleY);
    }
  });
}

renderRefinementPins();

function renderLiveTemplateStage() {
  if (!templateIframe) return;
  const params = new URLSearchParams({ lang: activeLang });
  const currentBrand = brandInput ? brandInput.value.trim().slice(0, 80) : '';
  const currentBrief = goal ? goal.value.trim().slice(0, 240) : '';
  if (currentBrand) params.set('brand', currentBrand);
  if (currentBrief) params.set('brief', currentBrief);
  const renderUrl = withBasePath(
    `/api/templates/${encodeURIComponent(activeTemplateId)}/render?${params.toString()}`
  );
  if (templateIframe.getAttribute('src') !== renderUrl) {
    templateIframe.setAttribute('src', renderUrl);
  }
  if (previewUrlLabel) {
    previewUrlLabel.textContent = `glow.web/${activeTemplateId}?lang=${activeLang}`;
  }
  const found = templatesCatalog.find((t) => t.id === activeTemplateId);
  if (found && stageMeta) {
    const loc = found[activeLang] || found.vi;
    stageMeta.textContent = `${loc.title} · ${loc.industry_label} — ${loc.tagline}`;
  }
}

let previewDebounceTimer = null;
function scheduleTemplateRefresh() {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(renderLiveTemplateStage, 260);
}

if (brandInput) brandInput.addEventListener('input', scheduleTemplateRefresh);
if (goal) goal.addEventListener('input', scheduleTemplateRefresh);

async function loadTemplatesCatalog() {
  try {
    const res = await fetch(withBasePath('/api/templates'), {
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error('templates_unavailable');
    const data = await res.json();
    if (!data || !Array.isArray(data.templates) || data.templates.length === 0) {
      throw new Error('templates_empty');
    }
    templatesCatalog = data.templates;
    if (!templatesCatalog.some((t) => t.id === activeTemplateId)) {
      activeTemplateId = templatesCatalog[0].id;
    }
    if (templateSelect) {
      const frag = document.createDocumentFragment();
      for (const tpl of templatesCatalog) {
        const opt = document.createElement('option');
        opt.value = tpl.id;
        const loc = tpl[activeLang] || tpl.vi;
        opt.textContent = `${loc.title} (${loc.industry_label})`;
        if (tpl.id === activeTemplateId) opt.selected = true;
        frag.appendChild(opt);
      }
      templateSelect.replaceChildren(frag);
    }
    renderLiveTemplateStage();
    renderRefinementPins();
  } catch {
    if (stageMeta) {
      stageMeta.textContent =
        activeLang === 'en'
          ? 'Previewing selected template in standalone mode.'
          : 'Đang hiển thị khung xem trước mẫu giao diện trực tiếp.';
    }
    renderLiveTemplateStage();
    renderRefinementPins();
  }
}

if (templateSelect) {
  templateSelect.addEventListener('change', () => {
    const nextId = templateSelect.value.trim();
    if (VALID_TEMPLATE_ID_RE.test(nextId)) {
      activeTemplateId = nextId;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('template', activeTemplateId);
      nextUrl.searchParams.set('lang', activeLang);
      window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      renderLiveTemplateStage();
      renderRefinementPins();
    }
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const selected = form.querySelector('input[name="type"]:checked');
  if (!selected) {
    show(activeLang === 'en' ? 'Please choose a website focus.' : 'Hãy chọn loại website.');
    form.querySelector('input[name="type"]').focus();
    return;
  }
  const description = goal.value.trim();
  if (description.length < 15) {
    show(
      activeLang === 'en'
        ? 'Please describe your goal in at least 15 characters.'
        : 'Hãy mô tả mục tiêu với ít nhất 15 ký tự.'
    );
    goal.focus();
    return;
  }
  const selectedChromeBudget =
    chromeBudgetSelect && ALLOWED_CHROME_BUDGETS.has(chromeBudgetSelect.value)
      ? chromeBudgetSelect.value
      : 'EDITORIAL_MINIMAL';
  const selectedStudioLoop =
    studioLoopSelect && ALLOWED_STUDIO_LOOPS.has(studioLoopSelect.value)
      ? studioLoopSelect.value
      : 'FAST_CREATIVE_STUDIO';
  const visualDnaNotes = visualDnaNotesInput
    ? visualDnaNotesInput.value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 240)
    : '';
  const compiledPins = refinementPins.slice(0, MAX_REFINEMENT_PINS).map((pin) => ({
    pin_id: pin.pin_id,
    template_id: VALID_TEMPLATE_ID_RE.test(pin.template_id || '') ? pin.template_id : activeTemplateId,
    locale: pin.locale === 'en' ? 'en' : 'vi',
    viewport: ALLOWED_VIEWPORTS.has(pin.viewport) ? pin.viewport : 'desktop_1440',
    region: pin.region,
    x_pct: pin.x_pct,
    y_pct: pin.y_pct,
    note: (pin.note || '').trim().slice(0, 240) || defaultPinNote(pin.region),
  }));

  lastDraft = {
    schema: 'GLOW_WEB_PUBLIC_INTAKE_V1',
    intent: 'START_GLOW_WEB_MISSION',
    selected_template_id: activeTemplateId,
    website_type: selected.value,
    goal: description,
    name_or_brand: brandInput.value.trim() || null,
    language: langSelect.value,
    ui_locale: activeLang,
    chrome_budget: selectedChromeBudget,
    studio_loop_mode: selectedStudioLoop,
    visual_dna_notes: visualDnaNotes || null,
    pin_workflow_scope: 'DRAFT_FEEDBACK_ANNOTATION_ONLY',
    refinement_pins: compiledPins,
    privacy: 'PUBLIC_INTAKE_ONLY_NO_PRIVATE_FACTORY_STATE',
    execution_profile: 'DEMO_BOUNDED',
    notice: 'DRAFT_ONLY_NOT_SUBMITTED',
  };
  output.textContent = JSON.stringify(lastDraft, null, 2);
  result.hidden = false;
  result.focus();
  show(
    activeLang === 'en'
      ? 'Draft prepared locally. No data has been submitted to the server yet.'
      : 'Đã chuẩn bị bản nháp. Chưa gửi dữ liệu lên nhà máy.'
  );
});

byId('copy').addEventListener('click', async () => {
  if (!lastDraft) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastDraft, null, 2));
    show(
      activeLang === 'en'
        ? 'Copied brief JSON. Paste it into your connected AI channel.'
        : 'Đã sao chép nội dung. Bạn có thể gửi qua kênh đã kết nối.'
    );
  } catch {
    show(
      activeLang === 'en'
        ? 'Clipboard permission blocked; please copy the JSON block manually.'
        : 'Trình duyệt chưa cho phép sao chép tự động. Hãy chọn và sao chép văn bản trong khung.'
    );
  }
});

const copyMcpBtn = byId('copy-mcp');
if (copyMcpBtn) {
  copyMcpBtn.addEventListener('click', async () => {
    const endpoint = `${window.location.origin}${withBasePath('/mcp-v2')}`;
    try {
      await navigator.clipboard.writeText(endpoint);
      show(
        activeLang === 'en'
          ? 'Copied MCP endpoint URL to clipboard.'
          : 'Đã sao chép địa chỉ cổng MCP.'
      );
    } catch {
      show(endpoint);
    }
  });
}

async function checkConnection() {
  const host = byId('host-status');
  const service = byId('service-status');
  const dh = byId('dot-host');
  const ds = byId('dot-service');
  host.textContent = activeLang === 'en' ? 'Checking…' : 'Đang kiểm tra…';
  service.textContent = activeLang === 'en' ? 'Checking…' : 'Đang kiểm tra…';
  dh.className = 'dot';
  ds.className = 'dot';
  const timeout = AbortSignal.timeout(7000);
  const [a, b] = await Promise.allSettled([
    fetch(withBasePath('/api/public/profile'), { signal: timeout, cache: 'no-store' }).then(
      async (r) => {
        if (!r.ok) throw Error('unavailable');
        const j = await r.json();
        if (j.product !== 'GLOW Web') throw Error('unexpected');
        return j;
      }
    ),
    fetch(withBasePath('/readyz'), { signal: timeout, cache: 'no-store' }).then(async (r) => ({
      ok: r.ok,
      body: await r.json(),
    })),
  ]);
  if (a.status === 'fulfilled') {
    host.textContent = activeLang === 'en' ? 'Connected' : 'Đã kết nối';
    dh.classList.add('ok');
  } else {
    host.textContent = activeLang === 'en' ? 'Unconfirmed' : 'Chưa xác nhận kết nối';
    dh.classList.add('down');
  }
  if (b.status === 'fulfilled' && b.value.ok && b.value.body.ok === true) {
    service.textContent =
      activeLang === 'en' ? 'Reachable (no project created)' : 'Đã phản hồi, chưa xác nhận dự án';
    ds.classList.add('ok');
  } else {
    service.textContent =
      activeLang === 'en' ? 'Standby or unavailable' : 'Chưa sẵn sàng hoặc tạm gián đoạn';
    ds.classList.add('down');
  }
}

byId('refresh').addEventListener('click', checkConnection);
void loadTemplatesCatalog();
void checkConnection();
