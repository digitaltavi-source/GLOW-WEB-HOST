import { z } from "zod";

export const WebRequest = z.object({
  request_id: z.string().min(1).max(128),
  operation: z.enum(["create_web_mission","get_work","get_capability_plan","submit_capability_contributions","submit_work","inspect_blocked_stage","recover_blocked_stage","approve_stage","get_status","get_delivery","get_next_factory_capability_handshake","next_factory_control"]),
  role: z.enum(["client","operator","unspecified"]).default("unspecified"),
  input: z.record(z.string(), z.unknown()),
  locale: z.string().min(2).max(32).default("vi-VN")
}).strict();

export const PublicError = z.object({
  code: z.string().min(1).max(128),
  message: z.string().min(1).max(1000),
  retryable: z.boolean()
}).strict();

export const WebResponse = z.object({
  request_id: z.string(),
  status: z.enum(["accepted","completed","blocked","degraded","failed"]),
  exposure: z.enum(["PUBLIC_DECLASSIFIED","MODEL_SESSION_PRIVATE"]).default("PUBLIC_DECLASSIFIED"),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  public_evidence: z.array(z.record(z.string(), z.unknown())).default([]),
  errors: z.array(PublicError).default([])
}).strict();

export type WebRequestType = z.infer<typeof WebRequest>;
export type WebResponseType = z.infer<typeof WebResponse>;
