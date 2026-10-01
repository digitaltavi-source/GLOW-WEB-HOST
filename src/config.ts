export type HostConfig = {
  protectedServiceUrl: string | null;
  protectedServiceToken: string | null;
  port: number;
  inProcessProtected?: boolean;
};

export function loadConfig(env = process.env): HostConfig {
  const inProcessProtected = env.GLOW_PROTECTED_INPROCESS === "1";
  const port = Number(env.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("CONFIG_PORT_INVALID");

  if (inProcessProtected) {
    return {
      protectedServiceUrl: null,
      protectedServiceToken: null,
      port,
      inProcessProtected: true
    };
  }

  const protectedServiceUrl = env.GLOW_PROTECTED_SERVICE_URL?.trim();
  const protectedServiceToken = env.GLOW_PROTECTED_SERVICE_TOKEN?.trim();

  if (!protectedServiceUrl) throw new Error("CONFIG_PROTECTED_SERVICE_URL_REQUIRED");
  if (!protectedServiceToken) throw new Error("CONFIG_PROTECTED_SERVICE_TOKEN_REQUIRED");

  const parsed = new URL(protectedServiceUrl);
  if (parsed.protocol !== "https:" && env.GLOW_ALLOW_INSECURE_LOCAL !== "1") {
    throw new Error("CONFIG_HTTPS_REQUIRED");
  }

  return {
    protectedServiceUrl: parsed.toString().replace(/\/$/, ""),
    protectedServiceToken,
    port,
    inProcessProtected: false
  };
}
