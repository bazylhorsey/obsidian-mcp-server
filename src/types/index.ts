/**
 * Core types for the Obsidian MCP server
 */

/**
 * Represents an Obsidian note with metadata
 */
export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter?: Record<string, any>;
  tags?: string[];
  links?: Link[];
  backlinks?: Link[];
  createdAt?: Date;
  modifiedAt?: Date;
}

/**
 * Represents a link between notes
 */
export interface Link {
  source: string;
  target: string;
  type: 'internal' | 'embed' | 'external';
  text?: string;
}

/**
 * Configuration for a vault
 */
export interface VaultConfig {
  name: string;
  type: 'local' | 'remote';
  path?: string;
  url?: string;
  apiKey?: string;
  syncInterval?: number;
}

/**
 * Search options for notes
 */
export interface SearchOptions {
  query: string;
  tags?: string[];
  folder?: string;
  limit?: number;
  includeContent?: boolean;
}

/**
 * Knowledge graph node
 */
export interface GraphNode {
  id: string;
  title: string;
  type: 'note' | 'tag' | 'folder';
  metadata?: Record<string, any>;
}

/**
 * Knowledge graph edge
 */
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

/**
 * Complete knowledge graph
 */
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Result of a vault operation
 */
export interface VaultOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Statistics about a vault
 */
export interface VaultStats {
  noteCount: number;
  totalWords: number;
  totalLinks: number;
  tags: Map<string, number>;
  lastModified?: Date;
}

// Re-export canvas types
export * from './canvas.js';

// Re-export dataview types
export * from './dataview.js';

// Re-export template types
export * from './template.js';

// Re-export periodic notes types
export * from './periodic.js';
