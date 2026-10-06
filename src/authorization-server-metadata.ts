export type ProviderAuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  code_challenge_methods_supported?: string[];
};

function normalizeUrl(raw: unknown, label: string, requireHttps = true) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`${label}_REQUIRED`);
  let parsed: URL;
  try { parsed = new URL(raw.trim()); }
  catch { throw new Error(`${label}_INVALID_URL`); }
  if (requireHttps && parsed.protocol !== "https:") throw new Error(`${label}_HTTPS_REQUIRED`);
  if (parsed.username || parsed.password) throw new Error(`${label}_USERINFO_FORBIDDEN`);
  return parsed.toString().replace(/\/$/, "");
}

function cleanArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out=value.filter((v):v is string=>typeof v==="string" && Boolean(v.trim())).map(v=>v.trim());
  return out.length ? [...new Set(out)] : undefined;
}

export async function fetchProviderAuthorizationServerMetadata(
  oauthIssuer: string,
  fetchImpl: typeof fetch = fetch
): Promise<ProviderAuthorizationServerMetadata> {
  const issuer=normalizeUrl(oauthIssuer,"OAUTH_PROVIDER_ISSUER");
  const discoveryUrl=`${issuer}/.well-known/openid-configuration`;
  const response=await fetchImpl(discoveryUrl,{headers:{accept:"application/json"}});
  if(!response.ok) throw new Error(`OAUTH_PROVIDER_DISCOVERY_HTTP_${response.status}`);
  const raw=await response.json() as Record<string,unknown>;
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) throw new Error("OAUTH_PROVIDER_DISCOVERY_INVALID");
  const discoveredIssuer=normalizeUrl(raw.issuer,"OAUTH_PROVIDER_DISCOVERED_ISSUER");
  if(discoveredIssuer!==issuer) throw new Error("OAUTH_PROVIDER_ISSUER_MISMATCH");

  const registrationRaw=raw.registration_endpoint;
  return {
    issuer:discoveredIssuer,
    authorization_endpoint:normalizeUrl(raw.authorization_endpoint,"OAUTH_PROVIDER_AUTHORIZATION_ENDPOINT"),
    token_endpoint:normalizeUrl(raw.token_endpoint,"OAUTH_PROVIDER_TOKEN_ENDPOINT"),
    ...(typeof registrationRaw==="string" && registrationRaw.trim()
      ? {registration_endpoint:normalizeUrl(registrationRaw,"OAUTH_PROVIDER_REGISTRATION_ENDPOINT")}
      : {}),
    ...(cleanArray(raw.scopes_supported) ? {scopes_supported:cleanArray(raw.scopes_supported)!} : {}),
    ...(cleanArray(raw.response_types_supported) ? {response_types_supported:cleanArray(raw.response_types_supported)!} : {}),
    ...(cleanArray(raw.grant_types_supported) ? {grant_types_supported:cleanArray(raw.grant_types_supported)!} : {}),
    ...(cleanArray(raw.token_endpoint_auth_methods_supported) ? {token_endpoint_auth_methods_supported:cleanArray(raw.token_endpoint_auth_methods_supported)!} : {}),
    ...(cleanArray(raw.code_challenge_methods_supported) ? {code_challenge_methods_supported:cleanArray(raw.code_challenge_methods_supported)!} : {})
  };
}

export async function buildPublicAuthorizationServerMetadata(args:{
  publicIssuer:string;
  oauthIssuer:string;
  fetchImpl?:typeof fetch;
}) {
  const publicIssuer=normalizeUrl(args.publicIssuer,"PUBLIC_AUTHORIZATION_SERVER",false);
  const provider=await fetchProviderAuthorizationServerMetadata(args.oauthIssuer,args.fetchImpl??fetch);
  return {
    issuer:publicIssuer,
    authorization_endpoint:provider.authorization_endpoint,
    token_endpoint:provider.token_endpoint,
    ...(provider.registration_endpoint ? {registration_endpoint:provider.registration_endpoint} : {}),
    ...(provider.scopes_supported ? {scopes_supported:provider.scopes_supported} : {}),
    ...(provider.response_types_supported ? {response_types_supported:provider.response_types_supported} : {}),
    ...(provider.grant_types_supported ? {grant_types_supported:provider.grant_types_supported} : {}),
    ...(provider.token_endpoint_auth_methods_supported ? {token_endpoint_auth_methods_supported:provider.token_endpoint_auth_methods_supported} : {}),
    ...(provider.code_challenge_methods_supported ? {code_challenge_methods_supported:provider.code_challenge_methods_supported} : {})
  };
}
