/**
 * Base connector interface for vault connections
 * All vault connectors (local, remote) must implement this interface
 */

import type { Note, SearchOptions, VaultOperationResult, VaultStats, VaultConfig } from '../types/index.js';

export abstract class BaseConnector {
  protected config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
  }

  /**
   * Get vault path (for local vaults)
   */
  get vaultPath(): string | undefined {
    return this.config.path;
  }

  /**
   * Initialize the connector
   */
  abstract initialize(): Promise<VaultOperationResult<void>>;

  /**
   * Get a note by its path
   */
  abstract getNote(path: string): Promise<VaultOperationResult<Note>>;

  /**
   * Get all notes in the vault
   */
  abstract getAllNotes(): Promise<VaultOperationResult<Note[]>>;

  /**
   * Search for notes
   */
  abstract searchNotes(options: SearchOptions): Promise<VaultOperationResult<Note[]>>;

  /**
   * Create a new note
   */
  abstract createNote(path: string, content: string, frontmatter?: Record<string, any>): Promise<VaultOperationResult<Note>>;

  /**
   * Update an existing note
   */
  abstract updateNote(path: string, content: string, frontmatter?: Record<string, any>): Promise<VaultOperationResult<Note>>;

  /**
   * Delete a note
   */
  abstract deleteNote(path: string): Promise<VaultOperationResult<void>>;

  /**
   * Get vault statistics
   */
  abstract getStats(): Promise<VaultOperationResult<VaultStats>>;

  /**
   * List all folders in the vault
   */
  abstract listFolders(): Promise<VaultOperationResult<string[]>>;

  /**
   * List all tags used in the vault
   */
  abstract listTags(): Promise<VaultOperationResult<string[]>>;

  /**
   * Close the connector and cleanup resources
   */
  abstract close(): Promise<void>;
}
