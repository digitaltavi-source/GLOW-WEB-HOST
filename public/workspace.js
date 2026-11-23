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
  formEyebrow: '01 · YOUR PROJECT BRIEF',
  draftBadge: 'Browser-local draft',
  formTitle: 'Tell GLOW about the website you want to build',
  formMuted: 'Your brief stays in this browser tab until you copy and share it through an authenticated channel. Never enter passwords or secrets here.',
  typeLegend: 'Website focus',
  goalLabel: 'Primary outcome your website should achieve',
  goalHint: 'Write in your preferred language',
  brandLabel: 'Personal or brand name',
  langLabel: 'Website language',
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
  lastDraft = {
    schema: 'GLOW_WEB_PUBLIC_INTAKE_V1',
    intent: 'START_GLOW_WEB_MISSION',
    selected_template_id: activeTemplateId,
    website_type: selected.value,
    goal: description,
    name_or_brand: brandInput.value.trim() || null,
    language: langSelect.value,
    ui_locale: activeLang,
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
