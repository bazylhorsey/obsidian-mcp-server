/**
 * Regression tests for vault path traversal (issue #3).
 *
 * These run against real files in a temp directory so that the assertions
 * cover actual reads/writes, not just the path helper.
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { CanvasService } from '../CanvasService.js';
import { TemplateService } from '../TemplateService.js';

describe('Vault path traversal (issue #3)', () => {
  let vault: string;
  let outsideDir: string;
  let secretCanvas: string;
  let secretTemplate: string;
  let outsideWriteTarget: string;

  const canvas = new CanvasService();
  const templates = new TemplateService();

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-mcp-traversal-'));
    vault = path.join(base, 'vault');
    outsideDir = path.join(base, 'outside');

    await fs.mkdir(path.join(vault, 'sub'), { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });

    secretCanvas = path.join(outsideDir, 'secret.canvas');
    secretTemplate = path.join(outsideDir, 'secret-template.md');
    outsideWriteTarget = path.join(outsideDir, 'pwned.md');

    await fs.writeFile(secretCanvas, JSON.stringify({ nodes: [], edges: [] }), 'utf-8');
    await fs.writeFile(secretTemplate, '# secret template\n', 'utf-8');
  });

  // Payloads covering the three reported sinks plus common variants.
  const traversalPaths = [
    '../outside/secret.canvas',
    '../../outside/secret.canvas',
    'sub/../../outside/secret.canvas',
    '../outside/secret-template.md',
  ];

  describe('CanvasService', () => {
    it('reads a canvas inside the vault', async () => {
      await fs.writeFile(
        path.join(vault, 'sub', 'ok.canvas'),
        JSON.stringify({ nodes: [], edges: [] }),
        'utf-8'
      );

      const result = await canvas.readCanvas(vault, 'sub/ok.canvas');

      expect(result.success).toBe(true);
    });

    it.each(traversalPaths)('refuses to read a traversing canvas path: %s', async (badPath) => {
      const result = await canvas.readCanvas(vault, badPath);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Path traversal is not allowed/);
    });

    it('refuses to read via an absolute path', async () => {
      const result = await canvas.readCanvas(vault, secretCanvas);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Absolute paths are not allowed/);
    });

    it('refuses to write a canvas outside the vault', async () => {
      const result = await canvas.writeCanvas(vault, '../outside/pwned.canvas', {
        nodes: [],
        edges: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Path traversal is not allowed/);
      await expect(fs.access(outsideWriteTarget.replace('.md', '.canvas'))).rejects.toBeTruthy();
    });

    it('refuses createCanvas outside the vault', async () => {
      const result = await canvas.createCanvas(vault, '../outside/created.canvas');

      expect(result.success).toBe(false);
      await expect(fs.access(path.join(outsideDir, 'created.canvas'))).rejects.toBeTruthy();
    });

    it('refuses to add a node through a traversing canvas path', async () => {
      const result = await canvas.addTextNode(vault, '../outside/secret.canvas', {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        text: 'injected'
      });

      expect(result.success).toBe(false);
    });

    it('refuses to delete a node through a traversing canvas path', async () => {
      const result = await canvas.deleteNode(vault, '../outside/secret.canvas', 'any-node');

      expect(result.success).toBe(false);
    });
  });

  describe('TemplateService', () => {
    it('reads a template inside the vault', async () => {
      await fs.mkdir(path.join(vault, 'Templates'), { recursive: true });
      await fs.writeFile(path.join(vault, 'Templates', 'daily.md'), '# Daily\n', 'utf-8');

      const result = await templates.getTemplate(vault, 'Templates/daily.md');

      expect(result.success).toBe(true);
    });

    it('refuses to read a template outside the vault', async () => {
      const result = await templates.getTemplate(vault, '../outside/secret-template.md');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Path traversal is not allowed/);
    });

    it('refuses to render a template outside the vault', async () => {
      const result = await templates.renderTemplate(vault, '../outside/secret-template.md');

      expect(result.success).toBe(false);
    });

    it('refuses to write the created note outside the vault', async () => {
      await fs.mkdir(path.join(vault, 'Templates'), { recursive: true });
      await fs.writeFile(path.join(vault, 'Templates', 'daily.md'), '# Daily\n', 'utf-8');

      const result = await templates.createFromTemplate(
        vault,
        'Templates/daily.md',
        '../outside/pwned.md'
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Path traversal is not allowed/);
      // The escape target must not exist.
      await expect(fs.access(outsideWriteTarget)).rejects.toBeTruthy();
    });

    it('still creates notes inside the vault', async () => {
      await fs.mkdir(path.join(vault, 'Templates'), { recursive: true });
      await fs.writeFile(path.join(vault, 'Templates', 'daily.md'), '# Daily\n', 'utf-8');

      const result = await templates.createFromTemplate(
        vault,
        'Templates/daily.md',
        'sub/note.md'
      );

      expect(result.success).toBe(true);
      const written = await fs.readFile(path.join(vault, 'sub', 'note.md'), 'utf-8');
      expect(written).toContain('# Daily');
    });
  });
});