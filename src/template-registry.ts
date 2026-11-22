export const TEMPLATE_REGISTRY_SCHEMA_VERSION = "1.0.0" as const;
export const TEMPLATE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
export const TEMPLATE_LICENSE = "GLOW_CLEANROOM_MIT_INSPIRED" as const;

export type TemplateCategory = "landing" | "showcase" | "commerce" | "platform";
export type TemplateMood = "botanical" | "coastal" | "editorial";
export type TemplateStatus = "published" | "draft";

export interface TemplateBlockSpec {
  readonly id: string;
  readonly type: string;
  readonly label_vi: string;
  readonly label_en: string;
}

export interface TemplateLocaleCopy {
  readonly title: string;
  readonly industry_label: string;
  readonly tagline: string;
  readonly description: string;
  readonly sample_brand: string;
  readonly sample_brief: string;
  readonly highlights: readonly string[];
}

export interface TemplateItem {
  readonly id: string;
  readonly schema_version: typeof TEMPLATE_REGISTRY_SCHEMA_VERSION;
  readonly status: TemplateStatus;
  readonly featured: boolean;
  readonly industry_key: string;
  readonly category: TemplateCategory;
  readonly mood: TemplateMood;
  readonly preview_image: string;
  readonly preview_video: string;
  readonly license: typeof TEMPLATE_LICENSE;
  readonly source_inspiration: string;
  readonly mcp_compatible: true;
  readonly blocks: readonly TemplateBlockSpec[];
  readonly vi: TemplateLocaleCopy;
  readonly en: TemplateLocaleCopy;
}

export interface TemplateIndustrySummary {
  readonly key: string;
  readonly label_vi: string;
  readonly label_en: string;
  readonly count: number;
  readonly featured_template_id: string;
}

export interface TemplateRegistryResponse {
  readonly ok: true;
  readonly schema_version: typeof TEMPLATE_REGISTRY_SCHEMA_VERSION;
  readonly total: number;
  readonly industries: readonly TemplateIndustrySummary[];
  readonly templates: readonly TemplateItem[];
  readonly mcp_resource: string;
}

export interface TemplateQueryOptions {
  readonly industry?: string;
  readonly category?: string;
  readonly mood?: string;
  readonly q?: string;
  readonly featuredOnly?: boolean;
  readonly includeDrafts?: boolean;
  readonly mcpResource?: string;
}

export type TemplateLookupResult =
  | {
      readonly ok: true;
      readonly schema_version: typeof TEMPLATE_REGISTRY_SCHEMA_VERSION;
      readonly template: TemplateItem;
    }
  | {
      readonly ok: false;
      readonly status: 400 | 404;
      readonly code: "INVALID_TEMPLATE_ID" | "TEMPLATE_NOT_FOUND";
    };

const REGISTRY_TEMPLATES: readonly TemplateItem[] = [
  {
    id: "coastal-glass-architecture",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: true,
    industry_key: "architecture",
    category: "showcase",
    mood: "coastal",
    preview_image: "/assets/reel-02-coastal-villa.webp",
    preview_video: "/assets/reel-02-coastal-villa.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "AstroWind + Webstudio Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "hero-panorama", type: "hero_cinema", label_vi: "Khung cảnh kiến trúc toàn màn hình", label_en: "Full-bleed architectural hero" },
      { id: "project-index", type: "portfolio_grid", label_vi: "Danh mục công trình tuyển chọn", label_en: "Curated project index" },
      { id: "spatial-philosophy", type: "editorial_split", label_vi: "Triết lý không gian & vật liệu", label_en: "Spatial & material philosophy" },
      { id: "blueprint-metrics", type: "spec_band", label_vi: "Thông số kỹ thuật & giải thưởng", label_en: "Technical specs & recognition" },
      { id: "private-viewing", type: "consultation_cta", label_vi: "Đặt lịch tham quan riêng tư", label_en: "Private viewing invitation" }
    ],
    vi: {
      title: "Kiến Trúc Kính Ven Biển",
      industry_label: "Kiến trúc & BĐS",
      tagline: "Trình diễn biệt thự nghỉ dưỡng và hồ sơ công trình tầm vóc.",
      description: "Bố cục tỷ lệ rộng giàu khoảng thở, tôn vinh mặt kính, ánh sáng tự nhiên và đường nét kiến trúc đương đại.",
      sample_brand: "Aurelia Coastal Studio",
      sample_brief: "Xây dựng website giới thiệu 12 dự án biệt thự ven biển cao cấp cùng lịch hẹn tư vấn riêng cho chủ đầu tư.",
      highlights: ["Trình diễn khung hình 16:9", "Hồ sơ công trình phân tầng", "Biểu mẫu đặt lịch riêng tư"]
    },
    en: {
      title: "Coastal Glass Architecture",
      industry_label: "Architecture & Real Estate",
      tagline: "Showcase coastal villas and landmark architectural monographs.",
      description: "Generous widescreen framing crafted to highlight glass facades, horizon light, and contemporary spatial rhythm.",
      sample_brand: "Aurelia Coastal Studio",
      sample_brief: "Build a monograph site showcasing 12 coastal villa commissions with a private client viewing scheduler.",
      highlights: ["16:9 widescreen framing", "Structured project dossiers", "Private consultation funnel"]
    }
  },
  {
    id: "botanical-wellness-sanctuary",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: true,
    industry_key: "wellness",
    category: "landing",
    mood: "botanical",
    preview_image: "/assets/reel-01-botanical.webp",
    preview_video: "/assets/reel-01-botanical.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Canva Editorial + HyperUI Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "sanctuary-hero", type: "hero_cinema", label_vi: "Mở màn tĩnh tại với hơi sương ngọc bích", label_en: "Serene botanical mist hero" },
      { id: "ritual-menu", type: "service_list", label_vi: "Thực đơn liệu trình & nghi thức", label_en: "Signature rituals menu" },
      { id: "ingredient-story", type: "editorial_split", label_vi: "Câu chuyện thảo mộc & tinh dầu", label_en: "Botanical ingredients story" },
      { id: "therapist-craft", type: "team_showcase", label_vi: "Đội ngũ nghệ nhân trị liệu", label_en: "Master therapists showcase" },
      { id: "retreat-booking", type: "booking_cta", label_vi: "Đặt lịch trải nghiệm không gian", label_en: "Sanctuary reservation block" }
    ],
    vi: {
      title: "Không Gian Tĩnh Tại Thảo Mộc",
      industry_label: "Spa & Wellness",
      tagline: "Dẫn dắt cảm giác thư thái sâu lắng cho spa cao cấp và khu trị liệu.",
      description: "Nhịp cuộn chậm rãi kết hợp bảng màu ngọc bích dịu mắt giúp khách hàng cảm nhận sự an yên ngay từ giây đầu tiên.",
      sample_brand: "Sora Botanical Sanctuary",
      sample_brief: "Thiết kế website cho trung tâm trị liệu thảo mộc với danh mục liệu trình rõ ràng và nút đặt lịch nhanh.",
      highlights: ["Bảng liệu trình tinh gọn", "Nhịp cuộn thư thái", "Đặt lịch trải nghiệm 1 chạm"]
    },
    en: {
      title: "Botanical Wellness Sanctuary",
      industry_label: "Spa & Wellness",
      tagline: "Calm sensory storytelling for luxury spas and holistic retreats.",
      description: "Unhurried scroll pacing and dewy jade surfaces evoke restoration from the very first viewport.",
      sample_brand: "Sora Botanical Sanctuary",
      sample_brief: "Create a wellness sanctuary website presenting signature botanical therapies with effortless appointment booking.",
      highlights: ["Curated ritual menu", "Restorative motion pacing", "One-step sanctuary booking"]
    }
  },
  {
    id: "ocean-obsidian-ai-platform",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: true,
    industry_key: "saas-ai",
    category: "platform",
    mood: "editorial",
    preview_image: "/assets/hero-ocean-jade.webp",
    preview_video: "/assets/hero-ocean-jade.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "shadcn Registry + Puck Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "platform-hero", type: "hero_platform", label_vi: "Tuyên ngôn nền tảng AI & bản demo", label_en: "AI platform statement & demo" },
      { id: "bento-capabilities", type: "bento_grid", label_vi: "Lưới Bento tính năng cốt lõi", label_en: "Core capabilities Bento grid" },
      { id: "api-bridge", type: "integration_strip", label_vi: "Hệ sinh thái tích hợp & Plugin", label_en: "Plugin & API ecosystem strip" },
      { id: "security-trust", type: "trust_matrix", label_vi: "Kiến trúc bảo mật & kiểm soát dữ liệu", label_en: "Security & governance matrix" },
      { id: "plan-comparison", type: "pricing_grid", label_vi: "Gói triển khai linh hoạt", label_en: "Flexible deployment plans" },
      { id: "launch-cta", type: "conversion_banner", label_vi: "Khởi tạo không gian làm việc", label_en: "Workspace activation CTA" }
    ],
    vi: {
      title: "Nền Tảng SaaS & AI Đại Hải",
      industry_label: "SaaS & AI",
      tagline: "Giao diện sản phẩm công nghệ sắc nét cho nền tảng AI thế hệ mới.",
      description: "Kết hợp lưới Bento cấu trúc rõ ràng, khối trình diễn kết nối Plugin và điểm nhấn ánh sáng bạch kim chuyên nghiệp.",
      sample_brand: "Meridian AI Cloud",
      sample_brief: "Ra mắt trang chủ nền tảng điều phối AI cho doanh nghiệp với phần giới thiệu tính năng, bảo mật và bảng gói dịch vụ.",
      highlights: ["Kiến trúc Bento 6 khối", "Trình diễn kết nối Plugin", "Bảng gói minh bạch"]
    },
    en: {
      title: "Ocean Obsidian AI Platform",
      industry_label: "SaaS & AI",
      tagline: "Sharp dark-slate product storytelling for next-generation AI platforms.",
      description: "Combines modular Bento grids, integration highlights, and luminous platinum typography built for technical buyers.",
      sample_brand: "Meridian AI Cloud",
      sample_brief: "Launch an enterprise AI orchestration website featuring modular capabilities, trust architecture, and transparent plans.",
      highlights: ["6-block Bento layout", "Plugin bridge showcase", "Clear plan matrix"]
    }
  },
  {
    id: "atelier-maison-luxury",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: true,
    industry_key: "luxury-brand",
    category: "showcase",
    mood: "editorial",
    preview_image: "/assets/reel-03-liquid-prism.webp",
    preview_video: "/assets/reel-03-liquid-prism.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Webstudio Editorial + AstroWind Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "maison-overture", type: "hero_editorial", label_vi: "Khúc dạo đầu thương hiệu độc bản", label_en: "Signature maison overture" },
      { id: "capsule-collections", type: "collection_reel", label_vi: "Bộ sưu tập giới hạn theo mùa", label_en: "Limited seasonal collections" },
      { id: "craft-manifesto", type: "manifesto_band", label_vi: "Tuyên ngôn thủ công & di sản", label_en: "Craftsmanship & heritage manifesto" },
      { id: "press-mentions", type: "press_strip", label_vi: "Ấn phẩm & triển lãm quốc tế", label_en: "Press & global exhibitions" },
      { id: "atelier-contact", type: "concierge_cta", label_vi: "Kết nối cố vấn riêng", label_en: "Private concierge inquiry" }
    ],
    vi: {
      title: "Atelier Maison Độc Bản",
      industry_label: "Thương hiệu Cá nhân",
      tagline: "Ngôn ngữ tạp chí điện ảnh cho nhà thiết kế, nghệ sĩ và thương hiệu xa xỉ.",
      description: "Ưu tiên độ tương phản tinh tế giữa kiểu chữ serif và khoảng tối sâu để mỗi bộ sưu tập trở thành tâm điểm.",
      sample_brand: "Maison Valen Atelier",
      sample_brief: "Tạo trang thương hiệu cá nhân cho nhà thiết kế chế tác thủ công với bộ sưu tập giới hạn và kênh đặt lịch riêng.",
      highlights: ["Kiểu chữ tạp chí cao cấp", "Trình diễn bộ sưu tập", "Kênh liên hệ cố vấn riêng"]
    },
    en: {
      title: "Atelier Maison Luxury",
      industry_label: "Luxury Brand",
      tagline: "Editorial magazine presence for founders, houses, and bespoke labels.",
      description: "Pairs refined serif accents with deep obsidian framing so every collection piece commands quiet authority.",
      sample_brand: "Maison Valen Atelier",
      sample_brief: "Craft a personal luxury house website highlighting capsule collections, heritage craft, and private concierge bookings.",
      highlights: ["Editorial serif hierarchy", "Capsule gallery flow", "Private concierge intake"]
    }
  },
  {
    id: "azure-horizon-resort",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: false,
    industry_key: "hospitality",
    category: "showcase",
    mood: "coastal",
    preview_image: "/assets/reel-02-coastal-villa.webp",
    preview_video: "/assets/reel-02-coastal-villa.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Canva Hospitality + AstroWind Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "horizon-arrival", type: "hero_cinema", label_vi: "Khung hình đón khách ven vịnh", label_en: "Bayfront arrival cinema hero" },
      { id: "villa-suites", type: "suite_cards", label_vi: "Hạng phòng & biệt thự hướng biển", label_en: "Oceanfront villas & suites" },
      { id: "curated-experiences", type: "experience_grid", label_vi: "Hành trình ẩm thực & du thuyền", label_en: "Dining & yacht excursions" },
      { id: "location-access", type: "destination_map", label_vi: "Vị trí bán đảo & di chuyển", label_en: "Peninsula access & arrival" },
      { id: "stay-inquiry", type: "booking_cta", label_vi: "Yêu cầu giữ phòng trực tiếp", label_en: "Direct stay reservation" }
    ],
    vi: {
      title: "Khu Nghỉ Dưỡng Chân Trời Xanh",
      industry_label: "Nghỉ dưỡng & Du lịch",
      tagline: "Tái hiện bầu không khí đại dương cho boutique resort và khu nghỉ dưỡng.",
      description: "Cấu trúc kể chuyện theo từng chặng lưu trú từ đón tiếp, hạng biệt thự đến trải nghiệm ẩm thực hoàng hôn.",
      sample_brand: "Lumina Bay Resort",
      sample_brief: "Thiết kế trang giới thiệu khu nghỉ dưỡng 24 biệt thự biển kèm danh mục trải nghiệm và yêu cầu đặt phòng trực tiếp.",
      highlights: ["Trình diễn hạng phòng rõ nét", "Lịch trình trải nghiệm bản địa", "Tối ưu đặt phòng trực tiếp"]
    },
    en: {
      title: "Azure Horizon Resort",
      industry_label: "Boutique Resort",
      tagline: "Capture coastal serenity for boutique resorts and island sanctuaries.",
      description: "Guides guests effortlessly from bayfront arrival through suite architecture, coastal dining, and direct reservations.",
      sample_brand: "Lumina Bay Resort",
      sample_brief: "Design a 24-villa coastal resort site showcasing suite categories, curated excursions, and direct stay inquiries.",
      highlights: ["Suite showcase cards", "Curated excursion highlights", "Direct reservation flow"]
    }
  },
  {
    id: "jade-botanical-skincare",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: true,
    industry_key: "ecommerce",
    category: "commerce",
    mood: "botanical",
    preview_image: "/assets/reel-01-botanical.webp",
    preview_video: "/assets/reel-01-botanical.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "HyperUI Commerce + shadcn Registry Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "flagship-drop", type: "hero_commerce", label_vi: "Trình diễn dòng sản phẩm chủ lực", label_en: "Flagship collection spotlight" },
      { id: "product-shelf", type: "catalog_grid", label_vi: "Kệ sản phẩm tuyển chọn & bộ lọc", label_en: "Curated product shelf & filters" },
      { id: "formula-purity", type: "ingredient_cards", label_vi: "Bảng thành phần & kiểm nghiệm", label_en: "Formula transparency cards" },
      { id: "routine-guide", type: "step_strip", label_vi: "Chu trình chăm sóc 3 bước", label_en: "3-step daily ritual guide" },
      { id: "verified-reviews", type: "testimonial_row", label_vi: "Cảm nhận khách hàng thực tế", label_en: "Verified customer stories" }
    ],
    vi: {
      title: "Mỹ Phẩm Thảo Mộc Ngọc Bích",
      industry_label: "Thương mại điện tử",
      tagline: "Cửa hàng trực tuyến tinh khiết cho thương hiệu skincare và chăm sóc cá nhân.",
      description: "Nhấn mạnh tính minh bạch thành phần, hướng dẫn chu trình sử dụng và trải nghiệm xem sản phẩm mượt mà trên di động.",
      sample_brand: "Neru Botanical Labs",
      sample_brief: "Xây dựng cửa hàng trực tuyến giới thiệu 8 dòng tinh chất thảo mộc kèm bảng thành phần minh bạch và chu trình sử dụng.",
      highlights: ["Kệ sản phẩm trực quan", "Minh bạch thành phần", "Tối ưu chuyển đổi di động"]
    },
    en: {
      title: "Jade Botanical Skincare",
      industry_label: "Boutique E-Commerce",
      tagline: "Pure editorial storefront for botanical skincare and apothecary labels.",
      description: "Spotlights ingredient clarity, ritual routines, and tactile product presentation engineered for mobile shoppers.",
      sample_brand: "Neru Botanical Labs",
      sample_brief: "Build a boutique skincare storefront presenting 8 botanical serums with transparent formulas and routine guidance.",
      highlights: ["Editorial product shelf", "Formula transparency", "Mobile-first conversion flow"]
    }
  },
  {
    id: "silver-prism-creative-studio",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: false,
    industry_key: "creative-agency",
    category: "showcase",
    mood: "editorial",
    preview_image: "/assets/hero-ocean-jade.webp",
    preview_video: "/assets/hero-ocean-jade.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Puck + Webstudio Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "studio-reel", type: "hero_showreel", label_vi: "Khung phim showreel & tuyên ngôn", label_en: "Showreel hero & studio statement" },
      { id: "selected-cases", type: "case_study_grid", label_vi: "Hồ sơ dự án khách hàng tiêu biểu", label_en: "Selected client case studies" },
      { id: "discipline-matrix", type: "service_columns", label_vi: "Năng lực thương hiệu & kỹ thuật số", label_en: "Brand & digital disciplines" },
      { id: "process-cadence", type: "step_strip", label_vi: "Quy trình đồng hành 4 giai đoạn", label_en: "4-stage collaborative cadence" },
      { id: "new-business", type: "brief_cta", label_vi: "Gửi đề bài dự án mới", label_en: "New project brief intake" }
    ],
    vi: {
      title: "Studio Sáng Tạo Lăng Kính Bạc",
      industry_label: "Agency & Sáng tạo",
      tagline: "Hồ sơ năng lực đậm chất điện ảnh cho creative studio và agency thiết kế.",
      description: "Kết cấu trình bày case study rõ ràng giúp khách hàng doanh nghiệp đánh giá ngay tư duy thẩm mỹ và quy trình làm việc.",
      sample_brand: "Kova Prism Agency",
      sample_brief: "Tạo website giới thiệu năng lực thiết kế thương hiệu, dựng phim và sản phẩm số cùng biểu mẫu nhận brief dự án.",
      highlights: ["Showreel mở màn ấn tượng", "Case study giàu ngữ cảnh", "Biểu mẫu nhận brief chuẩn"]
    },
    en: {
      title: "Silver Prism Creative Studio",
      industry_label: "Creative Studio",
      tagline: "Cinematic portfolio system for design agencies and production houses.",
      description: "Frames case studies, creative disciplines, and client workflows with quiet confidence and sharp visual hierarchy.",
      sample_brand: "Kova Prism Agency",
      sample_brief: "Create a creative agency website presenting brand systems, motion work, and a structured new-business brief form.",
      highlights: ["Showreel opening stage", "Structured case studies", "Guided project brief form"]
    }
  },
  {
    id: "calm-sea-fine-dining",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: true,
    industry_key: "fnb-dining",
    category: "landing",
    mood: "coastal",
    preview_image: "/assets/reel-02-coastal-villa.webp",
    preview_video: "/assets/reel-02-coastal-villa.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Canva Dining + HyperUI Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "dining-atmosphere", type: "hero_cinema", label_vi: "Không gian nhà hàng & ánh đèn tối", label_en: "Evening dining atmosphere hero" },
      { id: "tasting-menu", type: "menu_chapters", label_vi: "Thực đơn nếm thử theo mùa", label_en: "Seasonal tasting menu" },
      { id: "chef-philosophy", type: "editorial_split", label_vi: "Bếp trưởng & nguồn nguyên liệu biển", label_en: "Chef & coastal sourcing story" },
      { id: "private-cellar", type: "gallery_pair", label_vi: "Phòng tiệc riêng & hầm vang", label_en: "Private dining & cellar" },
      { id: "table-reservation", type: "booking_cta", label_vi: "Đặt bàn trực tuyến & giờ mở cửa", label_en: "Table reservations & hours" }
    ],
    vi: {
      title: "Ẩm Thực Biển Đêm Fine Dining",
      industry_label: "Ẩm thực & F&B",
      tagline: "Khắc họa vị giác tinh tế cho nhà hàng fine dining và cocktail bar.",
      description: "Sắp đặt thực đơn theo chương rõ ràng, tôn vinh câu chuyện bếp trưởng và dẫn thẳng tới thao tác đặt bàn nhanh.",
      sample_brand: "Maris Tasting Room",
      sample_brief: "Thiết kế website cho nhà hàng hải sản fine dining với thực đơn 7 món theo mùa, phòng tiệc riêng và đặt bàn nhanh.",
      highlights: ["Thực đơn phân chương tinh tế", "Câu chuyện nguyên liệu", "Đặt bàn & phòng riêng"]
    },
    en: {
      title: "Calm Sea Fine Dining",
      industry_label: "Fine Dining",
      tagline: "Atmospheric culinary storytelling for tasting rooms and coastal restaurants.",
      description: "Organizes seasonal tasting courses, chef philosophy, and private dining rooms around effortless table reservations.",
      sample_brand: "Maris Tasting Room",
      sample_brief: "Build a coastal fine-dining website presenting a 7-course seasonal menu, chef story, and direct table reservations.",
      highlights: ["Chaptered tasting menu", "Chef & sourcing narrative", "Table & private room booking"]
    }
  },
  {
    id: "serene-clinic-medical",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: false,
    industry_key: "medical-clinic",
    category: "landing",
    mood: "botanical",
    preview_image: "/assets/reel-01-botanical.webp",
    preview_video: "/assets/reel-01-botanical.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "HyperUI Trust + AstroWind Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "clinic-welcome", type: "hero_trust", label_vi: "Định vị chuyên môn & an tâm", label_en: "Clinical trust & calm welcome" },
      { id: "specialty-grid", type: "service_list", label_vi: "Chuyên khoa & phác đồ điều trị", label_en: "Specialties & care protocols" },
      { id: "doctor-board", type: "team_showcase", label_vi: "Hội đồng bác sĩ & chứng chỉ", label_en: "Medical board & credentials" },
      { id: "facility-standards", type: "trust_matrix", label_vi: "Tiêu chuẩn vô trùng & thiết bị", label_en: "Facility & safety standards" },
      { id: "appointment-desk", type: "booking_cta", label_vi: "Đặt lịch khám & tư vấn bác sĩ", label_en: "Appointment & specialist desk" }
    ],
    vi: {
      title: "Phòng Khám & Thẩm Mỹ Chuẩn Mực",
      industry_label: "Y tế & Thẩm mỹ",
      tagline: "Tạo dựng niềm tin chuyên khoa với giao diện trong sáng và mạch lạc.",
      description: "Cân bằng giữa sự chuẩn xác y khoa và cảm giác thư giãn nhẹ nhàng, làm nổi bật hồ sơ bác sĩ và quy trình thăm khám.",
      sample_brand: "Verdant Medical Clinic",
      sample_brief: "Xây dựng website cho phòng khám da liễu và chăm sóc sức khỏe chủ động với hồ sơ bác sĩ và đặt lịch hẹn khám.",
      highlights: ["Hồ sơ hội đồng bác sĩ", "Trình bày phác đồ minh bạch", "Đặt lịch hẹn nhanh chóng"]
    },
    en: {
      title: "Serene Clinic & Medical Trust",
      industry_label: "Clinic & Medical Trust",
      tagline: "Reassuring, transparent digital presence for clinics and aesthetic medicine.",
      description: "Balances clinical precision with calm hospitality, emphasizing physician credentials, safety standards, and clear appointments.",
      sample_brand: "Verdant Medical Clinic",
      sample_brief: "Create a dermatology and preventive care clinic site highlighting physician credentials, treatments, and online booking.",
      highlights: ["Physician credentials board", "Transparent care protocols", "Streamlined appointment desk"]
    }
  },
  {
    id: "monolith-advisory-legal",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: false,
    industry_key: "advisory-legal",
    category: "platform",
    mood: "editorial",
    preview_image: "/assets/hero-ocean-jade.webp",
    preview_video: "/assets/hero-ocean-jade.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "shadcn Registry + AstroWind Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "advisory-thesis", type: "hero_editorial", label_vi: "Tuyên ngôn tư vấn chiến lược", label_en: "Strategic advisory thesis hero" },
      { id: "practice-areas", type: "bento_grid", label_vi: "Lĩnh vực tư vấn tài chính & pháp lý", label_en: "Financial & legal practice areas" },
      { id: "partner-leadership", type: "team_showcase", label_vi: "Ban đối tác điều hành", label_en: "Managing partners directory" },
      { id: "research-briefs", type: "insight_list", label_vi: "Báo cáo phân tích & ấn phẩm", label_en: "Insights & regulatory briefings" },
      { id: "executive-contact", type: "consultation_cta", label_vi: "Kênh trao đổi bảo mật", label_en: "Confidential partner inquiry" }
    ],
    vi: {
      title: "Tư Vấn Chiến Lược & Pháp Lý",
      industry_label: "Tư vấn & Tài chính",
      tagline: "Vẻ đĩnh đạc chuẩn mực cho công ty luật, quỹ đầu tư và cố vấn doanh nghiệp.",
      description: "Bố cục giàu kỷ luật thông tin giúp đối tác nắm bắt lĩnh vực chuyên môn, đội ngũ điều hành và báo cáo nghiên cứu.",
      sample_brand: "Monolith Partners Advisory",
      sample_brief: "Thiết kế website cho công ty tư vấn M&A và pháp lý doanh nghiệp với thư viện phân tích và kênh liên hệ bảo mật.",
      highlights: ["Bố cục chuẩn mực doanh nghiệp", "Thư viện báo cáo phân tích", "Kênh liên hệ đối tác bảo mật"]
    },
    en: {
      title: "Monolith Advisory & Legal",
      industry_label: "Advisory & Legal",
      tagline: "Measured institutional authority for legal, wealth, and M&A practices.",
      description: "Disciplined editorial hierarchy presenting practice areas, partner leadership, and regulatory research briefings.",
      sample_brand: "Monolith Partners Advisory",
      sample_brief: "Develop an advisory and corporate legal firm site featuring practice areas, leadership bios, and executive briefings.",
      highlights: ["Institutional grid rigor", "Research briefing hub", "Confidential partner intake"]
    }
  },
  {
    id: "kinetic-academy-edtech",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: false,
    industry_key: "education",
    category: "platform",
    mood: "editorial",
    preview_image: "/assets/reel-03-liquid-prism.webp",
    preview_video: "/assets/reel-03-liquid-prism.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Puck + HyperUI Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "academy-hero", type: "hero_platform", label_vi: "Giới thiệu học viện & lộ trình", label_en: "Academy overview & tracks hero" },
      { id: "curriculum-tracks", type: "curriculum_grid", label_vi: "Chương trình đào tạo theo cấp độ", label_en: "Tiered curriculum tracks" },
      { id: "mentor-faculty", type: "team_showcase", label_vi: "Đội ngũ giảng viên & cố vấn", label_en: "Faculty & industry mentors" },
      { id: "alumni-outcomes", type: "spec_band", label_vi: "Dự án học viên & kết quả đầu ra", label_en: "Alumni projects & outcomes" },
      { id: "cohort-enrollment", type: "booking_cta", label_vi: "Đăng ký giữ chỗ khóa sắp khai giảng", label_en: "Upcoming cohort enrollment" }
    ],
    vi: {
      title: "Học Viện Chuyển Động EdTech",
      industry_label: "Giáo dục & Học viện",
      tagline: "Trình bày chương trình đào tạo hiện đại cho học viện thiết kế, AI và lãnh đạo.",
      description: "Biến lộ trình học phức tạp thành các khối trực quan dễ quét, kết hợp hồ sơ giảng viên và lịch khai giảng rõ ràng.",
      sample_brand: "Kinetic Design Academy",
      sample_brief: "Xây dựng trang tuyển sinh cho học viện đào tạo sản phẩm số & AI với lộ trình khóa học và biểu mẫu đăng ký tư vấn.",
      highlights: ["Lộ trình khóa học trực quan", "Hồ sơ giảng viên chuyên gia", "Đăng ký khóa khai giảng"]
    },
    en: {
      title: "Kinetic Academy EdTech",
      industry_label: "EdTech Academy",
      tagline: "Structured learning showcase for modern design, AI, and executive academies.",
      description: "Turns multi-week syllabi into scannable tracks backed by mentor profiles, alumni portfolios, and cohort signups.",
      sample_brand: "Kinetic Design Academy",
      sample_brief: "Build an admissions site for a digital product & AI academy showcasing curriculum tracks, mentors, and cohort dates.",
      highlights: ["Scannable curriculum tracks", "Mentor faculty profiles", "Cohort admission funnel"]
    }
  },
  {
    id: "veranda-interior-atelier",
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    status: "published",
    featured: false,
    industry_key: "interior-design",
    category: "showcase",
    mood: "coastal",
    preview_image: "/assets/reel-02-coastal-villa.webp",
    preview_video: "/assets/reel-02-coastal-villa.mp4",
    license: TEMPLATE_LICENSE,
    source_inspiration: "Canva Interior + Webstudio Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "interior-frame", type: "hero_cinema", label_vi: "Không gian nội thất ánh sáng tự nhiên", label_en: "Natural-light interior hero" },
      { id: "room-stories", type: "portfolio_grid", label_vi: "Câu chuyện từng không gian sống", label_en: "Room-by-room living stories" },
      { id: "material-palette", type: "material_board", label_vi: "Bảng vật liệu đá, gỗ & kim loại", label_en: "Stone, timber & metal palette" },
      { id: "bespoke-process", type: "step_strip", label_vi: "Quy trình thiết kế & thi công trọn gói", label_en: "Turnkey design & build process" },
      { id: "studio-visit", type: "consultation_cta", label_vi: "Hẹn trao đổi ý tưởng không gian", label_en: "Schedule studio consultation" }
    ],
    vi: {
      title: "Nội Thất & Không Gian Veranda",
      industry_label: "Nội thất & Không gian",
      tagline: "Tôn vinh chất liệu, ánh sáng và chiều sâu cho studio thiết kế nội thất.",
      description: "Tập trung vào bộ ảnh không gian lớn, bảng vật liệu tinh tuyển và quy trình bàn giao trọn gói minh bạch.",
      sample_brand: "Veranda Living Atelier",
      sample_brief: "Thiết kế website cho studio nội thất căn hộ penthouse & biệt thự kèm bảng chất liệu và lịch tư vấn tại showroom.",
      highlights: ["Bộ sưu tập từng phòng", "Bảng vật liệu trực quan", "Lịch hẹn tư vấn showroom"]
    },
    en: {
      title: "Veranda Interior Atelier",
      industry_label: "Interior Design",
      tagline: "Celebrate tactile materials, natural light, and bespoke residential interiors.",
      description: "Highlights room-by-room photography, curated material palettes, and a transparent turnkey studio workflow.",
      sample_brand: "Veranda Living Atelier",
      sample_brief: "Create an interior design studio site presenting penthouse and villa interiors, material palettes, and showroom bookings.",
      highlights: ["Room-by-room galleries", "Tactile material board", "Showroom consultation booking"]
    }
  }
];

function assertRegistryIntegrity(): void {
  const seen = new Set<string>();
  for (const item of REGISTRY_TEMPLATES) {
    if (!TEMPLATE_ID_PATTERN.test(item.id) || seen.has(item.id)) {
      throw new Error(`TEMPLATE_REGISTRY_INTEGRITY_ERROR:${item.id}`);
    }
    seen.add(item.id);
  }
}

assertRegistryIntegrity();

export function isValidTemplateId(id: string): boolean {
  return typeof id === "string" && TEMPLATE_ID_PATTERN.test(id);
}

function normalizeFilter(value: string | undefined, maxLen = 64): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, maxLen);
}

function buildIndustrySummaries(items: readonly TemplateItem[]): TemplateIndustrySummary[] {
  const map = new Map<string, { label_vi: string; label_en: string; count: number; featured_template_id: string }>();
  for (const item of items) {
    const existing = map.get(item.industry_key);
    if (existing) {
      existing.count += 1;
      if (item.featured) existing.featured_template_id = item.id;
    } else {
      map.set(item.industry_key, {
        label_vi: item.vi.industry_label,
        label_en: item.en.industry_label,
        count: 1,
        featured_template_id: item.id
      });
    }
  }
  return [...map.entries()].map(([key, value]) => ({
    key,
    label_vi: value.label_vi,
    label_en: value.label_en,
    count: value.count,
    featured_template_id: value.featured_template_id
  }));
}

export function queryTemplates(options: TemplateQueryOptions = {}): TemplateRegistryResponse {
  const includeDrafts = options.includeDrafts === true;
  const visibleBase = includeDrafts
    ? REGISTRY_TEMPLATES
    : REGISTRY_TEMPLATES.filter((item) => item.status === "published");

  const industry = normalizeFilter(options.industry, 64);
  const category = normalizeFilter(options.category, 32);
  const mood = normalizeFilter(options.mood, 32);
  const q = normalizeFilter(options.q, 120);
  const featuredOnly = options.featuredOnly === true;

  const filtered = visibleBase.filter((item) => {
    if (featuredOnly && !item.featured) return false;
    if (industry && industry !== "all" && item.industry_key !== industry) return false;
    if (category && category !== "all" && item.category !== category) return false;
    if (mood && mood !== "all" && item.mood !== mood) return false;
    if (q) {
      const haystack = [
        item.id,
        item.industry_key,
        item.category,
        item.mood,
        item.vi.title,
        item.vi.industry_label,
        item.vi.tagline,
        item.vi.description,
        item.vi.sample_brand,
        ...item.vi.highlights,
        item.en.title,
        item.en.industry_label,
        item.en.tagline,
        item.en.description,
        item.en.sample_brand,
        ...item.en.highlights
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return {
    ok: true,
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    total: filtered.length,
    industries: buildIndustrySummaries(visibleBase),
    templates: filtered,
    mcp_resource: options.mcpResource ?? "/mcp-v2"
  };
}

export function getTemplateById(id: string): TemplateLookupResult {
  if (!isValidTemplateId(id)) {
    return { ok: false, status: 400, code: "INVALID_TEMPLATE_ID" };
  }
  const found = REGISTRY_TEMPLATES.find((item) => item.id === id && item.status === "published");
  if (!found) {
    return { ok: false, status: 404, code: "TEMPLATE_NOT_FOUND" };
  }
  return {
    ok: true,
    schema_version: TEMPLATE_REGISTRY_SCHEMA_VERSION,
    template: found
  };
}
