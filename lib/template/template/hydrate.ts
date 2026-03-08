import { randomBytes } from "crypto";
import { stringify } from "yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HydrateOptions {
  /** The domain to substitute for SERVICE_FQDN_* variables (e.g. "n8n.example.com"). */
  domain?: string;
  /** User-supplied env var overrides — applied last, win over generated values. */
  envVars?: Record<string, string>;
  /**
   * Port parsed from the "# port: 1234" comment at the top of the Coolify
   * template YAML. Used as a fallback when no SERVICE_FQDN_*_PORT bare env
   * entries exist in the template (some templates use the comment only).
   * fetch.ts should parse this and pass it in.
   */
  fallbackPort?: number;
}

export interface HydrateResult {
  /** Final docker-compose.yml content as a string — ready to write to disk. */
  composeYaml: string;
  /**
   * Flat key=value pairs for the .env file.
   * Includes all generated secrets + user overrides.
   * Write this next to docker-compose.yml on the EC2 instance.
   */
  envFileContent: string;
  /**
   * The resolved variables map — useful for CDK CfnOutputs.
   * Keys are variable names (e.g. SERVICE_PASSWORD_N8N), values are resolved strings.
   */
  resolvedVars: Record<string, string>;
  /**
   * List of ports that need to be opened in the Security Group.
   * Only populated when no domain is provided.
   */
  exposedPorts: number[];
}

// Bare env entry like "SERVICE_FQDN_N8N_5678" (no "=" sign)
// Name = N8N, port = 5678
interface FqdnEntry {
  fullKey: string; // e.g. SERVICE_FQDN_N8N_5678
  serviceName: string; // e.g. N8N  (always uppercase)
  port: number; // e.g. 5678
}

// ---------------------------------------------------------------------------
// Main hydrate function
// ---------------------------------------------------------------------------

/**
 * Resolves all Coolify magic variables and generic placeholders in a parsed
 * template object and returns a ready-to-deploy docker-compose.yml string
 * plus a .env file string.
 *
 * Coolify magic variable reference:
 *   SERVICE_FQDN_<NAME>_<PORT>  — bare env entry; tells Coolify which port to proxy.
 *                                  We strip it and add Traefik labels / port mappings instead.
 *   ${SERVICE_FQDN_<NAME>}      — domain value only, no protocol  (e.g. n8n.example.com)
 *   ${SERVICE_URL_<NAME>}       — full URL with https://  (e.g. https://n8n.example.com)
 *   ${SERVICE_PASSWORD_<NAME>}  — 32-char random alphanumeric string
 *   ${SERVICE_USER_<NAME>}      — 8-char random lowercase username
 *   ${SERVICE_BASE64_<NAME>}    — 32 random bytes, base64-encoded
 *   ${SERVICE_BASE64_64_<NAME>} — 64 random bytes, base64-encoded
 *   ${SERVICE_BASE64URL_<NAME>} — 32 random bytes, base64url-encoded
 *
 * Generic placeholders:
 *   ${VAR:-default}             — uses VAR from envVars, or 'default' if missing
 *   $VAR                        — uses VAR from envVars, or empty if missing
 */
export function hydrateTemplate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedTemplate: any,
  options: HydrateOptions
): HydrateResult {
  const { domain, envVars = {}, fallbackPort } = options;

  // Deep-clone so we don't mutate the caller's object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const template: any = JSON.parse(JSON.stringify(parsedTemplate));

  // ------------------------------------------------------------------
  // Pass 1: scan every service's environment list for SERVICE_FQDN_* / SERVICE_URL_*
  // entries. Collect them, strip them from the list, record port info.
  // ------------------------------------------------------------------
  const fqdnEntries: FqdnEntry[] = [];
  const services: Record<string, unknown> = template.services ?? {};

  for (const [, svc] of Object.entries(services)) {
    const service = svc as Record<string, unknown>;
    if (!Array.isArray(service.environment)) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kept: any[] = [];
    for (const entry of service.environment as string[]) {
      const match = /^(?:SERVICE_FQDN|SERVICE_URL)_([A-Z0-9_]+)(?:_(\d+))?$/.exec(entry);
      if (match) {
        fqdnEntries.push({
          fullKey: entry,
          serviceName: match[1],
          port: match[2] ? parseInt(match[2], 10) : (fallbackPort ?? 80),
        });
      } else {
        kept.push(entry);
      }
    }
    service.environment = kept;
  }

  // ------------------------------------------------------------------
  // Pass 2: build the resolved variable map by scanning the whole
  // template string for placeholder patterns.
  // ------------------------------------------------------------------
  const templateStr = JSON.stringify(template);
  const resolvedVars: Record<string, string> = {};

  // strategy 1 & 2: ${VAR...}
  const bracedRe = /(?<!\$)\$\{([A-Z0-9_]+)(?::-?([^}]*))?\}/g;
  let m: RegExpExecArray | null;
  while ((m = bracedRe.exec(templateStr)) !== null) {
    const key = m[1];
    const defaultValue = m[2]; // undefined if not present
    if (!(key in resolvedVars)) {
      resolvedVars[key] = resolveVariable(key, domain, envVars, defaultValue);
    }
  }

  // strategy 3: $VAR (unbraced)
  const unbracedRe = /(?<!\$)\$([A-Z0-9_]+)/g;
  while ((m = unbracedRe.exec(templateStr)) !== null) {
    const key = m[1];
    if (!(key in resolvedVars)) {
      resolvedVars[key] = resolveVariable(key, domain, envVars);
    }
  }

  // strategy 4: generated keys for stripped FQDN/URL entries
  for (const entry of fqdnEntries) {
    const fqdnKey = `SERVICE_FQDN_${entry.serviceName}`;
    const urlKey = `SERVICE_URL_${entry.serviceName}`;
    if (!(fqdnKey in resolvedVars)) {
      resolvedVars[fqdnKey] = generateValue(fqdnKey, domain);
    }
    if (!(urlKey in resolvedVars)) {
      resolvedVars[urlKey] = generateValue(urlKey, domain);
    }
  }

  // Final override from user
  for (const [k, v] of Object.entries(envVars)) {
    resolvedVars[k] = v;
  }

  // ------------------------------------------------------------------
  // Pass 3: substitute all placeholders in the template JSON string
  // ------------------------------------------------------------------
  let hydratedStr = templateStr;

  // Order by key length descending to avoid partial matches
  const sortedKeys = Object.keys(resolvedVars).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const val = resolvedVars[key];
    const bracedWithDefaultRe = new RegExp(`\\\\$\\\\{${key}(?::-?[^}]*)?\\\\}`, "g");
    hydratedStr = hydratedStr.replace(bracedWithDefaultRe, val);

    const unbracedSubRe = new RegExp(`(?<!\\\\$)\\\\$${key}\\\\b`, "g");
    hydratedStr = hydratedStr.replace(unbracedSubRe, val);
  }

  // Unescape double dollars: $$ -> $
  hydratedStr = hydratedStr.replace(/\$\$/g, "$");

  // ------------------------------------------------------------------
  // Pass 4: parse back, then add Traefik labels / port mappings
  // ------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydratedTemplate: any = JSON.parse(hydratedStr);

  if (fqdnEntries.length > 0) {
    patchNetworkingAndProxy(hydratedTemplate, fqdnEntries, domain);
  } else if (fallbackPort) {
    const firstServiceKey = Object.keys(hydratedTemplate.services ?? {})[0];
    if (firstServiceKey) {
      const syntheticEntries: FqdnEntry[] = [{
        fullKey: `SERVICE_FQDN_APP_${fallbackPort}`,
        serviceName: firstServiceKey.toUpperCase(),
        port: fallbackPort,
      }];
      patchNetworkingAndProxy(hydratedTemplate, syntheticEntries, domain, firstServiceKey);
    }
  }

  const exposedPorts: number[] = [];
  if (!domain) {
    for (const entry of fqdnEntries) {
      if (!exposedPorts.includes(entry.port)) {
        exposedPorts.push(entry.port);
      }
    }
    if (fallbackPort && !exposedPorts.includes(fallbackPort)) {
      exposedPorts.push(fallbackPort);
    }
  }

  if (template.volumes) {
    hydratedTemplate.volumes = template.volumes;
  }

  for (const svc of Object.values(hydratedTemplate.services ?? {}) as Record<string, any>[]) {
    if (!svc.volumes || !Array.isArray(svc.volumes)) continue;

    svc.volumes = svc.volumes.map((vol: any) => {
      if (typeof vol === "string") {
        const parts = vol.split(":");
        const source = parts[0];
        const isBindMount = source.startsWith("/") || source.startsWith(".");
        if (!isBindMount) {
          parts[0] = `./volumes/${source}`;
          return parts.join(":");
        }
      } else if (typeof vol === "object" && vol !== null) {
        if (vol.type !== "bind" && vol.type !== "tmpfs" && vol.source) {
          const isBindMount = vol.source.startsWith("/") || vol.source.startsWith(".");
          if (!isBindMount) {
            vol.type = "bind";
            vol.source = `./volumes/${vol.source}`;
          }
        }
      }
      return vol;
    });
  }

  delete hydratedTemplate.volumes;

  const composeYaml = stringify(hydratedTemplate, {
    lineWidth: 0,
    singleQuote: false,
  });

  const envFileLines: string[] = [
    "# Auto-generated by cdk-templates. Do not edit manually.",
    "# Re-deploying the stack regenerates all SERVICE_* values.",
    "",
  ];

  for (const [k, v] of Object.entries(resolvedVars)) {
    if (!k.startsWith("SERVICE_FQDN") && !k.startsWith("SERVICE_URL")) {
      envFileLines.push(`${k}=${v}`);
    }
  }

  for (const [k, v] of Object.entries(envVars)) {
    if (!(k in resolvedVars)) {
      envFileLines.push(`${k}=${v}`);
    }
  }

  return {
    composeYaml,
    envFileContent: envFileLines.join("\n") + "\n",
    resolvedVars,
    exposedPorts,
  };
}

function patchNetworkingAndProxy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: any,
  fqdnEntries: FqdnEntry[],
  domain?: string,
  knownServiceKey?: string
): void {
  const services: Record<string, unknown> = template.services ?? {};
  const proxiedServiceKeys = new Set<string>();

  for (const entry of fqdnEntries) {
    const targetServiceKey = knownServiceKey ?? findServiceForFqdn(entry.serviceName, services);
    if (!targetServiceKey) {
      console.warn(`[hydrate] Could not find compose service for FQDN entry ${entry.fullKey} — skipping label injection`);
      continue;
    }

    proxiedServiceKeys.add(targetServiceKey);
    const svc = services[targetServiceKey] as Record<string, unknown>;

    if (domain) {
      const routerName = entry.serviceName.toLowerCase();
      const labels: string[] = Array.isArray(svc.labels)
        ? (svc.labels as string[])
        : [];

      labels.push(
        "traefik.enable=true",
        `traefik.http.routers.${routerName}.rule=Host(\`${domain}\`)`,
        `traefik.http.routers.${routerName}.entrypoints=websecure`,
        `traefik.http.routers.${routerName}.tls=true`,
        `traefik.http.routers.${routerName}.tls.certresolver=letsencrypt`,
        `traefik.http.services.${routerName}.loadbalancer.server.port=${entry.port}`
      );

      svc.labels = labels;
    } else {
      const ports: string[] = Array.isArray(svc.ports)
        ? (svc.ports as string[])
        : [];
      const mapping = `${entry.port}:${entry.port}`;
      if (!ports.includes(mapping)) {
        ports.push(mapping);
      }
      svc.ports = ports;
    }
  }

  if (domain && proxiedServiceKeys.size > 0) {
    for (const svcKey of Object.keys(services)) {
      addToNetwork(services[svcKey] as Record<string, any>, "coolify");
    }

    template.networks = template.networks ?? {};
    template.networks.coolify = { external: true };
  }
}

function findServiceForFqdn(
  fqdnServiceName: string,
  services: Record<string, unknown>
): string | undefined {
  const lowerFqdnName = fqdnServiceName.toLowerCase();
  if (lowerFqdnName in services) return lowerFqdnName;
  const match = Object.keys(services).find((k) => lowerFqdnName.startsWith(k.toLowerCase()));
  if (match) return match;
  return Object.keys(services).find((k) => k.toLowerCase().startsWith(lowerFqdnName));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addToNetwork(svc: Record<string, any>, networkName: string): void {
  if (!svc.networks) {
    svc.networks = [networkName];
  } else if (Array.isArray(svc.networks)) {
    if (!svc.networks.includes(networkName)) {
      svc.networks.push(networkName);
    }
  } else if (typeof svc.networks === "object") {
    svc.networks[networkName] = null;
  }
}

function resolveVariable(
  key: string,
  domain: string | undefined,
  envVars: Record<string, string>,
  defaultValue?: string
): string {
  if (key in envVars) return envVars[key];
  if (key.startsWith("SERVICE_") || key.startsWith("COOLIFY_VOLUME_")) {
    return generateValue(key, domain);
  }
  return defaultValue ?? "";
}

function generateValue(key: string, domain?: string): string {
  if (key.startsWith("SERVICE_PASSWORD_64_")) return randomAlphanumeric(64);
  if (key.startsWith("SERVICE_PASSWORD_")) return randomAlphanumeric(32);
  if (key.startsWith("SERVICE_USER_")) return randomAlphanumeric(8).toLowerCase();
  if (key.startsWith("SERVICE_BASE64_64_")) return randomBytes(64).toString("base64");
  if (key.startsWith("SERVICE_BASE64URL_")) return randomBytes(32).toString("base64url");
  if (key.startsWith("SERVICE_BASE64_")) return randomBytes(32).toString("base64");
  if (key.startsWith("SERVICE_FQDN_")) return domain ?? "localhost";
  if (key.startsWith("SERVICE_URL_")) return domain ? `https://${domain}` : "http://localhost";
  if (key.startsWith("COOLIFY_VOLUME_")) {
    const name = key.replace("COOLIFY_VOLUME_", "").toLowerCase();
    return `./volumes/${name}`;
  }
  throw new Error(`[hydrate] Unknown SERVICE_* variable pattern: ${key}`);
}

function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}
