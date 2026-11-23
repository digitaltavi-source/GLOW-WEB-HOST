import type { TemplateBlockSpec, TemplateItem } from "./template-registry.js";

export type TemplateRenderLang = "vi" | "en";

export interface TemplateRenderOptions {
  readonly lang?: TemplateRenderLang;
  readonly brand?: string;
  readonly brief?: string;
  readonly basePath?: string;
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
  readonly assetBase: string;
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

function resolveAssetBase(basePath?: string): string {
  if (typeof basePath !== "string") return "";
  const trimmed = basePath.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return /^\/[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : "";
}

function photoUrl(ctx: TemplateRenderContext, slug: string): string {
  return `${ctx.assetBase}/assets/templates/${slug}.webp`;
}

const DESIGN_TOKENS_BY_ID: Readonly<Record<string, TemplateDesignTokens>> = {
  "coastal-glass-architecture": {
    mode: "dark",
    surface_bg: "#0B1218",
    surface_alt: "#111C25",
    surface_card: "#14222D",
    text_primary: "#F4F1EB",
    text_muted: "#A9BAC6",
    accent: "#DFC9A6",
    accent_soft: "rgba(223, 201, 166, 0.14)",
    border: "rgba(234, 230, 223, 0.16)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "6px",
  },
  "botanical-wellness-sanctuary": {
    mode: "light",
    surface_bg: "#F5F7F4",
    surface_alt: "#E9F0EA",
    surface_card: "#FFFFFF",
    text_primary: "#152E23",
    text_muted: "#4D695B",
    accent: "#1B4332",
    accent_soft: "#DCECE2",
    border: "rgba(27, 67, 50, 0.14)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "16px",
  },
  "ocean-obsidian-ai-platform": {
    mode: "dark",
    surface_bg: "#070C14",
    surface_alt: "#0D1626",
    surface_card: "#101B2E",
    text_primary: "#F1F5F9",
    text_muted: "#98A8BE",
    accent: "#34E8B4",
    accent_soft: "rgba(52, 232, 180, 0.14)",
    border: "rgba(148, 163, 184, 0.18)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "14px",
  },
  "atelier-maison-luxury": {
    mode: "dark",
    surface_bg: "#0C0D10",
    surface_alt: "#14161B",
    surface_card: "#171920",
    text_primary: "#F7F2EA",
    text_muted: "#AEA89E",
    accent: "#E3D2B6",
    accent_soft: "rgba(227, 210, 182, 0.13)",
    border: "rgba(232, 223, 209, 0.16)",
    font_display: FONT_SERIF,
    font_body: FONT_SANS,
    radius: "4px",
  },
  "azure-horizon-resort": {
    mode: "light",
    surface_bg: "#F3F7F9",
    surface_alt: "#E4F0F4",
    surface_card: "#FFFFFF",
    text_primary: "#0D394A",
    text_muted: "#486E7C",
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
    surface_bg: "#0F1216",
    surface_alt: "#161A21",
    surface_card: "#1A1E26",
    text_primary: "#F8FAFC",
    text_muted: "#9CA7B5",
    accent: "#34E8B4",
    accent_soft: "rgba(52, 232, 180, 0.14)",
    border: "rgba(248, 250, 252, 0.14)",
    font_display: FONT_SANS,
    font_body: FONT_SANS,
    radius: "10px",
  },
  "calm-sea-fine-dining": {
    mode: "dark",
    surface_bg: "#0C0F12",
    surface_alt: "#14191E",
    surface_card: "#171D22",
    text_primary: "#F5F0E6",
    text_muted: "#ABB6B2",
    accent: "#D6C5A7",
    accent_soft: "rgba(214, 197, 167, 0.14)",
    border: "rgba(214, 197, 167, 0.18)",
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
    surface_bg: "#0A121E",
    surface_alt: "#101C2E",
    surface_card: "#132136",
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
    border: "rgba(15, 23, 42, 0.12)",
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
    radius: "8px",
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
  surface_bg: "#0B1218",
  surface_alt: "#111C25",
  surface_card: "#14222D",
  text_primary: "#F4F1EB",
  text_muted: "#A9BAC6",
  accent: "#DFC9A6",
  accent_soft: "rgba(223, 201, 166, 0.14)",
  border: "rgba(234, 230, 223, 0.16)",
  font_display: FONT_SERIF,
  font_body: FONT_SANS,
  radius: "6px",
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
    "html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:var(--font-body);line-height:1.56;-webkit-font-smoothing:antialiased}",
    "a{color:inherit;text-decoration:none}",
    "img,svg{display:block;max-width:100%}",
    ".wrap{width:min(1180px,calc(100% - 48px));margin:0 auto}",
    ".nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid var(--line)}",
    ".nav-brand{font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:.04em}",
    ".nav-links{display:flex;align-items:center;gap:22px;font-size:13px;color:var(--muted)}",
    ".btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;border-radius:var(--radius);font-size:13px;font-weight:650;border:1px solid transparent;cursor:pointer;white-space:nowrap}",
    ".btn-primary{background:var(--accent);color:var(--btn-ink,#091217)}",
    ".btn-outline{background:transparent;border-color:var(--line);color:var(--ink)}",
    ".eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}",
    ".section{padding:54px 0}",
    ".grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}",
    ".grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}",
    ".grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px;overflow:hidden}",
    ".hero-photo-frame{position:relative;border-radius:calc(var(--radius) + 4px);overflow:hidden;border:1px solid var(--line);background:var(--bg-alt);box-shadow:0 28px 68px -26px rgba(0,0,0,.46)}",
    ".hero-photo{width:100%;height:100%;min-height:320px;max-height:460px;aspect-ratio:16/10;object-fit:cover}",
    ".hero-photo-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,10,16,.04) 0%,rgba(4,10,16,.18) 54%,rgba(4,10,16,.78) 100%);pointer-events:none}",
    ".hero-float-badge{position:absolute;left:16px;right:16px;bottom:16px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px 15px;border-radius:10px;background:rgba(8,15,23,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.18);color:#F8FAFC;font-size:12px}",
    ".card-photo-wrap{position:relative;height:176px;border-radius:calc(var(--radius) + 2px);overflow:hidden;margin-bottom:15px;border:1px solid var(--line);background:var(--bg-alt)}",
    ".card-photo{width:100%;height:100%;object-fit:cover}",
    ".card-photo-tag{position:absolute;top:10px;left:10px;z-index:2;padding:4px 10px;border-radius:999px;background:rgba(8,15,23,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#F8FAFC;border:1px solid rgba(255,255,255,.18);font-size:10.5px;font-weight:650;letter-spacing:.05em}",
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
  const heroImg = photoUrl(ctx, "coastal-glass-architecture");
  const projects = en
    ? [
        { num: "01", name: "Villa Horizon", area: "680m²", loc: "Son Tra Peninsula", tag: "Cantilever Glass", img: heroImg, pos: "center 42%" },
        { num: "02", name: "Pavilion North", area: "420m²", loc: "Cam Ranh Bay", tag: "Cliffside Infinity", img: photoUrl(ctx, "azure-horizon-resort"), pos: "center 55%" },
        { num: "03", name: "Courtyard Residence", area: "890m²", loc: "Phu Yen Coast", tag: "Travertine & Timber", img: photoUrl(ctx, "veranda-interior-atelier"), pos: "center center" },
      ]
    : [
        { num: "01", name: "Villa Horizon", area: "680m²", loc: "Bán đảo Sơn Trà", tag: "Kính vượt nhịp", img: heroImg, pos: "center 42%" },
        { num: "02", name: "Pavilion North", area: "420m²", loc: "Vịnh Cam Ranh", tag: "Hồ tràn vách đá", img: photoUrl(ctx, "azure-horizon-resort"), pos: "center 55%" },
        { num: "03", name: "Courtyard Residence", area: "890m²", loc: "Bờ biển Phú Yên", tag: "Đá Travertine & Gỗ", img: photoUrl(ctx, "veranda-interior-atelier"), pos: "center center" },
      ];

  const css = `
:root{--btn-ink:#0B1218}
.hero-split{display:grid;grid-template-columns:1.02fr 1.08fr;gap:36px;align-items:center;padding:48px 0 44px}
.hero-title{font-family:var(--font-display);font-size:clamp(32px,4.1vw,50px);line-height:1.08;font-weight:400;margin:14px 0 16px;letter-spacing:-.02em}
.hero-sub{color:var(--muted);font-size:15.5px;max-width:520px;margin:0 0 26px}
.proj-num{font-family:var(--font-mono);font-size:11px;color:var(--accent);letter-spacing:.14em}
.proj-meta{display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
.spec-band{background:var(--bg-alt);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:34px 0}
.spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;text-align:center}
.spec-val{font-family:var(--font-display);font-size:32px;color:var(--accent)}
.spec-lbl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.cta-bar{background:linear-gradient(135deg,#182834,#0F1A22);border:1px solid var(--line);border-radius:var(--radius);padding:32px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
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
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Cantilevered coastal glass villa overlooking twilight infinity pool" : "Biệt thự kính vượt nhịp bên hồ bơi vô cực ven biển"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="font-family:var(--font-mono);color:var(--accent)">ELEVATION N-04 · 18.4M SPAN</span>
        <span>${en ? "Low-E Structural Glazing · Son Tra" : "Kính Low-E Vượt Nhịp · Sơn Trà"}</span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:14px">
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
          (p) => `
      <article class="card" style="padding:16px">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">${p.num} · ${escapeHtml(p.tag)}</span>
          <img class="card-photo" src="${p.img}" style="object-position:${p.pos}" alt="${escapeHtml(p.name)}" loading="lazy">
        </div>
        <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:4px 0 2px">${escapeHtml(p.name)}</h3>
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
  const heroImg = photoUrl(ctx, "botanical-wellness-sanctuary");
  const rituals = en
    ? [
        { name: "Jade Botanical Ritual", dur: "90 min", price: "$78", desc: "Warm white-tea compress, herbal oil meridian therapy & jade Gua Sha.", img: heroImg, pos: "center 58%" },
        { name: "Eucalyptus Hydro Soak", dur: "75 min", price: "$62", desc: "Thermal stone bath infused with fresh forest eucalyptus and mineral sea salt.", img: photoUrl(ctx, "jade-botanical-skincare"), pos: "center 40%" },
        { name: "Cliffside Ocean Breath", dur: "90 min", price: "$72", desc: "Open-pavilion sound therapy and warm coastal basalt stone release.", img: photoUrl(ctx, "azure-horizon-resort"), pos: "left 60%" },
        { name: "Courtyard Tea & Hinoki", dur: "60 min", price: "$49", desc: "Singing bowl resonance paired with cold-pressed lotus & hinoki mist.", img: photoUrl(ctx, "veranda-interior-atelier"), pos: "right center" },
      ]
    : [
        { name: "Liệu trình Ngọc Bích", dur: "90 phút", price: "1.850.000đ", desc: "Ủ ấm trà trắng, bấm huyệt tinh dầu thảo mộc và nâng cơ đá ngọc bích.", img: heroImg, pos: "center 58%" },
        { name: "Ngâm Khoáng Bạch Đàn", dur: "75 phút", price: "1.450.000đ", desc: "Bồn đá khoáng nóng cùng lá bạch đàn tươi và muối biển tinh khiết.", img: photoUrl(ctx, "jade-botanical-skincare"), pos: "center 40%" },
        { name: "Đá Nóng Bazan Ven Vịnh", dur: "90 phút", price: "1.680.000đ", desc: "Thư giãn cơ sâu bằng đá bazan mài thủ công trong đình nghỉ hướng biển.", img: photoUrl(ctx, "azure-horizon-resort"), pos: "left 60%" },
        { name: "Thiền Chuông & Trà Trắng", dur: "60 phút", price: "1.150.000đ", desc: "Âm thanh trị liệu kết hợp hương gỗ hinoki và sen trắng ép lạnh.", img: photoUrl(ctx, "veranda-interior-atelier"), pos: "right center" },
      ];

  const css = `
:root{--btn-ink:#F5F7F4}
.hero-split{display:grid;grid-template-columns:1.02fr 1.08fr;gap:34px;align-items:center;padding:46px 0 40px}
.hero-title{font-family:var(--font-display);font-size:clamp(32px,4vw,50px);line-height:1.12;font-weight:400;margin:14px 0 16px;color:#143325}
.hero-sub{color:var(--muted);font-size:15.5px;margin:0 0 26px;max-width:500px}
.ritual-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px}
.ritual-price{font-weight:700;color:var(--accent);font-size:15px}
.apothecary{background:var(--bg-alt);border-radius:22px;padding:30px;display:grid;grid-template-columns:1.05fr .95fr;gap:26px;align-items:center}
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
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Tranquil emerald thermal bath surrounded by lush tropical foliage" : "Không gian hồ khoáng thảo mộc ngọc bích tĩnh tại"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span>✦ ${en ? "12 Private Thermal Suites" : "12 Phòng Khoáng Nóng Riêng Tư"}</span>
        <span style="color:#A7F3D0;font-weight:650">4.98 ★ Guest Serenity</span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:14px">
    <span class="eyebrow">${en ? "SIGNATURE RITUAL MENU" : "THỰC ĐƠN LIỆU TRÌNH CHUYÊN SÂU"}</span>
    <h2 style="font-family:var(--font-display);font-size:30px;font-weight:400;margin:8px 0 22px">${en ? "Four Restorative Experiences" : "4 Nghi thức chăm sóc thân – tâm"}</h2>
    <div class="grid-2">
      ${rituals
        .map(
          (r) => `
      <article class="card">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">${escapeHtml(r.dur)}</span>
          <img class="card-photo" src="${r.img}" style="object-position:${r.pos}" alt="${escapeHtml(r.name)}" loading="lazy">
        </div>
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
  const heroImg = photoUrl(ctx, "ocean-obsidian-ai-platform");
  const bento = en
    ? [
        { k: "01 · ROUTER", t: "Deterministic Tool Router", d: "Route multi-agent workloads across verified MCP endpoints with zero drift.", img: heroImg, pos: "center 35%" },
        { k: "02 · EDGE", t: "Sub-50ms Edge Runtime", d: "Global cold-start elimination with isolated sandbox worker execution.", img: photoUrl(ctx, "silver-prism-creative-studio"), pos: "center center" },
        { k: "03 · OAUTH", t: "Scoped OAuth Authority", d: "Per-action token verification and cryptographic audit receipts.", img: photoUrl(ctx, "monolith-advisory-legal"), pos: "center 40%" },
      ]
    : [
        { k: "01 · ĐIỀU PHỐI", t: "Điều phối Công cụ Chuẩn xác", d: "Kết nối đa tác nhân AI qua chuẩn MCP với kiểm soát phạm vi minh bạch.", img: heroImg, pos: "center 35%" },
        { k: "02 · HẠ TẦNG BIÊN", t: "Độ trễ biên dưới 50ms", d: "Thực thi siêu tốc trên hạ tầng cô lập với độ sẵn sàng 99.99%.", img: photoUrl(ctx, "silver-prism-creative-studio"), pos: "center center" },
        { k: "03 · BẢO MẬT", t: "Phân quyền OAuth theo tác vụ", d: "Xác thực quyền riêng biệt từng hành động kèm biên bản kiểm tra.", img: photoUrl(ctx, "monolith-advisory-legal"), pos: "center 40%" },
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
.hero-split{display:grid;grid-template-columns:1.02fr 1.08fr;gap:32px;align-items:center;padding:46px 0 38px}
.hero-title{font-size:clamp(32px,4vw,48px);line-height:1.08;font-weight:750;letter-spacing:-.035em;margin:14px 0 14px;background:linear-gradient(95deg,#FFFFFF 0%,#A5F3FC 55%,#34E8B4 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.kpi-strip{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
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
        <span class="kpi-chip">38ms p95</span>
        <span class="kpi-chip">99.99% SLA</span>
        <span class="kpi-chip">OAuth 2.1 + MCP</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Obsidian AI command architecture and optical glass telemetry" : "Trung tâm điều phối hạ tầng AI thế hệ mới"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="font-family:var(--font-mono);color:#34E8B4">● MCP /mcp-v2 READY</span>
        <span style="font-family:var(--font-mono)">tx: 38ms · zero-trust verified</span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:14px">
    <span class="eyebrow">${en ? "MODULAR BENTO ARCHITECTURE" : "KIẾN TRÚC BENTO CỐT LÕI"}</span>
    <h2 style="font-size:28px;font-weight:700;margin:8px 0 22px;letter-spacing:-.02em">${en ? "Engineered for production reliability" : "Thiết kế cho vận hành doanh nghiệp bền bỉ"}</h2>
    <div class="grid-3">
      ${bento
        .map(
          (item) => `
      <article class="card">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">${escapeHtml(item.k)}</span>
          <img class="card-photo" src="${item.img}" style="object-position:${item.pos}" alt="${escapeHtml(item.t)}" loading="lazy">
        </div>
        <h3 style="margin:0 0 8px;font-size:17px">${escapeHtml(item.t)}</h3>
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
  const heroImg = photoUrl(ctx, "atelier-maison-luxury");
  const looks = [
    { id: "LOOK 01", name: "SILHOUETTE", note: en ? "Structured raw obsidian silk coat" : "Áo choàng lụa obsidian cắt thủ công", img: heroImg, pos: "center 30%" },
    { id: "LOOK 02", name: "LUMIÈRE", note: en ? "Travertine & sculptural gallery objects" : "Không gian trưng bày đá travertine & đồng", img: photoUrl(ctx, "veranda-interior-atelier"), pos: "left center" },
    { id: "LOOK 03", name: "SOIRÉE", note: en ? "Private candlelit salon reception" : "Phòng tiếp đón khách mời riêng tư", img: photoUrl(ctx, "calm-sea-fine-dining"), pos: "center 45%" },
  ];

  const css = `
:root{--btn-ink:#0C0D10}
.masthead{text-align:center;padding:24px 0 18px;border-bottom:1px solid var(--line)}
.masthead-brand{font-family:var(--font-display);font-size:26px;letter-spacing:.26em;text-transform:uppercase}
.masthead-sub{font-size:11px;letter-spacing:.24em;color:var(--accent);margin-top:6px;text-transform:uppercase}
.hero-split{display:grid;grid-template-columns:1fr 1.1fr;gap:36px;align-items:center;padding:46px 0 40px}
.maison-h1{font-family:var(--font-display);font-size:clamp(34px,4.4vw,54px);font-weight:400;line-height:1.08;margin:16px 0 18px;font-style:italic}
.salon-box{border:1px solid var(--line);padding:34px;text-align:center;background:var(--bg-alt);border-radius:var(--radius)}
`;

  const body = `
<header class="wrap masthead">
  <div class="masthead-brand">${b}</div>
  <div class="masthead-sub">${en ? "PARIS · SAIGON · ISSUE 09 AUTUMN / WINTER" : "ẤN PHẨM SỐ 09 · BỘ SƯU TẬP THU ĐÔNG ĐỘC BẢN"}</div>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "HAUTE ATELIER MANIFESTO" : "TUYÊN NGÔN THỦ CÔNG & DI SẢN"}</span>
      <h1 class="maison-h1">${en ? "Quiet permanence, sculpted in shadow and warm travertine." : "Vẻ đẹp vượt thời gian, tạc trong ánh sáng ấm và đá tự nhiên."}</h1>
      <p style="color:var(--muted);font-size:15.5px;margin:0 0 26px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "View Issue 09 Lookbook" : "Xem bộ sưu tập số 09"}</span>
        <span class="btn btn-outline">${en ? "Private Salon Appointment" : "Đặt hẹn phòng trưng bày"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Luxury haute couture atelier showroom with travertine plinths" : "Không gian phòng trưng bày thời trang & chế tác độc bản"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="letter-spacing:.16em;color:var(--accent)">EDITION N° 09 / 24</span>
        <span>${en ? "Private Viewing · Rue Saint-Honoré" : "Tiếp đón theo lịch hẹn riêng"}</span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:12px">
    <div class="grid-3">
      ${looks
        .map(
          (lk) => `
      <article class="card" style="padding:16px">
        <div class="card-photo-wrap" style="height:208px">
          <span class="card-photo-tag">${lk.id}</span>
          <img class="card-photo" src="${lk.img}" style="object-position:${lk.pos}" alt="${lk.name}" loading="lazy">
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
  const heroImg = photoUrl(ctx, "azure-horizon-resort");
  const villas = en
    ? [
        { name: "Ocean Pool Villa", rate: "$360 / night", spec: "165m² · Private Infinity Pool · King", img: heroImg, pos: "center 52%" },
        { name: "Cliffside Glass Suite", rate: "$265 / night", spec: "110m² · Panoramic Sea Deck · King", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 45%" },
        { name: "Thermal Lagoon Pavilion", rate: "$480 / night", spec: "240m² · 2 Bedrooms · Butler Service", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "center center" },
      ]
    : [
        { name: "Ocean Pool Villa", rate: "8.900.000đ / đêm", spec: "165m² · Hồ bơi riêng · Hướng vịnh", img: heroImg, pos: "center 52%" },
        { name: "Cliffside Glass Suite", rate: "6.400.000đ / đêm", spec: "110m² · Ban công vách đá · Giường King", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 45%" },
        { name: "Thermal Lagoon Pavilion", rate: "11.500.000đ / đêm", spec: "240m² · 2 Phòng ngủ · Quản gia riêng", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "center center" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.resort-hero{position:relative;color:#F2F7F9;border-radius:24px;min-height:390px;padding:52px 40px 76px;overflow:hidden;margin-top:20px;display:flex;flex-direction:column;justify-content:flex-end}
.resort-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.resort-hero-scrim{position:absolute;inset:0;background:linear-gradient(95deg,rgba(6,24,34,.84) 0%,rgba(6,24,34,.46) 56%,rgba(6,24,34,.18) 100%);z-index:1}
.resort-hero-copy{position:relative;z-index:2;max-width:650px}
.booking-widget{background:#FFFFFF;border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:-36px auto 0;width:min(960px,calc(100% - 24px));position:relative;z-index:3;display:grid;grid-template-columns:repeat(3,1fr) auto;gap:14px;align-items:center;box-shadow:0 20px 44px -18px rgba(13,59,76,.24)}
.bw-field{border-right:1px solid var(--line);padding-right:12px}
.bw-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
.bw-val{font-weight:700;font-size:14px;color:var(--ink);margin-top:2px}
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
    <img class="resort-hero-img" src="${heroImg}" alt="${en ? "Boutique coastal resort timber pavilion and infinity pool overlooking turquoise bay" : "Biệt thự nghỉ dưỡng ven vịnh biển xanh ngọc"}" loading="eager">
    <div class="resort-hero-scrim"></div>
    <div class="resort-hero-copy">
      <span class="eyebrow" style="color:#A6F0EA">${en ? "PRIVATE PENINSULA SANCTUARY · 24 OCEAN VILLAS" : "KHU NGHỈ DƯỠNG BÁN ĐẢO · 24 BIỆT THỰ BIỂN"}</span>
      <h1 style="font-family:var(--font-display);font-size:clamp(32px,4.2vw,50px);font-weight:400;line-height:1.1;margin:12px 0 14px">${en ? "Where turquoise cliffs meet quiet island mornings." : "Nơi vách đá xanh ngọc chạm vào bình minh đại dương."}</h1>
      <p style="color:rgba(242,247,249,.92);max-width:560px;margin:0;font-size:15px">${brief}</p>
    </div>
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
          (v) => `
      <article class="card" style="padding:16px">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">${escapeHtml(v.rate)}</span>
          <img class="card-photo" src="${v.img}" style="object-position:${v.pos}" alt="${escapeHtml(v.name)}" loading="lazy">
        </div>
        <h3 style="font-family:var(--font-display);font-size:21px;font-weight:400;margin:0 0 6px">${escapeHtml(v.name)}</h3>
        <p style="margin:0 0 14px;color:var(--muted);font-size:13px">${escapeHtml(v.spec)}</p>
        <span class="btn btn-outline" style="width:100%">${en ? "Reserve Villa" : "Giữ biệt thự này"}</span>
      </article>`
        )
        .join("")}
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
  const heroImg = photoUrl(ctx, "jade-botanical-skincare");
  const products = en
    ? [
        { name: "Jade Dew Barrier Serum", price: "$42", badge: "Bestseller", rating: "★ 4.9 (418)", vol: "30ml", img: heroImg, pos: "center center" },
        { name: "Cica Calm Gel Cleanser", price: "$28", badge: "New", rating: "★ 4.9 (204)", vol: "150ml", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "left center" },
        { name: "White Tea Hydra Essence", price: "$36", badge: "Vegan", rating: "★ 4.8 (312)", vol: "100ml", img: heroImg, pos: "right 40%" },
        { name: "Botanical Night Recovery", price: "$58", badge: "Signature", rating: "★ 5.0 (186)", vol: "50ml", img: photoUrl(ctx, "serene-clinic-medical"), pos: "center 35%" },
      ]
    : [
        { name: "Tinh Chất Ngọc Bích Phục Hồi", price: "980.000đ", badge: "Bán chạy", rating: "★ 4.9 (418)", vol: "30ml", img: heroImg, pos: "center center" },
        { name: "Gel Rửa Mặt Rau Má Dịu Nhẹ", price: "680.000đ", badge: "Mới", rating: "★ 4.9 (204)", vol: "150ml", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "left center" },
        { name: "Nước Cân Bằng Trà Trắng", price: "840.000đ", badge: "Thuần chay", rating: "★ 4.8 (312)", vol: "100ml", img: heroImg, pos: "right 40%" },
        { name: "Kem Tái Tạo Ban Đêm", price: "1.450.000đ", badge: "Độc quyền", rating: "★ 5.0 (186)", vol: "50ml", img: photoUrl(ctx, "serene-clinic-medical"), pos: "center 35%" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.promo-strip{background:#14532D;color:#ECFDF5;text-align:center;font-size:12px;padding:8px 14px;letter-spacing:.04em}
.hero-split{display:grid;grid-template-columns:1.02fr 1.08fr;gap:30px;align-items:center;padding:42px 0 36px}
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
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Frosted emerald glass dropper bottles arranged on wet stone" : "Bộ tinh chất thảo mộc ngọc bích trên phiến đá tự nhiên"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span>99.4% Natural Origin · Cold-Pressed</span>
        <span style="color:#86EFAC;font-weight:700">EWG Verified</span>
      </div>
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
      <article class="card" style="padding:14px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="card-photo-wrap" style="height:152px">
            <span class="card-photo-tag">${escapeHtml(p.badge)}</span>
            <img class="card-photo" src="${p.img}" style="object-position:${p.pos}" alt="${escapeHtml(p.name)}" loading="lazy">
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
  const heroImg = photoUrl(ctx, "silver-prism-creative-studio");
  const cases = [
    { num: "01", title: "Solara Electric Mobility", tags: "BRANDING · WEB · 3D", img: heroImg, pos: "center 38%" },
    { num: "02", title: "Vortex Neural Systems", tags: "PRODUCT UI · IDENTITY", img: photoUrl(ctx, "ocean-obsidian-ai-platform"), pos: "center center" },
    { num: "03", title: "Maison Valen Issue 09", tags: "EDITORIAL · ART DIRECTION", img: photoUrl(ctx, "atelier-maison-luxury"), pos: "center 40%" },
    { num: "04", title: "Aurelia Architectural Film", tags: "CINEMA · DIGITAL MONOGRAPH", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 52%" },
  ];

  const css = `
:root{--btn-ink:#0D1216}
.swiss-hero{display:grid;grid-template-columns:1.02fr 1.08fr;gap:32px;align-items:center;padding:46px 0 36px;border-bottom:1px solid var(--line)}
.swiss-headline{font-size:clamp(34px,4.8vw,58px);line-height:.98;font-weight:800;letter-spacing:-.045em;text-transform:uppercase;margin:14px 0 18px}
.ticker{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:16px 0;border-bottom:1px solid var(--line);font-family:var(--font-mono);font-size:12px;letter-spacing:.2em;color:var(--muted)}
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
  <section class="swiss-hero hero-split">
    <div>
      <span class="eyebrow">${en ? "INDEPENDENT DESIGN & MOTION STUDIO" : "AGENCY THIẾT KẾ THƯƠNG HIỆU & CHUYỂN ĐỘNG"}</span>
      <h1 class="swiss-headline">${en ? "WE SHAPE ICONIC DIGITAL BRANDS." : "KIẾN TẠO THƯƠNG HIỆU SỐ ĐỘC BẢN."}</h1>
      <p style="color:var(--muted);max-width:520px;margin:0 0 22px;font-size:15px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Play 2026 Showreel" : "Xem Showreel 2026"}</span>
        <span class="btn btn-outline">${en ? "Selected Case Studies" : "Hồ sơ dự án"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Creative direction studio desk with color-calibrated cinema monitor" : "Không gian đạo diễn hình ảnh và thiết kế thương hiệu số"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="font-family:var(--font-mono);color:#34E8B4">REEL 2026 · 01:48</span>
        <span>Saigon · Tokyo · Zurich</span>
      </div>
    </div>
  </section>
  <div class="ticker">
    <span>SOLARA</span><span>NORDIC LAB</span><span>VORTEX AI</span><span>MAISON VALEN</span><span>AURELIA</span>
  </div>

  <section class="section">
    <div class="grid-2">
      ${cases
        .map(
          (c) => `
      <article class="card">
        <div class="card-photo-wrap" style="height:196px">
          <span class="card-photo-tag">CASE ${c.num}</span>
          <img class="card-photo" src="${c.img}" style="object-position:${c.pos}" alt="${escapeHtml(c.title)}" loading="lazy">
        </div>
        <span class="pill-cat">${escapeHtml(c.tags)}</span>
        <h3 style="font-size:21px;font-weight:700;margin:10px 0 4px">${escapeHtml(c.title)}</h3>
      </article>`
        )
        .join("")}
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
  const heroImg = photoUrl(ctx, "calm-sea-fine-dining");
  const courses = en
    ? [
        { cat: "I · PRELUDE", name: "Hokkaido Scallop & Yuzu Sea Mist", desc: "Cold-cured coastal scallop, green shiso oil, smoked sea salt.", price: "$34", img: heroImg, pos: "center 55%" },
        { cat: "II · HEARTH MAIN", name: "Binchotan Bluefin Otoro & Truffle Dashi", desc: "Aged 14 days, live ember sear, warm kombu broth.", price: "$78", img: photoUrl(ctx, "atelier-maison-luxury"), pos: "center 65%" },
        { cat: "III · PRIVATE CELLAR", name: "Coastal Sommelier Pairing & Salon", desc: "Curated old-world vintages served in our intimate 8-guest cellar.", price: "$95", img: photoUrl(ctx, "azure-horizon-resort"), pos: "right 45%" },
      ]
    : [
        { cat: "I · KHAI VỊ", name: "Sò Điệp Hokkaido & Sương Yuzu Biển", desc: "Sò điệp ủ lạnh, dầu tía tô xanh, muối biển hun khói.", price: "790.000đ", img: heroImg, pos: "center 55%" },
        { cat: "II · MÓN CHÍNH", name: "Cá Ngừ Otoro Than Hoa & Dashi Truffle", desc: "Ủ chín 14 ngày, áp chảo than binchotan, nước dùng tảo bẹ.", price: "1.850.000đ", img: photoUrl(ctx, "atelier-maison-luxury"), pos: "center 65%" },
        { cat: "III · HẦM VANG RIÊNG", name: "Phòng Tiệc Cellar & Rượu Vang Tuyển Chọn", desc: "Trải nghiệm sommelier riêng tư dành cho bàn tiệc từ 6–8 thực khách.", price: "2.250.000đ", img: photoUrl(ctx, "azure-horizon-resort"), pos: "right 45%" },
      ];

  const css = `
:root{--btn-ink:#0C0F12}
.hero-split{display:grid;grid-template-columns:1fr 1.1fr;gap:34px;align-items:center;padding:46px 0 40px;border-bottom:1px solid var(--line)}
.dine-h1{font-family:var(--font-display);font-size:clamp(32px,4.2vw,52px);font-weight:400;line-height:1.1;margin:14px 0 16px}
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
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "SEASONAL COASTAL OMAKASE · 14 SEATS" : "OMAKASE HẢI SẢN THEO MÙA · 14 GHẾ QUẦY BẾP"}</span>
      <h1 class="dine-h1">${en ? "Nighttide flavours composed over live binchotan embers." : "Nghệ thuật ẩm thực biển đêm trên bếp than hoa thủ công."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 24px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Book Evening Seating" : "Đặt bàn tối nay"}</span>
        <span class="btn btn-outline">${en ? "7-Course Menu · $165" : "Thực đơn 7 món · 3.650k"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Intimate coastal fine dining room overlooking moonlit sea" : "Không gian nhà hàng fine dining ấm cúng bên bờ biển đêm"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="color:var(--accent)">MICHELIN GUIDE SELECTED</span>
        <span>${en ? "Two Seatings: 18:00 & 20:30" : "Hai khung giờ: 18:00 & 20:30"}</span>
      </div>
    </div>
  </section>

  <section class="section">
    <span class="eyebrow">${en ? "CHEF'S AUTUMN TASTING CHAPTERS" : "CHƯƠNG THỰC ĐƠN NẾM THỬ THEO MÙA"}</span>
    <div class="grid-3" style="margin-top:18px">
      ${courses
        .map(
          (c) => `
      <article class="card">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">${escapeHtml(c.price)}</span>
          <img class="card-photo" src="${c.img}" style="object-position:${c.pos}" alt="${escapeHtml(c.name)}" loading="lazy">
        </div>
        <div style="font-size:11px;letter-spacing:.16em;color:var(--accent)">${escapeHtml(c.cat)}</div>
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:400;margin:6px 0 6px">${escapeHtml(c.name)}</h3>
        <p style="margin:0;color:var(--muted);font-size:13.5px">${escapeHtml(c.desc)}</p>
      </article>`
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
  const heroImg = photoUrl(ctx, "serene-clinic-medical");
  const specialties = en
    ? [
        { t: "Advanced Dermatology", d: "Non-invasive laser resurfacing, pigment mapping & barrier restoration.", img: heroImg, pos: "center 40%" },
        { t: "Cellular Aesthetics", d: "Evidence-based skin longevity therapy under board-certified care.", img: photoUrl(ctx, "jade-botanical-skincare"), pos: "center 50%" },
        { t: "Preventive Recovery", d: "Comprehensive annual biomarkers and serene post-care suites.", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "center 45%" },
      ]
    : [
        { t: "Da liễu công nghệ cao", d: "Điều trị sắc tố, phục hồi hàng rào da và chăm sóc chuẩn y khoa.", img: heroImg, pos: "center 40%" },
        { t: "Thẩm mỹ nội khoa", d: "Ứng dụng liệu pháp sinh học an toàn dưới sự theo dõi trực tiếp của bác sĩ.", img: photoUrl(ctx, "jade-botanical-skincare"), pos: "center 50%" },
        { t: "Tầm soát & Phục hồi", d: "Kiểm tra chỉ số chuyên sâu và nghỉ dưỡng phục hồi trong phòng riêng.", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "center 45%" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.top-clinical{background:#0D7A6F;color:#F7FBFA;font-size:12px;padding:8px 0}
.top-clinical-inner{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
.hero-split{display:grid;grid-template-columns:1.05fr 1.05fr;gap:30px;align-items:center;padding:42px 0 34px}
.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;background:var(--bg-alt);border-radius:16px;padding:22px;text-align:center}
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
        <span class="btn btn-primary">${en ? "Book Appointment · Today 14:30" : "Đặt lịch khám · 14:30 hôm nay"}</span>
        <span class="btn btn-outline">${en ? "Meet Medical Board" : "Hội đồng bác sĩ"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Serene architectural dermatology and aesthetic clinic reception" : "Không gian tiếp đón phòng khám da liễu chuẩn quốc tế"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span>✓ ${en ? "1-on-1 Board-Certified Physicians" : "Thăm khám 1:1 cùng Bác sĩ Chuyên khoa"}</span>
        <span style="color:#5EEAD4;font-weight:700">JCI Standard</span>
      </div>
    </div>
  </section>

  <section class="stat-row">
    <div><strong style="font-size:26px;color:var(--accent)">28.000+</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Patients Cared For" : "Khách hàng tin chọn"}</div></div>
    <div><strong style="font-size:26px;color:var(--accent)">98.6%</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Patient Satisfaction" : "Tỷ lệ hài lòng"}</div></div>
    <div><strong style="font-size:26px;color:var(--accent)">100%</strong><div style="font-size:12.5px;color:var(--muted)">${en ? "Licensed Specialists" : "Bác sĩ chuyên khoa"}</div></div>
  </section>

  <section class="section">
    <span class="eyebrow">${en ? "CLINICAL SPECIALTIES" : "CHUYÊN KHOA MŨI NHỌN"}</span>
    <div class="grid-3" style="margin-top:16px">
      ${specialties
        .map(
          (s, idx) => `
      <article class="card">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">0${idx + 1}</span>
          <img class="card-photo" src="${s.img}" style="object-position:${s.pos}" alt="${escapeHtml(s.t)}" loading="lazy">
        </div>
        <h3 style="font-size:17px;margin:0 0 8px;color:#0E2F33">${escapeHtml(s.t)}</h3>
        <p style="margin:0;font-size:13.5px;color:var(--muted)">${escapeHtml(s.d)}</p>
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
  const heroImg = photoUrl(ctx, "monolith-advisory-legal");
  const practices = en
    ? [
        { k: "01 · M&A", t: "Cross-Border M&A", d: "Strategic acquisitions, valuation governance, and post-merger integration.", img: heroImg, pos: "center 40%" },
        { k: "02 · CAPITAL", t: "Private Capital & Real Assets", d: "Institutional structuring for landmark real estate and sovereign funds.", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 50%" },
        { k: "03 · DIGITAL LAW", t: "AI & Cleanroom IP Counsel", d: "Global software licensing, data governance, and regulatory compliance.", img: photoUrl(ctx, "ocean-obsidian-ai-platform"), pos: "center 35%" },
      ]
    : [
        { k: "01 · M&A", t: "M&A Xuyên Biên Giới", d: "Tư vấn mua bán sáp nhập chiến lược, thẩm định chuyên sâu và tái cấu trúc.", img: heroImg, pos: "center 40%" },
        { k: "02 · NGUỒN VỐN", t: "Cấu Trúc Vốn & Bất Động Sản", d: "Thu xếp vốn định chế cho các dự án hạ tầng và bất động sản quy mô lớn.", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 50%" },
        { k: "03 · SỞ HỮU TRÍ TUỆ", t: "Pháp Lý Công Nghệ & Dữ Liệu", d: "Bảo hộ tài sản trí tuệ, cấp phép phần mềm và quản trị tuân thủ quốc tế.", img: photoUrl(ctx, "ocean-obsidian-ai-platform"), pos: "center 35%" },
      ];

  const css = `
:root{--btn-ink:#0A121E}
.hero-split{display:grid;grid-template-columns:1.05fr 1.05fr;gap:34px;align-items:center;padding:46px 0 36px}
.kpi-band{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:26px 0}
.kpi-num{font-family:var(--font-display);font-size:32px;color:#93C5FD}
.brief-box{background:var(--bg-alt);border:1px solid var(--line);border-radius:var(--radius);padding:30px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
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
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "INSTITUTIONAL ADVISORY & CORPORATE LAW" : "TƯ VẤN CHIẾN LƯỢC TÀI CHÍNH & PHÁP LÝ"}</span>
      <h1 style="font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:400;line-height:1.1;margin:14px 0 16px">${en ? "Disciplined counsel for complex transactions and enduring capital." : "Tư vấn chuẩn mực cho các thương vụ trọng yếu và cấu trúc vốn bền vững."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 26px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Request Partner Briefing" : "Đặt lịch trao đổi đối tác"}</span>
        <span class="btn btn-outline">${en ? "2026 Regulatory Outlook" : "Báo cáo pháp lý 2026"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Executive advisory boardroom overlooking twilight city skyline" : "Phòng họp hội đồng tư vấn chiến lược nhìn ra toàn cảnh thành phố"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="color:#93C5FD;font-weight:700">$2.4B+ ADVISED VOLUME</span>
        <span>Singapore · HCMC · Tokyo</span>
      </div>
    </div>
  </section>

  <div class="kpi-band">
    <div><div class="kpi-num">$2.4B</div><div style="font-size:12.5px;color:var(--muted)">${en ? "Advised Transaction Value" : "Tổng giá trị giao dịch tư vấn"}</div></div>
    <div><div class="kpi-num">18</div><div style="font-size:12.5px;color:var(--muted)">${en ? "Years Institutional Practice" : "Năm kinh nghiệm tư vấn"}</div></div>
    <div><div class="kpi-num">4</div><div style="font-size:12.5px;color:var(--muted)">${en ? "Regional Offices" : "Văn phòng khu vực"}</div></div>
  </div>

  <section class="section">
    <span class="eyebrow">${en ? "CORE PRACTICE AREAS" : "LĨNH VỰC CHUYÊN MÔN CHÍNH"}</span>
    <div class="grid-3" style="margin-top:16px">
      ${practices
        .map(
          (p) => `
      <article class="card">
        <div class="card-photo-wrap">
          <span class="card-photo-tag">${escapeHtml(p.k)}</span>
          <img class="card-photo" src="${p.img}" style="object-position:${p.pos}" alt="${escapeHtml(p.t)}" loading="lazy">
        </div>
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:400;margin:4px 0 8px">${escapeHtml(p.t)}</h3>
        <p style="margin:0;color:var(--muted);font-size:13.5px">${escapeHtml(p.d)}</p>
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
  const heroImg = photoUrl(ctx, "kinetic-academy-edtech");
  const courses = en
    ? [
        { title: "Applied AI Systems", meta: "12 Weeks · 48 Studio Labs", rating: "★ 4.9", tag: "Cohort 14", img: photoUrl(ctx, "ocean-obsidian-ai-platform"), pos: "center 40%" },
        { title: "Design Systems & UI Craft", meta: "10 Weeks · 40 Studio Labs", rating: "★ 4.9", tag: "Portfolio", img: photoUrl(ctx, "silver-prism-creative-studio"), pos: "center 45%" },
        { title: "Executive Product Leadership", meta: "8 Weeks · Live Mentorship", rating: "★ 5.0", tag: "Fellowship", img: heroImg, pos: "center 35%" },
      ]
    : [
        { title: "Kỹ Thuật Hệ Thống AI Thực Chiến", meta: "12 Tuần · 48 Bài Lab", rating: "★ 4.9", tag: "Khóa K14", img: photoUrl(ctx, "ocean-obsidian-ai-platform"), pos: "center 40%" },
        { title: "Design Systems & Sản Phẩm Số", meta: "10 Tuần · 40 Bài Lab", rating: "★ 4.9", tag: "Hồ sơ thực tế", img: photoUrl(ctx, "silver-prism-creative-studio"), pos: "center 45%" },
        { title: "Quản Trị Sản Phẩm Cấp Cao", meta: "8 Tuần · Cố vấn 1:1", rating: "★ 5.0", tag: "Fellowship", img: heroImg, pos: "center 35%" },
      ];

  const css = `
:root{--btn-ink:#FFFFFF}
.search-pill{display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:#FFFFFF;border:1px solid var(--line);font-size:13px;color:var(--muted);min-width:220px}
.hero-split{display:grid;grid-template-columns:1.04fr 1.06fr;gap:32px;align-items:center;padding:42px 0 34px}
.outcome-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}
.outcome-card{background:var(--bg-alt);border-radius:14px;padding:18px;text-align:center}
`;

  const body = `
<header class="wrap nav">
  <div class="nav-brand">${b}</div>
  <div class="search-pill">⌕ ${en ? "Search AI, Design Systems, TypeScript..." : "Tìm khóa AI, Design Systems, TypeScript..."}</div>
  <span class="btn btn-primary">${en ? "Apply Cohort" : "Đăng ký tư vấn"}</span>
</header>
<main class="wrap">
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "NEXT COHORT OPENS JUNE 02 · LIVE MENTORSHIP" : "KHAI GIẢNG KHÓA MỚI 02/06 · CỐ VẤN TRỰC TIẾP 1:1"}</span>
      <h1 style="font-size:clamp(30px,4vw,46px);line-height:1.1;font-weight:750;letter-spacing:-.03em;margin:12px 0 14px">${en ? "Master applied AI and product engineering through real builds." : "Làm chủ kỹ thuật AI và sản phẩm số qua dự án thực chiến."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 24px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Explore Tracks" : "Xem lộ trình học"}</span>
        <span class="btn btn-outline">${en ? "Download Syllabus" : "Tải giáo trình chi tiết"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Architectural sunlit design and AI academy collaboration studio" : "Không gian học viện thiết kế sản phẩm số và nghiên cứu AI"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span style="color:#5EEAD4;font-weight:700">94% PLACEMENT RATE</span>
        <span>${en ? "42 Principal Industry Mentors" : "42 Giảng viên Chuyên gia"}</span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:14px">
    <span class="eyebrow">${en ? "STRUCTURED CURRICULUM TRACKS" : "CHƯƠNG TRÌNH ĐÀO TẠO CHUYÊN SÂU"}</span>
    <h2 style="font-size:28px;font-weight:720;margin:8px 0 20px">${en ? "Career-Accelerating Studio Programs" : "Lộ trình kỹ sư & thiết kế sản phẩm thực chiến"}</h2>
    <div class="grid-3">
      ${courses
        .map(
          (c) => `
      <article class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
        <div>
          <div class="card-photo-wrap">
            <span class="card-photo-tag">${escapeHtml(c.tag)} · ${escapeHtml(c.rating)}</span>
            <img class="card-photo" src="${c.img}" style="object-position:${c.pos}" alt="${escapeHtml(c.title)}" loading="lazy">
          </div>
          <h3 style="margin:0 0 6px;font-size:18px">${escapeHtml(c.title)}</h3>
          <p style="margin:0;font-size:13.5px;color:var(--muted)">${escapeHtml(c.meta)}</p>
        </div>
        <span class="btn btn-primary" style="width:100%;padding:9px 12px">${en ? "Enroll in Track" : "Đăng ký lộ trình"}</span>
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
  const heroImg = photoUrl(ctx, "veranda-interior-atelier");
  const swatches = en
    ? [
        { name: "Honed Basalt", code: "MAT-01", color: "#2A343B" },
        { name: "Smoked Grey Oak", code: "MAT-02", color: "#8C8275" },
        { name: "Raw Travertine", code: "MAT-03", color: "#CFC6B4" },
        { name: "Brushed Bronze", code: "MAT-04", color: "#6D5D4B" },
      ]
    : [
        { name: "Đá Bazan Mài", code: "MAT-01", color: "#2A343B" },
        { name: "Gỗ Sồi Xám", code: "MAT-02", color: "#8C8275" },
        { name: "Đá Travertine Thô", code: "MAT-03", color: "#CFC6B4" },
        { name: "Đồng Phay Mờ", code: "MAT-04", color: "#6D5D4B" },
      ];
  const rooms = en
    ? [
        { name: "Courtyard Living Pavilion", spec: "Limewash plaster · Bouclé sofa · Raw travertine slab", img: heroImg, pos: "center 58%" },
        { name: "Oceanfront Glass Veranda", spec: "Floor-to-ceiling glazing · Sunset horizon deck", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 48%" },
        { name: "Private Sanctuary Bath", spec: "Carved monolith stone basin · Botanical garden light", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "center 52%" },
      ]
    : [
        { name: "Phòng Khách Giếng Trời", spec: "Tường vữa khoáng · Sofa bouclé · Bàn đá nguyên khối", img: heroImg, pos: "center 58%" },
        { name: "Hiên Kính Hướng Biển", spec: "Hệ kính kịch trần · Đón ánh hoàng hôn tự nhiên", img: photoUrl(ctx, "coastal-glass-architecture"), pos: "center 48%" },
        { name: "Phòng Tắm Tĩnh Tại", spec: "Bồn đá tự nhiên nguyên khối · Vườn nhiệt đới", img: photoUrl(ctx, "botanical-wellness-sanctuary"), pos: "center 52%" },
      ];

  const css = `
:root{--btn-ink:#F6F5F1}
.hero-split{display:grid;grid-template-columns:1fr 1.1fr;gap:34px;align-items:center;padding:44px 0 34px}
.swatch-chip{height:60px;border-radius:6px;margin-bottom:10px;border:1px solid rgba(0,0,0,.08)}
.showroom-bar{background:#1E262B;color:#F6F5F1;padding:32px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
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
  <section class="hero-split">
    <div>
      <span class="eyebrow">${en ? "BESPOKE RESIDENTIAL INTERIORS" : "THIẾT KẾ NỘI THẤT & KHÔNG GIAN SỐNG"}</span>
      <h1 style="font-family:var(--font-display);font-size:clamp(32px,4.1vw,50px);font-weight:400;line-height:1.1;margin:12px 0 14px">${en ? "Tactile calm composed with stone, smoked oak, and quiet light." : "Sự hài hòa của chất liệu đá, gỗ sồi xám và ánh sáng tự nhiên."}</h1>
      <p style="color:var(--muted);font-size:15px;margin:0 0 24px">${brief}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span class="btn btn-primary">${en ? "Book Showroom Consultation" : "Đặt lịch tư vấn showroom"}</span>
        <span class="btn btn-outline">${en ? "Explore Material Library" : "Thư viện vật liệu"}</span>
      </div>
    </div>
    <div class="hero-photo-frame">
      <img class="hero-photo" src="${heroImg}" alt="${en ? "Warm minimalist living room opening onto mossy Japanese courtyard" : "Không gian nội thất tối giản ấm áp mở ra vườn thiền xanh mát"}" loading="eager">
      <div class="hero-photo-scrim"></div>
      <div class="hero-float-badge">
        <span>RESIDENCE N° 14 · THAO DIEN</span>
        <span>${en ? "Turnkey Architecture & Bespoke Millwork" : "Thiết kế & Thi công Trọn gói"}</span>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:12px">
    <span class="eyebrow">${en ? "ROOM TRANSFORMATIONS" : "CÂU CHUYỆN TỪNG KHÔNG GIAN"}</span>
    <div class="grid-3" style="margin-top:16px">
      ${rooms
        .map(
          (rm, idx) => `
      <article class="card" style="padding:16px">
        <div class="card-photo-wrap" style="height:186px">
          <span class="card-photo-tag">SPACE 0${idx + 1}</span>
          <img class="card-photo" src="${rm.img}" style="object-position:${rm.pos}" alt="${escapeHtml(rm.name)}" loading="lazy">
        </div>
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:400;margin:0 0 6px">${escapeHtml(rm.name)}</h3>
        <p style="margin:0;color:var(--muted);font-size:13.5px">${escapeHtml(rm.spec)}</p>
      </article>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" style="padding-top:4px">
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
  const assetBase = resolveAssetBase(opts.basePath);
  const tokens = getDesignTokens(template.id);
  const ctx: TemplateRenderContext = {
    lang,
    brand,
    brief,
    isEn: lang === "en",
    assetBase,
    template,
    tokens,
  };
  const renderFn = RENDERERS[template.id] ?? renderCoastalArchitecture;
  return renderFn(ctx);
}

export function buildTemplateSourcePayload(
  template: TemplateItem,
  lang: TemplateRenderLang = "vi",
  opts: { readonly brand?: string; readonly brief?: string; readonly basePath?: string } = {}
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
      basePath: opts.basePath,
    }),
    design_tokens: getDesignTokens(template.id),
  };
}
