# GLOW Web — Website connection

**Owner:** GLOW-WEB-HOST public website/workspace adapter
**Public surface:** the website, user workspace and declassified API responses

The website gives customers a straightforward experience to describe a project, review permitted previews, follow understandable progress and make their own authorized decisions.

- Present plain-language progress only, such as **Đã tiếp nhận → Đang tìm hiểu → Đang thiết kế → Đang thực hiện → Đang kiểm tra → Chờ bạn duyệt → Hoàn tất**.
- Use only server-authorized, customer-safe status fields. Do not infer private process steps from time elapsed, local UI state or a connected ChatGPT session.
- Never display internal stage labels, specialist coverage, proprietary execution plans, raw approval/evidence receipts or restricted identities in public UI or logs.
- Ask the protected service for authorized actions through a bounded public API, not by executing private processing inside the browser.
- Show clear unavailable/paused states when the protected service cannot confirm progress; do not display a false success state.

**Change boundary:** website presentation may evolve independently of the GPT/MCP transport. Shared identity, permission, status/declassification and runtime contracts require regression across both channels. No website button can override protected service release authority.

**State:** boundary contract only. This file is not proof that the complete website workspace is implemented or deployed.
