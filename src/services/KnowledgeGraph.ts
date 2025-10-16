/**
 * Knowledge graph service for analyzing note relationships
 */

import type { Note, KnowledgeGraph, GraphNode, GraphEdge } from '../types/index.js';

export interface GraphAnalysis {
  totalNodes: number;
  totalEdges: number;
  mostConnectedNodes: Array<{ id: string; connections: number }>;
  orphanNotes: string[];
  clusters?: Array<string[]>;
}

export class KnowledgeGraphService {
  private notes: Map<string, Note> = new Map();

  /**
   * Update the knowledge graph with new notes
   */
  updateNotes(notes: Note[]): void {
    this.notes.clear();
    for (const note of notes) {
      this.notes.set(note.path, note);
    }
  }

  /**
   * Build a complete knowledge graph
   */
  buildGraph(): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const tagNodes = new Map<string, GraphNode>();
    const folderNodes = new Map<string, GraphNode>();

    // Create note nodes
    for (const note of this.notes.values()) {
      nodes.push({
        id: note.path,
        title: note.title,
        type: 'note',
        metadata: {
          tags: note.tags,
          wordCount: note.content.length,
          linkCount: note.links?.length || 0
        }
      });

      // Create edges for note links
      if (note.links) {
        for (const link of note.links) {
          edges.push({
            source: note.path,
            target: this.resolveNotePath(link.target),
            type: link.type,
            weight: 1
          });
        }
      }

      // Create tag nodes and edges
      if (note.tags) {
        for (const tag of note.tags) {
          if (!tagNodes.has(tag)) {
            const tagNode: GraphNode = {
              id: `tag:${tag}`,
              title: tag,
              type: 'tag'
            };
            tagNodes.set(tag, tagNode);
            nodes.push(tagNode);
          }

          edges.push({
            source: note.path,
            target: `tag:${tag}`,
            type: 'tagged-with',
            weight: 1
          });
        }
      }

      // Create folder nodes and edges
      const folder = this.getFolder(note.path);
      if (folder && folder !== '.') {
        if (!folderNodes.has(folder)) {
          const folderNode: GraphNode = {
            id: `folder:${folder}`,
            title: folder,
            type: 'folder'
          };
          folderNodes.set(folder, folderNode);
          nodes.push(folderNode);
        }

        edges.push({
          source: note.path,
          target: `folder:${folder}`,
          type: 'in-folder',
          weight: 1
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Get notes related to a specific note
   */
  getRelatedNotes(notePath: string, maxDepth: number = 2): Note[] {
    const related = new Set<string>();
    const visited = new Set<string>();

    const traverse = (path: string, depth: number) => {
      if (depth > maxDepth || visited.has(path)) {
        return;
      }

      visited.add(path);
      const note = this.notes.get(path);
      if (!note) return;

      if (depth > 0) {
        related.add(path);
      }

      // Follow outgoing links
      if (note.links) {
        for (const link of note.links) {
          const target = this.resolveNotePath(link.target);
          traverse(target, depth + 1);
        }
      }

      // Follow backlinks
      if (note.backlinks) {
        for (const backlink of note.backlinks) {
          traverse(backlink.source, depth + 1);
        }
      }
    };

    traverse(notePath, 0);

    return Array.from(related)
      .map(path => this.notes.get(path))
      .filter((note): note is Note => note !== undefined);
  }

  /**
   * Find the shortest path between two notes
   */
  findPath(fromPath: string, toPath: string): string[] | null {
    const queue: Array<{ path: string; route: string[] }> = [{ path: fromPath, route: [fromPath] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { path, route } = queue.shift()!;

      if (path === toPath) {
        return route;
      }

      if (visited.has(path)) {
        continue;
      }

      visited.add(path);
      const note = this.notes.get(path);
      if (!note) continue;

      // Add linked notes to queue
      if (note.links) {
        for (const link of note.links) {
          const target = this.resolveNotePath(link.target);
          if (!visited.has(target)) {
            queue.push({ path: target, route: [...route, target] });
          }
        }
      }
    }

    return null;
  }

  /**
   * Analyze the knowledge graph
   */
  analyzeGraph(): GraphAnalysis {
    const connectionCounts = new Map<string, number>();
    const orphans: string[] = [];

    for (const note of this.notes.values()) {
      const linkCount = (note.links?.length || 0) + (note.backlinks?.length || 0);
      connectionCounts.set(note.path, linkCount);

      if (linkCount === 0) {
        orphans.push(note.path);
      }
    }

    // Sort by connection count
    const mostConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, connections]) => ({ id, connections }));

    const graph = this.buildGraph();

    return {
      totalNodes: graph.nodes.filter(n => n.type === 'note').length,
      totalEdges: graph.edges.length,
      mostConnectedNodes: mostConnected,
      orphanNotes: orphans
    };
  }

  /**
   * Get notes by tag
   */
  getNotesByTag(tag: string): Note[] {
    return Array.from(this.notes.values())
      .filter(note => note.tags?.includes(tag));
  }

  /**
   * Get notes in folder
   */
  getNotesByFolder(folder: string): Note[] {
    return Array.from(this.notes.values())
      .filter(note => note.path.startsWith(folder + '/') || this.getFolder(note.path) === folder);
  }

  /**
   * Get all unique tags
   */
  getAllTags(): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();

    for (const note of this.notes.values()) {
      if (note.tags) {
        for (const tag of note.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Suggest related notes based on content similarity
   */
  suggestRelatedNotes(notePath: string, limit: number = 5): Array<{ path: string; score: number }> {
    const note = this.notes.get(notePath);
    if (!note) return [];

    const scores = new Map<string, number>();

    // Score based on shared tags
    if (note.tags) {
      for (const otherNote of this.notes.values()) {
        if (otherNote.path === notePath) continue;

        if (otherNote.tags) {
          const sharedTags = note.tags.filter(tag => otherNote.tags!.includes(tag));
          if (sharedTags.length > 0) {
            scores.set(otherNote.path, (scores.get(otherNote.path) || 0) + sharedTags.length * 10);
          }
        }
      }
    }

    // Score based on common words in title
    const noteWords = new Set(note.title.toLowerCase().split(/\s+/));
    for (const otherNote of this.notes.values()) {
      if (otherNote.path === notePath) continue;

      const otherWords = otherNote.title.toLowerCase().split(/\s+/);
      const commonWords = otherWords.filter(word => noteWords.has(word) && word.length > 3);

      if (commonWords.length > 0) {
        scores.set(otherNote.path, (scores.get(otherNote.path) || 0) + commonWords.length * 5);
      }
    }

    // Score based on folder proximity
    const folder = this.getFolder(notePath);
    for (const otherNote of this.notes.values()) {
      if (otherNote.path === notePath) continue;

      if (this.getFolder(otherNote.path) === folder) {
        scores.set(otherNote.path, (scores.get(otherNote.path) || 0) + 3);
      }
    }

    return Array.from(scores.entries())
      .map(([path, score]) => ({ path, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Helper methods

  private resolveNotePath(linkTarget: string): string {
    // Remove .md extension if present
    const normalized = linkTarget.endsWith('.md') ? linkTarget : `${linkTarget}.md`;

    // Check if exact match exists
    if (this.notes.has(normalized)) {
      return normalized;
    }

    // Try to find by title match
    for (const [path, note] of this.notes.entries()) {
      if (note.title === linkTarget || path.endsWith(`/${normalized}`)) {
        return path;
      }
    }

    return normalized;
  }

  private getFolder(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '.' : path.substring(0, lastSlash);
  }
}
