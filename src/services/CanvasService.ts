/**
 * Service for managing Obsidian Canvas files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import type {
  CanvasData,
  CanvasNode,
  CanvasEdge,
  CanvasFileNode,
  CanvasTextNode,
  CanvasLinkNode,
  CanvasGroupNode,
  CANVAS_COLORS
} from '../types/canvas.js';
import type { VaultOperationResult } from '../types/index.js';

export interface CreateNodeOptions {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: keyof typeof CANVAS_COLORS;
}

export interface CreateFileNodeOptions extends CreateNodeOptions {
  file: string;
  subpath?: string;
}

export interface CreateTextNodeOptions extends CreateNodeOptions {
  text: string;
}

export interface CreateLinkNodeOptions extends CreateNodeOptions {
  url: string;
}

export interface CreateGroupNodeOptions extends CreateNodeOptions {
  label?: string;
  background?: string;
  backgroundStyle?: string;
}

export interface CreateEdgeOptions {
  id?: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  toEnd?: 'none' | 'arrow';
  color?: keyof typeof CANVAS_COLORS;
  label?: string;
}

export class CanvasService {
  /**
   * Read and parse a canvas file
   */
  async readCanvas(vaultPath: string, canvasPath: string): Promise<VaultOperationResult<CanvasData>> {
    try {
      const fullPath = path.join(vaultPath, canvasPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const data: CanvasData = JSON.parse(content);

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read canvas: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Write canvas data to file
   */
  async writeCanvas(
    vaultPath: string,
    canvasPath: string,
    data: CanvasData
  ): Promise<VaultOperationResult<void>> {
    try {
      const fullPath = path.join(vaultPath, canvasPath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write JSON with formatting
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, content, 'utf-8');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write canvas: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a new empty canvas
   */
  async createCanvas(vaultPath: string, canvasPath: string): Promise<VaultOperationResult<CanvasData>> {
    const emptyCanvas: CanvasData = {
      nodes: [],
      edges: []
    };

    const result = await this.writeCanvas(vaultPath, canvasPath, emptyCanvas);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: emptyCanvas };
  }

  /**
   * Add a file node to canvas
   */
  async addFileNode(
    vaultPath: string,
    canvasPath: string,
    options: CreateFileNodeOptions
  ): Promise<VaultOperationResult<CanvasFileNode>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    const node: CanvasFileNode = {
      id: options.id || this.generateId(),
      type: 'file',
      file: options.file,
      subpath: options.subpath,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color
    };

    canvasResult.data.nodes.push(node);

    const writeResult = await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, data: node };
  }

  /**
   * Add a text node to canvas
   */
  async addTextNode(
    vaultPath: string,
    canvasPath: string,
    options: CreateTextNodeOptions
  ): Promise<VaultOperationResult<CanvasTextNode>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    const node: CanvasTextNode = {
      id: options.id || this.generateId(),
      type: 'text',
      text: options.text,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color
    };

    canvasResult.data.nodes.push(node);

    const writeResult = await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, data: node };
  }

  /**
   * Add a link node to canvas
   */
  async addLinkNode(
    vaultPath: string,
    canvasPath: string,
    options: CreateLinkNodeOptions
  ): Promise<VaultOperationResult<CanvasLinkNode>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    const node: CanvasLinkNode = {
      id: options.id || this.generateId(),
      type: 'link',
      url: options.url,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color
    };

    canvasResult.data.nodes.push(node);

    const writeResult = await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, data: node };
  }

  /**
   * Add a group node to canvas
   */
  async addGroupNode(
    vaultPath: string,
    canvasPath: string,
    options: CreateGroupNodeOptions
  ): Promise<VaultOperationResult<CanvasGroupNode>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    const node: CanvasGroupNode = {
      id: options.id || this.generateId(),
      type: 'group',
      label: options.label,
      background: options.background,
      backgroundStyle: options.backgroundStyle,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color
    };

    canvasResult.data.nodes.push(node);

    const writeResult = await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, data: node };
  }

  /**
   * Add an edge to canvas
   */
  async addEdge(
    vaultPath: string,
    canvasPath: string,
    options: CreateEdgeOptions
  ): Promise<VaultOperationResult<CanvasEdge>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    const edge: CanvasEdge = {
      id: options.id || this.generateId(),
      fromNode: options.fromNode,
      fromSide: options.fromSide || 'right',
      fromEnd: options.fromEnd,
      toNode: options.toNode,
      toSide: options.toSide || 'left',
      toEnd: options.toEnd || 'arrow',
      color: options.color,
      label: options.label
    };

    canvasResult.data.edges.push(edge);

    const writeResult = await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, data: edge };
  }

  /**
   * Delete a node from canvas
   */
  async deleteNode(
    vaultPath: string,
    canvasPath: string,
    nodeId: string
  ): Promise<VaultOperationResult<void>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    // Remove node
    canvasResult.data.nodes = canvasResult.data.nodes.filter(n => n.id !== nodeId);

    // Remove edges connected to this node
    canvasResult.data.edges = canvasResult.data.edges.filter(
      e => e.fromNode !== nodeId && e.toNode !== nodeId
    );

    return await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
  }

  /**
   * Delete an edge from canvas
   */
  async deleteEdge(
    vaultPath: string,
    canvasPath: string,
    edgeId: string
  ): Promise<VaultOperationResult<void>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    canvasResult.data.edges = canvasResult.data.edges.filter(e => e.id !== edgeId);

    return await this.writeCanvas(vaultPath, canvasPath, canvasResult.data);
  }

  /**
   * Get canvas as a graph structure
   */
  async getCanvasGraph(
    vaultPath: string,
    canvasPath: string
  ): Promise<VaultOperationResult<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>> {
    const canvasResult = await this.readCanvas(vaultPath, canvasPath);
    if (!canvasResult.success || !canvasResult.data) {
      return { success: false, error: canvasResult.error };
    }

    return {
      success: true,
      data: {
        nodes: canvasResult.data.nodes,
        edges: canvasResult.data.edges
      }
    };
  }

  /**
   * List all canvas files in vault
   */
  async listCanvasFiles(vaultPath: string): Promise<VaultOperationResult<string[]>> {
    try {
      const { glob } = await import('glob');
      const pattern = path.join(vaultPath, '**/*.canvas');
      const files = await glob(pattern, { ignore: '**/node_modules/**' });

      const relativePaths = files.map(f => path.relative(vaultPath, f));

      return { success: true, data: relativePaths };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list canvas files: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return randomBytes(8).toString('hex');
  }
}
