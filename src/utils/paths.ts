/**
 * Vault path safety helpers.
 *
 * Every caller-supplied path that is turned into an absolute filesystem path
 * must be resolved through `resolveVaultPath`, so that it cannot escape the
 * selected vault root.
 *
 * See issue #3: canvas and template tools previously joined untrusted paths
 * straight onto the vault path, which allowed a malicious MCP client to read
 * and write arbitrary files reachable by the server process.
 */

import path from 'path';

/**
 * Thrown when a caller-supplied path is unusable or would resolve outside the
 * selected vault.
 */
export class VaultPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultPathError';
  }
}

/**
 * Check whether `candidatePath` is a strict descendant of `vaultPath`.
 *
 * Uses `path.relative` instead of a string prefix comparison so that sibling
 * directories sharing a name prefix (`/vault-backup` next to `/vault`) and any
 * resolved `..` segments are handled correctly.
 */
export function isInsideVault(vaultPath: string, candidatePath: string): boolean {
  const root = path.resolve(vaultPath);
  const target = path.resolve(candidatePath);
  const relative = path.relative(root, target);

  // Resolving to the vault root itself is never a valid note/canvas/template
  // path, so treat it as outside.
  if (relative === '') {
    return false;
  }

  // `path.relative` returns an absolute path when the two paths are on
  // different roots or drives.
  if (path.isAbsolute(relative)) {
    return false;
  }

  // Only `..` as a whole segment escapes. `..foo` is a legitimate file name.
  return relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

/**
 * Resolve a vault-relative path to an absolute path, rejecting anything that
 * would leave the vault.
 *
 * Rejects null bytes, absolute paths, and `..` traversal segments, then
 * re-checks the resolved path against the vault root as defense in depth.
 *
 * @param vaultPath Absolute or cwd-relative vault root.
 * @param relativePath Vault-relative path supplied by a caller.
 * @returns The absolute, vault-contained path.
 * @throws {VaultPathError} If the path is empty, absolute, or escapes the vault.
 */
export function resolveVaultPath(vaultPath: string, relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new VaultPathError('Path is required');
  }

  if (relativePath.includes('\0')) {
    throw new VaultPathError('Path contains a null byte');
  }

  if (path.isAbsolute(relativePath)) {
    throw new VaultPathError(`Absolute paths are not allowed: ${relativePath}`);
  }

  // Split on both separators: on POSIX a backslash is a legal filename
  // character, but rejecting `..\` there costs nothing and keeps the rule
  // identical across platforms.
  const segments = relativePath.split(/[\\/]+/);
  if (segments.includes('..')) {
    throw new VaultPathError(`Path traversal is not allowed: ${relativePath}`);
  }

  const root = path.resolve(vaultPath);
  const resolved = path.resolve(root, relativePath);

  if (!isInsideVault(root, resolved)) {
    throw new VaultPathError(`Path resolves outside the vault: ${relativePath}`);
  }

  return resolved;
}