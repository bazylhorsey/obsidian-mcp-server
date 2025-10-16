/**
 * Local file system connector for Obsidian vaults
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import chokidar, { FSWatcher } from 'chokidar';
import { BaseConnector } from './BaseConnector.js';
import { parseNote, serializeNote, countWords } from '../utils/markdown.js';
import type { Note, SearchOptions, VaultOperationResult, VaultStats, VaultConfig } from '../types/index.js';

export class LocalConnector extends BaseConnector {
  private watcher?: FSWatcher;
  private notesCache: Map<string, Note> = new Map();

  constructor(config: VaultConfig) {
    super(config);
    if (!config.path) {
      throw new Error('Local vault path is required');
    }
  }

  async initialize(): Promise<VaultOperationResult<void>> {
    try {
      // Verify vault path exists
      const stats = await fs.stat(this.config.path!);
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: `Path ${this.config.path} is not a directory`
        };
      }

      // Setup file watcher for changes
      this.watcher = chokidar.watch(path.join(this.config.path!, '**/*.md'), {
        persistent: true,
        ignoreInitial: true
      });

      this.watcher.on('change', (filePath: string) => this.handleFileChange(filePath));
      this.watcher.on('unlink', (filePath: string) => this.handleFileDelete(filePath));

      // Load all notes into cache
      await this.refreshCache();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize local vault: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getNote(notePath: string): Promise<VaultOperationResult<Note>> {
    try {
      const fullPath = path.join(this.config.path!, notePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      const note = parseNote(notePath, content, stats);

      // Add backlinks
      note.backlinks = this.getBacklinks(notePath);

      // Update cache
      this.notesCache.set(notePath, note);

      return { success: true, data: note };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getAllNotes(): Promise<VaultOperationResult<Note[]>> {
    try {
      if (this.notesCache.size === 0) {
        await this.refreshCache();
      }

      const notes = Array.from(this.notesCache.values());
      return { success: true, data: notes };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get all notes: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async searchNotes(options: SearchOptions): Promise<VaultOperationResult<Note[]>> {
    try {
      const allNotes = await this.getAllNotes();
      if (!allNotes.success || !allNotes.data) {
        return allNotes;
      }

      let results = allNotes.data;

      // Filter by folder
      if (options.folder) {
        results = results.filter(note => note.path.startsWith(options.folder!));
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        results = results.filter(note => {
          if (!note.tags) return false;
          return options.tags!.some(tag => note.tags!.includes(tag));
        });
      }

      // Search in title and content
      if (options.query) {
        const query = options.query.toLowerCase();
        results = results.filter(note => {
          const inTitle = note.title.toLowerCase().includes(query);
          const inContent = options.includeContent && note.content.toLowerCase().includes(query);
          return inTitle || inContent;
        });
      }

      // Apply limit
      if (options.limit && options.limit > 0) {
        results = results.slice(0, options.limit);
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search notes: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async createNote(notePath: string, content: string, frontmatter?: Record<string, any>): Promise<VaultOperationResult<Note>> {
    try {
      const fullPath = path.join(this.config.path!, notePath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      const note: Note = {
        path: notePath,
        title: frontmatter?.title || notePath.split('/').pop()?.replace('.md', '') || 'Untitled',
        content,
        frontmatter
      };

      const serialized = serializeNote(note);
      await fs.writeFile(fullPath, serialized, 'utf-8');

      // Parse the note to get full structure
      const result = await this.getNote(notePath);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to create note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async updateNote(notePath: string, content: string, frontmatter?: Record<string, any>): Promise<VaultOperationResult<Note>> {
    try {
      const fullPath = path.join(this.config.path!, notePath);

      const note: Note = {
        path: notePath,
        title: frontmatter?.title || notePath.split('/').pop()?.replace('.md', '') || 'Untitled',
        content,
        frontmatter
      };

      const serialized = serializeNote(note);
      await fs.writeFile(fullPath, serialized, 'utf-8');

      // Parse the note to get full structure
      const result = await this.getNote(notePath);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to update note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async deleteNote(notePath: string): Promise<VaultOperationResult<void>> {
    try {
      const fullPath = path.join(this.config.path!, notePath);
      await fs.unlink(fullPath);
      this.notesCache.delete(notePath);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getStats(): Promise<VaultOperationResult<VaultStats>> {
    try {
      const allNotes = await this.getAllNotes();
      if (!allNotes.success || !allNotes.data) {
        return { success: false, error: 'Failed to get notes for stats' };
      }

      const notes = allNotes.data;
      const tags = new Map<string, number>();
      let totalWords = 0;
      let totalLinks = 0;
      let lastModified: Date | undefined;

      for (const note of notes) {
        totalWords += countWords(note.content);

        if (note.links) {
          totalLinks += note.links.length;
        }

        if (note.tags) {
          for (const tag of note.tags) {
            tags.set(tag, (tags.get(tag) || 0) + 1);
          }
        }

        if (note.modifiedAt && (!lastModified || note.modifiedAt > lastModified)) {
          lastModified = note.modifiedAt;
        }
      }

      const stats: VaultStats = {
        noteCount: notes.length,
        totalWords,
        totalLinks,
        tags,
        lastModified
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get stats: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async listFolders(): Promise<VaultOperationResult<string[]>> {
    try {
      const folders = new Set<string>();
      const notes = await this.getAllNotes();

      if (notes.success && notes.data) {
        for (const note of notes.data) {
          const folder = path.dirname(note.path);
          if (folder !== '.') {
            folders.add(folder);
          }
        }
      }

      return { success: true, data: Array.from(folders).sort() };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list folders: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async listTags(): Promise<VaultOperationResult<string[]>> {
    try {
      const tags = new Set<string>();
      const notes = await this.getAllNotes();

      if (notes.success && notes.data) {
        for (const note of notes.data) {
          if (note.tags) {
            note.tags.forEach(tag => tags.add(tag));
          }
        }
      }

      return { success: true, data: Array.from(tags).sort() };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list tags: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
    this.notesCache.clear();
  }

  // Private helper methods

  private async refreshCache(): Promise<void> {
    const pattern = path.join(this.config.path!, '**/*.md');
    const files = await glob(pattern, { ignore: '**/node_modules/**' });

    this.notesCache.clear();

    for (const fullPath of files) {
      try {
        const relativePath = path.relative(this.config.path!, fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);

        const note = parseNote(relativePath, content, stats);
        this.notesCache.set(relativePath, note);
      } catch (error) {
        console.error(`Failed to parse note ${fullPath}:`, error);
      }
    }

    // Add backlinks to all notes
    for (const note of this.notesCache.values()) {
      note.backlinks = this.getBacklinks(note.path);
    }
  }

  private getBacklinks(notePath: string): Array<{ source: string; target: string; type: 'internal' | 'embed' | 'external'; text?: string }> {
    const backlinks: Array<{ source: string; target: string; type: 'internal' | 'embed' | 'external'; text?: string }> = [];
    const noteTitle = notePath.replace('.md', '');

    for (const note of this.notesCache.values()) {
      if (note.links) {
        for (const link of note.links) {
          if (link.target === noteTitle || link.target === notePath) {
            backlinks.push(link);
          }
        }
      }
    }

    return backlinks;
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const relativePath = path.relative(this.config.path!, filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      const note = parseNote(relativePath, content, stats);
      note.backlinks = this.getBacklinks(relativePath);

      this.notesCache.set(relativePath, note);
    } catch (error) {
      console.error(`Failed to handle file change for ${filePath}:`, error);
    }
  }

  private handleFileDelete(filePath: string): void {
    const relativePath = path.relative(this.config.path!, filePath);
    this.notesCache.delete(relativePath);
  }
}
