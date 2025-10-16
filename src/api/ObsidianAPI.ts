/**
 * Obsidian API integration layer
 * Provides advanced features through Obsidian's Local REST API plugin
 * or Obsidian URI protocol
 */

import axios, { AxiosInstance } from 'axios';
import type { VaultOperationResult } from '../types/index.js';

export interface ObsidianAPIConfig {
  restApiUrl?: string;
  apiKey?: string;
  vaultName?: string;
}

export interface OpenNoteOptions {
  newLeaf?: boolean;
  mode?: 'source' | 'preview' | 'live';
  viewMode?: 'source' | 'preview';
}

export interface CommandResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Integration with Obsidian's advanced features
 */
export class ObsidianAPI {
  private client?: AxiosInstance;
  private config: ObsidianAPIConfig;

  constructor(config: ObsidianAPIConfig = {}) {
    this.config = config;

    if (config.restApiUrl) {
      this.client = axios.create({
        baseURL: config.restApiUrl,
        headers: {
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
        },
        timeout: 5000
      });
    }
  }

  /**
   * Check if Obsidian REST API is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.get('/');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open a note in Obsidian
   */
  async openNote(path: string, options: OpenNoteOptions = {}): Promise<VaultOperationResult<string | void>> {
    try {
      if (this.client) {
        // Use REST API
        await this.client.post('/open', {
          file: path,
          newLeaf: options.newLeaf,
          mode: options.mode
        });
        return { success: true };
      } else if (this.config.vaultName) {
        // Use URI protocol
        const uri = this.buildObsidianURI('open', {
          vault: this.config.vaultName,
          file: path,
          newpane: options.newLeaf ? 'true' : undefined
        });

        // Note: In Node.js, we can't directly open URIs. This would need to be handled
        // by the client application or shell command
        return {
          success: true,
          data: uri
        };
      }

      return {
        success: false,
        error: 'No Obsidian API connection configured'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to open note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute an Obsidian command
   */
  async executeCommand(commandId: string): Promise<CommandResult> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'REST API not configured'
        };
      }

      const response = await this.client.post('/commands/execute', {
        commandId
      });

      return {
        success: true,
        result: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get active file in Obsidian
   */
  async getActiveFile(): Promise<VaultOperationResult<string>> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'REST API not configured'
        };
      }

      const response = await this.client.get('/active');
      return {
        success: true,
        data: response.data.path || response.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get active file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a daily note
   */
  async createDailyNote(date?: Date): Promise<VaultOperationResult<string>> {
    try {
      if (this.client) {
        const response = await this.client.post('/daily-notes', {
          date: date?.toISOString()
        });
        return {
          success: true,
          data: response.data.path
        };
      } else if (this.config.vaultName) {
        const uri = this.buildObsidianURI('daily', {
          vault: this.config.vaultName
        });

        return {
          success: true,
          data: uri
        };
      }

      return {
        success: false,
        error: 'No Obsidian API connection configured'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create daily note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Search within Obsidian
   */
  async search(query: string): Promise<VaultOperationResult<any[]>> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'REST API not configured'
        };
      }

      const response = await this.client.get('/search', {
        params: { query }
      });

      return {
        success: true,
        data: response.data.results || response.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get list of available commands
   */
  async listCommands(): Promise<VaultOperationResult<string[]>> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'REST API not configured'
        };
      }

      const response = await this.client.get('/commands');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list commands: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Build an Obsidian URI
   */
  private buildObsidianURI(action: string, params: Record<string, string | undefined>): string {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${encodeURIComponent(value!)}`)
      .join('&');

    return `obsidian://${action}?${cleanParams}`;
  }

  /**
   * Close the API connection
   */
  close(): void {
    // Clean up resources if needed
  }
}
