import path from 'path';
import { isInsideVault, resolveVaultPath, VaultPathError } from '../paths.js';

describe('Vault path utils', () => {
  const vault = path.resolve('/tmp/test-vault');

  describe('isInsideVault', () => {
    it('accepts a direct child', () => {
      expect(isInsideVault(vault, path.join(vault, 'note.md'))).toBe(true);
    });

    it('accepts a nested descendant', () => {
      expect(isInsideVault(vault, path.join(vault, 'a', 'b', 'note.md'))).toBe(true);
    });

    it('rejects the vault root itself', () => {
      expect(isInsideVault(vault, vault)).toBe(false);
    });

    it('rejects a parent directory', () => {
      expect(isInsideVault(vault, path.dirname(vault))).toBe(false);
    });

    it('rejects a traversal that escapes the vault', () => {
      expect(isInsideVault(vault, path.join(vault, '..', 'etc', 'passwd'))).toBe(false);
    });

    it('does not confuse a sibling with a shared name prefix', () => {
      // /tmp/test-vault-backup must not be treated as inside /tmp/test-vault
      expect(isInsideVault(vault, `${vault}-backup/secret.md`)).toBe(false);
    });

    it('treats a traversal that lands back inside as inside', () => {
      expect(isInsideVault(vault, path.join(vault, 'a', '..', 'b', 'note.md'))).toBe(true);
    });
  });

  describe('resolveVaultPath', () => {
    it('resolves a normal vault-relative path', () => {
      expect(resolveVaultPath(vault, 'folder/note.md')).toBe(path.join(vault, 'folder', 'note.md'));
    });

    it('rejects a missing path', () => {
      expect(() => resolveVaultPath(vault, '')).toThrow(VaultPathError);
    });

    it('rejects an absolute path', () => {
      expect(() => resolveVaultPath(vault, '/etc/passwd')).toThrow(/Absolute paths are not allowed/);
    });

    it('rejects a null byte', () => {
      expect(() => resolveVaultPath(vault, 'note.md\0.png')).toThrow(/null byte/);
    });

    it('rejects a leading traversal', () => {
      expect(() => resolveVaultPath(vault, '../outside.canvas')).toThrow(/Path traversal is not allowed/);
    });

    it('rejects an embedded traversal', () => {
      expect(() => resolveVaultPath(vault, 'sub/../../outside.canvas')).toThrow(/Path traversal is not allowed/);
    });

    it('rejects a backslash traversal', () => {
      expect(() => resolveVaultPath(vault, '..\\outside.canvas')).toThrow(/Path traversal is not allowed/);
    });

    it('rejects deep traversal payloads', () => {
      expect(() => resolveVaultPath(vault, '../../../../../../etc/passwd')).toThrow(/Path traversal is not allowed/);
    });

    it('allows a file whose name merely starts with dots', () => {
      expect(resolveVaultPath(vault, '..notes/..draft.md')).toBe(
        path.join(vault, '..notes', '..draft.md')
      );
    });

    it('allows dot-prefixed hidden files', () => {
      expect(resolveVaultPath(vault, '.obsidian/workspace.json')).toBe(
        path.join(vault, '.obsidian', 'workspace.json')
      );
    });

    it('resolves against a relative vault path', () => {
      const relativeVault = path.relative(process.cwd(), vault);
      expect(resolveVaultPath(relativeVault, 'note.md')).toBe(path.join(vault, 'note.md'));
    });
  });
});