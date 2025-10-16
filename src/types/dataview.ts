/**
 * Types for Dataview-style querying
 */

export interface DataviewQuery {
  // Source selection
  from?: string | string[]; // Folder, tag, or file paths

  // Filters
  where?: QueryFilter[];

  // Sorting
  sort?: QuerySort[];

  // Limiting
  limit?: number;

  // Grouping
  groupBy?: string;

  // Fields to select
  select?: string[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'exists';
  value?: any;
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataviewResult {
  path: string;
  title: string;
  metadata: Record<string, any>;
  [key: string]: any;
}

export interface GroupedDataviewResult {
  group: string;
  items: DataviewResult[];
}

export interface QueryExecutionResult {
  results: DataviewResult[] | GroupedDataviewResult[];
  totalCount: number;
  grouped: boolean;
}

/**
 * Common metadata fields
 */
export interface NoteMetadata {
  // File properties
  path: string;
  title: string;

  // Dates
  created?: Date;
  modified?: Date;

  // Content properties
  tags?: string[];
  aliases?: string[];

  // Custom frontmatter
  [key: string]: any;
}

/**
 * Inline field pattern: key:: value
 */
export interface InlineField {
  key: string;
  value: string;
  line: number;
}
