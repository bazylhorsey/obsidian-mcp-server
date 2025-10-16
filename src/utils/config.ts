/**
 * Configuration management for the MCP server
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { VaultConfig } from '../types/index.js';
import type { ObsidianAPIConfig } from '../api/ObsidianAPI.js';

export interface ServerConfig {
  vaults: VaultConfig[];
  obsidianApi?: ObsidianAPIConfig;
  server?: {
    name?: string;
    version?: string;
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  vaults: [],
  server: {
    name: 'obsidian-mcp-server',
    version: '1.0.0'
  }
};

/**
 * Load configuration from file or environment
 */
export async function loadConfig(configPath?: string): Promise<ServerConfig> {
  // Try to load from specified path
  if (configPath) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      return validateConfig(config);
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
    }
  }

  // Try to load from default locations
  const defaultPaths = [
    './obsidian-mcp.json',
    path.join(process.cwd(), 'obsidian-mcp.json'),
    path.join(process.env.HOME || '~', '.obsidian-mcp.json')
  ];

  for (const defaultPath of defaultPaths) {
    try {
      const content = await fs.readFile(defaultPath, 'utf-8');
      const config = JSON.parse(content);
      return validateConfig(config);
    } catch {
      // Continue to next path
    }
  }

  // Load from environment variables
  const envConfig = loadFromEnvironment();
  if (envConfig.vaults.length > 0) {
    return envConfig;
  }

  // Return default config
  console.warn('No configuration found, using defaults');
  return DEFAULT_CONFIG;
}

/**
 * Load configuration from environment variables
 */
function loadFromEnvironment(): ServerConfig {
  const config: ServerConfig = {
    vaults: [],
    server: DEFAULT_CONFIG.server
  };

  // Load vault from environment
  if (process.env.OBSIDIAN_VAULT_PATH) {
    config.vaults.push({
      name: process.env.OBSIDIAN_VAULT_NAME || 'default',
      type: 'local',
      path: process.env.OBSIDIAN_VAULT_PATH
    });
  }

  if (process.env.OBSIDIAN_REMOTE_URL) {
    config.vaults.push({
      name: process.env.OBSIDIAN_REMOTE_NAME || 'remote',
      type: 'remote',
      url: process.env.OBSIDIAN_REMOTE_URL,
      apiKey: process.env.OBSIDIAN_REMOTE_API_KEY,
      syncInterval: process.env.OBSIDIAN_SYNC_INTERVAL ? parseInt(process.env.OBSIDIAN_SYNC_INTERVAL) : undefined
    });
  }

  // Load Obsidian API config
  if (process.env.OBSIDIAN_API_URL) {
    config.obsidianApi = {
      restApiUrl: process.env.OBSIDIAN_API_URL,
      apiKey: process.env.OBSIDIAN_API_KEY,
      vaultName: process.env.OBSIDIAN_VAULT_NAME
    };
  }

  return config;
}

/**
 * Validate and normalize configuration
 */
function validateConfig(config: any): ServerConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration format');
  }

  if (!Array.isArray(config.vaults)) {
    throw new Error('Configuration must have a "vaults" array');
  }

  // Validate each vault
  for (const vault of config.vaults) {
    if (!vault.name || !vault.type) {
      throw new Error('Each vault must have a "name" and "type"');
    }

    if (vault.type === 'local' && !vault.path) {
      throw new Error('Local vaults must have a "path"');
    }

    if (vault.type === 'remote' && !vault.url) {
      throw new Error('Remote vaults must have a "url"');
    }
  }

  return {
    vaults: config.vaults,
    obsidianApi: config.obsidianApi,
    server: config.server || DEFAULT_CONFIG.server
  };
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: ServerConfig, configPath: string): Promise<void> {
  const content = JSON.stringify(config, null, 2);
  await fs.writeFile(configPath, content, 'utf-8');
}

/**
 * Create example configuration file
 */
export function getExampleConfig(): ServerConfig {
  return {
    vaults: [
      {
        name: 'my-vault',
        type: 'local',
        path: '/path/to/obsidian/vault'
      },
      {
        name: 'remote-vault',
        type: 'remote',
        url: 'http://localhost:27124',
        apiKey: 'your-api-key-here',
        syncInterval: 60000
      }
    ],
    obsidianApi: {
      restApiUrl: 'http://localhost:27124',
      apiKey: 'your-api-key-here',
      vaultName: 'my-vault'
    },
    server: {
      name: 'obsidian-mcp-server',
      version: '1.0.0'
    }
  };
}
