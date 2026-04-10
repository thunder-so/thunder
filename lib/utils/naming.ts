/**
 * Sanitize a string to be used as part of a resource ID or AWS resource name.
 * It removes non-alphanumeric characters (replacing with hyphens),
 * collapses multiple hyphens, and trims leading/trailing hyphens.
 */
function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getResourceIdPrefix(
  application: string,
  service: string,
  environment: string,
): string {
  const sApp = sanitize(application).substring(0, 7);
  const sService = sanitize(service).substring(0, 7);
  const sEnv = sanitize(environment).substring(0, 7);

  return `${sApp}-${sService}-${sEnv}`.substring(0, 23).replace(/-$/, "");
}
