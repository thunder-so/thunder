import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Runs Nixpacks CLI to generate a Dockerfile during the CDK synth phase.
 */
export function generateNixpacksDockerfile(
  rootDir: string,
  buildProps?: any
): string {
  const absRootDir = path.resolve(rootDir || '.');
  if (!fs.existsSync(absRootDir)) {
    throw new Error(`[nixpacks] Source directory does not exist: ${absRootDir}`);
  }

  const installCmd = buildProps?.installcmd ? `--install-cmd "${buildProps.installcmd}"` : '';
  const buildCmd = buildProps?.buildcmd ? `--build-cmd "${buildProps.buildcmd}"` : '';
  const startCmd = buildProps?.startcmd ? `--start-cmd "${buildProps.startcmd}"` : '';
  const runtimeVersion = buildProps?.runtime_version?.toString() || '20';

  console.log(`[nixpacks] Running Nixpacks for ${absRootDir}`);

  // Construct the nixpacks command
  const nixpacksCmd = [
    'DOCKER_BUILDKIT=1',
    'DOCKER_CLI_EXPERIMENTAL=enabled',
    'nixpacks build',
    `--env NIXPACKS_NODE_VERSION=${runtimeVersion}`,
    `--out "${absRootDir}"`,
    `"${absRootDir}"`,
    installCmd,
    buildCmd,
    startCmd,
  ].filter(Boolean).join(' ');

  try {
    execSync(nixpacksCmd, { cwd: absRootDir, encoding: 'utf8', shell: '/bin/bash' });
  } catch (err: any) {
    throw new Error(`[nixpacks] Build failed: ${err.message}`);
  }

  return '.nixpacks/Dockerfile';
}
