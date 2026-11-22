import type { TemplateBlockSpec, TemplateItem } from "./template-registry.js";

export type TemplateRenderLang = "vi" | "en";

export interface TemplateRenderOptions {
  readonly lang?: TemplateRenderLang;
  readonly brand?: string;
  readonly brief?: string;
}

export interface TemplateDesignTokens {
  readonly mode: "dark" | "light";
  readonly surface_bg: string;
  readonly surface_alt: string;
  readonly surface_card: string;
  readonly text_primary: string;
  readonly text_muted: string;
  readonly accent: string;
  readonly accent_soft: string;
  readonly border: string;
  readonly font_display: string;
  readonly font_body: string;
  readonly radius: string;
}

export interface TemplateSourcePayload {
  readonly ok: true;
  readonly schema_version: "1.0.0";
  readonly id: string;
  readonly license: TemplateItem["license"];
  readonly source_inspiration: string;
  readonly blocks: readonly TemplateBlockSpec[];
  readonly html: string;
  readonly design_tokens: TemplateDesignTokens;
}

interface TemplateRenderContext {
  readonly lang: TemplateRenderLang;
  readonly brand: string;
  readonly brief: string;
  readonly isEn: boolean;
  readonly template: TemplateItem;
  readonly tokens: TemplateDesignTokens;
}

const FONT_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", "Palatino Linotype", serif';
const FONT_MONO = 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

export function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeOverride(value: string | undefined, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : undefined;
}

function resolveLang(lang?: string): TemplateRenderLang {
  return lang === "en" ? "en" : "vi";
}

const DESIGN_TOKENS_BY_ID: Readonly<Record<string, TemplateDesignTokens>> = {
  "coastal-glass-architecture": {
    mode: "dark",
    surface_bg: "#0E161D",
    surface_alt: "#142029",
    surface_card: "#172530",
    text_primary: "#F2EFE9",
    text_muted: "#A6B6C2",
    accent: "#D9C7A8",
    accent_soft: "rgba(217, 199, 168, 0.14)",
    border: "rgba(234, 230, 223, 0.16)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "4px",
  },
  "botanical-wellness-sanctuary": {
    mode: "light",
    surface_bg: "#F5F7F4",
    surface_alt: "#EBF1EC",
    surface_card: "#FFFFFF",
    text_primary: "#173025",
    text_muted: "#4F6B5D",
    accent: "#1B4332",
    accent_soft: "#DCECE2",
    border: "rgba(27, 67, 50, 0.14)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "16px",
  },
  "ocean-obsidian-ai-platform": {
    mode: "dark",
    surface_bg: "#090D16",
    surface_alt: "#0F172A",
    surface_card: "#111A2E",
    text_primary: "#F1F5F9",
    text_muted: "#94A3B8",
    accent: "#34E8B4",
    accent_soft: "rgba(56, 189, 248, 0.14)",
    border: "rgba(148, 163, 184, 0.18)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "14px",
  },
  "atelier-maison-luxury": {
    mode: "dark",
    surface_bg: "#0D0E11",
    surface_alt: "#15171C",
    surface_card: "#171920",
    text_primary: "#F6F1E9",
    text_muted: "#A9A49B",
    accent: "#E3D2B6",
    accent_soft: "rgba(227, 210, 182, 0.12)",
    border: "rgba(232, 223, 209, 0.16)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "2px",
  },
  "azure-horizon-resort": {
    mode: "light",
    surface_bg: "#F2F7F9",
    surface_alt: "#E3EFF3",
    surface_card: "#FFFFFF",
    text_primary: "#0D3B4C",
    text_muted: "#496F7D",
    accent: "#0D6E7A",
    accent_soft: "#D7EEF2",
    border: "rgba(13, 59, 76, 0.14)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "16px",
  },
  "jade-botanical-skincare": {
    mode: "light",
    surface_bg: "#FAFBF9",
    surface_alt: "#EFF5F0",
    surface_card: "#FFFFFF",
    text_primary: "#132A1E",
    text_muted: "#4C695A",
    accent: "#166534",
    accent_soft: "#DCFCE7",
    border: "rgba(22, 101, 52, 0.14)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "14px",
  },
  "silver-prism-creative-studio": {
    mode: "dark",
    surface_bg: "#111317",
    surface_alt: "#181B22",
    surface_card: "#1B1F27",
    text_primary: "#F8FAFC",
    text_muted: "#9CA3AF",
    accent: "#34E8B4",
    accent_soft: "rgba(52, 232, 180, 0.14)",
    border: "rgba(248, 250, 252, 0.14)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "10px",
  },
  "calm-sea-fine-dining": {
    mode: "dark",
    surface_bg: "#0E1114",
    surface_alt: "#151A1F",
    surface_card: "#171D22",
    text_primary: "#F3EFE6",
    text_muted: "#A7B3AF",
    accent: "#C8D5CE",
    accent_soft: "rgba(200, 213, 206, 0.12)",
    border: "rgba(200, 213, 206, 0.18)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "8px",
  },
  "serene-clinic-medical": {
    mode: "light",
    surface_bg: "#F7FBFA",
    surface_alt: "#E7F5F3",
    surface_card: "#FFFFFF",
    text_primary: "#0E2F33",
    text_muted: "#486B70",
    accent: "#0D7A6F",
    accent_soft: "#D3F0EC",
    border: "rgba(13, 122, 111, 0.16)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "14px",
  },
  "monolith-advisory-legal": {
    mode: "dark",
    surface_bg: "#0B1320",
    surface_alt: "#111D30",
    surface_card: "#142238",
    text_primary: "#F1F5F9",
    text_muted: "#9DB0C9",
    accent: "#93C5FD",
    accent_soft: "rgba(147, 197, 253, 0.14)",
    border: "rgba(226, 232, 240, 0.16)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "6px",
  },
  "kinetic-academy-edtech": {
    mode: "light",
    surface_bg: "#F8FAFC",
    surface_alt: "#EEF2F7",
    surface_card: "#FFFFFF",
    text_primary: "#0F172A",
    text_muted: "#475569",
    accent: "#0D9488",
    accent_soft: "#CCFBF1",
    border: "rgba(15, 23, 42, 0.11)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "14px",
  },
  "veranda-interior-atelier": {
    mode: "light",
    surface_bg: "#F6F5F1",
    surface_alt: "#ECE9E1",
    surface_card: "#FFFFFF",
    text_primary: "#1E262B",
    text_muted: "#5A6266",
    accent: "#47555E",
    accent_soft: "#E4E0D5",
    border: "rgba(30, 38, 43, 0.14)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "6px",
  },
};

const DEFAULT_BRAND_BY_ID: Readonly<Record<string, string>> = {
  "coastal-glass-architecture": "Aurelia Coastal Architects",
  "botanical-wellness-sanctuary": "Sora Botanical Sanctuary",
  "ocean-obsidian-ai-platform": "Vortex Neural OS",
  "atelier-maison-luxury": "Maison Valen Atelier",
  "azure-horizon-resort": "Azure Cliffside Resort",
  "jade-botanical-skincare": "Lumina Pure Skincare",
  "silver-prism-creative-studio": "Kinetik Design Studio",
  "calm-sea-fine-dining": "Nori & Tide Omakase",
  "serene-clinic-medical": "Céleste Medical & Derma Clinic",
  "monolith-advisory-legal": "Vanguard Capital & Legal",
  "kinetic-academy-edtech": "NovaMind AI Academy",
  "veranda-interior-atelier": "Atelier Veranda Living",
};

const DEFAULT_DESIGN_TOKENS: TemplateDesignTokens = {
  mode: "dark",
  surface_bg: "#0E161D",
  surface_alt: "#142029",
  surface_card: "#172530",
  text_primary: "#F2EFE9",
  text_muted: "#A6B6C2",
  accent: "#D9C7A8",
  accent_soft: "rgba(217, 199, 168, 0.14)",
  border: "rgba(234, 230, 223, 0.16)",
  font_display: FONT_SERIF,
  font_body: FONT_SANS,
  radius: "4px",
};

function getDesignTokens(templateId: string): TemplateDesignTokens {
  return DESIGN_TOKENS_BY_ID[templateId] ?? DEFAULT_DESIGN_TOKENS;
}

function wrapStandaloneDocument(
  ctx: TemplateRenderContext,
  extraCss: string,
  bodyHtml: string
): string {
  const { tokens, lang, brand, template } = ctx;
  const pageTitle = escapeHtml(`${brand} — ${template[lang].industry_label}`);
  return [
    "<!DOCTYPE html>",
    `<html lang="${lang}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${pageTitle}</title>`,
    "<style>",
    ":root{",
    `--bg:${tokens.surface_bg};`,
    `--bg-alt:${tokens.surface_alt};`,
    `--card:${tokens.surface_card};`,
    `--ink:${tokens.text_primary};`,
    `--muted:${tokens.text_muted};`,
    `--accent:${tokens.accent};`,
    `--accent-soft:${tokens.accent_soft};`,
    `--line:${tokens.border};`,
    `--font-display:${tokens.font_display};`,
    `--font-body:${tokens.font_body};`,
    `--font-mono:${FONT_MONO};`,
    `--radius:${tokens.radius};`,
    "}",
    "*{box-sizing:border-box}",
    "html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:var(--font-body);line-height:1.55;-webkit-font-smoothing:antialiased}",
    "a{color:inherit;text-decoration:none}",
    "svg{display:block;max-width:100%}",
    ".wrap{width:min(1160px,calc(100% - 48px));margin:0 auto}",
    ".nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid var(--line)}",
    ".nav-brand{font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:.04em}",
    ".nav-links{display:flex;align-items:center;gap:22px;font-size:13px;color:var(--muted)}",
    ".btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 20px;border-radius:var(--radius);font-size:13px;font-weight:650;border:1px solid transparent;cursor:pointer;white-space:nowrap}",
    ".btn-primary{background:var(--accent);color:var(--btn-ink,#091217)}",
    ".btn-outline{background:transparent;border-color:var(--line);color:var(--ink)}",
    ".eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}",
    ".section{padding:56px 0}",
    ".grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}",
    ".grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}",
    ".grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px}",
    ".foot{padding:32px 0;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}",
    extraCss,
    "@media(max-width:860px){.grid-3,.grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}.nav-links{display:none}}",
    "@media(max-width:640px){.wrap{width:calc(100% - 28px)}.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.section{padding:36px 0}.hero-split,.split-band,.booking-widget,.search-bar-row{grid-template-columns:1fr!important;flex-direction:column!important}}",
    "</style>",
    "</head>",
    `<body data-template-id="${escapeHtml(template.id)}" data-template-lang="${lang}">`,
    bodyHtml,
    "</body>",
    "</html>",
  ].join("\n");
}

function renderCoastalArchitecture(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const projects = en
    ? [
        { num: "01", name: "Villa Horizon", area: "680m²", loc: "Son Tra Peninsula", tag: "Cantilever Glass" },
        { num: "02", name: "Pavilion North", area: "420m²", loc: "Cam Ranh Bay", tag: "Honed Basalt" },
        { num: "03", name: "Clifftop House", area: "890m²", loc: "Phu Yen Coast", tag: "Infinity Horizon" },
      ]
    : [
        { num: "01", name: "Villa Horizon", area: "680m²", loc: "Bán đảo Sơn Trà", tag: "Kính vượt nhịp" },
        { num: "02", name: "Pavilion North", area: "420m²", loc: "Vịnh Cam Ranh", tag: "Đá Bazan mài" },
        { num: "03", name: "Clifftop House", area: "890m²", loc: "Bờ biển Phú Yên", tag: "Hồ tràn vô cực" },
      ];

  const css = `
:root{--btn-ink:#0E161D}
.hero-split{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;align-items:center;padding:56px 0 48px}
.hero-title{font-family:var(--font-display);font-size:clamp(32px,4.2vw,52px);line-height:1.08;font-weight:400;margin:14px 0 16px;letter-spacing:-.02em}
.hero-sub{color:var(--muted);font-size:15.5px;max-width:520px;margin:0 0 26px}
.blueprint-panel{background:linear-gradient(155deg,#162531 0%,#0B1218 100%);border:1px solid var(--line);padding:20px;border-radius:var(--radius)}
.proj-svg{height:150px;width:100%;border-bottom:1px solid var(--line);margin-bottom:16px;background:linear-gradient(180deg,#12202B,#0C151C)}
.proj-num{font-family:var(--font-mono);font-size:11px;color:var(--accent);letter-spacing:.14em}
.proj-meta{display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);margin-top:8px}
.spec-band{background:var(--bg-alt);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:34px 0}
.spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;text-align:center}
.spec-val{font-family:var(--font-display);font-size:32px;color:var(--accent)}
.spec-lbl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.cta-bar{background:linear-gradient(135deg,#182834,#0F1A22);border:1px solid var(--line);padding:32px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Monographs" : "Công trình"}</span>
    <span>${en ? "Philosophy" : "Triết lý"}</span>
    <span>${en ? "Materials" : "Vật liệu"}</span>
    <span>${en ? "Journal" : "Ấn phẩm"}</span>
  </nav>
  <span class="btn btn-outline">${en ? "Private Viewing" : "Hẹn tham quan"}</span>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "COASTAL ARCHITECTURE STUDIO · EST. 2008" : "KIẾN TRÚC KÍNH VEN BIỂN · EST. 2008"}</span>
      <h1 class="hero-title">${en ? "Cantilevered glass residences framed against open ocean light." : "Kiến trúc biệt thự kính vượt nhịp đối thoại cùng chân trời biển."}</h1>
      <p class="hero-sub">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Explore 12 Commissions" : "Khám phá 12 công trình"}</span>
        <span class="btn btn-outline">${en ? "Download Monograph" : "Hồ sơ năng lực"}</span>
      </div>
    </div>
    <div class="blueprint-panel">
      <svg viewBox="0 0 460 300" role="img" aria-label="Coastal glass cantilever architectural blueprint">
        <defs>
          <linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1A3242"/><stop offset="100%" stop-color="#0D1820"/></linearGradient>
          <linearGradient id="glassA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8FD4D8" stop-opacity=".42"/><stop offset="100%" stop-color="#1B3C4B" stop-opacity=".2"/></linearGradient>
        </defs>
        <rect width="460" height="300" fill="url(#skyA)"/>
        <g stroke="#D9C7A8" stroke-opacity=".18" stroke-width="0.7">
          <line x1="0" y1="60" x2="460" y2="60"/><line x1="0" y1="120" x2="460" y2="120"/><line x1="0" y1="180" x2="460" y2="180"/><line x1="0" y1="240" x2="460" y2="240"/>
          <line x1="90" y1="0" x2="90" y2="300"/><line x1="230" y1="0" x2="230" y2="300"/><line x1="370" y1="0" x2="370" y2="300"/>
        </g>
        <rect x="44" y="102" width="372" height="14" fill="#EAE6DF"/>
        <rect x="82" y="116" width="298" height="72" fill="url(#glassA)" stroke="#D9C7A8" stroke-width="1.2"/>
        <line x1="168" y1="116" x2="168" y2="188" stroke="#EAE6DF" stroke-opacity=".65"/>
        <line x1="268" y1="116" x2="268" y2="188" stroke="#EAE6DF" stroke-opacity=".65"/>
        <rect x="30" y="188" width="400" height="10" fill="#D9C7A8"/>
        <rect x="96" y="198" width="24" height="58" fill="#1D2E3B" stroke="#D9C7A8" stroke-opacity=".4"/>
        <rect x="342" y="198" width="24" height="58" fill="#1D2E3B" stroke="#D9C7A8" stroke-opacity=".4"/>
        <rect x="0" y="254" width="460" height="46" fill="#0A141C"/>
        <line x1="36" y1="268" x2="424" y2="268" stroke="#7AD3CE" stroke-opacity=".45" stroke-dasharray="10 6"/>
        <text x="44" y="88" fill="#D9C7A8" font-family="monospace" font-size="10" letter-spacing="2">ELEVATION N-04 · SPAN 18.4M · LOW-E GLAZING</text>
      </svg>
    </div>
  </section>

  <section class="section" style="padding-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px;gap:12px;flex-wrap:wrap">
      <div>
        <span class="eyebrow">${en ? "SELECTED COMMISSIONS" : "DANH MỤC CÔNG TRÌNH TUYỂN CHỌN"}</span>
        <h2 style="font-family:var(--font-display);font-size:28px;font-weight:400;margin:6px 0 0">${en ? "Signature Coastal Monographs" : "Những công trình ven biển tiêu biểu"}</h2>
      </div>
      <span style="font-size:12.5px;color:var(--muted)">${en ? "03 of 42 Built Works" : "03 / 42 Công trình hoàn thiện"}</span>
    </div>
    <div class="grid-3">
      ${projects
        .map(
          (p, i) => `
      <article class="card" style="padding:18px">
        <div class="proj-svg">
          <svg viewBox="0 0 320 150">
            <rect width="320" height="150" fill="#0F1B24"/>
            <rect x="${24 + i * 8}" y="48" width="${256 - i * 12}" height="9" fill="#EAE6DF"/>
            <rect x="${42 + i * 6}" y="57" width="${224 - i * 10}" height="50" fill="#5CB5BE" fill-opacity=".22" stroke="#D9C7A8" stroke-opacity=".7"/>
            <rect x="16" y="107" width="288" height="7" fill="#D9C7A8"/>
            <line x1="20" y1="130" x2="300" y2="130" stroke="#7BC7C4" stroke-opacity=".35"/>
          </svg>
        </div>
        <div class="proj-num">${p.num} · ${escapeHtml(p.tag)}</div>
        <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:6px 0 2px">${escapeHtml(p.name)}</h3>
        <div class="proj-meta"><span>${escapeHtml(p.loc)}</span><strong>${escapeHtml(p.area)}</strong></div>
      </article>`
        )
        .join("")}
    </div>
  </section>
</main>
<section class="spec-band">
  <div class="wrap spec-grid">
    <div><div class="spec-val">42</div><div class="spec-lbl">${en ? "Built Residences" : "Công trình đã bàn giao"}</div></div>
    <div><div class="spec-val">14</div><div class="spec-lbl">${en ? "Design Awards" : "Giải thưởng kiến trúc"}</div></div>
    <div><div class="spec-val">18+</div><div class="spec-lbl">${en ? "Years Along Coast" : "Năm kiến tạo ven biển"}</div></div>
  </div>
</section>
<section class="wrap section">
  <div class="cta-bar">
    <div>
      <span class="eyebrow">${en ? "PRIVATE ARCHITECTURAL CONSULTATION" : "TƯ VẤN CHỦ ĐẦU TƯ RIÊNG TƯ"}</span>
      <h2 style="font-family:var(--font-display);font-size:26px;font-weight:400;margin:8px 0 4px">${en ? "Commission a site study with our principal partners." : "Đặt lịch khảo sát hiện trạng cùng kiến trúc sư trưởng."}</h2>
    </div>
    <span class="btn btn-primary">${en ? "Schedule Private Briefing" : "Đặt lịch tư vấn riêng"}</span>
  </div>
</section>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Architectural Monograph" : "Hồ sơ Kiến trúc Ven biển"}</span>
  <span>Da Nang · Ho Chi Minh City · Singapore</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderBotanicalWellness(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const rituals = en
    ? [
        { name: "Jade Botanical Ritual", dur: "90 min", price: "$78", desc: "Warm white-tea compress, herbal oil meridian therapy & jade Gua Sha." },
        { name: "Eucalyptus Steam Bath", dur: "75 min", price: "$62", desc: "Mineral hydro-soak infused with fresh forest eucalyptus and sea salt." },
        { name: "Warm Basalt Stone Flow", dur: "90 min", price: "$72", desc: "Deep restorative muscle release using hand-honed coastal basalt." },
        { name: "Sound & Dew Aromatherapy", dur: "60 min", price: "$49", desc: "Singing bowl resonance paired with cold-pressed lotus & hinoki mist." },
      ]
    : [
        { name: "Liệu trình Ngọc Bích", dur: "90 phút", price: "1.850.000đ", desc: "Ủ ấm trà trắng, bấm huyệt tinh dầu thảo mộc và nâng cơ đá ngọc bích." },
        { name: "Tắm Thảo Mộc Bạch Đàn", dur: "75 phút", price: "1.450.000đ", desc: "Ngâm bồn khoáng nóng cùng lá bạch đàn tươi và muối biển tinh khiết." },
        { name: "Trị Liệu Đá Nóng Bazan", dur: "90 phút", price: "1.680.000đ", desc: "Thư giãn cơ sâu bằng đá bazan mài thủ công truyền nhiệt dịu êm." },
        { name: "Thiền Chuông & Tinh Dầu", dur: "60 phút", price: "1.150.000đ", desc: "Âm thanh trị liệu kết hợp hương gỗ hinoki và sen trắng ép lạnh." },
      ];

  const css = `
:root{--btn-ink:#F5F7F4}
.hero-split{display:grid;grid-template-columns:1.1fr .9fr;gap:32px;align-items:center;padding:52px 0 42px}
.hero-title{font-family:var(--font-display);font-size:clamp(32px,4vw,50px);line-height:1.12;font-weight:400;margin:14px 0 16px;color:#143325}
.hero-sub{color:var(--muted);font-size:15.5px;margin:0 0 26px;max-width:500px}
.botanical-card{background:linear-gradient(155deg,#E2EFE6 0%,#D1E5D8 100%);border:1px solid var(--line);border-radius:24px;padding:24px}
.ritual-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px}
.ritual-price{font-weight:700;color:var(--accent);font-size:15px}
.ritual-dur{display:inline-block;padding:3px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:11.5px;font-weight:650;margin-bottom:10px}
.apothecary{background:var(--bg-alt);border-radius:22px;padding:32px;display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:center}
.book-bar{background:#1B4332;color:#F5F7F4;border-radius:20px;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Rituals" : "Liệu trình"}</span>
    <span>${en ? "Apothecary" : "Thảo mộc"}</span>
    <span>${en ? "Sanctuary" : "Không gian"}</span>
    <span>${en ? "Gift Cards" : "Quà tặng"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Book Sanctuary" : "Đặt lịch ngay"}</span>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "HOLISTIC BOTANICAL SANCTUARY" : "KHÔNG GIAN TĨNH TẠI & THẢO MỘC"}</span>
      <h1 class="hero-title">${en ? "Unhurried botanical rituals to restore breath and balance." : "Liệu trình thảo mộc tĩnh tại khơi lại nhịp thở cân bằng."}</h1>
      <p class="hero-sub">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Reserve a Ritual" : "Chọn liệu trình"}</span>
        <span class="btn btn-outline">${en ? "View Full Menu" : "Xem bảng giá"}</span>
      </div>
    </div>
    <div class="botanical-card">
      <svg viewBox="0 0 420 290" role="img" aria-label="Botanical eucalyptus sanctuary illustration">
        <rect width="420" height="290" rx="18" fill="#F5F7F4"/>
        <circle cx="210" cy="145" r="96" fill="#DCECE2"/>
        <path d="M210 232 C210 165, 210 112, 210 56" stroke="#1B4332" stroke-width="2.5" fill="none"/>
        <path d="M210 184 C162 178, 136 146, 152 126 C174 128, 198 152, 210 184Z" fill="#2D6A4F"/>
        <path d="M210 162 C258 154, 286 120, 268 100 C244 104, 222 128, 210 162Z" fill="#40916C"/>
        <path d="M210 128 C168 118, 150 86, 170 72 C188 78, 202 100, 210 128Z" fill="#52B788"/>
        <path d="M210 108 C246 98, 264 72, 246 58 C230 64, 218 84, 210 108Z" fill="#1B4332"/>
        <circle cx="122" cy="214" r="18" fill="#1B4332" fill-opacity=".12"/>
        <circle cx="304" cy="202" r="24" fill="#2D6A4F" fill-opacity=".14"/>
      </svg>
    </div>
  </section>

  <section class="section" style="padding-top:16px">
    <span class="eyebrow">${en ? "SIGNATURE RITUAL MENU" : "THỰC ĐƠN LIỆU TRÌNH CHUYÊN SÂU"}</span>
    <h2 style="font-family:var(--font-display);font-size:30px;font-weight:400;margin:8px 0 22px">${en ? "Four Restorative Experiences" : "4 Nghi thức chăm sóc thân – tâm"}</h2>
    <div class="grid-2">
      ${rituals
        .map(
          (r) => `
      <article class="card">
        <span class="ritual-dur">${escapeHtml(r.dur)}</span>
        <div class="ritual-row">
          <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:0">${escapeHtml(r.name)}</h3>
          <span class="ritual-price">${escapeHtml(r.price)}</span>
        </div>
        <p style="margin:0;color:var(--muted);font-size:14px">${escapeHtml(r.desc)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:8px">
    <div class="apothecary split-band">
      <div>
        <span class="eyebrow">${en ? "HERBAL APOTHECARY" : "PHÒNG BÀO CHẾ THẢO MỘC"}</span>
        <h2 style="font-family:var(--font-display);font-size:27px;font-weight:400;margin:8px 0 12px">${en ? "Freshly steeped botanicals, zero synthetic fragrance." : "Thảo mộc ủ mới mỗi sáng, 100% tinh chất tự nhiên."}</h2>
        <p style="color:var(--muted);margin:0;font-size:14.5px">${en ? "Every treatment begins with organic eucalyptus mist, cold-pressed camellia oil, and a personalized herbal tea infusion." : "Mỗi buổi trị liệu bắt đầu bằng hương hơi sương bạch đàn, dầu trà my ép lạnh và tách trà thảo mộc phối riêng theo thể trạng."}</p>
      </div>
      <div class="grid-2" style="gap:12px">
        <div class="card" style="padding:16px"><strong>100%</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Organic Oils" : "Tinh dầu hữu cơ"}</div></div>
        <div class="card" style="padding:16px"><strong>12</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Private Suites" : "Phòng trị liệu riêng"}</div></div>
        <div class="card" style="padding:16px"><strong>4.95★</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Guest Serenity" : "Đánh giá khách hàng"}</div></div>
        <div class="card" style="padding:16px"><strong>09–22h</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Open Daily" : "Mở cửa mỗi ngày"}</div></div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:12px">
    <div class="book-bar">
      <div>
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#A7DFC0">${en ? "INSTANT RESERVATION" : "ĐẶT LỊCH 1 CHẠM"}</div>
        <h3 style="font-family:var(--font-display);font-size:24px;font-weight:400;margin:6px 0 0">${en ? "Reserve your quiet afternoon today." : "Giữ khung giờ tĩnh tại cho riêng bạn hôm nay."}</h3>
      </div>
      <span class="btn" style="background:#F5F7F4;color:#1B4332">${en ? "Book 90-Min Ritual →" : "Đặt lịch trị liệu →"}</span>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Botanical Wellness Sanctuary" : "Không Gian Trị Liệu Thảo Mộc"}</span>
  <span>Thao Dien · Da Lat · Phu Quoc</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderSaasAiPlatform(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const bento = en
    ? [
        { k: "01", t: "Deterministic Tool Router", d: "Route multi-agent workloads across verified MCP endpoints with zero drift." },
        { k: "02", t: "Sub-50ms Edge Runtime", d: "Global cold-start elimination with isolated sandbox worker execution." },
        { k: "03", t: "Scoped OAuth Authority", d: "Per-action token verification and cryptographic audit receipts." },
        { k: "04", t: "Live Telemetry Stream", d: "Inspect token budgets, p95 latency, and trace diffs in real time." },
        { k: "05", t: "Structured JSON Outputs", d: "Schema-enforced contracts ready for CI/CD and downstream pipelines." },
        { k: "06", t: "Instant Team Rollback", d: "Immutable deployment snapshots with one-click recovery." },
      ]
    : [
        { k: "01", t: "Điều phối Công cụ Chuẩn xác", d: "Kết nối đa tác nhân AI qua chuẩn MCP với kiểm soát phạm vi minh bạch." },
        { k: "02", t: "Độ trễ biên dưới 50ms", d: "Thực thi siêu tốc trên hạ tầng cô lập với độ sẵn sàng 99.99%." },
        { k: "03", t: "Phân quyền OAuth theo tác vụ", d: "Xác thực quyền riêng biệt từng hành động kèm biên bản kiểm tra." },
        { k: "04", t: "Giám sát Hiệu năng Trực tiếp", d: "Theo dõi độ trễ p95, lưu lượng và nhật ký gọi API theo thời gian thực." },
        { k: "05", t: "Đầu ra JSON theo Lược đồ", d: "Dữ liệu đầu ra chuẩn hóa sẵn sàng tích hợp vào hệ thống doanh nghiệp." },
        { k: "06", t: "Khôi phục Phiên bản 1 chạm", d: "Lưu vết bất biến mọi bản phát hành để hoàn tác tức thì khi cần." },
      ];
  const plans = en
    ? [
        { name: "Starter", price: "$0", note: "For solo builders · 25k req/mo" },
        { name: "Pro Team", price: "$49", note: "Most popular · 1M req/mo + SSO", hi: true },
        { name: "Enterprise", price: "Custom", note: "Dedicated VPC · 99.99% SLA" },
      ]
    : [
        { name: "Khởi tạo", price: "0đ", note: "Cá nhân · 25.000 lượt gọi/tháng" },
        { name: "Pro Team", price: "1.190.000đ", note: "Phổ biến nhất · 1 triệu lượt gọi + SSO", hi: true },
        { name: "Enterprise", price: "Tùy chỉnh", note: "Hạ tầng riêng · SLA 99.99%" },
      ];

  const css = `
:root{--btn-ink:#07131A}
.pill-announce{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;background:rgba(52,232,180,.1);border:1px solid rgba(52,232,180,.35);color:#7EF4D0;font-size:12px;font-weight:600}
.hero-split{display:grid;grid-template-columns:1.05fr .95fr;gap:30px;align-items:center;padding:48px 0 40px}
.hero-title{font-size:clamp(32px,4vw,48px);line-height:1.08;font-weight:750;letter-spacing:-.035em;margin:14px 0 14px;background:linear-gradient(95deg,#FFFFFF 0%,#A5F3FC 55%,#34E8B4 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.terminal{background:#060A12;border:1px solid rgba(56,189,248,.28);border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55)}
.term-top{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0D1526;border-bottom:1px solid var(--line);font-family:var(--font-mono);font-size:11.5px;color:#94A3B8}
.term-dots{display:flex;gap:6px}.term-dots i{width:9px;height:9px;border-radius:50%;display:block;background:#334155}
.term-body{margin:0;padding:18px;font-family:var(--font-mono);font-size:12.5px;line-height:1.65;color:#CBD5E1;overflow-x:auto}
.c-k{color:#38BDF8}.c-s{color:#34E8B4}.c-n{color:#FBBF24}.c-c{color:#64748B}
.kpi-strip{display:flex;gap:14px;flex-wrap:wrap;margin-top:20px}
.kpi-chip{padding:7px 12px;border-radius:10px;background:rgba(15,23,42,.9);border:1px solid var(--line);font-family:var(--font-mono);font-size:12px;color:#A5F3FC}
.plan-hi{border-color:#34E8B4;background:linear-gradient(180deg,rgba(52,232,180,.12),rgba(17,26,46,.95))}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand" style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:#34E8B4;display:inline-block"></span>${b}</div>
  <nav class="nav-links">
    <span>${en ? "Platform" : "Nền tảng"}</span>
    <span>${en ? "MCP Gateway" : "Kết nối API"}</span>
    <span>${en ? "Security" : "Bảo mật"}</span>
    <span>${en ? "Pricing" : "Bảng giá"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Launch Console" : "Mở Console"}</span>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="pill-announce">● ${en ? "v4.2 Live · Zero-Cold-Start MCP Engine" : "v4.2 Mới · Điều phối AI tốc độ cao"}</span>
      <h1 class="hero-title">${en ? "Ship verifiable AI systems at sub-50ms scale." : "Triển khai nền tảng AI tốc độ biên, chuẩn xác từng mili-giây."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 22px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Start Free Workspace" : "Tạo không gian miễn phí"}</span>
        <span class="btn btn-outline">${en ? "Read API Docs" : "Tài liệu kỹ thuật"}</span>
      </div>
      <div class="kpi-strip">
        <span class="kpi-chip">42ms p95</span>
        <span class="kpi-chip">99.99% SLA</span>
        <span class="kpi-chip">OAuth 2.1 + MCP</span>
      </div>
    </div>
    <div class="terminal">
      <div class="term-top">
        <span class="term-dots"><i></i><i></i><i></i></span>
        <span>vortex-runtime.ts · MCP Client</span>
      </div>
      <pre class="term-body"><span class="c-c">// Connect verified agent workflow</span>
<span class="c-k">import</span> { createRuntime } <span class="c-k">from</span> <span class="c-s">"@vortex/neural-os"</span>;

<span class="c-k">const</span> node = createRuntime({
  region: <span class="c-s">"ap-southeast-1"</span>,
  slaTargetMs: <span class="c-n">42</span>,
  strictSchema: <span class="c-k">true</span>
});

<span class="c-k">const</span> receipt = <span class="c-k">await</span> node.dispatch(<span class="c-s">"site.build"</span>);
<span class="c-c">// =&gt; { status: "READY", latencyMs: 38 }</span></pre>
    </div>
  </section>

  <section class="section" style="padding-top:16px">
    <span class="eyebrow">${en ? "6-TILE BENTO ARCHITECTURE" : "KIẾN TRÚC BENTO 6 KHỐI CỐT LÕI"}</span>
    <h2 style="font-size:28px;font-weight:700;margin:8px 0 22px;letter-spacing:-.02em">${en ? "Engineered for production reliability" : "Thiết kế cho vận hành doanh nghiệp bền bỉ"}</h2>
    <div class="grid-3">
      ${bento
        .map(
          (item) => `
      <article class="card">
        <div style="font-family:var(--font-mono);font-size:11px;color:#38BDF8;margin-bottom:8px">${item.k}</div>
        <h3 style="margin:0 0 8px;font-size:16.5px">${escapeHtml(item.t)}</h3>
        <p style="margin:0;color:var(--muted);font-size:13.5px">${escapeHtml(item.d)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:8px">
    <span class="eyebrow">${en ? "TRANSPARENT DEPLOYMENT TIERS" : "BẢNG GÓI TRIỂN KHAI MINH BẠCH"}</span>
    <div class="grid-3" style="margin-top:16px">
      ${plans
        .map(
          (p) => `
      <article class="card ${p.hi ? "plan-hi" : ""}">
        <div style="font-size:13px;color:var(--muted);font-weight:600">${escapeHtml(p.name)}</div>
        <div style="font-size:30px;font-weight:750;margin:8px 0">${escapeHtml(p.price)}</div>
        <p style="margin:0 0 18px;font-size:13px;color:var(--muted)">${escapeHtml(p.note)}</p>
        <span class="btn ${p.hi ? "btn-primary" : "btn-outline"}" style="width:100%">${en ? "Select Plan" : "Chọn gói"}</span>
      </article>`
        )
        .join("")}
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Enterprise AI Platform" : "Nền Tảng SaaS & AI"}</span>
  <span>Status: Operational · 99.99% Uptime</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderLuxuryMaison(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const looks = [
    { id: "LOOK 01", name: "SILHOUETTE", note: en ? "Structured raw obsidian silk coat" : "Áo choàng lụa obsidian cắt thủ công" },
    { id: "LOOK 02", name: "LUMIÈRE", note: en ? "Platinum-thread draped evening column" : "Đầm dạ hội dệt sợi bạch kim" },
    { id: "LOOK 03", name: "ATELIER", note: en ? "Hand-pleated sculptural cashmere cape" : "Áo choàng cashmere xếp ly điêu khắc" },
  ];

  const css = `
:root{--btn-ink:#0D0E11}
.masthead{text-align:center;padding:24px 0 18px;border-bottom:1px solid var(--line)}
.masthead-brand{font-family:var(--font-display);font-size:26px;letter-spacing:.26em;text-transform:uppercase}
.masthead-sub{font-size:11px;letter-spacing:.24em;color:var(--accent);margin-top:6px;text-transform:uppercase}
.editorial-hero{text-align:center;padding:56px 0 46px;max-width:780px;margin:0 auto}
.editorial-hero h1{font-family:var(--font-display);font-size:clamp(34px,4.8vw,58px);font-weight:400;line-height:1.08;margin:16px 0 18px;font-style:italic}
.look-frame{height:220px;background:linear-gradient(160deg,#1E2028 0%,#0E0F13 100%);border-bottom:1px solid var(--line);margin-bottom:16px;display:flex;align-items:center;justify-content:center}
.salon-box{border:1px solid var(--line);padding:34px;text-align:center;background:var(--bg-alt)}
`;

  const body = `
<header class="wrap masthead">
  <div class="masthead-brand">${b}</div>
  <div class="masthead-sub">${en ? "PARIS · SAIGON · ISSUE 09 AUTUMN / WINTER" : "ẤN PHẨM SỐ 09 · BỘ SƯU TẬP THU ĐÔNG ĐỘC BẢN"}</div>
</header>
<main class="wrap">
  <section class="editorial-hero">
    <span class="eyebrow">${en ? "HAUTE ATELIER MANIFESTO" : "TUYÊN NGÔN THỦ CÔNG & DI SẢN"}</span>
    <h1>${en ? "Quiet permanence, sculpted in shadow and platinum light." : "Vẻ đẹp vượt thời gian, tạc trong bóng tối sâu và ánh bạch kim."}</h1>
    <p style="color:var(--muted);font-size:15.5px;margin:0 auto 28px;max-width:600px">${brief}</p>
    <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap">
      <span class="btn btn-primary">${en ? "View Issue 09 Lookbook" : "Xem bộ sưu tập số 09"}</span>
      <span class="btn btn-outline">${en ? "Private Salon Appointment" : "Đặt hẹn phòng trưng bày"}</span>
    </div>
  </section>

  <section class="section" style="padding-top:12px">
    <div class="grid-3">
      ${looks
        .map(
          (lk, idx) => `
      <article class="card" style="padding:18px">
        <div class="look-frame">
          <svg viewBox="0 0 220 180" width="200" height="165">
            <rect x="24" y="14" width="172" height="152" fill="none" stroke="#E3D2B6" stroke-opacity=".32"/>
            <ellipse cx="110" cy="90" rx="${40 + idx * 8}" ry="58" fill="none" stroke="#E3D2B6" stroke-width="1.2"/>
            <line x1="110" y1="22" x2="110" y2="158" stroke="#E3D2B6" stroke-opacity=".45"/>
            <text x="110" y="95" text-anchor="middle" fill="#F6F1E9" font-family="Georgia,serif" font-size="13" letter-spacing="4">${lk.id}</text>
          </svg>
        </div>
        <div style="font-size:11px;letter-spacing:.2em;color:var(--accent)">${lk.id} · ${lk.name}</div>
        <p style="margin:8px 0 0;color:var(--muted);font-size:13.5px">${escapeHtml(lk.note)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:8px">
    <div class="salon-box">
      <span class="eyebrow">${en ? "BY APPOINTMENT ONLY" : "TIẾP ĐÓN THEO LỊCH HẸN RIÊNG"}</span>
      <h2 style="font-family:var(--font-display);font-size:28px;font-weight:400;margin:10px 0 10px">${en ? "Request a private fitting with our Maison concierge." : "Đặt lịch thử trang phục riêng tư cùng cố vấn Atelier."}</h2>
      <p style="color:var(--muted);font-size:14px;margin:0 0 22px">${en ? "Numbered editions limited to 24 pieces worldwide." : "Mỗi thiết kế được đánh số giới hạn tối đa 24 tác phẩm toàn cầu."}</p>
      <span class="btn btn-primary">${en ? "Reserve Private Salon" : "Kết nối cố vấn riêng"}</span>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · Issue 09</span>
  <span>Vogue · Wallpaper* · Elle Décor</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderAzureResort(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const villas = en
    ? [
        { name: "Ocean Pool Villa", rate: "$360 / night", spec: "165m² · Private Infinity Pool · King" },
        { name: "Cliffside Horizon Suite", rate: "$265 / night", spec: "110m² · Panoramic Sea Deck · King" },
        { name: "Lagoon Sanctuary Pavilion", rate: "$480 / night", spec: "240m² · 2 Bedrooms · Butler Service" },
      ]
    : [
        { name: "Ocean Pool Villa", rate: "8.900.000đ / đêm", spec: "165m² · Hồ bơi riêng · Hướng vịnh" },
        { name: "Cliffside Horizon Suite", rate: "6.400.000đ / đêm", spec: "110m² · Ban công vách đá · Giường King" },
        { name: "Lagoon Sanctuary Pavilion", rate: "11.500.000đ / đêm", spec: "240m² · 2 Phòng ngủ · Quản gia riêng" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.resort-hero{background:linear-gradient(145deg,#0D3B4C 0%,#0E5E6F 60%,#19848F 100%);color:#F2F7F9;border-radius:24px;padding:44px 38px 66px;position:relative;overflow:hidden;margin-top:20px}
.booking-widget{background:#FFFFFF;border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:-36px auto 0;width:min(960px,calc(100% - 24px));position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,1fr) auto;gap:14px;align-items:center;box-shadow:0 20px 44px -18px rgba(13,59,76,.22)}
.bw-field{border-right:1px solid var(--line);padding-right:12px}
.bw-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
.bw-val{font-weight:700;font-size:14px;color:var(--ink);margin-top:2px}
.villa-banner{height:126px;border-radius:10px;background:linear-gradient(135deg,#0E4F61,#2D9AA6);margin-bottom:14px;padding:14px;display:flex;align-items:flex-end;justify-content:space-between;color:#F2F7F9;font-size:12px;font-weight:650}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Villas & Suites" : "Biệt thự"}</span>
    <span>${en ? "Coastal Dining" : "Ẩm thực"}</span>
    <span>${en ? "Island Yacht" : "Du thuyền"}</span>
    <span>${en ? "Wellness" : "Spa biển"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Direct Stay" : "Đặt phòng trực tiếp"}</span>
</header>
<main class="wrap">
  <section class="resort-hero">
    <span class="eyebrow" style="color:#A6F0EA">${en ? "PRIVATE PENINSULA SANCTUARY · 24 OCEAN VILLAS" : "KHU NGHỈ DƯỠNG BÁN ĐẢO · 24 BIỆT THỰ BIỂN"}</span>
    <h1 style="font-family:var(--font-display);font-size:clamp(32px,4.2vw,50px);font-weight:400;line-height:1.1;margin:12px 0 14px;max-width:680px">${en ? "Where turquoise cliffs meet quiet island mornings." : "Nơi vách đá xanh ngọc chạm vào bình minh đại dương."}</h1>
    <p style="color:rgba(242,247,249,.86);max-width:560px;margin:0;font-size:15px">${brief}</p>
  </section>

  <div class="booking-widget" role="region" aria-label="${en ? "Reservation search" : "Tìm phòng nghỉ dưỡng"}">
    <div class="bw-field"><div class="bw-lbl">${en ? "Check-in" : "Nhận phòng"}</div><div class="bw-val">18 / 05 / 2026</div></div>
    <div class="bw-field"><div class="bw-lbl">${en ? "Check-out" : "Trả phòng"}</div><div class="bw-val">21 / 05 / 2026</div></div>
    <div class="bw-field" style="border-right:0"><div class="bw-lbl">${en ? "Guests" : "Số khách"}</div><div class="bw-val">${en ? "2 Adults · 1 Villa" : "2 Khách · 1 Biệt thự"}</div></div>
    <span class="btn btn-primary">${en ? "Check Availability" : "Tìm phòng"}</span>
  </div>

  <section class="section">
    <span class="eyebrow">${en ? "OCEANFRONT ACCOMMODATIONS" : "HẠNG PHÒNG & BIỆT THỰ HƯỚNG BIỂN"}</span>
    <h2 style="font-family:var(--font-display);font-size:29px;font-weight:400;margin:8px 0 22px">${en ? "Private Cliffside Villas" : "Biệt thự hồ bơi riêng hướng vịnh"}</h2>
    <div class="grid-3">
      ${villas
        .map(
          (v, idx) => `
      <article class="card" style="padding:18px">
        <div class="villa-banner" style="background:linear-gradient(135deg,${idx === 1 ? "#0C4254,#248594" : idx === 2 ? "#0A3647,#1C7C7D" : "#0D4E63,#2BA1AE"})">
          <span>${en ? "Ocean View" : "Hướng biển"}</span>
          <span>${escapeHtml(v.rate)}</span>
        </div>
        <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:0 0 6px">${escapeHtml(v.name)}</h3>
        <p style="margin:0 0 14px;color:var(--muted);font-size:13px">${escapeHtml(v.spec)}</p>
        <span class="btn btn-outline" style="width:100%">${en ? "Reserve Villa" : "Giữ biệt thự này"}</span>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="card" style="background:var(--bg-alt);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
      <div>
        <span class="eyebrow">${en ? "CURATED ISLAND EXPERIENCES" : "TRẢI NGHIỆM BẢN ĐỊA ĐỘC QUYỀN"}</span>
        <p style="margin:6px 0 0;font-weight:600">${en ? "Sunset Catamaran · Reef Snorkeling · Private Cliffside Dining · Helicopter Transfer" : "Du thuyền hoàng hôn · Lặn ngắm san hô · Tiệc tối trên vách đá · Đưa đón trực thăng"}</p>
      </div>
      <span class="btn btn-primary">${en ? "Explore Itinerary" : "Xem lịch trình"}</span>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Boutique Coastal Resort" : "Khu Nghỉ Dưỡng Chân Trời Xanh"}</span>
  <span>Ninh Van Bay · Direct Best-Rate Guarantee</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderJadeSkincare(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const products = en
    ? [
        { name: "Jade Dew Barrier Serum", price: "$42", badge: "Bestseller", rating: "★ 4.9 (418)", vol: "30ml" },
        { name: "Cica Calm Gel Cleanser", price: "$28", badge: "New", rating: "★ 4.9 (204)", vol: "150ml" },
        { name: "White Tea Hydra Essence", price: "$36", badge: "Vegan", rating: "★ 4.8 (312)", vol: "100ml" },
        { name: "Botanical Night Recovery", price: "$58", badge: "Signature", rating: "★ 5.0 (186)", vol: "50ml" },
      ]
    : [
        { name: "Tinh Chất Ngọc Bích Phục Hồi", price: "980.000đ", badge: "Bán chạy", rating: "★ 4.9 (418)", vol: "30ml" },
        { name: "Gel Rửa Mặt Rau Má Dịu Nhẹ", price: "680.000đ", badge: "Mới", rating: "★ 4.9 (204)", vol: "150ml" },
        { name: "Nước Cân Bằng Trà Trắng", price: "840.000đ", badge: "Thuần chay", rating: "★ 4.8 (312)", vol: "100ml" },
        { name: "Kem Tái Tạo Ban Đêm", price: "1.450.000đ", badge: "Độc quyền", rating: "★ 5.0 (186)", vol: "50ml" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.promo-strip{background:#14532D;color:#ECFDF5;text-align:center;font-size:12px;padding:8px 14px;letter-spacing:.04em}
.hero-split{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;padding:42px 0 36px}
.bottle-stage{background:linear-gradient(145deg,#E7F4EB,#D3EAD9);border-radius:20px;padding:24px;border:1px solid var(--line)}
.prod-thumb{height:132px;border-radius:10px;background:linear-gradient(160deg,#EFF7F1,#DAEBE0);display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:14px}
.prod-badge{position:absolute;top:10px;left:10px;padding:3px 9px;border-radius:999px;background:#166534;color:#FFFFFF;font-size:11px;font-weight:650}
`;

  const body = `
<div class="promo-strip">${en ? "Free express delivery on orders over $60 · Dermatologist-tested botanical formulas" : "Miễn phí giao hàng hỏa tốc đơn từ 990.000đ · Kiểm nghiệm da liễu 100% minh bạch"}</div>
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Shop All" : "Sản phẩm"}</span>
    <span>${en ? "Serums" : "Tinh chất"}</span>
    <span>${en ? "Ingredients" : "Thành phần"}</span>
    <span>${en ? "Routine" : "Chu trình"}</span>
  </nav>
  <span class="btn btn-outline">${en ? "Cart (2)" : "Giỏ hàng (2)"}</span>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "CLEAN BOTANICAL SKINCARE" : "MỸ PHẨM THẢO MỘC MINH BẠCH"}</span>
      <h1 style="font-size:clamp(30px,4vw,46px);line-height:1.1;font-weight:720;letter-spacing:-.03em;margin:12px 0 14px">${en ? "Pure jade-botanical formulas crafted for luminous skin." : "Công thức thảo mộc tinh khiết cho làn da căng mướt tự nhiên."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 22px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Shop Collection" : "Mua ngay bộ sưu tập"}</span>
        <span class="btn btn-outline">${en ? "3-Step Routine" : "Chu trình 3 bước"}</span>
      </div>
    </div>
    <div class="bottle-stage">
      <svg viewBox="0 0 380 240" role="img" aria-label="Botanical serum dropper bottle">
        <rect width="380" height="240" rx="14" fill="#FAFBF9"/>
        <circle cx="190" cy="126" r="82" fill="#DCFCE7"/>
        <rect x="176" y="34" width="28" height="26" rx="6" fill="#14532D"/>
        <rect x="170" y="58" width="40" height="14" rx="4" fill="#166534"/>
        <rect x="150" y="72" width="80" height="128" rx="16" fill="#22794B" fill-opacity=".88"/>
        <rect x="160" y="102" width="60" height="62" rx="6" fill="#FAFBF9"/>
        <text x="190" y="128" text-anchor="middle" fill="#14532D" font-family="sans-serif" font-size="10" font-weight="700">LUMINA</text>
        <text x="190" y="144" text-anchor="middle" fill="#4C695A" font-family="sans-serif" font-size="8">JADE SERUM</text>
        <text x="190" y="156" text-anchor="middle" fill="#166534" font-family="monospace" font-size="7.5">30ML · 99% NAT</text>
      </svg>
    </div>
  </section>

  <section class="section" style="padding-top:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:26px;font-weight:700;margin:0">${en ? "Featured Storefront Shelf" : "Sản phẩm được yêu thích nhất"}</h2>
      <span style="font-size:13px;color:var(--accent);font-weight:600">${en ? "All 8 Formulas →" : "Xem tất cả 8 dòng →"}</span>
    </div>
    <div class="grid-4">
      ${products
        .map(
          (p) => `
      <article class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="prod-thumb">
            <span class="prod-badge">${escapeHtml(p.badge)}</span>
            <svg viewBox="0 0 80 96" width="68" height="82">
              <rect x="31" y="8" width="18" height="14" rx="4" fill="#14532D"/>
              <rect x="20" y="22" width="40" height="66" rx="10" fill="#1E6B42" fill-opacity=".86"/>
              <rect x="26" y="38" width="28" height="30" rx="4" fill="#FAFBF9"/>
            </svg>
          </div>
          <div style="font-size:11.5px;color:#15803D;font-weight:600">${escapeHtml(p.rating)} · ${escapeHtml(p.vol)}</div>
          <h3 style="font-size:15px;font-weight:700;margin:6px 0 8px">${escapeHtml(p.name)}</h3>
        </div>
        <div>
          <div style="font-size:16px;font-weight:750;margin-bottom:10px">${escapeHtml(p.price)}</div>
          <span class="btn btn-primary" style="width:100%;padding:9px 12px">${en ? "Add to Cart" : "Thêm vào giỏ"}</span>
        </div>
      </article>`
        )
        .join("")}
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Botanical Skincare Storefront" : "Cửa hàng Mỹ phẩm Thảo mộc"}</span>
  <span>Cruelty-Free · EWG Verified · Refillable Glass</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderCreativeStudio(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const cases = [
    { num: "01", title: "Solara Electric Mobility", tags: "BRANDING · WEB · 3D", accent: "#34E8B4" },
    { num: "02", title: "Nordic Audio Systems", tags: "IDENTITY · MOTION", accent: "#38BDF8" },
    { num: "03", title: "Aera Architectural Press", tags: "EDITORIAL · DESIGN SYSTEM", accent: "#A78BFA" },
    { num: "04", title: "Kineta Fintech App", tags: "PRODUCT UI · LAUNCH FILM", accent: "#F59E0B" },
  ];

  const css = `
:root{--btn-ink:#0D1216}
.swiss-hero{padding:52px 0 36px;border-bottom:1px solid var(--line)}
.swiss-headline{font-size:clamp(36px,5.4vw,66px);line-height:.98;font-weight:800;letter-spacing:-.045em;text-transform:uppercase;margin:14px 0 20px}
.ticker{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid var(--line);font-family:var(--font-mono);font-size:12px;letter-spacing:.2em;color:var(--muted)}
.case-visual{height:142px;border-radius:6px;margin-bottom:14px;padding:14px;display:flex;align-items:flex-end;justify-content:space-between;font-family:var(--font-mono);font-size:11px;color:#0E1116;font-weight:700}
.pill-cat{display:inline-block;padding:4px 9px;border-radius:999px;background:rgba(52,232,180,.12);color:#34E8B4;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.08em}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand" style="text-transform:uppercase;letter-spacing:.12em">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Work (18)" : "Dự án (18)"}</span>
    <span>${en ? "Disciplines" : "Năng lực"}</span>
    <span>${en ? "Studio" : "Đội ngũ"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Start a Brief →" : "Gửi đề bài →"}</span>
</header>
<main class="wrap">
  <section class="swiss-hero">
    <span class="eyebrow">${en ? "INDEPENDENT DESIGN & MOTION STUDIO" : "AGENCY THIẾT KẾ THƯƠNG HIỆU & CHUYỂN ĐỘNG"}</span>
    <h1 class="swiss-headline">${en ? "WE SHAPE ICONIC DIGITAL BRANDS." : "KIẾN TẠO THƯƠNG HIỆU SỐ ĐỘC BẢN."}</h1>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap">
      <p style="color:var(--muted);max-width:560px;margin:0;font-size:15.5px">${brief}</p>
      <span class="btn btn-outline">${en ? "Play 2026 Showreel" : "Xem Showreel 2026"}</span>
    </div>
  </section>
  <div class="ticker">
    <span>SOLARA</span><span>NORDIC LAB</span><span>VECTRA AI</span><span>KINETA</span><span>MONOLITH</span>
  </div>

  <section class="section">
    <div class="grid-2">
      ${cases
        .map(
          (c) => `
      <article class="card">
        <div class="case-visual" style="background:linear-gradient(135deg,${c.accent} 0%,#1E293B 100%)">
          <span>CASE ${c.num}</span>
          <span>2026</span>
        </div>
        <span class="pill-cat">${escapeHtml(c.tags)}</span>
        <h3 style="font-size:21px;font-weight:700;margin:10px 0 4px">${escapeHtml(c.title)}</h3>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="grid-4">
      <div class="card"><strong>01</strong><div style="margin-top:6px;font-weight:650">${en ? "Brand Systems" : "Hệ thống Thương hiệu"}</div></div>
      <div class="card"><strong>02</strong><div style="margin-top:6px;font-weight:650">${en ? "Web Architecture" : "Thiết kế Website"}</div></div>
      <div class="card"><strong>03</strong><div style="margin-top:6px;font-weight:650">${en ? "Motion & Film" : "Đạo diễn Hình ảnh"}</div></div>
      <div class="card"><strong>04</strong><div style="margin-top:6px;font-weight:650">${en ? "Design Ops" : "Hệ thống Design Ops"}</div></div>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Swiss-Editorial Creative Agency" : "Studio Sáng tạo Đa nền tảng"}</span>
  <span>hello@kinetik.studio · Saigon / Tokyo</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderFineDining(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const courses = en
    ? [
        { cat: "I · PRELUDE", name: "Hokkaido Scallop & Yuzu Sea Mist", desc: "Cold-cured coastal scallop, green shiso oil, smoked sea salt.", price: "$34" },
        { cat: "II · SIGNATURE MAIN", name: "Charcoal-Kissed Bluefin Otoro & Truffle Dashi", desc: "Aged 14 days, binchotan sear, warm kombu broth.", price: "$78" },
        { cat: "III · FINALE", name: "Roasted Matcha Pavlova & Sea Buckthorn", desc: "Crisp meringue, ceremonial Uji matcha cream, citrus pearls.", price: "$24" },
      ]
    : [
        { cat: "I · KHAI VỊ", name: "Sò Điệp Hokkaido & Sương Yuzu Biển", desc: "Sò điệp ủ lạnh, dầu tía tô xanh, muối biển hun khói.", price: "790.000đ" },
        { cat: "II · MÓN CHÍNH", name: "Cá Ngừ Otoro Than Hoa & Dashi Nấm Truffle", desc: "Ủ chín 14 ngày, áp chảo than binchotan, nước dùng tảo bẹ.", price: "1.850.000đ" },
        { cat: "III · TRÁNG MIỆNG", name: "Pavlova Trà Xanh Rang & Cam Chanh Biển", desc: "Bánh meringue giòn nhẹ, kem matcha Uji và ngọc cam.", price: "480.000đ" },
      ];

  const css = `
:root{--btn-ink:#0E1114}
.dine-hero{text-align:center;padding:54px 0 42px;border-bottom:1px solid var(--line)}
.dine-hero h1{font-family:var(--font-display);font-size:clamp(32px,4.4vw,54px);font-weight:400;line-height:1.1;margin:14px 0 14px}
.menu-item{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:20px 0;border-bottom:1px solid var(--line)}
.reserve-bar{background:var(--bg-alt);border:1px solid var(--line);border-radius:12px;padding:22px;display:grid;grid-template-columns:repeat(3,1fr) auto;gap:14px;align-items:center}
.res-cell{padding:10px 14px;background:var(--bg);border:1px solid var(--line);border-radius:8px;font-size:13.5px}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Omakase" : "Thực đơn"}</span>
    <span>${en ? "Cellar" : "Hầm vang"}</span>
    <span>${en ? "Private Room" : "Phòng riêng"}</span>
    <span>${en ? "Hours" : "Giờ mở cửa"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Reserve Table" : "Đặt bàn"}</span>
</header>
<main class="wrap">
  <section class="dine-hero">
    <span class="eyebrow">${en ? "SEASONAL COASTAL OMAKASE · 14 SEATS" : "OMAKASE HẢI SẢN THEO MÙA · 14 GHẾ QUẦY BẾP"}</span>
    <h1>${en ? "Nighttide flavours composed over live binchotan embers." : "Nghệ thuật ẩm thực biển đêm trên bếp than hoa thủ công."}</h1>
    <p style="color:var(--muted);max-width:580px;margin:0 auto 24px;font-size:15px">${brief}</p>
    <span class="btn btn-outline">${en ? "7-Course Tasting · $165 / Guest" : "Thực đơn 7 món · 3.650.000đ / Khách"}</span>
  </section>

  <section class="section">
    <span class="eyebrow">${en ? "CHEF'S AUTUMN TASTING CHAPTERS" : "CHƯƠNG THỰC ĐƠN NẾM THỬ THEO MÙA"}</span>
    <div style="margin-top:14px">
      ${courses
        .map(
          (c) => `
      <div class="menu-item">
        <div>
          <div style="font-size:11px;letter-spacing:.18em;color:var(--accent)">${escapeHtml(c.cat)}</div>
          <h3 style="font-family:var(--font-display);font-size:22px;font-weight:400;margin:6px 0 4px">${escapeHtml(c.name)}</h3>
          <p style="margin:0;color:var(--muted);font-size:14px">${escapeHtml(c.desc)}</p>
        </div>
        <strong style="font-family:var(--font-display);font-size:18px;color:var(--accent);white-space:nowrap">${escapeHtml(c.price)}</strong>
      </div>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:4px">
    <div class="reserve-bar booking-widget">
      <div class="res-cell"><div style="font-size:10.5px;color:var(--muted)">${en ? "DATE" : "NGÀY"}</div><strong>${en ? "Fri, 22 May" : "Thứ 6, 22/05"}</strong></div>
      <div class="res-cell"><div style="font-size:10.5px;color:var(--muted)">${en ? "SEATING" : "KHUNG GIỜ"}</div><strong>19:30</strong></div>
      <div class="res-cell"><div style="font-size:10.5px;color:var(--muted)">${en ? "GUESTS" : "SỐ KHÁCH"}</div><strong>${en ? "2 Guests" : "2 Khách"}</strong></div>
      <span class="btn btn-primary">${en ? "Book Table" : "Đặt bàn ngay"}</span>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Evening Seating 18:00 & 20:30" : "Phục vụ 2 lượt 18:00 & 20:30"}</span>
  <span>Sommelier Pairing · Private Cellar Room</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderSereneMedical(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const specialties = en
    ? [
        { t: "Advanced Dermatology", d: "Non-invasive laser resurfacing, pigment mapping & barrier restoration." },
        { t: "Preventive Internal Medicine", d: "Comprehensive annual biomarkers and personalized longevity care." },
        { t: "Regenerative Aesthetics", d: "Evidence-based cellular skin therapy under board-certified care." },
        { t: "Precision Screening", d: "Same-day diagnostic imaging with clear specialist consultations." },
      ]
    : [
        { t: "Da liễu công nghệ cao", d: "Điều trị sắc tố, phục hồi hàng rào da và chăm sóc chuẩn y khoa." },
        { t: "Nội tổng quát chủ động", d: "Tầm soát chỉ số sinh học định kỳ và phác đồ dự phòng cá nhân hóa." },
        { t: "Chăm sóc tái tạo chuyên sâu", d: "Ứng dụng liệu pháp sinh học an toàn dưới sự theo dõi của bác sĩ." },
        { t: "Tầm soát chuyên sâu", d: "Chẩn đoán hình ảnh hiện đại và trả kết quả tư vấn trực tiếp trong ngày." },
      ];
  const doctors = en
    ? [
        { name: "Dr. Minh Quan, MD, PhD", role: "Chief of Dermatology · 16 Years Experience", cert: "JCI & EADV Member" },
        { name: "Dr. Lan Anh, MSc, MD", role: "Lead Preventive Medicine · 12 Years Experience", cert: "Board Certified Internal" },
      ]
    : [
        { name: "BS.CKII Minh Quân", role: "Trưởng khoa Da liễu · 16 năm kinh nghiệm lâm sàng", cert: "Chứng nhận JCI & EADV" },
        { name: "ThS.BS Lan Anh", role: "Chuyên khoa Nội tổng quát · 12 năm kinh nghiệm", cert: "Hội đồng Y khoa Quốc tế" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.top-clinical{background:#0D7A6F;color:#F7FBFA;font-size:12px;padding:8px 0}
.top-clinical-inner{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
.hero-split{display:grid;grid-template-columns:1.15fr .85fr;gap:28px;align-items:center;padding:44px 0 36px}
.trust-card{background:#FFFFFF;border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 16px 38px -20px rgba(13,122,111,.22)}
.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;background:var(--bg-alt);border-radius:16px;padding:22px;text-align:center}
.doc-avatar{width:48px;height:48px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:750;font-size:15px;flex-shrink:0}
`;

  const body = `
<div class="top-clinical">
  <div class="wrap top-clinical-inner">
    <span>✓ ${en ? "JCI Clinical Safety Standards · Sterile Grade-A Suites" : "Đạt chuẩn An toàn Y khoa JCI · Phòng vô trùng cấp độ A"}</span>
    <span>Hotline: 1900 8868 · 08:00 – 20:00</span>
  </div>
</div>
<header class="wrap nav">
  <div class="nav-brand" style="color:var(--accent)">✚ ${b}</div>
  <nav class="nav-links">
    <span>${en ? "Specialties" : "Chuyên khoa"}</span>
    <span>${en ? "Physicians" : "Đội ngũ bác sĩ"}</span>
    <span>${en ? "Standards" : "Tiêu chuẩn"}</span>
    <span>${en ? "Patient Guide" : "Hướng dẫn"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Book Consultation" : "Đặt lịch khám ngay"}</span>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "EVIDENCE-BASED CLINICAL CARE" : "CHĂM SÓC Y KHOA CHUẨN MỰC & TẬN TÂM"}</span>
      <h1 style="font-size:clamp(30px,4vw,46px);line-height:1.12;font-weight:720;margin:12px 0 14px;color:#0E2F33">${en ? "Trusted dermatology and preventive medicine with calm precision." : "Phòng khám da liễu & sức khỏe chủ động minh bạch, chuẩn y khoa."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 24px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Book Appointment Now" : "Đặt lịch khám ngay"}</span>
        <span class="btn btn-outline">${en ? "Meet Our Doctors" : "Hồ sơ hội đồng bác sĩ"}</span>
      </div>
    </div>
    <div class="trust-card">
      <div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--accent);text-transform:uppercase">${en ? "NEXT AVAILABLE SPECIALIST" : "LỊCH KHÁM SỚM NHẤT HÔM NAY"}</div>
      <h3 style="margin:8px 0 14px;font-size:18px">${en ? "Direct 1-on-1 Physician Visit" : "Thăm khám 1:1 cùng Bác sĩ Chuyên khoa"}</h3>
      <div style="display:grid;gap:10px;font-size:13.5px;color:var(--muted);margin-bottom:18px">
        <div style="padding:10px 12px;border-radius:10px;background:var(--bg)">✓ ${en ? "Transparent treatment protocol before care" : "Tư vấn phác đồ và chi phí minh bạch trước điều trị"}</div>
        <div style="padding:10px 12px;border-radius:10px;background:var(--bg)">✓ ${en ? "Private digital medical record access" : "Hồ sơ sức khỏe số bảo mật riêng cho từng khách hàng"}</div>
      </div>
      <span class="btn btn-primary" style="width:100%">${en ? "Confirm Slot · Today 14:30" : "Giữ lịch khám · 14:30 hôm nay"}</span>
    </div>
  </section>

  <section class="stat-row">
    <div><strong style="font-size:26px;color:var(--accent)">28.000+</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Patients Cared For" : "Khách hàng tin chọn"}</div></div>
    <div><strong style="font-size:26px;color:var(--accent)">98.6%</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Patient Satisfaction" : "Tỷ lệ hài lòng"}</div></div>
    <div><strong style="font-size:26px;color:var(--accent)">100%</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Licensed Specialists" : "Bác sĩ chuyên khoa"}</div></div>
  </section>

  <section class="section">
    <span class="eyebrow">${en ? "CLINICAL SPECIALTIES" : "4 CHUYÊN KHOA MŨI NHỌN"}</span>
    <div class="grid-4" style="margin-top:16px">
      ${specialties
        .map(
          (s) => `
      <article class="card">
        <h3 style="font-size:16px;margin:0 0 8px;color:#0E2F33">${escapeHtml(s.t)}</h3>
        <p style="margin:0;font-size:13px;color:var(--muted)">${escapeHtml(s.d)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <span class="eyebrow">${en ? "MEDICAL BOARD" : "HỘI ĐỒNG BÁC SĨ CHUYÊN MÔN"}</span>
    <div class="grid-2" style="margin-top:16px">
      ${doctors
        .map(
          (d, i) => `
      <article class="card" style="display:flex;gap:16px;align-items:flex-start">
        <div class="doc-avatar">${i === 0 ? "MQ" : "LA"}</div>
        <div>
          <h3 style="margin:0 0 4px;font-size:17px">${escapeHtml(d.name)}</h3>
          <p style="margin:0 0 6px;font-size:13.5px;color:var(--muted)">${escapeHtml(d.role)}</p>
          <span style="font-size:11.5px;color:var(--accent);font-weight:650">${escapeHtml(d.cert)}</span>
        </div>
      </article>`
        )
        .join("")}
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Clinical Medical & Derma Care" : "Phòng khám Đa khoa & Da liễu"}</span>
  <span>Ministry of Health Licensed · District 1, HCMC</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderMonolithAdvisory(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const practices = en
    ? [
        { k: "01", t: "Corporate M&A", d: "Cross-border acquisitions, valuation governance, and post-merger integration." },
        { k: "02", t: "Intellectual Property", d: "Global patent portfolios, cleanroom software licensing, and brand defense." },
        { k: "03", t: "Capital Structuring", d: "Private credit, Series B–D growth rounds, and treasury risk frameworks." },
        { k: "04", t: "Risk & Regulatory", d: "Board-level compliance, privacy audits, and sovereign regulatory counsel." },
      ]
    : [
        { k: "01", t: "M&A Doanh nghiệp", d: "Tư vấn mua bán sáp nhập xuyên biên giới, thẩm định và tái cấu trúc." },
        { k: "02", t: "Sở hữu trí tuệ", d: "Bảo hộ sáng chế, cấp phép phần mềm và phòng vệ tài sản thương hiệu." },
        { k: "03", t: "Cấu trúc vốn", d: "Thu xếp vốn tăng trưởng, tín dụng tư nhân và quản trị dòng tiền chiến lược." },
        { k: "04", t: "Quản trị rủi ro", d: "Tuân thủ pháp lý cấp Hội đồng quản trị và đánh giá rủi ro quy định." },
      ];

  const css = `
:root{--btn-ink:#0B1320}
.kpi-band{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:26px 0;margin-top:34px}
.kpi-num{font-family:var(--font-display);font-size:32px;color:#93C5FD}
.brief-box{background:var(--bg-alt);border:1px solid var(--line);padding:30px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Practices" : "Lĩnh vực"}</span>
    <span>${en ? "Partners" : "Đối tác"}</span>
    <span>${en ? "Briefings" : "Báo cáo"}</span>
    <span>${en ? "Offices" : "Văn phòng"}</span>
  </nav>
  <span class="btn btn-outline">${en ? "Confidential Inquiry" : "Trao đổi bảo mật"}</span>
</header>
<main class="wrap">
  <section class="section" style="padding-bottom:24px">
    <span class="eyebrow">${en ? "INSTITUTIONAL ADVISORY & CORPORATE LAW" : "TƯ VẤN CHIẾN LƯỢC TÀI CHÍNH & PHÁP LÝ"}</span>
    <h1 style="font-family:var(--font-display);font-size:clamp(32px,4.2vw,50px);font-weight:400;line-height:1.1;margin:14px 0 16px;max-width:780px">${en ? "Disciplined counsel for complex transactions and enduring capital." : "Tư vấn chuẩn mực cho các thương vụ trọng yếu và cấu trúc vốn bền vững."}</h1>
    <p style="color:var(--muted);max-width:620px;font-size:15.5px;margin:0 0 26px">${brief}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <span class="btn btn-primary">${en ? "Request Partner Briefing" : "Đặt lịch trao đổi đối tác"}</span>
      <span class="btn btn-outline">${en ? "2026 Regulatory Outlook" : "Báo cáo pháp lý 2026"}</span>
    </div>
    <div class="kpi-band">
      <div><div class="kpi-num">$2.4B</div><div style="font-size:12.5px;color:var(--muted)">${en ? "Advised Transaction Value" : "Tổng giá trị giao dịch tư vấn"}</div></div>
      <div><div class="kpi-num">18</div><div style="font-size:12.5px;color:var(--muted)">${en ? "Years Institutional Practice" : "Năm kinh nghiệm tư vấn"}</div></div>
      <div><div class="kpi-num">4</div><div style="font-size:12.5px;color:var(--muted)">${en ? "Regional Offices" : "Văn phòng khu vực"}</div></div>
    </div>
  </section>

  <section class="section" style="padding-top:16px">
    <span class="eyebrow">${en ? "CORE PRACTICE AREAS" : "4 LĨNH VỰC CHUYÊN MÔN CHÍNH"}</span>
    <div class="grid-2" style="margin-top:16px">
      ${practices
        .map(
          (p) => `
      <article class="card">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--accent)">${p.k}</div>
        <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:8px 0">${escapeHtml(p.t)}</h3>
        <p style="margin:0;color:var(--muted);font-size:14px">${escapeHtml(p.d)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="brief-box">
      <div>
        <span class="eyebrow">${en ? "PRIVILEGED CHANNEL" : "KÊNH LIÊN HỆ BẢO MẬT NDA"}</span>
        <h3 style="font-family:var(--font-display);font-size:24px;font-weight:400;margin:6px 0 0">${en ? "Speak directly with a managing partner under NDA." : "Làm việc trực tiếp cùng Đối tác Điều hành theo cam kết NDA."}</h3>
      </div>
      <span class="btn btn-primary">${en ? "Open Confidential Brief" : "Gửi hồ sơ bảo mật"}</span>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · Singapore · Ho Chi Minh City · Hanoi · Tokyo</span>
  <span>Institutional Governance · Attorney-Client Confidentiality</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderEdtechAcademy(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const courses = en
    ? [
        { title: "AI Engineering", meta: "12 Weeks · 48 Lessons", rating: "★ 4.9", tag: "Cohort 14" },
        { title: "UI/UX Systems", meta: "10 Weeks · 40 Lessons", rating: "★ 4.9", tag: "Portfolio" },
        { title: "Full-Stack TypeScript", meta: "14 Weeks · 56 Lessons", rating: "★ 4.8", tag: "Production" },
        { title: "Data Analytics", meta: "8 Weeks · 32 Lessons", rating: "★ 4.9", tag: "Applied SQL" },
      ]
    : [
        { title: "AI Engineering", meta: "12 Tuần · 48 Bài thực hành", rating: "★ 4.9", tag: "Khóa K14" },
        { title: "UI/UX Systems", meta: "10 Tuần · 40 Bài thực hành", rating: "★ 4.9", tag: "Hồ sơ thực tế" },
        { title: "Full-Stack TypeScript", meta: "14 Tuần · 56 Bài thực hành", rating: "★ 4.8", tag: "Dự án thật" },
        { title: "Data Analytics", meta: "8 Tuần · 32 Bài thực hành", rating: "★ 4.9", tag: "Phân tích dữ liệu" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.search-pill{display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:#FFFFFF;border:1px solid var(--line);font-size:13px;color:var(--muted);min-width:220px}
.ed-hero{background:linear-gradient(135deg,#0F172A 0%,#134E4A 100%);color:#F8FAFC;border-radius:22px;padding:44px 36px;margin-top:20px}
.course-tag{display:inline-block;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:#0F766E;font-size:11px;font-weight:700}
.outcome-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px}
.outcome-card{background:var(--bg-alt);border-radius:14px;padding:18px;text-align:center}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <div class="search-pill">⌕ ${en ? "Search AI, TypeScript, UI/UX..." : "Tìm khóa AI, UI/UX, TypeScript..."}</div>
  <span class="btn btn-primary">${en ? "Apply Cohort" : "Đăng ký tư vấn"}</span>
</header>
<main class="wrap">
  <section class="ed-hero">
    <span class="eyebrow" style="color:#5EEAD4">${en ? "NEXT COHORT OPENS JUNE 02 · LIVE MENTORSHIP" : "KHAI GIẢNG KHÓA MỚI 02/06 · CỐ VẤN TRỰC TIẾP 1:1"}</span>
    <h1 style="font-size:clamp(30px,4vw,46px);line-height:1.1;font-weight:750;letter-spacing:-.03em;margin:12px 0 14px;max-width:720px">${en ? "Master applied AI and product engineering through real builds." : "Làm chủ kỹ thuật AI và sản phẩm số qua dự án thực chiến."}</h1>
    <p style="color:#CBD5E1;max-width:580px;font-size:15px;margin:0 0 24px">${brief}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <span class="btn btn-primary">${en ? "Explore 4 Tracks" : "Xem 4 lộ trình học"}</span>
      <span class="btn" style="background:rgba(255,255,255,.12);color:#FFFFFF">${en ? "Download Syllabus" : "Tải giáo trình chi tiết"}</span>
    </div>
  </section>

  <section class="section">
    <span class="eyebrow">${en ? "STRUCTURED CURRICULUM TRACKS" : "CHƯƠNG TRÌNH ĐÀO TẠO CHUYÊN SÂU"}</span>
    <h2 style="font-size:28px;font-weight:720;margin:8px 0 20px">${en ? "4 Career-Accelerating Programs" : "4 Lộ trình kỹ sư & thiết kế sản phẩm"}</h2>
    <div class="grid-4">
      ${courses
        .map(
          (c) => `
      <article class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span class="course-tag">${escapeHtml(c.tag)}</span>
            <span style="font-size:12px;font-weight:700;color:#0F766E">${escapeHtml(c.rating)}</span>
          </div>
          <h3 style="margin:0 0 6px;font-size:17px">${escapeHtml(c.title)}</h3>
          <p style="margin:0;font-size:13px;color:var(--muted)">${escapeHtml(c.meta)}</p>
        </div>
        <span class="btn btn-primary" style="width:100%;padding:9px 12px">${en ? "Enroll Now" : "Đăng ký học"}</span>
      </article>`
        )
        .join("")}
    </div>
    <div class="outcome-grid">
      <div class="outcome-card"><strong style="font-size:26px;color:var(--accent)">94%</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Placement within 90 Days" : "Có việc làm sau 90 ngày"}</div></div>
      <div class="outcome-card"><strong style="font-size:26px;color:var(--accent)">14.200+</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Alumni Worldwide" : "Học viên tốt nghiệp"}</div></div>
      <div class="outcome-card"><strong style="font-size:26px;color:var(--accent)">42</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Principal Mentors" : "Giảng viên chuyên gia"}</div></div>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Applied AI & Design Academy" : "Học viện Công nghệ & Thiết kế"}</span>
  <span>Live Cohorts · Capstone Portfolio · Career Coaching</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

function renderInteriorAtelier(ctx: TemplateRenderContext): string {
  const b = escapeHtml(ctx.brand);
  const brief = escapeHtml(ctx.brief);
  const en = ctx.isEn;
  const swatches = en
    ? [
        { name: "Honed Basalt", code: "MAT-01", color: "#2A343B" },
        { name: "Smoked Grey Oak", code: "MAT-02", color: "#8C8275" },
        { name: "Low-E Architectural Glass", code: "MAT-03", color: "#B8CFD1" },
        { name: "Brushed Titanium", code: "MAT-04", color: "#687076" },
      ]
    : [
        { name: "Đá Bazan Mài", code: "MAT-01", color: "#2A343B" },
        { name: "Gỗ Sồi Xám", code: "MAT-02", color: "#8C8275" },
        { name: "Kính Low-E", code: "MAT-03", color: "#B8CFD1" },
        { name: "Kim Loại Phay", code: "MAT-04", color: "#687076" },
      ];
  const rooms = en
    ? [
        { name: "Living Pavilion", spec: "Natural daylight · Travertine & linen sofa", tone: "#D9D4C7" },
        { name: "Minimalist Kitchen", spec: "Monolithic stone island · Concealed millwork", tone: "#C8C4B9" },
        { name: "Meditation Chamber", spec: "Acoustic timber slats · Diffused courtyard glow", tone: "#DFDBD0" },
      ]
    : [
        { name: "Phòng khách", spec: "Ánh sáng tự nhiên · Đá travertine & sofa vải lanh", tone: "#D9D4C7" },
        { name: "Bếp tối giản", spec: "Đảo bếp nguyên khối · Hệ tủ giấu tay nắm", tone: "#C8C4B9" },
        { name: "Phòng thiền", spec: "Lam gỗ tiêu âm · Ánh sáng dịu từ giếng trời", tone: "#DFDBD0" },
      ];

  const css = `
:root{--btn-ink:#F6F5F1}
.swatch-chip{height:68px;border-radius:4px;margin-bottom:10px;border:1px solid rgba(0,0,0,.08)}
.room-canvas{height:138px;border-radius:4px;margin-bottom:14px;display:flex;align-items:flex-end;padding:12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#1E262B;font-weight:700}
.showroom-bar{background:#1E262B;color:#F6F5F1;padding:32px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <nav class="nav-links">
    <span>${en ? "Residences" : "Không gian"}</span>
    <span>${en ? "Materials" : "Vật liệu"}</span>
    <span>${en ? "Process" : "Quy trình"}</span>
    <span>${en ? "Showroom" : "Showroom"}</span>
  </nav>
  <span class="btn btn-primary">${en ? "Visit Showroom" : "Hẹn tại Showroom"}</span>
</header>
<main class="wrap">
  <section class="section" style="padding-bottom:32px">
    <span class="eyebrow">${en ? "BESPOKE RESIDENTIAL INTERIORS" : "THIẾT KẾ NỘI THẤT & KHÔNG GIAN SỐNG"}</span>
    <h1 style="font-family:var(--font-display);font-size:clamp(32px,4.2vw,52px);font-weight:400;line-height:1.1;margin:12px 0 14px;max-width:740px">${en ? "Tactile calm composed with stone, smoked oak, and quiet light." : "Sự hài hòa của chất liệu đá, gỗ sồi xám và ánh sáng tự nhiên."}</h1>
    <p style="color:var(--muted);max-width:580px;font-size:15px;margin:0 0 24px">${brief}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <span class="btn btn-primary">${en ? "Book Showroom Consultation" : "Đặt lịch tư vấn showroom"}</span>
      <span class="btn btn-outline">${en ? "Explore Material Library" : "Thư viện vật liệu"}</span>
    </div>
  </section>

  <section class="section" style="padding-top:8px">
    <span class="eyebrow">${en ? "TACTILE MATERIAL PALETTE" : "BẢNG VẬT LIỆU TINH TUYỂN"}</span>
    <div class="grid-4" style="margin-top:16px">
      ${swatches
        .map(
          (sw) => `
      <article class="card" style="padding:14px">
        <div class="swatch-chip" style="background:${sw.color}"></div>
        <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">${sw.code}</div>
        <div style="font-weight:650;font-size:14.5px;margin-top:3px">${escapeHtml(sw.name)}</div>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:8px">
    <span class="eyebrow">${en ? "ROOM TRANSFORMATIONS" : "CÂU CHUYỆN TỪNG KHÔNG GIAN"}</span>
    <div class="grid-3" style="margin-top:16px">
      ${rooms
        .map(
          (rm, idx) => `
      <article class="card" style="padding:18px">
        <div class="room-canvas" style="background:linear-gradient(155deg,${rm.tone},#F1EFE9)">ROOM 0${idx + 1}</div>
        <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:0 0 6px">${escapeHtml(rm.name)}</h3>
        <p style="margin:0;color:var(--muted);font-size:13.5px">${escapeHtml(rm.spec)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:4px">
    <div class="showroom-bar">
      <div>
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#C8C2B4">${en ? "TURNKEY DESIGN & BUILD" : "THIẾT KẾ & THI CÔNG TRỌN GÓI"}</div>
        <h3 style="font-family:var(--font-display);font-size:24px;font-weight:400;margin:6px 0 0">${en ? "Experience our stone and timber samples in person." : "Trải nghiệm trực tiếp bảng mẫu đá, gỗ và ánh sáng tại showroom."}</h3>
      </div>
      <span class="btn" style="background:#F6F5F1;color:#1E262B">${en ? "Reserve Visit →" : "Đặt lịch hẹn →"}</span>
    </div>
  </section>
</main>
<footer class="wrap foot">
  <span>© ${b} · ${en ? "Interior Design & Architecture" : "Studio Nội thất & Không gian"}</span>
  <span>Thao Dien Showroom · Open Tue–Sun</span>
</footer>`;
  return wrapStandaloneDocument(ctx, css, body);
}

const RENDERERS: Readonly<Record<string, (ctx: TemplateRenderContext) => string>> = {
  "coastal-glass-architecture": renderCoastalArchitecture,
  "botanical-wellness-sanctuary": renderBotanicalWellness,
  "ocean-obsidian-ai-platform": renderSaasAiPlatform,
  "atelier-maison-luxury": renderLuxuryMaison,
  "azure-horizon-resort": renderAzureResort,
  "jade-botanical-skincare": renderJadeSkincare,
  "silver-prism-creative-studio": renderCreativeStudio,
  "calm-sea-fine-dining": renderFineDining,
  "serene-clinic-medical": renderSereneMedical,
  "monolith-advisory-legal": renderMonolithAdvisory,
  "kinetic-academy-edtech": renderEdtechAcademy,
  "veranda-interior-atelier": renderInteriorAtelier,
};

export function renderTemplateHtml(
  template: TemplateItem,
  opts: TemplateRenderOptions = {}
): string {
  const lang = resolveLang(opts.lang);
  const loc = template[lang];
  const defaultBrand = DEFAULT_BRAND_BY_ID[template.id] ?? loc.sample_brand;
  const brand = sanitizeOverride(opts.brand, 80) ?? defaultBrand;
  const brief = sanitizeOverride(opts.brief, 320) ?? loc.sample_brief;
  const tokens = getDesignTokens(template.id);
  const ctx: TemplateRenderContext = {
    lang,
    brand,
    brief,
    isEn: lang === "en",
    template,
    tokens,
  };
  const renderFn = RENDERERS[template.id] ?? renderCoastalArchitecture;
  return renderFn(ctx);
}

export function buildTemplateSourcePayload(
  template: TemplateItem,
  lang: TemplateRenderLang = "vi",
  opts: { readonly brand?: string; readonly brief?: string } = {}
): TemplateSourcePayload {
  const resolvedLang = resolveLang(lang);
  return {
    ok: true,
    schema_version: "1.0.0",
    id: template.id,
    license: template.license,
    source_inspiration: template.source_inspiration,
    blocks: template.blocks,
    html: renderTemplateHtml(template, {
      lang: resolvedLang,
      brand: opts.brand,
      brief: opts.brief,
    }),
    design_tokens: getDesignTokens(template.id),
  };
}
