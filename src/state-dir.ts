import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

export type StateDirResolution = {
  path: string;
  mode: "EXPLICIT_ABSOLUTE" | "HOME_PERSISTENT";
  ignoredRelativeLegacy: boolean;
};

function safeNamespace(raw: string): string {
  const normalized=raw.trim().toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"");
  return normalized || "default";
}

export function resolveProtectedStateDir(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir()
): StateDirResolution {
  const configured=(env.GLOW_NODE_STATE_DIR ?? "").trim();
  if(configured && isAbsolute(configured)){
    return {path:resolve(configured),mode:"EXPLICIT_ABSOLUTE",ignoredRelativeLegacy:false};
  }

  const configuredRoot=(env.GLOW_PERSISTENT_STATE_ROOT ?? "").trim();
  const root=configuredRoot && isAbsolute(configuredRoot)
    ? resolve(configuredRoot)
    : resolve(home,".glow-web-state");

  let namespace="default";
  const mcpUrl=(env.GLOW_PUBLIC_MCP_URL ?? "").trim();
  if(mcpUrl){
    try { namespace=safeNamespace(new URL(mcpUrl).hostname); }
    catch { namespace="default"; }
  }

  return {
    path:resolve(root,namespace),
    mode:"HOME_PERSISTENT",
    ignoredRelativeLegacy:Boolean(configured)
  };
}
