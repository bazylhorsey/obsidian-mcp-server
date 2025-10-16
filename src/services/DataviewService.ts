/**
 * Dataview-style query service for notes
 */

import type { Note } from '../types/index.js';
import type {
  DataviewQuery,
  QueryFilter,
  QuerySort,
  DataviewResult,
  GroupedDataviewResult,
  QueryExecutionResult,
  NoteMetadata,
  InlineField
} from '../types/dataview.js';

export class DataviewService {
  private notes: Note[] = [];

  /**
   * Update the notes collection
   */
  updateNotes(notes: Note[]): void {
    this.notes = notes;
  }

  /**
   * Execute a Dataview query
   */
  async executeQuery(query: DataviewQuery): Promise<QueryExecutionResult> {
    let results = this.notes.map(note => this.noteToDataviewResult(note));

    // Apply FROM clause (source filtering)
    if (query.from) {
      results = this.applyFromFilter(results, query.from);
    }

    // Apply WHERE clause (filters)
    if (query.where && query.where.length > 0) {
      results = this.applyFilters(results, query.where);
    }

    // Apply SORT
    if (query.sort && query.sort.length > 0) {
      results = this.applySorting(results, query.sort);
    }

    // Apply field selection
    if (query.select && query.select.length > 0) {
      results = this.applyFieldSelection(results, query.select);
    }

    const totalCount = results.length;

    // Apply GROUP BY
    if (query.groupBy) {
      const grouped = this.applyGrouping(results, query.groupBy);
      return {
        results: grouped,
        totalCount,
        grouped: true
      };
    }

    // Apply LIMIT
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return {
      results,
      totalCount,
      grouped: false
    };
  }

  /**
   * Get metadata for a specific note
   */
  getMetadata(notePath: string): NoteMetadata | null {
    const note = this.notes.find(n => n.path === notePath);
    if (!note) return null;

    return this.extractMetadata(note);
  }

  /**
   * Extract all metadata from a note
   */
  extractMetadata(note: Note): NoteMetadata {
    const metadata: NoteMetadata = {
      path: note.path,
      title: note.title,
      created: note.createdAt,
      modified: note.modifiedAt,
      tags: note.tags,
      aliases: note.frontmatter?.aliases,
    };

    // Add all frontmatter fields
    if (note.frontmatter) {
      Object.assign(metadata, note.frontmatter);
    }

    // Extract inline fields
    const inlineFields = this.extractInlineFields(note.content);
    for (const field of inlineFields) {
      if (!metadata[field.key]) {
        metadata[field.key] = this.parseFieldValue(field.value);
      }
    }

    return metadata;
  }

  /**
   * Extract inline fields from content (key:: value pattern)
   */
  extractInlineFields(content: string): InlineField[] {
    const fields: InlineField[] = [];
    const lines = content.split('\n');

    // Match patterns like: key:: value or [key:: value]
    const inlineRegex = /(\w+)::\s*(.+?)(?:\s*$|\s*\])/g;

    lines.forEach((line, index) => {
      let match;
      while ((match = inlineRegex.exec(line)) !== null) {
        fields.push({
          key: match[1].trim(),
          value: match[2].trim(),
          line: index + 1
        });
      }
    });

    return fields;
  }

  /**
   * Get all unique values for a metadata field
   */
  getUniqueValues(field: string): any[] {
    const values = new Set<any>();

    for (const note of this.notes) {
      const metadata = this.extractMetadata(note);
      const value = this.getNestedValue(metadata, field);

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => values.add(v));
        } else {
          values.add(value);
        }
      }
    }

    return Array.from(values);
  }

  /**
   * Get notes grouped by a field
   */
  groupNotesByField(field: string): Map<string, Note[]> {
    const groups = new Map<string, Note[]>();

    for (const note of this.notes) {
      const metadata = this.extractMetadata(note);
      const value = this.getNestedValue(metadata, field);

      const key = value !== undefined && value !== null ? String(value) : '(none)';

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(note);
    }

    return groups;
  }

  // Private helper methods

  private noteToDataviewResult(note: Note): DataviewResult {
    const metadata = this.extractMetadata(note);

    return {
      metadata,
      ...metadata // Flatten metadata to top level for easy access (includes path and title)
    } as DataviewResult;
  }

  private applyFromFilter(results: DataviewResult[], from: string | string[]): DataviewResult[] {
    const sources = Array.isArray(from) ? from : [from];

    return results.filter(result => {
      return sources.some(source => {
        if (source.startsWith('#')) {
          // Tag filter
          const tag = source.substring(1);
          return result.metadata.tags?.includes(tag);
        } else if (source.startsWith('"') && source.endsWith('"')) {
          // Folder filter
          const folder = source.slice(1, -1);
          return result.path.startsWith(folder);
        } else {
          // Folder filter without quotes
          return result.path.startsWith(source);
        }
      });
    });
  }

  private applyFilters(results: DataviewResult[], filters: QueryFilter[]): DataviewResult[] {
    return results.filter(result => {
      return filters.every(filter => this.evaluateFilter(result, filter));
    });
  }

  private evaluateFilter(result: DataviewResult, filter: QueryFilter): boolean {
    const value = this.getNestedValue(result, filter.field);

    switch (filter.operator) {
      case 'exists':
        return value !== undefined && value !== null;

      case 'eq':
        return value === filter.value;

      case 'neq':
        return value !== filter.value;

      case 'gt':
        return value > filter.value;

      case 'gte':
        return value >= filter.value;

      case 'lt':
        return value < filter.value;

      case 'lte':
        return value <= filter.value;

      case 'contains':
        if (typeof value === 'string') {
          return value.includes(String(filter.value));
        }
        if (Array.isArray(value)) {
          return value.includes(filter.value);
        }
        return false;

      case 'startsWith':
        return typeof value === 'string' && value.startsWith(String(filter.value));

      case 'endsWith':
        return typeof value === 'string' && value.endsWith(String(filter.value));

      default:
        return false;
    }
  }

  private applySorting(results: DataviewResult[], sorts: QuerySort[]): DataviewResult[] {
    return results.sort((a, b) => {
      for (const sort of sorts) {
        const aVal = this.getNestedValue(a, sort.field);
        const bVal = this.getNestedValue(b, sort.field);

        let comparison = 0;

        if (aVal === undefined || aVal === null) comparison = 1;
        else if (bVal === undefined || bVal === null) comparison = -1;
        else if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  private applyFieldSelection(results: DataviewResult[], fields: string[]): DataviewResult[] {
    return results.map(result => {
      const selected: DataviewResult = {
        path: result.path,
        title: result.title,
        metadata: {}
      };

      for (const field of fields) {
        const value = this.getNestedValue(result, field);
        if (value !== undefined) {
          this.setNestedValue(selected, field, value);
        }
      }

      return selected;
    });
  }

  private applyGrouping(results: DataviewResult[], groupByField: string): GroupedDataviewResult[] {
    const groups = new Map<string, DataviewResult[]>();

    for (const result of results) {
      const groupValue = this.getNestedValue(result, groupByField);
      const key = groupValue !== undefined && groupValue !== null ? String(groupValue) : '(none)';

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(result);
    }

    return Array.from(groups.entries()).map(([group, items]) => ({
      group,
      items
    }));
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }

    return value;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    current[lastKey] = value;
  }

  private parseFieldValue(value: string): any {
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try to parse as date
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}$/);
    if (dateMatch) {
      return new Date(value);
    }

    // Try to parse as array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Return as string
    return value;
  }
}
