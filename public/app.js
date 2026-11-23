const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const runtimeStatus = $("#runtime-status");
const readyState = $("#ready-state");
const progress = $("#progress");
const siteHeader = $("#site-header");
const heroSection = $("#top");
const heroVideo = $("#hero-ocean-video");
const heroSeamFlare = $("#hero-seam-flare");
const manifestoSection = $("#manifesto");
const manifestoHeading = $("#manifesto-heading");
const craftSection = $("#craft");
const craftThread = $("#craft-thread");
const chapterRail = $("#chapter-rail");
const sanctuaryWorld = $("#sanctuary-world");
const sanctuarySculpture = $("#sanctuary-sculpture");
const mainContent = $("#main-content");

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

const BASE_PATH =
  window.location.pathname === "/web" || window.location.pathname.startsWith("/web/")
    ? "/web"
    : "";

const VALID_ROUTES = ["home", "product", "solutions", "resources", "pricing"];
const ROUTE_PATHS = {
  home: "/",
  product: "/product",
  solutions: "/solutions",
  resources: "/resources",
  pricing: "/pricing",
};

function withBasePath(pathname) {
  if (!BASE_PATH) return pathname;
  return pathname === "/" ? BASE_PATH : `${BASE_PATH}${pathname}`;
}

function resolveRouteFromLocation() {
  let raw = window.location.pathname || "/";
  if (BASE_PATH && raw.startsWith(BASE_PATH)) {
    raw = raw.slice(BASE_PATH.length) || "/";
  }
  const clean = raw.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "/app") return "home";
  if (clean === "/product") return "product";
  if (clean === "/solutions") return "solutions";
  if (clean === "/resources") return "resources";
  if (clean === "/pricing") return "pricing";
  return "home";
}

/* -------------------------------------------------------------------------- */
/* 1. Bilingual VI | EN Dictionary & Language Engine                          */
/* -------------------------------------------------------------------------- */
const I18N = {
  vi: {
    "meta.title.home": "GLOW Web — Ánh Sáng Đại Hải · Kiến Trúc Điện Ảnh Cho Thương Hiệu",
    "meta.title.product": "Sản phẩm — GLOW Web",
    "meta.title.solutions": "Giải pháp theo ngành — GLOW Web",
    "meta.title.resources": "Thư viện 12+ mẫu chuẩn — GLOW Web",
    "meta.title.pricing": "Bảng giá Early Access — GLOW Web",
    "a11y.skip": "Chuyển tới nội dung chính",
    "nav.home": "Trang chủ",
    "nav.product": "Sản phẩm",
    "nav.solutions": "Giải pháp",
    "nav.resources": "Tài nguyên",
    "nav.pricing": "Bảng giá",
    "header.signin": "Đăng nhập",
    "rail.00": "Khởi màn",
    "rail.01": "Ngọc bích",
    "rail.02": "Chân trời",
    "rail.03": "Nghệ thuật",
    "rail.04": "Khởi tạo",
    "hero.eyebrow": "GLOW WEBSITE · STUDIO KIẾN TẠO SỐ",
    "hero.line1": "Không gian số",
    "hero.line2": "mang dấu ấn riêng.",
    "hero.sub": "Nơi bản sắc trở thành không gian sống động — chế tác độc bản xứng tầm thương hiệu.",
    "hero.ctaStart": "Khởi tạo website",
    "hero.ctaGallery": "Khám phá 12+ mẫu",
    "hero.scrollCue": "Khám phá",
    "video.pause": "Tạm dừng",
    "video.play": "Phát phim",
    "video.fullscreen": "Toàn màn hình",
    "manifesto.coord": "01 · CHUẨN MỰC THIẾT KẾ",
    "ch1.eyebrow": "01 · BOTANICAL SANCTUARY",
    "ch1.line1": "Lặng sóng",
    "ch1.line2": "sinh hương.",
    "ch1.desc": "Nhịp nước tĩnh và hơi sương ngọc bích cho thương hiệu chế tác & nghệ thuật sống.",
    "ch2.eyebrow": "02 · COASTAL GLASS PAVILION",
    "ch2.line1": "Kiến trúc chạm",
    "ch2.line2": "chân trời.",
    "ch2.desc": "Hoàng hôn xanh và mặt hồ vô cực cho studio kiến trúc & bất động sản tầm vóc.",
    "craft.eyebrow": "NGHỆ THUẬT CHẾ TÁC · 04 NHỊP CHẢY",
    "craft.headLead": "Tinh giản ở bề mặt. ",
    "craft.headAccent": "Vững chắc ở chiều sâu.",
    "craft.s1.title": "Khởi nguồn cảm hứng",
    "craft.s1.desc": "Lắng nghe bản sắc và khoảnh khắc thương hiệu cần chạm tới.",
    "craft.s2.title": "Định hình điện ảnh",
    "craft.s2.desc": "Thiết lập ánh sáng, bố cục, kiểu chữ và nhịp chuyển động riêng.",
    "craft.s3.title": "Chế tác tinh xảo",
    "craft.s3.desc": "Hoàn thiện từng điểm ảnh, tương thích đa màn hình và mượt mà.",
    "craft.s4.title": "Bàn giao & Kết nối AI",
    "craft.s4.desc": "Đồng hành liền mạch cùng ChatGPT & Google Gemini theo quyền duyệt của bạn.",
    "gateway.headingLead": "Đánh thức không gian số ",
    "gateway.headingAccent": "mang dấu ấn độc bản.",
    "gateway.desc": "Kết nối ngay AI của bạn với Glow Website qua Plugin để khởi tạo dự án theo dấu ấn riêng của bạn.",
    "gateway.ctaPlugin": "Kết nối Plugin",
    "gateway.ctaDesign": "Thiết kế Website",
    "gateway.ctaConsult": "Tư vấn nhanh",
    "product.eyebrow": "NỀN TẢNG GLOW WEB · KIẾN TRÚC THẾ HỆ MỚI",
    "product.titleLead": "Mọi công cụ để kiến tạo ",
    "product.titleAccent": "website đẳng cấp điện ảnh.",
    "product.lead": "Kết hợp sức mạnh điều phối AI trực tiếp qua MCP, xưởng thiết kế trực quan có rào thẩm mỹ và mã nguồn tĩnh sạch không khóa nền tảng.",
    "product.p1.badge": "01 · KẾT NỐI AI TRỰC TIẾP",
    "product.p1.title": "GLOW AI Plugin & Cầu nối MCP",
    "product.p1.desc": "Kết nối liền mạch với ChatGPT và Google Gemini tại điểm cuối chuẩn /mcp-v2. Mọi bước khởi tạo, chỉnh sửa và duyệt bàn giao đều nằm dưới quyền kiểm soát OAuth minh bạch của bạn.",
    "product.p1.b1": "Điều phối dự án bằng ngôn ngữ tự nhiên tiếng Việt & tiếng Anh",
    "product.p1.b2": "Ranh giới bảo mật OAuth tách biệt, không tự ý xuất bản khi chưa duyệt",
    "product.p1.b3": "Tương thích trọn bộ 12+ mẫu chuẩn trong thư viện tài nguyên",
    "product.p1.v1": "Điều phối AI · OAuth minh bạch",
    "product.p1.v2": "Bản dựng trực tiếp từ mẫu chuẩn",
    "product.p1.cta": "Kết nối AI Plugin →",
    "product.p2.badge": "02 · XƯỞNG STUDIO TRỰC QUAN",
    "product.p2.title": "Khối bố cục JSON có rào thẩm mỹ",
    "product.p2.desc": "Mỗi trang được lắp ghép từ các khối chuẩn hóa rõ ràng về nhịp chữ, khoảng thở và tương phản. Tự do tùy biến nội dung mà không bao giờ vỡ bố cục trên di động.",
    "product.p2.b1": "Xem trước tức thì trên khung Desktop & Mobile",
    "product.p2.b2": "Tùy chọn 3 sắc thái thẩm mỹ: Ngọc bích · Ven biển · Điện ảnh",
    "product.p2.v1": "Rào thẩm mỹ Desktop & Mobile",
    "product.p2.cta": "Mở Xưởng Studio →",
    "product.p3.badge": "03 · XUẤT BẢN SIÊU TỐC",
    "product.p3.title": "Mã nguồn sạch & Đồng bộ GitHub",
    "product.p3.desc": "Xuất bản trực tiếp sang HTML/CSS/JS tối ưu, không phụ thuộc CDN bên ngoài, không rác thẻ lồng ghép và sẵn sàng đồng bộ GitHub hay hạ tầng edge của riêng bạn.",
    "product.p3.b1": "Tốc độ tải siêu nhanh, không khóa nền tảng (zero lock-in)",
    "product.p3.b2": "Chuẩn hóa khả năng tiếp cận bàn phím và giảm chuyển động",
    "product.p3.v1": "HTML/CSS tĩnh sạch · Đồng bộ GitHub",
    "product.p3.cta": "Xem thư viện mẫu →",
    "product.bandTitle": "Sẵn sàng khởi tạo không gian số mang dấu ấn riêng?",
    "product.bandDesc": "Chọn một mẫu ngành nghề chuẩn mực hoặc kết nối AI của bạn ngay trong Xưởng Studio.",
    "solutions.eyebrow": "GIẢI PHÁP THEO LĨNH VỰC · CHUYÊN SÂU NGÀNH NGHỀ",
    "solutions.titleLead": "Thiết kế đúng ngôn ngữ cho ",
    "solutions.titleAccent": "từng lĩnh vực kinh doanh.",
    "solutions.lead": "Mỗi ngành nghề đòi hỏi một nhịp kể chuyện, cấu trúc tin cậy và điểm chuyển đổi khác nhau. Chọn lĩnh vực của bạn để khám phá ngay bộ mẫu tương ứng.",
    "solutions.explore": "Khám phá mẫu ngành này",
    "solutions.openStudio": "Mở ngay trong Studio",
    "resources.eyebrow": "THƯ VIỆN TÀI NGUYÊN · 12+ MẪU CLEANROOM CHUẨN MỰC",
    "resources.titleLead": "Khám phá thư viện mẫu ",
    "resources.titleAccent": "sẵn sàng tùy biến với AI.",
    "resources.lead": "Toàn bộ mẫu được thiết kế sạch từ đầu, tương thích trực tiếp với GLOW AI Plugin và Xưởng Studio. Xem trước Desktop/Mobile hoặc mở ngay để tinh chỉnh theo thương hiệu của bạn.",
    "resources.searchLabel": "Tìm kiếm mẫu giao diện",
    "resources.searchPlaceholder": "Tìm theo ngành nghề, phong cách hoặc từ khóa...",
    "resources.preview": "Xem trước",
    "resources.useTemplate": "Dùng mẫu này →",
    "resources.allIndustries": "Tất cả ngành",
    "resources.moodAll": "Tất cả",
    "resources.moodBotanical": "Thiên nhiên Ngọc bích",
    "resources.moodCoastal": "Kiến trúc Ven biển",
    "resources.moodEditorial": "Điện ảnh Độc bản",
    "resources.empty": "Chưa tìm thấy mẫu phù hợp với bộ lọc hiện tại. Hãy thử xóa từ khóa hoặc chọn sắc thái khác.",
    "preview.desktop": "Desktop",
    "preview.mobile": "Mobile",
    "preview.liveTab": "Xem trực tiếp",
    "preview.sourceTab": "Mã nguồn HTML & JSON",
    "preview.copyHtml": "Sao chép HTML",
    "preview.copiedHtml": "Đã sao chép HTML ✓",
    "preview.loadingSource": "Đang tải mã nguồn sạch...",
    "preview.sourceError": "Không thể tải mã nguồn lúc này. Vui lòng thử lại.",
    "preview.blocksHeading": "Cấu trúc khối bố cục JSON",
    "preview.briefHeading": "Kịch bản thương hiệu mẫu",
    "preview.highlightsHeading": "Điểm nổi bật",
    "pricing.eyebrow": "BẢNG GIÁ MINH BẠCH · EARLY ACCESS",
    "pricing.titleLead": "Lựa chọn linh hoạt theo ",
    "pricing.titleAccent": "tốc độ phát triển của bạn.",
    "pricing.lead": "Bắt đầu trải nghiệm miễn phí với toàn bộ thư viện 12+ mẫu chuẩn và nâng cấp khi thương hiệu sẵn sàng kết nối tên miền riêng cùng AI Plugin.",
    "pricing.monthly": "Theo tháng",
    "pricing.annual": "Theo năm",
    "pricing.saveBadge": "Tiết kiệm 20%",
    "pricing.perMonth": "/ tháng",
    "pricing.p1.tag": "EARLY ACCESS",
    "pricing.p1.name": "Trải nghiệm",
    "pricing.p1.sub": "Dành cho cá nhân và nhà sáng tạo muốn khám phá ngôn ngữ thiết kế GLOW.",
    "pricing.p1.unit": "Miễn phí trải nghiệm",
    "pricing.p1.f1": "Truy cập toàn bộ thư viện 12+ mẫu ngành nghề chuẩn",
    "pricing.p1.f2": "1 dự án thử nghiệm trong Xưởng Studio",
    "pricing.p1.f3": "Xem trước trực tiếp trên Desktop & Mobile",
    "pricing.p1.f4": "Đóng gói hồ sơ khởi tạo dự án chuẩn JSON",
    "pricing.p1.cta": "Bắt đầu miễn phí",
    "pricing.p2.tag": "PHỔ BIẾN NHẤT",
    "pricing.p2.name": "Studio Pro",
    "pricing.p2.sub": "Dành cho thương hiệu, studio và chuyên gia cần vận hành website trọn gói cùng AI.",
    "pricing.p2.f1": "Không giới hạn số lượng mẫu & biến thể bố cục",
    "pricing.p2.f2": "Kết nối trực tiếp AI Plugin (ChatGPT & Gemini MCP)",
    "pricing.p2.f3": "Xuất mã nguồn tĩnh sạch không phụ thuộc CDN",
    "pricing.p2.f4": "Hỗ trợ gắn tên miền riêng & tối ưu tốc độ",
    "pricing.p2.cta": "Kích hoạt Studio Pro",
    "pricing.p3.tag": "TÙY CHỈNH",
    "pricing.p3.name": "Doanh nghiệp & Agency",
    "pricing.p3.sub": "Dành cho tổ chức đa thương hiệu cần phân quyền quản trị và đồng bộ quy trình riêng.",
    "pricing.p3.f1": "Không gian làm việc đa thương hiệu (Multi-brand Workspace)",
    "pricing.p3.f2": "Quản trị phân quyền Admin & phê duyệt nhiều cấp",
    "pricing.p3.f3": "Đồng bộ kho lưu trữ GitHub & quy trình xuất bản riêng",
    "pricing.p3.f4": "Tư vấn kiến trúc trải nghiệm 1-1 cùng đội ngũ GLOW",
    "pricing.p3.cta": "Đặt lịch tư vấn",
    "pricing.notice": "Thông báo minh bạch: GLOW Web hiện đang ở giai đoạn Early Access Trải nghiệm Giới hạn. Chưa thu phí trực tuyến hay tích hợp cổng thanh toán tự động; mức giá hiển thị là kế hoạch tham khảo minh bạch khi mở bản thương mại chính thức.",
    "footer.tagline": "Khai phóng dấu ấn số. Làm chủ công nghệ AI. Kiến tạo website đẳng cấp — theo cách của bạn.",
    "footer.colExplore": "Khám phá",
    "footer.colStudio": "Xưởng & Trải nghiệm",
    "footer.colSupport": "Hệ sinh thái & Hỗ trợ",
    "footer.note": "Phiên bản Trải nghiệm Giới hạn",
    "footer.workspace": "Xưởng Studio",
    "footer.aiPlugin": "Kết nối AI Plugin",
    "footer.resources": "Thư viện mẫu",
    "footer.google": "Đăng nhập Google",
    "footer.quickConsult": "Tư vấn nhanh",
    "footer.glowrivia": "Hệ sinh thái Glowrivia",
    "footer.privacy": "Quyền riêng tư",
    "footer.privacyPolicy": "Chính sách bảo mật",
    "footer.terms": "Điều khoản sử dụng",
    "footer.contact": "Liên hệ & Hợp tác",
    "status.online": "Không gian trải nghiệm trực tuyến",
    "status.ready": "Hệ thống xưởng sẵn sàng",
    "status.limited": "Chế độ kết nối giới hạn",
    "common.close": "Đóng ✕",
    "auth.eyebrow": "TÀI KHOẢN GLOW WEB",
    "auth.tabSignin": "Đăng nhập",
    "auth.tabSignup": "Đăng ký nhanh",
    "auth.signinLead": "Tiếp tục vào Xưởng Studio và kết nối AI Plugin của bạn trong một chạm.",
    "auth.googleCta": "Tiếp tục với Google · 1 chạm",
    "auth.orEmail": "hoặc đăng nhập bằng Email OTP",
    "auth.emailLabel": "Địa chỉ email công việc",
    "auth.emailPlaceholder": "ban@thuonghieu.vn",
    "auth.sendOtp": "Tiếp tục với Email OTP →",
    "auth.signupLead": "Tạo tài khoản Xưởng Studio chỉ trong 1 bước duy nhất.",
    "auth.googleSignupCta": "Đăng ký nhanh bằng Google",
    "auth.orQuickEmail": "hoặc nhập Email & Tên thương hiệu",
    "auth.brandLabel": "Tên cá nhân hoặc thương hiệu",
    "auth.brandPlaceholder": "Ví dụ: Sora Studio",
    "auth.createAccount": "Khởi tạo tài khoản →",
    "auth.transparentNote": "Google hoặc Email OTP sẽ tự động tạo không gian làm việc của bạn trong 1 bước mà không cần đặt mật khẩu rườm rà.",
    "wizard.eyebrow": "TẠO HỒ SƠ KHỞI TẠO · 04 BƯỚC",
    "wizard.s1.label": "Website này dành cho ai?",
    "wizard.s1.c1.title": "Cá nhân",
    "wizard.s1.c1.desc": "Portfolio · Hồ sơ · Nhà sáng tạo",
    "wizard.s1.c2.title": "Thương hiệu",
    "wizard.s1.c2.desc": "Studio · Doanh nghiệp · Dịch vụ",
    "wizard.s1.c3.title": "Sản phẩm",
    "wizard.s1.c3.desc": "Sản phẩm số · Ra mắt · Chiến dịch",
    "wizard.s2.label": "Một câu thôi: website phải giúp bạn đạt điều gì?",
    "wizard.s2.placeholder": "Ví dụ: Giúp đối tác cảm nhận ngay đẳng cấp thương hiệu và chủ động đặt lịch trao đổi.",
    "wizard.s3.label": "Bạn muốn người xem cảm thấy thế nào?",
    "wizard.s3.f1": "Tinh tế",
    "wizard.s3.f2": "Điện ảnh",
    "wizard.s3.f3": "Tĩnh tại",
    "wizard.s3.f4": "Tiên phong",
    "wizard.s3.f5": "Tối giản",
    "wizard.s3.f6": "Hãy gợi ý",
    "wizard.s4.label": "Hoàn tất hồ sơ khởi tạo dự án của bạn.",
    "wizard.namePlaceholder": "Tên cá nhân hoặc thương hiệu (tuỳ chọn)",
    "wizard.privacy": "Hồ sơ chỉ được đóng gói ngay trên trình duyệt của bạn. Không gửi dữ liệu riêng tư hay tự động khởi chạy khi chưa có xác nhận.",
    "wizard.back": "Quay lại",
    "wizard.next": "Tiếp tục",
    "wizard.launch": "Tạo hồ sơ & Mở ChatGPT",
    "wizard.capsuleReady": "HỒ SƠ KHỞI TẠO SẴN SÀNG",
    "wizard.capsuleTitle": "Yêu cầu dự án đã được đóng gói.",
    "wizard.capsuleDesc": "Nội dung đã được sao chép. Dán vào ChatGPT hoặc mở Xưởng Studio để bắt đầu chế tác.",
    "wizard.copy": "Copy lại capsule",
    "wizard.copied": "Đã copy ✓",
    "wizard.enterStudio": "Vào Xưởng Studio",
  },
  en: {
    "meta.title.home": "GLOW Web — Ocean Radiance · Cinematic Brand Architecture",
    "meta.title.product": "Product — GLOW Web",
    "meta.title.solutions": "Industry Solutions — GLOW Web",
    "meta.title.resources": "12+ Cleanroom Templates — GLOW Web",
    "meta.title.pricing": "Early Access Pricing — GLOW Web",
    "a11y.skip": "Skip to main content",
    "nav.home": "Home",
    "nav.product": "Product",
    "nav.solutions": "Solution",
    "nav.resources": "Resource",
    "nav.pricing": "Price",
    "header.signin": "Sign in",
    "rail.00": "Overture",
    "rail.01": "Botanical",
    "rail.02": "Horizon",
    "rail.03": "Craft",
    "rail.04": "Launch",
    "hero.eyebrow": "GLOW WEBSITE · DIGITAL ARCHITECTURE STUDIO",
    "hero.line1": "Digital flagships",
    "hero.line2": "unmistakably yours.",
    "hero.sub": "Where identity becomes a living space — bespoke digital craft worthy of your brand.",
    "hero.ctaStart": "Launch a website",
    "hero.ctaGallery": "Explore 12+ templates",
    "hero.scrollCue": "Explore",
    "video.pause": "Pause",
    "video.play": "Play film",
    "video.fullscreen": "Fullscreen",
    "manifesto.coord": "01 · DESIGN STANDARD",
    "ch1.eyebrow": "01 · BOTANICAL SANCTUARY",
    "ch1.line1": "Still waters",
    "ch1.line2": "awaken form.",
    "ch1.desc": "Quiet surface rhythm and jade mist crafted for bespoke artisans and wellness sanctuaries.",
    "ch2.eyebrow": "02 · COASTAL GLASS PAVILION",
    "ch2.line1": "Architecture meeting",
    "ch2.line2": "the horizon.",
    "ch2.desc": "Twilight ocean glass and infinity reflections for landmark architecture & real estate studios.",
    "craft.eyebrow": "CRAFT CADENCE · 04 MOVEMENTS",
    "craft.headLead": "Effortless on the surface. ",
    "craft.headAccent": "Engineered in depth.",
    "craft.s1.title": "Origin & Essence",
    "craft.s1.desc": "Capture your brand narrative and the decisive moment your audience must feel.",
    "craft.s2.title": "Cinematic Direction",
    "craft.s2.desc": "Compose lighting, typography, spatial rhythm, and tailored motion pacing.",
    "craft.s3.title": "Precision Craft",
    "craft.s3.desc": "Refine every breakpoint for fluid desktop and mobile responsiveness.",
    "craft.s4.title": "Delivery & AI Bridge",
    "craft.s4.desc": "Collaborate seamlessly with ChatGPT & Google Gemini under your explicit approval.",
    "gateway.headingLead": "Awaken a digital space ",
    "gateway.headingAccent": "unmistakably yours.",
    "gateway.desc": "Connect your AI to Glow Website via Plugin to launch a project crafted to your signature.",
    "gateway.ctaPlugin": "Connect Plugin",
    "gateway.ctaDesign": "Design Website",
    "gateway.ctaConsult": "Quick Consult",
    "product.eyebrow": "GLOW WEB PLATFORM · NEXT-GEN ARCHITECTURE",
    "product.titleLead": "Everything required to craft ",
    "product.titleAccent": "cinema-grade websites.",
    "product.lead": "Unite direct AI orchestration via MCP, a visual studio with built-in aesthetic guardrails, and clean static HTML output with zero vendor lock-in.",
    "product.p1.badge": "01 · DIRECT AI ORCHESTRATION",
    "product.p1.title": "GLOW AI Plugin & MCP Bridge",
    "product.p1.desc": "Connect ChatGPT and Google Gemini directly to the canonical /mcp-v2 endpoint. Every draft, revision, and release remains strictly governed by your OAuth approval.",
    "product.p1.b1": "Guide projects in natural English or Vietnamese conversation",
    "product.p1.b2": "Strict OAuth authority boundary — never publishes without your sign-off",
    "product.p1.b3": "Compatible with all 12+ structured templates in the resource registry",
    "product.p1.v1": "AI Orchestration · OAuth Governed",
    "product.p1.v2": "Live Render from Curated Template",
    "product.p1.cta": "Connect AI Plugin →",
    "product.p2.badge": "02 · VISUAL STUDIO GUARDRAILS",
    "product.p2.title": "JSON Block Architecture",
    "product.p2.desc": "Compose pages from clean, typed section blocks with locked typography scales, contrast ratios, and responsive balance so layouts never break on mobile.",
    "product.p2.b1": "Instant Desktop & Mobile live viewport switching",
    "product.p2.b2": "Three curated moods: Jade Botanical · Coastal Architecture · Editorial",
    "product.p2.v1": "Desktop & Mobile Layout Guardrails",
    "product.p2.cta": "Open Studio Workspace →",
    "product.p3.badge": "03 · INSTANT CLEAN OUTPUT",
    "product.p3.title": "Clean Static Code & GitHub Sync",
    "product.p3.desc": "Export lean HTML/CSS/JS with zero external CDN dependencies, zero div-soup bloat, and seamless synchronization to your GitHub repositories or edge hosts.",
    "product.p3.b1": "Fast first paint with complete ownership and zero lock-in",
    "product.p3.b2": "Built-in keyboard accessibility and reduced-motion compliance",
    "product.p3.v1": "Zero-CDN Static HTML/CSS · GitHub Sync",
    "product.p3.cta": "Browse template gallery →",
    "product.bandTitle": "Ready to shape a digital presence unmistakably yours?",
    "product.bandDesc": "Start from a cleanroom industry template or connect your AI directly inside the Studio.",
    "solutions.eyebrow": "INDUSTRY SOLUTIONS · TAILORED VERTICALS",
    "solutions.titleLead": "Designed in the native language of ",
    "solutions.titleAccent": "every business vertical.",
    "solutions.lead": "Each industry relies on distinct storytelling rhythm, trust proof, and conversion moments. Choose your vertical to explore matching templates.",
    "solutions.explore": "Explore templates",
    "solutions.openStudio": "Open in Studio",
    "resources.eyebrow": "RESOURCE REGISTRY · 12+ CLEANROOM TEMPLATES",
    "resources.titleLead": "Explore curated templates ",
    "resources.titleAccent": "ready for AI customization.",
    "resources.lead": "Every template is authored cleanroom from scratch and wired for GLOW AI Plugin and Studio. Preview Desktop/Mobile or launch directly into your workspace.",
    "resources.searchLabel": "Search templates",
    "resources.searchPlaceholder": "Search by industry, aesthetic mood, or keyword...",
    "resources.preview": "Preview",
    "resources.useTemplate": "Use template →",
    "resources.allIndustries": "All industries",
    "resources.moodAll": "All moods",
    "resources.moodBotanical": "Jade Botanical",
    "resources.moodCoastal": "Coastal Architecture",
    "resources.moodEditorial": "Cinematic Editorial",
    "resources.empty": "No templates match your current filters. Clear your query or switch aesthetic moods.",
    "preview.desktop": "Desktop",
    "preview.mobile": "Mobile",
    "preview.liveTab": "Live Preview",
    "preview.sourceTab": "HTML & JSON Source",
    "preview.copyHtml": "Copy HTML",
    "preview.copiedHtml": "HTML Copied ✓",
    "preview.loadingSource": "Loading cleanroom source...",
    "preview.sourceError": "Unable to load source payload right now. Please retry.",
    "preview.blocksHeading": "Structured JSON Section Blocks",
    "preview.briefHeading": "Sample Brand Brief",
    "preview.highlightsHeading": "Key Highlights",
    "pricing.eyebrow": "TRANSPARENT PRICING · EARLY ACCESS",
    "pricing.titleLead": "Flexible plans built for ",
    "pricing.titleAccent": "your pace of growth.",
    "pricing.lead": "Start free with all 12+ cleanroom templates and scale when your brand is ready for custom domains and direct AI Plugin orchestration.",
    "pricing.monthly": "Monthly",
    "pricing.annual": "Annual",
    "pricing.saveBadge": "Save 20%",
    "pricing.perMonth": "/ mo",
    "pricing.p1.tag": "EARLY ACCESS",
    "pricing.p1.name": "Starter",
    "pricing.p1.sub": "For creators and founders exploring the GLOW visual language.",
    "pricing.p1.unit": "Free during Early Access",
    "pricing.p1.f1": "Full access to all 12+ curated industry templates",
    "pricing.p1.f2": "1 experimental workspace project",
    "pricing.p1.f3": "Live Desktop & Mobile preview modes",
    "pricing.p1.f4": "Structured JSON project intake packaging",
    "pricing.p1.cta": "Start free",
    "pricing.p2.tag": "MOST POPULAR",
    "pricing.p2.name": "Studio Pro",
    "pricing.p2.sub": "For brands, studios, and consultants shipping end-to-end websites with AI.",
    "pricing.p2.f1": "Unlimited templates & section layout variations",
    "pricing.p2.f2": "Direct AI Plugin bridge (ChatGPT & Gemini MCP)",
    "pricing.p2.f3": "Clean zero-CDN static HTML/CSS/JS output",
    "pricing.p2.f4": "Custom domain mapping & edge performance tuning",
    "pricing.p2.cta": "Activate Studio Pro",
    "pricing.p3.tag": "CUSTOM",
    "pricing.p3.name": "Enterprise & Agency",
    "pricing.p3.sub": "For multi-brand teams needing admin governance and bespoke GitHub pipelines.",
    "pricing.p3.f1": "Multi-brand Workspace & shared design systems",
    "pricing.p3.f2": "Role-based Admin access & multi-step approvals",
    "pricing.p3.f3": "Direct GitHub repository sync & custom release flows",
    "pricing.p3.f4": "1-on-1 architectural advisory with the GLOW team",
    "pricing.p3.cta": "Book consultation",
    "pricing.notice": "Transparency notice: GLOW Web is currently in bounded Early Access. No online billing or payment gateway is active yet; displayed figures represent our transparent reference roadmap for commercial launch.",
    "footer.tagline": "Unleash your digital signature. Master AI craft. Build cinema-grade websites — your way.",
    "footer.colExplore": "Explore",
    "footer.colStudio": "Studio & Access",
    "footer.colSupport": "Ecosystem & Support",
    "footer.note": "Bounded Early Access Candidate",
    "footer.workspace": "Studio Workspace",
    "footer.aiPlugin": "Connect AI Plugin",
    "footer.resources": "Templates",
    "footer.google": "Google Sign In",
    "footer.quickConsult": "Quick Consult",
    "footer.glowrivia": "Glowrivia Ecosystem",
    "footer.privacy": "Privacy",
    "footer.privacyPolicy": "Privacy Policy",
    "footer.terms": "Terms of Use",
    "footer.contact": "Contact & Partnerships",
    "status.online": "Online experience host",
    "status.ready": "Studio service ready",
    "status.limited": "Limited connection mode",
    "common.close": "Close ✕",
    "auth.eyebrow": "GLOW WEB ACCOUNT",
    "auth.tabSignin": "Sign in",
    "auth.tabSignup": "Create account",
    "auth.signinLead": "Continue into Studio Workspace and connect your AI Plugin in one click.",
    "auth.googleCta": "Continue with Google · 1 click",
    "auth.orEmail": "or sign in with Email OTP",
    "auth.emailLabel": "Work email address",
    "auth.emailPlaceholder": "you@brand.com",
    "auth.sendOtp": "Continue with Email OTP →",
    "auth.signupLead": "Create your Studio Workspace account in one effortless step.",
    "auth.googleSignupCta": "Quick Sign up with Google",
    "auth.orQuickEmail": "or enter Email & Brand Name",
    "auth.brandLabel": "Personal or brand name",
    "auth.brandPlaceholder": "e.g., Sora Studio",
    "auth.createAccount": "Create account →",
    "auth.transparentNote": "Google or Email OTP automatically creates your workspace account in one step — no extra password setup required.",
    "wizard.eyebrow": "PROJECT BRIEF · 04 STEPS",
    "wizard.s1.label": "Who is this website for?",
    "wizard.s1.c1.title": "Personal",
    "wizard.s1.c1.desc": "Portfolio · Profile · Creator",
    "wizard.s1.c2.title": "Brand",
    "wizard.s1.c2.desc": "Studio · Business · Services",
    "wizard.s1.c3.title": "Product",
    "wizard.s1.c3.desc": "Digital Product · Launch · Campaign",
    "wizard.s2.label": "In one sentence: what must this website achieve for you?",
    "wizard.s2.placeholder": "e.g., Immediately convey our brand craft and invite partners to book a private consultation.",
    "wizard.s3.label": "How should visitors feel when exploring your site?",
    "wizard.s3.f1": "Refined",
    "wizard.s3.f2": "Cinematic",
    "wizard.s3.f3": "Serene",
    "wizard.s3.f4": "Pioneering",
    "wizard.s3.f5": "Minimal",
    "wizard.s3.f6": "Suggest for me",
    "wizard.s4.label": "Complete your project launch capsule.",
    "wizard.namePlaceholder": "Personal or brand name (optional)",
    "wizard.privacy": "Your brief is packaged locally inside your browser. No private data is transmitted or launched without your explicit confirmation.",
    "wizard.back": "Back",
    "wizard.next": "Continue",
    "wizard.launch": "Generate Brief & Open ChatGPT",
    "wizard.capsuleReady": "LAUNCH CAPSULE READY",
    "wizard.capsuleTitle": "Your project brief has been packaged.",
    "wizard.capsuleDesc": "Copied to your clipboard. Paste into ChatGPT or open Studio Workspace to start building.",
    "wizard.copy": "Copy capsule again",
    "wizard.copied": "Copied ✓",
    "wizard.enterStudio": "Open Studio Workspace",
  },
};

const MANIFESTO_WORDS = {
  vi: [
    ["Ấn", false], ["tượng", false], ["từ", false], ["ánh", false], ["nhìn", false],
    ["đầu", false], ["tiên", false], ["quyết", true], ["định", true], ["vị", true],
    ["thế", true], ["thương", true], ["hiệu", true], ["trong", false], ["lòng", false],
    ["khách", false], ["hàng.", false],
  ],
  en: [
    ["First", false], ["impressions", false], ["at", false], ["a", false], ["single", false],
    ["glance", false], ["define", true], ["your", true], ["brand's", true], ["authority", true],
    ["in", false], ["every", false], ["customer's", false], ["mind.", false],
  ],
};

const PRICING_AMOUNTS = {
  vi: {
    monthly: { starter: "0đ", pro: "490.000đ", enterprise: "1.890.000đ" },
    annual: { starter: "0đ", pro: "390.000đ", enterprise: "1.490.000đ" },
  },
  en: {
    monthly: { starter: "$0", pro: "$19", enterprise: "$79" },
    annual: { starter: "$0", pro: "$15", enterprise: "$63" },
  },
};

const SOLUTION_PILLARS = [
  {
    id: "architecture-real-estate",
    industryKeys: ["architecture", "interior-design"],
    primaryIndustry: "architecture",
    defaultTemplateId: "coastal-glass-architecture",
    vi: {
      title: "Kiến trúc, BĐS & Nội thất",
      desc: "Tôn vinh công trình quy mô, mặt kính ánh sáng tự nhiên và trải nghiệm đặt lịch tham quan riêng tư.",
      benefits: ["Trình diễn khung hình 16:9 không cắt góc", "Hồ sơ công trình & bảng chất liệu rõ ràng", "Luồng hẹn tư vấn riêng cho chủ đầu tư"],
    },
    en: {
      title: "Architecture, Real Estate & Interiors",
      desc: "Elevate landmark estates, natural-light glass interiors, and private client viewing funnels.",
      benefits: ["Uncropped 16:9 spatial photography", "Structured project dossiers & material boards", "Private viewing & showroom scheduling"],
    },
  },
  {
    id: "wellness-clinic",
    industryKeys: ["wellness", "medical-clinic"],
    primaryIndustry: "wellness",
    defaultTemplateId: "botanical-wellness-sanctuary",
    vi: {
      title: "Spa, Wellness & Y tế Chuẩn mực",
      desc: "Kết hợp sự an yên tự nhiên với hồ sơ chuyên môn minh bạch để khách hàng tin tưởng đặt lịch ngay.",
      benefits: ["Bảng liệu trình & chuyên khoa dễ quét", "Hồ sơ chuyên gia và tiêu chuẩn an toàn", "Trải nghiệm đặt lịch mượt mà trên di động"],
    },
    en: {
      title: "Spa, Wellness & Medical Trust",
      desc: "Pair restorative sensory calm with transparent clinical credentials and effortless bookings.",
      benefits: ["Scannable ritual & specialty menus", "Physician & master therapist profiles", "Mobile-first appointment reservations"],
    },
  },
  {
    id: "saas-ai-edtech",
    industryKeys: ["saas-ai", "education"],
    primaryIndustry: "saas-ai",
    defaultTemplateId: "ocean-obsidian-ai-platform",
    vi: {
      title: "SaaS, AI & Học viện EdTech",
      desc: "Cấu trúc lưới Bento sắc nét trình diễn năng lực sản phẩm, lộ trình học và tích hợp API hiện đại.",
      benefits: ["Lưới Bento 6 khối rõ giá trị cốt lõi", "Trình diễn kết nối Plugin & lộ trình khóa học", "Bảng gói dịch vụ và chuyển đổi minh bạch"],
    },
    en: {
      title: "SaaS, AI & EdTech Academies",
      desc: "Sharp Bento layouts designed to present product architecture, API bridges, and learning tracks.",
      benefits: ["Modular 6-block Bento capability grids", "Plugin ecosystem & syllabus visualization", "Clear pricing and cohort enrollment funnels"],
    },
  },
  {
    id: "luxury-creative",
    industryKeys: ["luxury-brand", "creative-agency"],
    primaryIndustry: "luxury-brand",
    defaultTemplateId: "atelier-maison-luxury",
    vi: {
      title: "Thương hiệu Cá nhân & Agency",
      desc: "Ngôn ngữ tạp chí điện ảnh cho nhà sáng lập, thương hiệu xa xỉ và studio sáng tạo giàu cá tính.",
      benefits: ["Phân cấp kiểu chữ serif tinh tế", "Trình diễn bộ sưu tập & case study có chiều sâu", "Kênh tiếp nhận đề bài dự án trực tiếp"],
    },
    en: {
      title: "Personal Luxury & Creative Agencies",
      desc: "Editorial magazine presence for founders, luxury maisons, and multidisciplinary creative studios.",
      benefits: ["Refined serif editorial typography", "Curated collections & deep case studies", "Guided concierge & project brief intake"],
    },
  },
  {
    id: "hospitality-dining",
    industryKeys: ["hospitality", "fnb-dining"],
    primaryIndustry: "fnb-dining",
    defaultTemplateId: "calm-sea-fine-dining",
    vi: {
      title: "Nghỉ dưỡng, Du lịch & Ẩm thực F&B",
      desc: "Khơi gợi không khí điểm đến và vị giác ngay trên trang chủ, dẫn thẳng tới đặt bàn và giữ phòng.",
      benefits: ["Kể chuyện hạng phòng & thực đơn theo mùa", "Khung video không khí tải siêu nhẹ", "Tối ưu đặt phòng và đặt bàn trực tiếp"],
    },
    en: {
      title: "Boutique Hospitality & Fine Dining",
      desc: "Evoke coastal atmosphere and culinary craft immediately, guiding guests straight to direct bookings.",
      benefits: ["Suite galleries & seasonal tasting chapters", "Lightweight ambient cinema frames", "Direct room and table reservation flows"],
    },
  },
  {
    id: "commerce-advisory",
    industryKeys: ["ecommerce", "advisory-legal"],
    primaryIndustry: "ecommerce",
    defaultTemplateId: "jade-botanical-skincare",
    vi: {
      title: "Thương mại điện tử & Tư vấn Doanh nghiệp",
      desc: "Trình bày kệ sản phẩm tinh tuyển hoặc năng lực tư vấn tài chính — pháp lý với độ tin cậy cao.",
      benefits: ["Minh bạch thành phần & hồ sơ năng lực", "Bố cục giàu kỷ luật thông tin, dễ đọc", "Kênh trao đổi bảo mật và chuyển đổi rõ ràng"],
    },
    en: {
      title: "Boutique Commerce & Advisory",
      desc: "Showcase curated product shelves or institutional financial-legal expertise with crystal clarity.",
      benefits: ["Ingredient & credential transparency", "Disciplined scannable grid systems", "High-trust conversion and confidential intake"],
    },
  },
];

let currentLang = "vi";
try {
  const saved = window.localStorage.getItem("glow_web_lang");
  if (saved === "vi" || saved === "en") currentLang = saved;
} catch {
  currentLang = "vi";
}

let activeView = resolveRouteFromLocation();
let billingMode = "annual";
let runtimeReadyState = "loading";

function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.vi[key] ?? key;
}

let kineticWords = $$(".kinetic-manifesto .k-word");

function renderManifestoWords() {
  if (!manifestoHeading) return;
  const words = MANIFESTO_WORDS[currentLang] || MANIFESTO_WORDS.vi;
  const frag = document.createDocumentFragment();
  for (const [text, accent] of words) {
    const span = document.createElement("span");
    span.className = accent ? "k-word k-accent" : "k-word";
    span.textContent = text;
    frag.appendChild(span);
    frag.appendChild(document.createTextNode(" "));
  }
  manifestoHeading.replaceChildren(frag);
  kineticWords = $$(".kinetic-manifesto .k-word");
}

function updatePricingDisplay() {
  const prices = PRICING_AMOUNTS[currentLang]?.[billingMode] || PRICING_AMOUNTS.vi.annual;
  $$("[data-price-key]").forEach((el) => {
    const key = el.dataset.priceKey;
    if (key && prices[key]) el.textContent = prices[key];
  });
  const toggleBtn = $("#pricing-billing-toggle");
  if (toggleBtn) {
    toggleBtn.dataset.billing = billingMode;
    toggleBtn.setAttribute("aria-checked", String(billingMode === "annual"));
    $$(".billing-opt", toggleBtn).forEach((opt) => {
      opt.classList.toggle("is-active", opt.dataset.billingMode === billingMode);
    });
  }
}

function updateRuntimeStatusText() {
  if (!runtimeStatus || !readyState) return;
  runtimeStatus.textContent = t("status.online");
  if (runtimeReadyState === "ready") {
    readyState.textContent = t("status.ready");
  } else if (runtimeReadyState === "degraded" || runtimeReadyState === "unknown") {
    readyState.textContent = t("status.limited");
  }
}

function syncLangToggleUI() {
  const btn = $("#lang-toggle");
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(currentLang === "en"));
  $$(".lang-opt", btn).forEach((opt) => {
    opt.classList.toggle("is-active", opt.dataset.langCode === currentLang);
  });
}

function applyLanguage(lang, persist = true) {
  currentLang = lang === "en" ? "en" : "vi";
  document.documentElement.lang = currentLang;
  document.body.dataset.lang = currentLang;
  if (persist) {
    try {
      window.localStorage.setItem("glow_web_lang", currentLang);
    } catch {
      /* storage disabled */
    }
  }

  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  const searchInput = $("#resource-search");
  if (searchInput) searchInput.placeholder = t("resources.searchPlaceholder");

  const goalInput = $("#goal");
  if (goalInput) goalInput.placeholder = t("wizard.s2.placeholder");

  const nameInput = $("#name");
  if (nameInput) nameInput.placeholder = t("wizard.namePlaceholder");

  const signinEmail = $("#auth-signin-email");
  if (signinEmail) signinEmail.placeholder = t("auth.emailPlaceholder");

  const signupEmail = $("#auth-signup-email");
  if (signupEmail) signupEmail.placeholder = t("auth.emailPlaceholder");

  const signupBrand = $("#auth-signup-brand");
  if (signupBrand) signupBrand.placeholder = t("auth.brandPlaceholder");

  renderManifestoWords();
  syncLangToggleUI();
  updatePricingDisplay();
  updateRuntimeStatusText();
  renderSolutionsGrid();
  renderResourceFilters();
  renderTemplateGallery();
  if (activePreviewTemplate) {
    populateTemplatePreviewModal(activePreviewTemplate);
    syncTemplatePreviewStage(activePreviewTemplate);
  }
  syncAllVideoButtonsText();
  updateDocumentTitle();
  scheduleScrollChoreography();
}

function updateDocumentTitle() {
  document.title = t(`meta.title.${activeView}`);
}

$("#lang-toggle")?.addEventListener("click", () => {
  applyLanguage(currentLang === "vi" ? "en" : "vi", true);
});

/* -------------------------------------------------------------------------- */
/* 2. 5-Tab Client Router & Mobile Drawer                                     */
/* -------------------------------------------------------------------------- */
const mobileMenuToggle = $("#mobile-menu-toggle");
const mobileNavDrawer = $("#mobile-nav-drawer");

function setMobileMenuOpen(open) {
  if (!mobileMenuToggle || !mobileNavDrawer) return;
  mobileMenuToggle.setAttribute("aria-expanded", String(open));
  mobileNavDrawer.classList.toggle("hidden", !open);
}

mobileMenuToggle?.addEventListener("click", () => {
  const isOpen = mobileMenuToggle.getAttribute("aria-expanded") === "true";
  setMobileMenuOpen(!isOpen);
});

function setActiveView(route, { pushHistory = true, scrollTop = true } = {}) {
  cancelHomeFrameSnap();
  const safeRoute = VALID_ROUTES.includes(route) ? route : "home";
  activeView = safeRoute;
  document.body.dataset.activeView = safeRoute;
  if (mainContent) mainContent.dataset.activeView = safeRoute;

  $$(".platform-view").forEach((viewEl) => {
    const isMatch = viewEl.dataset.view === safeRoute;
    viewEl.hidden = !isMatch;
    viewEl.classList.toggle("is-active", isMatch);
  });

  $$("[data-route]").forEach((link) => {
    const isMatch = link.dataset.route === safeRoute;
    if (link.closest(".nav-links") || link.closest(".mobile-nav-links")) {
      link.classList.toggle("is-active", isMatch);
      if (isMatch) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  });

  if (pushHistory) {
    const nextUrl = withBasePath(ROUTE_PATHS[safeRoute]);
    if (window.location.pathname !== nextUrl) {
      window.history.pushState({ route: safeRoute }, "", nextUrl);
    }
  }

  setMobileMenuOpen(false);
  updateDocumentTitle();

  if (safeRoute === "home") {
    document.body.dataset.worldScene = "ocean";
    syncHeroFlareLoopState();
  } else {
    document.body.dataset.worldScene = "sanctuary";
    resetHeroFlare();
    stopHeroFlareLoop();
    if (safeRoute === "resources" || safeRoute === "solutions") {
      void ensureTemplatesLoaded();
      if (safeRoute === "resources") {
        requestAnimationFrame(() => observeMiniViewports($("#template-gallery-grid")));
      }
    }
  }

  if (scrollTop) {
    window.scrollTo({ top: 0, behavior: isReducedMotion ? "auto" : "smooth" });
  }
  scheduleScrollChoreography();
}

document.addEventListener("click", (e) => {
  const routeLink = e.target?.closest?.("a[data-route]");
  if (!routeLink) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  const targetRoute = routeLink.dataset.route || "home";
  setActiveView(targetRoute, { pushHistory: true, scrollTop: true });
});

window.addEventListener("popstate", () => {
  setActiveView(resolveRouteFromLocation(), { pushHistory: false, scrollTop: true });
});

/* -------------------------------------------------------------------------- */
/* 3. Live Cleanroom Template Registry Client (Strict Safe DOM Creation)      */
/* -------------------------------------------------------------------------- */
const FALLBACK_TEMPLATES = [
  {
    id: "coastal-glass-architecture",
    schema_version: "1.0.0",
    status: "published",
    featured: true,
    industry_key: "architecture",
    category: "showcase",
    mood: "coastal",
    preview_image: "/assets/templates/coastal-glass-architecture.webp",
    preview_video: "/assets/reel-02-coastal-villa.mp4",
    license: "GLOW_CLEANROOM_MIT_INSPIRED",
    source_inspiration: "AstroWind + Webstudio Cleanroom",
    mcp_compatible: true,
    blocks: [
      { id: "hero-panorama", type: "hero_cinema", label_vi: "Khung cảnh kiến trúc toàn màn hình", label_en: "Full-bleed architectural hero" },
      { id: "project-index", type: "portfolio_grid", label_vi: "Danh mục công trình tuyển chọn", label_en: "Curated project index" },
      { id: "private-viewing", type: "consultation_cta", label_vi: "Đặt lịch tham quan riêng tư", label_en: "Private viewing invitation" },
    ],
    vi: {
      title: "Kiến Trúc Kính Ven Biển",
      industry_label: "Kiến trúc & BĐS",
      tagline: "Trình diễn biệt thự nghỉ dưỡng và hồ sơ công trình tầm vóc.",
      description: "Bố cục tỷ lệ rộng giàu khoảng thở, tôn vinh mặt kính và ánh sáng tự nhiên.",
      sample_brand: "Aurelia Coastal Studio",
      sample_brief: "Xây dựng website giới thiệu 12 dự án biệt thự ven biển cao cấp cùng lịch hẹn tư vấn riêng.",
      highlights: ["Trình diễn 16:9", "Hồ sơ công trình", "Đặt lịch riêng tư"],
    },
    en: {
      title: "Coastal Glass Architecture",
      industry_label: "Architecture & Real Estate",
      tagline: "Showcase coastal villas and landmark architectural monographs.",
      description: "Generous widescreen framing crafted to highlight glass facades and horizon light.",
      sample_brand: "Aurelia Coastal Studio",
      sample_brief: "Build a monograph site showcasing 12 coastal villa commissions with a private client viewing scheduler.",
      highlights: ["16:9 framing", "Project dossiers", "Private viewing"],
    },
  },
];

let registryTemplates = [];
let registryIndustries = [];
let templatesLoaded = false;
let templatesPromise = null;

const galleryFilterState = {
  q: "",
  mood: "all",
  industry: "all",
};

async function ensureTemplatesLoaded() {
  if (templatesLoaded) return registryTemplates;
  if (templatesPromise) return templatesPromise;

  templatesPromise = fetch(withBasePath("/api/templates"), { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error("templates_fetch_failed"))))
    .then((data) => {
      if (data && data.ok === true && Array.isArray(data.templates) && data.templates.length > 0) {
        registryTemplates = data.templates;
        registryIndustries = Array.isArray(data.industries) ? data.industries : [];
        templatesLoaded = true;
      } else {
        registryTemplates = FALLBACK_TEMPLATES;
      }
    })
    .catch(() => {
      if (registryTemplates.length === 0) {
        registryTemplates = FALLBACK_TEMPLATES;
      }
    })
    .finally(() => {
      renderSolutionsGrid();
      renderResourceFilters();
      renderTemplateGallery();
    });

  return templatesPromise;
}

function moodLabel(mood) {
  if (mood === "botanical") return t("resources.moodBotanical");
  if (mood === "coastal") return t("resources.moodCoastal");
  if (mood === "editorial") return t("resources.moodEditorial");
  return t("resources.moodAll");
}

function renderSolutionsGrid() {
  const container = $("#solutions-grid");
  if (!container) return;

  const frag = document.createDocumentFragment();
  for (const pillar of SOLUTION_PILLARS) {
    const copy = pillar[currentLang] || pillar.vi;
    const matching = registryTemplates.filter((tpl) => pillar.industryKeys.includes(tpl.industry_key));
    const count = matching.length || pillar.industryKeys.length;
    const featuredTpl = matching[0];
    const secondaryTpl = matching[1];
    const featuredId = featuredTpl?.id || pillar.defaultTemplateId;
    const featuredImage = featuredTpl?.preview_image || `/assets/templates/${featuredId}.webp`;
    const featuredLoc = featuredTpl ? (featuredTpl[currentLang] || featuredTpl.vi) : null;

    const card = document.createElement("article");
    card.className = "solution-card";

    const media = document.createElement("div");
    media.className = "solution-card-media";

    const photo = document.createElement("img");
    photo.className = "solution-card-photo";
    photo.src = withBasePath(featuredImage);
    photo.alt = copy.title;
    photo.width = 1280;
    photo.height = 720;
    photo.loading = "lazy";
    photo.decoding = "async";

    const scrim = document.createElement("div");
    scrim.className = "solution-card-scrim";
    scrim.setAttribute("aria-hidden", "true");

    const top = document.createElement("div");
    top.className = "solution-card-top";
    const chip = document.createElement("span");
    chip.className = "solution-count-chip";
    chip.textContent =
      currentLang === "en"
        ? `${count} ${count === 1 ? "template" : "templates"}`
        : `${count} mẫu chuẩn`;

    const featuredPill = document.createElement("span");
    featuredPill.className = "solution-featured-pill";
    const baseTitle = featuredLoc?.title || featuredId;
    featuredPill.textContent = secondaryTpl ? `${baseTitle} +1` : baseTitle;
    top.append(chip, featuredPill);

    media.append(photo, scrim, top);

    const body = document.createElement("div");
    body.className = "solution-card-body";

    const h2 = document.createElement("h2");
    h2.textContent = copy.title;

    const desc = document.createElement("p");
    desc.textContent = copy.desc;

    const list = document.createElement("ul");
    list.className = "solution-benefits";
    for (const item of copy.benefits) {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    }

    const actions = document.createElement("div");
    actions.className = "solution-actions";

    const exploreBtn = document.createElement("button");
    exploreBtn.type = "button";
    exploreBtn.className = "pill pill-twilight-outline";
    exploreBtn.textContent = t("solutions.explore");
    exploreBtn.addEventListener("click", () => {
      galleryFilterState.industry = pillar.primaryIndustry;
      galleryFilterState.mood = "all";
      galleryFilterState.q = "";
      const searchEl = $("#resource-search");
      if (searchEl) searchEl.value = "";
      setActiveView("resources", { pushHistory: true, scrollTop: true });
      renderResourceFilters();
      renderTemplateGallery();
    });

    const studioLink = document.createElement("a");
    studioLink.className = "pill pill-neon-capsule";
    studioLink.href = withBasePath(
      `/workspace?template=${encodeURIComponent(featuredId)}&lang=${encodeURIComponent(currentLang)}`
    );
    studioLink.textContent = t("solutions.openStudio");

    actions.append(exploreBtn, studioLink);
    body.append(h2, desc, list, actions);
    card.append(media, body);
    frag.appendChild(card);
  }
  container.replaceChildren(frag);
}

function renderResourceFilters() {
  const moodWrap = $("#resource-mood-filters");
  if (moodWrap) {
    const moodFrag = document.createDocumentFragment();
    const moods = [
      { key: "all", label: t("resources.moodAll") },
      { key: "botanical", label: t("resources.moodBotanical") },
      { key: "coastal", label: t("resources.moodCoastal") },
      { key: "editorial", label: t("resources.moodEditorial") },
    ];
    for (const m of moods) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `filter-chip${galleryFilterState.mood === m.key ? " is-active" : ""}`;
      btn.textContent = m.label;
      btn.addEventListener("click", () => {
        galleryFilterState.mood = m.key;
        renderResourceFilters();
        renderTemplateGallery();
      });
      moodFrag.appendChild(btn);
    }
    moodWrap.replaceChildren(moodFrag);
  }

  const industryWrap = $("#resource-industry-filters");
  if (industryWrap) {
    const indFrag = document.createDocumentFragment();
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `filter-chip${galleryFilterState.industry === "all" ? " is-active" : ""}`;
    allBtn.textContent = t("resources.allIndustries");
    allBtn.addEventListener("click", () => {
      galleryFilterState.industry = "all";
      renderResourceFilters();
      renderTemplateGallery();
    });
    indFrag.appendChild(allBtn);

    for (const ind of registryIndustries) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `filter-chip${galleryFilterState.industry === ind.key ? " is-active" : ""}`;
      btn.textContent = currentLang === "en" ? ind.label_en : ind.label_vi;
      btn.addEventListener("click", () => {
        galleryFilterState.industry = ind.key;
        renderResourceFilters();
        renderTemplateGallery();
      });
      indFrag.appendChild(btn);
    }
    industryWrap.replaceChildren(indFrag);
  }
}

function getFilteredTemplates() {
  const q = galleryFilterState.q.trim().toLowerCase();
  return registryTemplates.filter((tpl) => {
    if (galleryFilterState.mood !== "all" && tpl.mood !== galleryFilterState.mood) return false;
    if (galleryFilterState.industry !== "all" && tpl.industry_key !== galleryFilterState.industry) return false;
    if (q) {
      const hay = [
        tpl.id,
        tpl.industry_key,
        tpl.mood,
        tpl.category,
        tpl.vi?.title,
        tpl.vi?.industry_label,
        tpl.vi?.tagline,
        tpl.vi?.description,
        ...(tpl.vi?.highlights || []),
        tpl.en?.title,
        tpl.en?.industry_label,
        tpl.en?.tagline,
        tpl.en?.description,
        ...(tpl.en?.highlights || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

let miniIframeResizeObserver = null;

function syncMiniIframeScale(viewportEl) {
  if (!viewportEl) return;
  const width = viewportEl.clientWidth;
  if (width > 0) {
    viewportEl.style.setProperty("--mini-scale", (width / 1280).toFixed(4));
  }
}

function observeMiniViewports(gridEl) {
  if (!gridEl) return;
  const viewports = $$(".template-mini-viewport", gridEl);
  for (const vp of viewports) syncMiniIframeScale(vp);
  if (typeof ResizeObserver === "function") {
    if (miniIframeResizeObserver) miniIframeResizeObserver.disconnect();
    miniIframeResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        syncMiniIframeScale(entry.target);
      }
    });
    for (const vp of viewports) miniIframeResizeObserver.observe(vp);
  }
}

function renderTemplateGallery() {
  const grid = $("#template-gallery-grid");
  const countEl = $("#resources-count");
  if (!grid) return;

  const items = getFilteredTemplates();
  if (countEl) {
    countEl.textContent =
      currentLang === "en"
        ? `Showing ${items.length} / ${registryTemplates.length} templates`
        : `Hiển thị ${items.length} / ${registryTemplates.length} mẫu chuẩn`;
  }

  const frag = document.createDocumentFragment();
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "gallery-empty";
    empty.textContent = t("resources.empty");
    frag.appendChild(empty);
    grid.replaceChildren(frag);
    return;
  }

  for (const tpl of items) {
    const loc = tpl[currentLang] || tpl.vi;
    const card = document.createElement("article");
    card.className = "template-card";
    card.dataset.templateId = tpl.id;

    const media = document.createElement("div");
    media.className = "template-card-media";

    const chrome = document.createElement("div");
    chrome.className = "template-browser-bar";
    chrome.setAttribute("aria-hidden", "true");
    const dots = document.createElement("span");
    dots.className = "template-browser-dots";
    dots.append(
      document.createElement("i"),
      document.createElement("i"),
      document.createElement("i")
    );
    const urlPill = document.createElement("span");
    urlPill.className = "template-browser-url";
    urlPill.textContent = `glow.web/${tpl.id}`;
    chrome.append(dots, urlPill);

    const miniViewport = document.createElement("div");
    miniViewport.className = "template-mini-viewport";
    if (tpl.preview_image) {
      miniViewport.style.backgroundImage = `linear-gradient(180deg, rgba(6, 16, 23, 0.24), rgba(6, 16, 23, 0.52)), url("${withBasePath(tpl.preview_image)}")`;
    }

    const miniFrame = document.createElement("iframe");
    miniFrame.className = "template-mini-iframe";
    miniFrame.src = withBasePath(
      `/api/templates/${encodeURIComponent(tpl.id)}/render?lang=${encodeURIComponent(currentLang)}`
    );
    miniFrame.setAttribute("sandbox", "allow-same-origin");
    miniFrame.setAttribute("loading", "lazy");
    miniFrame.setAttribute("tabindex", "-1");
    miniFrame.setAttribute("aria-hidden", "true");
    miniFrame.title = loc.title;

    const badges = document.createElement("div");
    badges.className = "template-card-badges";
    const indBadge = document.createElement("span");
    indBadge.className = "tpl-badge";
    indBadge.textContent = loc.industry_label;
    const licBadge = document.createElement("span");
    licBadge.className = "tpl-badge tpl-badge-cleanroom";
    licBadge.textContent = "GLOW Cleanroom";
    badges.append(indBadge, licBadge);

    miniViewport.append(miniFrame, badges);
    media.append(chrome, miniViewport);

    const body = document.createElement("div");
    body.className = "template-card-body";

    const meta = document.createElement("div");
    meta.className = "template-card-meta";
    const moodSpan = document.createElement("span");
    moodSpan.textContent = moodLabel(tpl.mood);
    const blockSpan = document.createElement("span");
    const blockCount = Array.isArray(tpl.blocks) ? tpl.blocks.length : 5;
    blockSpan.textContent =
      currentLang === "en" ? `${blockCount} JSON blocks` : `${blockCount} khối bố cục`;
    meta.append(moodSpan, blockSpan);

    const title = document.createElement("h3");
    title.textContent = loc.title;

    const tagline = document.createElement("p");
    tagline.className = "template-card-tagline";
    tagline.textContent = loc.tagline;

    const hlWrap = document.createElement("div");
    hlWrap.className = "template-card-highlights";
    for (const hl of (loc.highlights || []).slice(0, 3)) {
      const chip = document.createElement("span");
      chip.className = "template-hl-chip";
      chip.textContent = hl;
      hlWrap.appendChild(chip);
    }

    const actions = document.createElement("div");
    actions.className = "template-card-actions";

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "pill pill-twilight-outline";
    previewBtn.textContent = t("resources.preview");
    previewBtn.addEventListener("click", () => openTemplatePreviewModal(tpl, previewBtn));

    const useLink = document.createElement("a");
    useLink.className = "pill pill-neon-capsule";
    useLink.href = withBasePath(
      `/workspace?template=${encodeURIComponent(tpl.id)}&lang=${encodeURIComponent(currentLang)}`
    );
    useLink.textContent = t("resources.useTemplate");

    actions.append(previewBtn, useLink);
    body.append(meta, title, tagline, hlWrap, actions);
    card.append(media, body);
    frag.appendChild(card);
  }

  grid.replaceChildren(frag);
  requestAnimationFrame(() => observeMiniViewports(grid));
}

$("#resource-search")?.addEventListener("input", (e) => {
  galleryFilterState.q = String(e.target?.value || "");
  renderTemplateGallery();
});

/* -------------------------------------------------------------------------- */
/* 4. Rich Template Preview Modal (Live Website Iframe + HTML & JSON Source)  */
/* -------------------------------------------------------------------------- */
const templatePreviewModal = $("#template-preview-modal");
const closeTemplatePreviewBtn = $("#close-template-preview");
const templateStageWrap = $("#template-stage-wrap");
const previewLivePanel = $("#preview-live-panel");
const previewLiveIframe = $("#preview-live-iframe");
const previewLiveUrl = $("#preview-live-url");
const previewSourcePanel = $("#preview-source-panel");
const previewSourceMeta = $("#preview-source-meta");
const previewSourceCode = $("#preview-source-code");
const previewViewportSwitch = $("#preview-viewport-switch");
const copyTemplateHtmlBtn = $("#copy-template-html");
let activePreviewTemplate = null;
let activePreviewTab = "live";
let activePreviewSourceHtml = "";
let activePreviewSourceKey = "";
let lastTemplatePreviewTrigger = null;

function populateTemplatePreviewModal(tpl) {
  if (!tpl) return;
  const loc = tpl[currentLang] || tpl.vi;

  const indEl = $("#template-preview-industry");
  const titleEl = $("#template-preview-title");
  const tagEl = $("#template-preview-tagline");
  const brandEl = $("#template-preview-brand");
  const briefEl = $("#template-preview-brief");
  const useLink = $("#template-preview-use-link");
  const licEl = $("#template-preview-license");
  const blocksEl = $("#template-preview-blocks");
  const hlEl = $("#template-preview-highlights");

  if (indEl) indEl.textContent = `${loc.industry_label} · ${moodLabel(tpl.mood)}`;
  if (titleEl) titleEl.textContent = loc.title;
  if (tagEl) tagEl.textContent = loc.description || loc.tagline;
  if (brandEl) brandEl.textContent = loc.sample_brand;
  if (briefEl) briefEl.textContent = loc.sample_brief;
  if (useLink) {
    useLink.href = withBasePath(
      `/workspace?template=${encodeURIComponent(tpl.id)}&lang=${encodeURIComponent(currentLang)}`
    );
    useLink.textContent = t("resources.useTemplate");
  }
  if (licEl) licEl.textContent = `${tpl.source_inspiration} · v${tpl.schema_version}`;
  if (previewLiveUrl) previewLiveUrl.textContent = `glow.web/${tpl.id}?lang=${currentLang}`;

  if (blocksEl) {
    const frag = document.createDocumentFragment();
    for (const blk of tpl.blocks || []) {
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = currentLang === "en" ? blk.label_en : blk.label_vi;
      const typeSpan = document.createElement("code");
      typeSpan.className = "preview-block-type";
      typeSpan.textContent = blk.type;
      li.append(nameSpan, typeSpan);
      frag.appendChild(li);
    }
    blocksEl.replaceChildren(frag);
  }

  if (hlEl) {
    const frag = document.createDocumentFragment();
    for (const hl of loc.highlights || []) {
      const li = document.createElement("li");
      li.textContent = hl;
      frag.appendChild(li);
    }
    hlEl.replaceChildren(frag);
  }
}

function setPreviewViewport(mode) {
  const safeMode = mode === "mobile" ? "mobile" : "desktop";
  if (templateStageWrap) templateStageWrap.dataset.viewport = safeMode;
  $$("[data-preview-viewport]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.previewViewport === safeMode);
  });
}

async function loadTemplateSourceIntoModal(tpl) {
  if (!tpl || !previewSourceCode) return;
  const cacheKey = `${tpl.id}:${currentLang}`;
  if (activePreviewSourceKey === cacheKey && activePreviewSourceHtml) return;

  previewSourceCode.textContent = t("preview.loadingSource");
  if (previewSourceMeta) {
    previewSourceMeta.textContent = `${tpl.id} · ${tpl.license}`;
  }
  try {
    const res = await fetch(
      withBasePath(
        `/api/templates/${encodeURIComponent(tpl.id)}/source?lang=${encodeURIComponent(currentLang)}`
      ),
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const payload = await res.json();
    if (!payload || payload.ok !== true || typeof payload.html !== "string") {
      throw new Error("INVALID_SOURCE_PAYLOAD");
    }
    if (!activePreviewTemplate || activePreviewTemplate.id !== tpl.id) return;
    activePreviewSourceHtml = payload.html;
    activePreviewSourceKey = cacheKey;
    if (previewSourceMeta) {
      const count = Array.isArray(payload.blocks) ? payload.blocks.length : 0;
      previewSourceMeta.textContent = `${payload.id} · ${count} JSON blocks · ${payload.license}`;
    }
    const metaJson = JSON.stringify(
      {
        id: payload.id,
        schema_version: payload.schema_version,
        license: payload.license,
        source_inspiration: payload.source_inspiration,
        design_tokens: payload.design_tokens,
        blocks: payload.blocks,
      },
      null,
      2
    );
    previewSourceCode.textContent = `/* === TEMPLATE JSON METADATA === */\n${metaJson}\n\n<!-- === STANDALONE HTML + CSS === -->\n${payload.html}`;
  } catch {
    if (!activePreviewTemplate || activePreviewTemplate.id !== tpl.id) return;
    previewSourceCode.textContent = t("preview.sourceError");
  }
}

function setPreviewTab(tab) {
  const safeTab = tab === "source" ? "source" : "live";
  activePreviewTab = safeTab;
  if (templateStageWrap) templateStageWrap.dataset.mode = safeTab;
  $$("[data-preview-tab]").forEach((btn) => {
    const isActive = btn.dataset.previewTab === safeTab;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  previewLivePanel?.classList.toggle("hidden", safeTab !== "live");
  previewSourcePanel?.classList.toggle("hidden", safeTab !== "source");
  previewViewportSwitch?.classList.toggle("hidden", safeTab !== "live");
  if (safeTab === "source" && activePreviewTemplate) {
    void loadTemplateSourceIntoModal(activePreviewTemplate);
  }
}

function syncTemplatePreviewStage(tpl) {
  if (!tpl) return;
  const loc = tpl[currentLang] || tpl.vi;
  if (previewLiveIframe) {
    const renderUrl = withBasePath(
      `/api/templates/${encodeURIComponent(tpl.id)}/render?lang=${encodeURIComponent(currentLang)}`
    );
    if (previewLiveIframe.getAttribute("src") !== renderUrl) {
      previewLiveIframe.setAttribute("src", renderUrl);
    }
    previewLiveIframe.title = loc.title;
  }
  activePreviewSourceHtml = "";
  activePreviewSourceKey = "";
  if (activePreviewTab === "source") {
    void loadTemplateSourceIntoModal(tpl);
  }
}

function openTemplatePreviewModal(tpl, triggerEl) {
  if (!templatePreviewModal || !tpl) return;
  activePreviewTemplate = tpl;
  lastTemplatePreviewTrigger = triggerEl || null;
  populateTemplatePreviewModal(tpl);
  setPreviewViewport("desktop");
  setPreviewTab("live");
  syncTemplatePreviewStage(tpl);

  templatePreviewModal.classList.remove("hidden");
  templatePreviewModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeTemplatePreviewBtn?.focus();
}

function closeTemplatePreviewModal() {
  if (!templatePreviewModal || templatePreviewModal.classList.contains("hidden")) return;
  templatePreviewModal.classList.add("hidden");
  templatePreviewModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (previewLiveIframe) {
    previewLiveIframe.setAttribute("src", "about:blank");
  }
  activePreviewTemplate = null;
  activePreviewSourceHtml = "";
  activePreviewSourceKey = "";
  if (lastTemplatePreviewTrigger && typeof lastTemplatePreviewTrigger.focus === "function") {
    lastTemplatePreviewTrigger.focus();
  }
  lastTemplatePreviewTrigger = null;
}

$$("[data-preview-viewport]").forEach((btn) => {
  btn.addEventListener("click", () => setPreviewViewport(btn.dataset.previewViewport));
});
$$("[data-preview-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setPreviewTab(btn.dataset.previewTab));
});
copyTemplateHtmlBtn?.addEventListener("click", async () => {
  if (!activePreviewTemplate) return;
  if (!activePreviewSourceHtml) {
    await loadTemplateSourceIntoModal(activePreviewTemplate);
  }
  if (!activePreviewSourceHtml) return;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(activePreviewSourceHtml);
    } else {
      const ta = document.createElement("textarea");
      ta.value = activePreviewSourceHtml;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    copyTemplateHtmlBtn.textContent = t("preview.copiedHtml");
    setTimeout(() => {
      if (copyTemplateHtmlBtn) copyTemplateHtmlBtn.textContent = t("preview.copyHtml");
    }, 2000);
  } catch {
    /* clipboard blocked */
  }
});
closeTemplatePreviewBtn?.addEventListener("click", closeTemplatePreviewModal);
$("[data-close-template-preview]")?.addEventListener("click", closeTemplatePreviewModal);

/* -------------------------------------------------------------------------- */
/* 5. Pricing Monthly / Annual Billing Toggle                                 */
/* -------------------------------------------------------------------------- */
$("#pricing-billing-toggle")?.addEventListener("click", () => {
  billingMode = billingMode === "annual" ? "monthly" : "annual";
  updatePricingDisplay();
});

/* -------------------------------------------------------------------------- */
/* 6. Unified Sign In / Quick Sign Up Modal (#auth-modal)                     */
/* -------------------------------------------------------------------------- */
const authModal = $("#auth-modal");
const openAuthBtn = $("#open-auth-modal");
const closeAuthBtn = $("#close-auth-modal");
let lastAuthTrigger = null;

function setAuthTab(tab) {
  const isSignup = tab === "signup";
  $("#auth-tab-signin")?.classList.toggle("is-active", !isSignup);
  $("#auth-tab-signup")?.classList.toggle("is-active", isSignup);
  $("#auth-tab-signin")?.setAttribute("aria-selected", String(!isSignup));
  $("#auth-tab-signup")?.setAttribute("aria-selected", String(isSignup));
  $("#auth-panel-signin")?.classList.toggle("hidden", isSignup);
  $("#auth-panel-signup")?.classList.toggle("hidden", !isSignup);
}

function openAuthModal(triggerEl, defaultTab = "signin") {
  if (!authModal) return;
  setMobileMenuOpen(false);
  lastAuthTrigger = triggerEl || openAuthBtn || null;
  setAuthTab(defaultTab);
  authModal.classList.remove("hidden");
  authModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeAuthBtn?.focus();
}

function closeAuthModal() {
  if (!authModal || authModal.classList.contains("hidden")) return;
  authModal.classList.add("hidden");
  authModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastAuthTrigger && typeof lastAuthTrigger.focus === "function") {
    lastAuthTrigger.focus();
  }
  lastAuthTrigger = null;
}

openAuthBtn?.addEventListener("click", () => openAuthModal(openAuthBtn, "signin"));
$$("[data-open-auth]").forEach((btn) => {
  btn.addEventListener("click", () => openAuthModal(btn, "signin"));
});
closeAuthBtn?.addEventListener("click", closeAuthModal);
$("[data-close-auth]")?.addEventListener("click", closeAuthModal);
$$("[data-auth-tab]").forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => setAuthTab(tabBtn.dataset.authTab));
});

$("#auth-signin-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#auth-signin-email")?.value.trim() || "";
  if (!email) {
    $("#auth-signin-email")?.focus();
    return;
  }
  const params = new URLSearchParams({
    next: withBasePath("/workspace"),
    login_hint: email,
    lang: currentLang,
  });
  window.location.assign(`${withBasePath("/auth/login")}?${params.toString()}`);
});

$("#auth-signup-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#auth-signup-email")?.value.trim() || "";
  if (!email) {
    $("#auth-signup-email")?.focus();
    return;
  }
  const brand = $("#auth-signup-brand")?.value.trim() || "";
  const params = new URLSearchParams({
    next: withBasePath("/workspace"),
    login_hint: email,
    mode: "signup",
    lang: currentLang,
  });
  if (brand) params.set("brand", brand);
  window.location.assign(`${withBasePath("/auth/login")}?${params.toString()}`);
});

/* -------------------------------------------------------------------------- */
/* 7. Preserved 4-Step Intake Wizard & Public Capsule Contract                */
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
      "Open ChatGPT and use the connected GLOW Web plugin to start the protected mission from this capsule.",
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
    btn.textContent = ok ? t("wizard.copied") : t("wizard.copy");
    setTimeout(() => {
      btn.textContent = t("wizard.copy");
    }, 1400);
  }
});

/* -------------------------------------------------------------------------- */
/* 8. Live Public Runtime Signal (/api/public/profile & /readyz)              */
/* -------------------------------------------------------------------------- */
async function refreshRuntime() {
  try {
    const [profile, ready] = await Promise.all([
      fetch(withBasePath("/api/public/profile"), { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("profile"))
      ),
      fetch(withBasePath("/readyz"), { cache: "no-store" }).then(async (r) => ({
        ok: r.ok,
        body: await r.json().catch(() => ({})),
      })),
    ]);
    const rawLabel = typeof profile.status_label === "string" ? profile.status_label.trim() : "";
    runtimeReadyState = ready.ok ? "ready" : "degraded";
    if (runtimeStatus) {
      runtimeStatus.textContent =
        !rawLabel || /^public experience/i.test(rawLabel) ? t("status.online") : rawLabel;
    }
    if (readyState) {
      readyState.textContent = ready.ok ? t("status.ready") : t("status.limited");
    }
    document.body.dataset.runtime = runtimeReadyState;
  } catch {
    runtimeReadyState = "unknown";
    updateRuntimeStatusText();
    document.body.dataset.runtime = "unknown";
  }
}

/* -------------------------------------------------------------------------- */
/* 9. Frame-Locked Video 01 Seamless Loop Flare (0.95s Seam Window · rAF)     */
/* -------------------------------------------------------------------------- */
const FLARE_BEFORE_SEC = 0.45;
const FLARE_AFTER_SEC = 0.5;
const FLARE_TOTAL_SEC = FLARE_BEFORE_SEC + FLARE_AFTER_SEC;
let heroFlareRafId = 0;
let isHeroInViewport = true;

function resetHeroFlare() {
  if (!heroSeamFlare) return;
  heroSeamFlare.style.setProperty("--flare-intensity", "0");
  heroSeamFlare.style.setProperty("--flare-progress", "0");
}

function stopHeroFlareLoop() {
  if (heroFlareRafId) {
    window.cancelAnimationFrame(heroFlareRafId);
    heroFlareRafId = 0;
  }
}

function stepHeroSeamFlare() {
  heroFlareRafId = 0;
  if (
    !heroVideo ||
    !heroSeamFlare ||
    isReducedMotion ||
    document.hidden ||
    !isHeroInViewport ||
    activeView !== "home" ||
    heroVideo.paused
  ) {
    resetHeroFlare();
    return;
  }

  const duration = heroVideo.duration;
  const currentTime = heroVideo.currentTime;
  if (Number.isFinite(duration) && duration > 1.5) {
    let intensity = 0;
    let u = 0;

    if (currentTime >= duration - FLARE_BEFORE_SEC) {
      u = clamp01((currentTime - (duration - FLARE_BEFORE_SEC)) / FLARE_TOTAL_SEC);
      intensity = Math.pow(Math.sin(Math.PI * u), 1.45);
    } else if (currentTime <= FLARE_AFTER_SEC) {
      u = clamp01((FLARE_BEFORE_SEC + currentTime) / FLARE_TOTAL_SEC);
      intensity = Math.pow(Math.sin(Math.PI * u), 1.45);
    }

    heroSeamFlare.style.setProperty("--flare-intensity", intensity.toFixed(4));
    heroSeamFlare.style.setProperty("--flare-progress", u.toFixed(4));
  } else {
    resetHeroFlare();
  }

  heroFlareRafId = window.requestAnimationFrame(stepHeroSeamFlare);
}

function syncHeroFlareLoopState() {
  if (
    !heroVideo ||
    !heroSeamFlare ||
    isReducedMotion ||
    document.hidden ||
    !isHeroInViewport ||
    activeView !== "home" ||
    heroVideo.paused
  ) {
    stopHeroFlareLoop();
    resetHeroFlare();
    return;
  }
  if (!heroFlareRafId) {
    heroFlareRafId = window.requestAnimationFrame(stepHeroSeamFlare);
  }
}

heroVideo?.addEventListener("play", syncHeroFlareLoopState);
heroVideo?.addEventListener("pause", syncHeroFlareLoopState);
heroVideo?.addEventListener("loadedmetadata", syncHeroFlareLoopState);
document.addEventListener("visibilitychange", syncHeroFlareLoopState);

/* -------------------------------------------------------------------------- */
/* 10. GPU-Smooth Scroll Choreography, 5-Stop Micro-Rail & World Atmosphere   */
/* -------------------------------------------------------------------------- */
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

let preferredFinaleRailTarget = "intake";

function getHomeSeamOffsets() {
  if (window.innerWidth >= 1024) {
    return { seam: 120, stone: 56 };
  }
  return { seam: 0, stone: 0 };
}

function updateChapterRail(vh, scrollY, maxScroll) {
  if (activeView !== "home" || !chapterRail || railItems.length === 0) return;

  let activeTarget = "top";
  if (window.innerWidth >= 1024) {
    const tops = getFrameTops();
    const threshold1 = Math.round((tops[0] + tops[1]) * 0.5);
    const threshold2 = Math.round((tops[1] + tops[2]) * 0.5);
    const threshold3 = Math.round((tops[2] + tops[3]) * 0.5);

    if (scrollY >= threshold3) {
      if (maxScroll > tops[3] + 60 && scrollY >= maxScroll - 28) {
        activeTarget = "intake";
      } else {
        activeTarget = preferredFinaleRailTarget;
      }
    } else {
      preferredFinaleRailTarget = "craft";
      if (scrollY >= threshold2) {
        activeTarget = "chapter-villa";
      } else if (scrollY >= threshold1) {
        activeTarget = "chapter-botanical";
      } else {
        activeTarget = "top";
      }
    }
  } else {
    const probeY = vh * 0.44;
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

  const heroThreshold =
    activeView === "home" && heroSection ? Math.max(80, vh - 160) : 24;
  siteHeader?.classList.toggle("is-scrolled", scrollY > heroThreshold);

  if (activeView !== "home") return;

  updateChapterRail(vh, scrollY, maxScroll);

  if (isReducedMotion) {
    heroSection?.style.setProperty("--hero-p", "0");
    kineticWords.forEach((w) => w.style.setProperty("--w-lit", "1"));
    parallaxEditorials.forEach((el) => el.style.setProperty("--ch-drift", "0"));
    craftThread?.style.setProperty("--craft-p", "1");
    return;
  }

  if (heroSection) {
    const heroSpan = Math.max(vh, 1);
    const heroP = clamp01(scrollY / heroSpan);
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
    const start = vh * 1.05;
    const end = vh * 0.15;
    const raw = (start - rect.top) / Math.max(start - end + rect.height * 0.35, 1);
    const p = clamp01(raw);
    const total = kineticWords.length;
    for (let i = 0; i < total; i += 1) {
      const wordStart = (i / total) * 0.65;
      const wordSpan = 0.35;
      const lit = 0.94 + 0.06 * clamp01((p - wordStart) / wordSpan);
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

/* -------------------------------------------------------------------------- */
/* 10.5. Silky-Light Frame-Locked Scroll Engine (Home Desktop >= 1024px)      */
/* -------------------------------------------------------------------------- */
const HOME_FRAME_IDS = ["top", "chapter-botanical", "chapter-villa", "sanctuary-world"];
let snapRafId = 0;
let snapAnimating = false;
let snapLockUntil = 0;

function cancelHomeFrameSnap() {
  if (snapRafId) {
    window.cancelAnimationFrame(snapRafId);
    snapRafId = 0;
  }
  snapAnimating = false;
  snapLockUntil = 0;
}

function areAllModalsClosed() {
  const modalIds = ["auth-modal", "intake-modal", "cinema-modal", "template-preview-modal"];
  for (const id of modalIds) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains("hidden")) {
      return false;
    }
  }
  return true;
}

function isHomeFrameSnapActive() {
  return Boolean(
    mainContent &&
      mainContent.dataset.activeView === "home" &&
      activeView === "home" &&
      window.innerWidth >= 1024 &&
      !isReducedMotion &&
      areAllModalsClosed()
  );
}

function getFrameTops() {
  const scrollY = window.scrollY || 0;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const { seam, stone } = getHomeSeamOffsets();
  return HOME_FRAME_IDS.map((id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const rawTop = Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY));
    if (id === "chapter-botanical" || id === "chapter-villa") {
      return Math.min(maxScroll, rawTop + seam);
    }
    if (id === "sanctuary-world") {
      const targetTop = Math.min(maxScroll, rawTop + stone);
      return Math.abs(maxScroll - targetTop) <= 16 ? maxScroll : targetTop;
    }
    return rawTop;
  });
}

function getNearestFrameIndex(scrollY, tops) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < tops.length; i += 1) {
    const dist = Math.abs(tops[i] - scrollY);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function animateScrollToY(targetY, durationMs = 540) {
  cancelHomeFrameSnap();
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const destY = Math.max(0, Math.min(maxScroll, Math.round(targetY)));
  const startY = window.scrollY || 0;
  const delta = destY - startY;

  if (isReducedMotion || Math.abs(delta) < 2) {
    window.scrollTo({ top: destY, behavior: "instant" });
    return;
  }

  const startTime = performance.now();
  snapAnimating = true;
  snapLockUntil = startTime + durationMs + 150;

  const stepFrame = (now) => {
    if (!isHomeFrameSnapActive()) {
      cancelHomeFrameSnap();
      return;
    }
    const elapsed = now - startTime;
    const t = Math.min(1, Math.max(0, elapsed / durationMs));
    const eased = 1 - Math.pow(1 - t, 3);
    const nextY = t >= 1 ? destY : Math.round(startY + delta * eased);
    window.scrollTo({ top: nextY, behavior: "instant" });

    if (t < 1) {
      snapRafId = window.requestAnimationFrame(stepFrame);
    } else {
      snapRafId = 0;
      snapAnimating = false;
    }
  };

  snapRafId = window.requestAnimationFrame(stepFrame);
}

function stepHomeFrameByDirection(dir) {
  const tops = getFrameTops();
  const scrollY = window.scrollY || 0;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const idx = getNearestFrameIndex(scrollY, tops);
  const lastIdx = tops.length - 1;

  if (idx === lastIdx || scrollY >= tops[lastIdx] - 24) {
    if (dir > 0) {
      if (scrollY < maxScroll - 4) {
        animateScrollToY(maxScroll, 420);
        return true;
      }
      return false;
    }
    if (scrollY > tops[lastIdx] + 28) {
      animateScrollToY(tops[lastIdx], 420);
      return true;
    }
    animateScrollToY(tops[lastIdx - 1], 540);
    return true;
  }

  const nextIdx = Math.max(0, Math.min(lastIdx, idx + dir));
  if (nextIdx === idx) return false;
  animateScrollToY(tops[nextIdx], 540);
  return true;
}

function initHomeFrameSnap() {
  window.addEventListener(
    "wheel",
    (e) => {
      if (!isHomeFrameSnapActive()) return;
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const now = performance.now();
      if (snapAnimating || now < snapLockUntil) {
        e.preventDefault();
        return;
      }

      if (Math.abs(e.deltaY) < 6) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const moved = stepHomeFrameByDirection(dir);
      if (moved) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (!isHomeFrameSnapActive()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const target = e.target;
    const tag = target && typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      (target && target.isContentEditable) ||
      (tag === "BUTTON" && e.key === " ")
    ) {
      return;
    }

    if (e.key === "PageDown") {
      e.preventDefault();
      stepHomeFrameByDirection(1);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      stepHomeFrameByDirection(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      const tops = getFrameTops();
      animateScrollToY(tops[0], 540);
    } else if (e.key === "End") {
      e.preventDefault();
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      animateScrollToY(maxScroll, 540);
    }
  });

  $$(".rail-item, .scroll-cue").forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      if (!isHomeFrameSnapActive()) return;
      const targetId =
        anchor.dataset.railTarget ||
        (anchor.getAttribute("href") || "").replace(/^#/, "");
      if (!targetId) return;

      const tops = getFrameTops();
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      let destY = null;

      if (targetId === "top") {
        destY = tops[0];
      } else if (targetId === "chapter-botanical") {
        destY = tops[1];
      } else if (targetId === "chapter-villa") {
        destY = tops[2];
      } else if (targetId === "sanctuary-world" || targetId === "craft") {
        preferredFinaleRailTarget = "craft";
        destY = tops[3];
      } else if (targetId === "intake") {
        preferredFinaleRailTarget = "intake";
        if (maxScroll <= tops[3] + 24) {
          destY = tops[3];
        } else {
          const el = document.getElementById("intake");
          const elTop = el ? Math.round(el.getBoundingClientRect().top + (window.scrollY || 0)) : tops[3];
          destY = Math.min(maxScroll, Math.max(tops[3], elTop - 72));
        }
      }

      if (destY !== null) {
        e.preventDefault();
        animateScrollToY(destY, 540);
        scheduleScrollChoreography();
      }
    });
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth < 1024) {
        cancelHomeFrameSnap();
      }
    },
    { passive: true }
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Pointer-Tracking Specular Glass, Magnetic Buttons & Sanctuary Caustics */
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
/* 12. Cinema Video Viewport Lifecycle & Reduced-Motion Controller            */
/* -------------------------------------------------------------------------- */
const cinemaVideos = $$("video[data-cinema-video]");
const manualOverrides = new Map();

function setButtonPausedState(btn, paused) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(paused));
  const label = $(".control-label", btn);
  if (label) label.textContent = paused ? t("video.play") : t("video.pause");
}

function syncToggleButton(key, paused) {
  const directBtn = $(`[data-toggle-video="${key}"]`);
  if (directBtn) setButtonPausedState(directBtn, paused);
}

function syncAllVideoButtonsText() {
  cinemaVideos.forEach((video) => {
    syncToggleButton(video.dataset.cinemaVideo, video.paused);
  });
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
  syncHeroFlareLoopState();
  updateScrollChoreography();
}

const videoVisibilityObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      const key = video.dataset.cinemaVideo;
      const override = manualOverrides.get(key);

      if (key === "hero") {
        isHeroInViewport = entry.isIntersecting;
      }

      if (entry.isIntersecting) {
        if (isReducedMotion && override !== "playing") {
          video.pause();
          syncToggleButton(key, true);
          if (key === "hero") syncHeroFlareLoopState();
          return;
        }
        if (override === "paused") {
          video.pause();
          syncToggleButton(key, true);
          if (key === "hero") syncHeroFlareLoopState();
          return;
        }
        safePlay(video);
        syncToggleButton(key, false);
      } else {
        video.pause();
      }
      if (key === "hero") syncHeroFlareLoopState();
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
    if (key === "hero") syncHeroFlareLoopState();
  });
});

reducedMotionQuery.addEventListener?.("change", (e) => {
  isReducedMotion = e.matches;
  applyReducedMotionState();
});

/* -------------------------------------------------------------------------- */
/* 13. Full-Screen Cinema Lightbox Modal (Real 1080p MP4 + ESC Focus Return)  */
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

  const src = withBasePath(triggerEl.dataset.src || "/assets/reel-01-botanical.mp4");
  const poster = withBasePath(triggerEl.dataset.poster || "/assets/reel-01-botanical.webp");
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
  cinemaVideo?.pause();
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
/* 14. Collapsible 4-Step Intake Modal Controller (Closed by Default + ESC)   */
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
$$("[data-open-intake]").forEach((btn) => {
  btn.addEventListener("click", () => openIntakeModal(btn));
});
closeIntakeModalBtn?.addEventListener("click", closeIntakeModal);
$("[data-close-intake]")?.addEventListener("click", closeIntakeModal);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    setMobileMenuOpen(false);
    closeCinemaModal();
    closeIntakeModal();
    closeAuthModal();
    closeTemplatePreviewModal();
  }
});

/* -------------------------------------------------------------------------- */
/* 15. Initial Boot                                                           */
/* -------------------------------------------------------------------------- */
if (BASE_PATH) {
  $$("img[data-asset-src]").forEach((img) => {
    const assetPath = img.dataset.assetSrc;
    if (assetPath) img.src = withBasePath(assetPath);
  });
  $$('link[rel="preload"][href^="/assets/"]').forEach((lnk) => {
    const href = lnk.getAttribute("href");
    if (href) lnk.setAttribute("href", withBasePath(href));
  });
  $$('video[poster^="/assets/"]').forEach((vid) => {
    const poster = vid.getAttribute("poster");
    if (poster) vid.setAttribute("poster", withBasePath(poster));
  });
  $$('source[src^="/assets/"]').forEach((srcEl) => {
    const s = srcEl.getAttribute("src");
    if (s) {
      srcEl.setAttribute("src", withBasePath(s));
      const parentVid = srcEl.parentElement;
      if (parentVid && typeof parentVid.load === "function") parentVid.load();
    }
  });
  $$("a[href]").forEach((anchor) => {
    const rawHref = anchor.getAttribute("href") || "";
    if (
      rawHref === "/" ||
      rawHref.startsWith("/workspace") ||
      rawHref.startsWith("/auth/login") ||
      rawHref.startsWith("/privacy")
    ) {
      if (rawHref.startsWith("/auth/login?next=%2Fworkspace")) {
        anchor.setAttribute(
          "href",
          withBasePath(
            `/auth/login?next=${encodeURIComponent(withBasePath("/workspace"))}`
          )
        );
      } else {
        anchor.setAttribute("href", withBasePath(rawHref));
      }
    }
  });
}
setStep(1);
applyLanguage(currentLang, false);
setActiveView(activeView, { pushHistory: false, scrollTop: false });
initHomeFrameSnap();
void ensureTemplatesLoaded();
void refreshRuntime();
syncHeroFlareLoopState();
