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
  inspectorToggle: 'Visual Click-to-Refine',
  clearPinsBtn: 'Clear all pins',
  inspectorHint: 'Enable Visual Click-to-Refine and click on the preview canvas to drop up to 8 numbered refinement pins (iframe sandbox stays untouched).',
  pinListTitle: 'Visual refinement pins',
  pinListSub: 'Attached automatically to your browser-local brief JSON',
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
  studioLoopLabel: 'Studio workflow mode',
  visualDnaLabel: 'Visual DNA & material notes (optional)',
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
}

function renderRefinementPins() {
  if (pinCounterBadge) {
    pinCounterBadge.textContent = `${refinementPins.length} / ${MAX_REFINEMENT_PINS}`;
  }
  if (clearPinsBtn) {
    clearPinsBtn.disabled = refinementPins.length === 0;
  }
  if (pinOverlay) {
    const overlayFrag = document.createDocumentFragment();
    refinementPins.forEach((pin, idx) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'studio-pin-marker';
      marker.textContent = String(idx + 1);
      marker.style.setProperty('--pin-x', `${pin.x_pct}%`);
      marker.style.setProperty('--pin-y', `${pin.y_pct}%`);
      marker.setAttribute(
        'aria-label',
        activeLang === 'en'
          ? `Pin ${idx + 1} at ${pin.region} (${pin.x_pct}%, ${pin.y_pct}%)`
          : `Ghim số ${idx + 1} tại ${pin.region} (${pin.x_pct}%, ${pin.y_pct}%)`
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
      const li = document.createElement('li');
      li.className = 'pin-item';

      const meta = document.createElement('div');
      meta.className = 'pin-item-meta';

      const badge = document.createElement('span');
      badge.className = 'pin-item-badge';
      badge.textContent = `#${idx + 1} · ${pin.region}`;

      const coords = document.createElement('span');
      coords.className = 'pin-item-coords';
      coords.textContent = `${pin.viewport} · (${pin.x_pct}%, ${pin.y_pct}%)`;

      meta.appendChild(badge);
      meta.appendChild(coords);

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `pin-note-${pin.pin_id}`;
      input.className = 'pin-note-input';
      input.maxLength = 240;
      input.value = pin.note;
      input.placeholder =
        activeLang === 'en'
          ? 'Concise refinement note (max 240 chars)'
          : 'Ghi chú chỉnh sửa ngắn gọn (tối đa 240 ký tự)';
      input.setAttribute(
        'aria-label',
        activeLang === 'en' ? `Refinement note for pin ${idx + 1}` : `Ghi chú chỉnh sửa cho ghim ${idx + 1}`
      );
      input.addEventListener('input', () => {
        pin.note = input.value.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, 240);
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'pin-remove-btn';
      removeBtn.textContent = activeLang === 'en' ? 'Remove' : 'Xóa';
      removeBtn.addEventListener('click', () => {
        refinementPins = refinementPins.filter((item) => item.pin_id !== pin.pin_id);
        renderRefinementPins();
      });

      li.appendChild(meta);
      li.appendChild(input);
      li.appendChild(removeBtn);
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
          ? 'Visual Click-to-Refine enabled. Click on the preview canvas to drop a pin.'
          : 'Đã bật chế độ Ghim & Sửa Trực Quan. Hãy nhấp vào khung xem trước để thả ghim.'
        : activeLang === 'en'
          ? 'Visual Click-to-Refine paused.'
          : 'Đã tạm tắt chế độ Ghim & Sửa Trực Quan.'
    );
  });
}

if (clearPinsBtn) {
  clearPinsBtn.addEventListener('click', () => {
    refinementPins = [];
    renderRefinementPins();
    show(activeLang === 'en' ? 'Cleared all refinement pins.' : 'Đã xóa toàn bộ điểm ghim tinh chỉnh.');
  });
}

if (pinOverlay) {
  pinOverlay.addEventListener('click', (event) => {
    if (!inspectorActive) return;
    if (refinementPins.length >= MAX_REFINEMENT_PINS) {
      show(
        activeLang === 'en'
          ? `Maximum ${MAX_REFINEMENT_PINS} refinement pins reached.`
          : `Đã đạt giới hạn tối đa ${MAX_REFINEMENT_PINS} điểm ghim tinh chỉnh.`
      );
      return;
    }
    const rect = pinOverlay.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;
    const xPct = Math.round(Math.min(100, Math.max(0, rawX)) * 10) / 10;
    const yPct = Math.round(Math.min(100, Math.max(0, rawY)) * 10) / 10;
    const region = inferSemanticRegion(yPct);
    const pinId = `pin-${String(pinSeq++).padStart(2, '0')}`;
    refinementPins.push({
      pin_id: pinId,
      viewport: activeViewport,
      region,
      x_pct: xPct,
      y_pct: yPct,
      note: defaultPinNote(region),
    });
    renderRefinementPins();
    const noteField = byId(`pin-note-${pinId}`);
    if (noteField) noteField.focus();
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
  } catch {
    if (stageMeta) {
      stageMeta.textContent =
        activeLang === 'en'
          ? 'Previewing selected template in standalone mode.'
          : 'Đang hiển thị khung xem trước mẫu giao diện trực tiếp.';
    }
    renderLiveTemplateStage();
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
