import { get } from "https";
import { parse } from "yaml";

const COOLIFY_TEMPLATES_BASE_URL =
  "https://raw.githubusercontent.com/coollabsio/coolify/refs/heads/v4.x/templates/compose";

export interface FetchResult {
  parsed: unknown;
  port?: number;
}

/**
 * Fetches a Coolify service template YAML from the official GitHub repo.
 * Runs at CDK synth time — not on the EC2 instance.
 */
export async function fetchTemplate(slug: string): Promise<FetchResult> {
  const url = `${COOLIFY_TEMPLATES_BASE_URL}/${slug}.yaml`;
  console.log(`[fetch] Downloading Coolify template: ${url}`);

  const raw = await httpsGet(url);
  
  // Extract port from comment: # port: 8096
  const portMatch = /^#\s*port:\s*(\d+)/m.exec(raw);
  const port = portMatch ? parseInt(portMatch[1], 10) : undefined;
  
  const parsed = parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `[fetch] Template "${slug}" did not parse to a valid YAML object.`
    );
  }

  return { parsed, port };
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (!location) {
          reject(new Error(`[fetch] Redirect with no Location header`));
          return;
        }
        resolve(httpsGet(location));
        return;
      }

      if (res.statusCode !== 200) {
        reject(
          new Error(
            `[fetch] HTTP ${res.statusCode} fetching template from ${url}`
          )
        );
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}
