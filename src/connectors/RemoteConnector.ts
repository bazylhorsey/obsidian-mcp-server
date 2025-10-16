/**
 * Remote vault connector via HTTP/REST API
 * Connects to Obsidian Local REST API plugin or custom sync server
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from './BaseConnector.js';
import { parseNote, serializeNote, countWords } from '../utils/markdown.js';
import type { Note, SearchOptions, VaultOperationResult, VaultStats, VaultConfig } from '../types/index.js';

export class RemoteConnector extends BaseConnector {
  private client: AxiosInstance;
  private notesCache: Map<string, Note> = new Map();
  private syncInterval?: NodeJS.Timeout;

  constructor(config: VaultConfig) {
    super(config);

    if (!config.url) {
      throw new Error('Remote vault URL is required');
    }

    this.client = axios.create({
      baseURL: config.url,
      headers: {
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async initialize(): Promise<VaultOperationResult<void>> {
    try {
      // Test connection
      await this.client.get('/');

      // Initial sync
      await this.syncVault();

      // Setup periodic sync if configured
      if (this.config.syncInterval && this.config.syncInterval > 0) {
        this.syncInterval = setInterval(() => {
          this.syncVault().catch(err => console.error('Sync error:', err));
        }, this.config.syncInterval);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize remote vault: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getNote(path: string): Promise<VaultOperationResult<Note>> {
    try {
      // Try cache first
      if (this.notesCache.has(path)) {
        return { success: true, data: this.notesCache.get(path)! };
      }

      // Fetch from remote
      const response = await this.client.get(`/vault/${encodeURIComponent(path)}`);
      const content = response.data.content || response.data;

      const note = parseNote(path, content);
      this.notesCache.set(path, note);

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
        await this.syncVault();
      }

      return { success: true, data: Array.from(this.notesCache.values()) };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get all notes: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async searchNotes(options: SearchOptions): Promise<VaultOperationResult<Note[]>> {
    try {
      // Try server-side search first
      try {
        const response = await this.client.post('/search', options);
        if (response.data.notes) {
          return { success: true, data: response.data.notes };
        }
      } catch {
        // Fall back to client-side search
      }

      // Client-side search fallback
      const allNotes = await this.getAllNotes();
      if (!allNotes.success || !allNotes.data) {
        return allNotes;
      }

      let results = allNotes.data;

      if (options.folder) {
        results = results.filter(note => note.path.startsWith(options.folder!));
      }

      if (options.tags && options.tags.length > 0) {
        results = results.filter(note => {
          if (!note.tags) return false;
          return options.tags!.some(tag => note.tags!.includes(tag));
        });
      }

      if (options.query) {
        const query = options.query.toLowerCase();
        results = results.filter(note => {
          const inTitle = note.title.toLowerCase().includes(query);
          const inContent = options.includeContent && note.content.toLowerCase().includes(query);
          return inTitle || inContent;
        });
      }

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

  async createNote(path: string, content: string, frontmatter?: Record<string, any>): Promise<VaultOperationResult<Note>> {
    try {
      const note: Note = {
        path,
        title: frontmatter?.title || path.split('/').pop()?.replace('.md', '') || 'Untitled',
        content,
        frontmatter
      };

      const serialized = serializeNote(note);

      await this.client.post(`/vault/${encodeURIComponent(path)}`, {
        content: serialized
      });

      const result = await this.getNote(path);
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to create note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async updateNote(path: string, content: string, frontmatter?: Record<string, any>): Promise<VaultOperationResult<Note>> {
    try {
      const note: Note = {
        path,
        title: frontmatter?.title || path.split('/').pop()?.replace('.md', '') || 'Untitled',
        content,
        frontmatter
      };

      const serialized = serializeNote(note);

      await this.client.put(`/vault/${encodeURIComponent(path)}`, {
        content: serialized
      });

      // Clear cache and refetch
      this.notesCache.delete(path);
      const result = await this.getNote(path);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to update note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async deleteNote(path: string): Promise<VaultOperationResult<void>> {
    try {
      await this.client.delete(`/vault/${encodeURIComponent(path)}`);
      this.notesCache.delete(path);

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
      // Try server-side stats first
      try {
        const response = await this.client.get('/stats');
        if (response.data) {
          return { success: true, data: response.data };
        }
      } catch {
        // Fall back to client-side calculation
      }

      // Client-side stats calculation
      const allNotes = await this.getAllNotes();
      if (!allNotes.success || !allNotes.data) {
        return { success: false, error: 'Failed to get notes for stats' };
      }

      const notes = allNotes.data;
      const tags = new Map<string, number>();
      let totalWords = 0;
      let totalLinks = 0;

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
      }

      const stats: VaultStats = {
        noteCount: notes.length,
        totalWords,
        totalLinks,
        tags
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
      const response = await this.client.get('/folders');
      return { success: true, data: response.data };
    } catch (error) {
      // Fallback to extracting from notes
      const notes = await this.getAllNotes();
      if (!notes.success || !notes.data) {
        return { success: false, error: 'Failed to list folders' };
      }

      const folders = new Set<string>();
      for (const note of notes.data) {
        const folder = note.path.substring(0, note.path.lastIndexOf('/'));
        if (folder) {
          folders.add(folder);
        }
      }

      return { success: true, data: Array.from(folders).sort() };
    }
  }

  async listTags(): Promise<VaultOperationResult<string[]>> {
    try {
      const response = await this.client.get('/tags');
      return { success: true, data: response.data };
    } catch (error) {
      // Fallback to extracting from notes
      const notes = await this.getAllNotes();
      if (!notes.success || !notes.data) {
        return { success: false, error: 'Failed to list tags' };
      }

      const tags = new Set<string>();
      for (const note of notes.data) {
        if (note.tags) {
          note.tags.forEach(tag => tags.add(tag));
        }
      }

      return { success: true, data: Array.from(tags).sort() };
    }
  }

  async close(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.notesCache.clear();
  }

  // Private helper methods

  private async syncVault(): Promise<void> {
    try {
      const response = await this.client.get('/vault');
      const notes = response.data.notes || response.data;

      this.notesCache.clear();

      if (Array.isArray(notes)) {
        for (const noteData of notes) {
          try {
            const content = noteData.content || '';
            const path = noteData.path || noteData.name;

            if (path && content) {
              const note = parseNote(path, content);
              this.notesCache.set(path, note);
            }
          } catch (error) {
            console.error(`Failed to parse note:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync vault:', error);
      throw error;
    }
  }
}
