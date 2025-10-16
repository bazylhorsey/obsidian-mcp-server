/**
 * Types for template system
 */

export interface Template {
  name: string;
  path: string;
  content: string;
  variables?: TemplateVariable[];
  tags?: string[];
  folder?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'choice';
  defaultValue?: any;
  description?: string;
  required?: boolean;
  choices?: string[]; // For 'choice' type
}

export interface TemplateConfig {
  templatesFolder: string;
  dateFormat?: string;
  timeFormat?: string;
}

export interface TemplateRenderOptions {
  variables?: Record<string, any>;
  targetPath?: string;
  frontmatter?: Record<string, any>;
}

export interface TemplateRenderResult {
  content: string;
  renderedVariables: Record<string, any>;
}

/**
 * Built-in template variables
 */
export interface BuiltInVariables {
  // Date variables
  date: string;           // Current date (YYYY-MM-DD)
  time: string;           // Current time (HH:mm)
  datetime: string;       // Current datetime
  year: string;           // Current year
  month: string;          // Current month (01-12)
  day: string;            // Current day (01-31)
  weekday: string;        // Day of week (Monday, Tuesday, etc.)
  week: string;           // Week number (01-53)

  // File variables
  title?: string;         // Note title (from filename)
  filename?: string;      // Target filename
  folder?: string;        // Target folder

  // Custom variables
  [key: string]: any;
}
