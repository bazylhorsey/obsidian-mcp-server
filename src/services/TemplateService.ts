/**
 * Service for managing templates with variable substitution
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  Template,
  TemplateConfig,
  TemplateRenderOptions,
  TemplateRenderResult,
  BuiltInVariables
} from '../types/template.js';
import type { VaultOperationResult } from '../types/index.js';
import { parseMarkdown } from '../utils/markdown.js';

export class TemplateService {
  private config: TemplateConfig;

  constructor(config?: Partial<TemplateConfig>) {
    this.config = {
      templatesFolder: config?.templatesFolder || 'Templates',
      dateFormat: config?.dateFormat || 'YYYY-MM-DD',
      timeFormat: config?.timeFormat || 'HH:mm',
    };
  }

  /**
   * List all templates in the templates folder
   */
  async listTemplates(vaultPath: string): Promise<VaultOperationResult<Template[]>> {
    try {
      const templatesPath = path.join(vaultPath, this.config.templatesFolder);

      // Check if templates folder exists
      try {
        await fs.access(templatesPath);
      } catch {
        return { success: true, data: [] };
      }

      const { glob } = await import('glob');
      const pattern = path.join(templatesPath, '**/*.md');
      const files = await glob(pattern);

      const templates: Template[] = [];

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(vaultPath, file);
        const parsed = parseMarkdown(content);

        const template: Template = {
          name: path.basename(file, '.md'),
          path: relativePath,
          content,
          tags: parsed.tags,
          folder: path.dirname(relativePath),
        };

        // Extract template variables from frontmatter
        if (parsed.frontmatter?.templateVariables) {
          template.variables = parsed.frontmatter.templateVariables;
        }

        templates.push(template);
      }

      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list templates: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get a specific template
   */
  async getTemplate(vaultPath: string, templatePath: string): Promise<VaultOperationResult<Template>> {
    try {
      const fullPath = path.join(vaultPath, templatePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = parseMarkdown(content);

      const template: Template = {
        name: path.basename(templatePath, '.md'),
        path: templatePath,
        content,
        tags: parsed.tags,
        folder: path.dirname(templatePath),
      };

      if (parsed.frontmatter?.templateVariables) {
        template.variables = parsed.frontmatter.templateVariables;
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get template: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Render a template with variable substitution
   */
  async renderTemplate(
    vaultPath: string,
    templatePath: string,
    options?: TemplateRenderOptions
  ): Promise<VaultOperationResult<TemplateRenderResult>> {
    try {
      // Get template
      const templateResult = await this.getTemplate(vaultPath, templatePath);
      if (!templateResult.success || !templateResult.data) {
        return { success: false, error: templateResult.error };
      }

      const template = templateResult.data;
      let content = template.content;

      // Build variables
      const builtInVars = this.getBuiltInVariables(options?.targetPath);
      const customVars = options?.variables || {};
      const allVariables: Record<string, any> = {
        ...builtInVars,
        ...customVars,
      };

      // Replace template variables
      content = this.substituteVariables(content, allVariables);

      // Add/update frontmatter if provided
      if (options?.frontmatter) {
        content = this.addFrontmatter(content, options.frontmatter);
      }

      return {
        success: true,
        data: {
          content,
          renderedVariables: allVariables,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to render template: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a note from a template
   */
  async createFromTemplate(
    vaultPath: string,
    templatePath: string,
    targetPath: string,
    options?: TemplateRenderOptions
  ): Promise<VaultOperationResult<string>> {
    try {
      // Render template
      const renderResult = await this.renderTemplate(vaultPath, templatePath, {
        ...options,
        targetPath,
      });

      if (!renderResult.success || !renderResult.data) {
        return { success: false, error: renderResult.error };
      }

      // Write to target path
      const fullTargetPath = path.join(vaultPath, targetPath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullTargetPath), { recursive: true });

      // Write file
      await fs.writeFile(fullTargetPath, renderResult.data.content, 'utf-8');

      return { success: true, data: targetPath };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create from template: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get built-in template variables
   */
  private getBuiltInVariables(targetPath?: string): BuiltInVariables {
    const now = new Date();

    const builtIn: BuiltInVariables = {
      date: this.formatDate(now, 'YYYY-MM-DD'),
      time: this.formatDate(now, 'HH:mm'),
      datetime: this.formatDate(now, 'YYYY-MM-DD HH:mm'),
      year: this.formatDate(now, 'YYYY'),
      month: this.formatDate(now, 'MM'),
      day: this.formatDate(now, 'DD'),
      weekday: this.getWeekday(now),
      week: String(this.getWeekNumber(now)),
    };

    // Add file-related variables if target path is provided
    if (targetPath) {
      builtIn.filename = path.basename(targetPath, '.md');
      builtIn.title = builtIn.filename;
      builtIn.folder = path.dirname(targetPath);
    }

    return builtIn;
  }

  /**
   * Substitute variables in content
   * Supports: {{variable}}, {{variable:format}}, {{variable|default}}
   */
  private substituteVariables(content: string, variables: Record<string, any>): string {
    // Replace {{variable}} or {{variable|default}} patterns
    return content.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      expression = expression.trim();

      // Handle default values: {{variable|default}}
      const [varName, defaultValue] = expression.split('|').map((s: string) => s.trim());

      // Handle date formats: {{date:YYYY-MM-DD}}
      const [actualVar, format] = varName.split(':').map((s: string) => s.trim());

      let value = variables[actualVar];

      // Apply format if specified
      if (format && value instanceof Date) {
        value = this.formatDate(value, format);
      } else if (format && typeof value === 'string') {
        // Try to parse as date and format
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          value = this.formatDate(date, format);
        }
      }

      // Use default if value is undefined
      if (value === undefined || value === null) {
        return defaultValue !== undefined ? defaultValue : match;
      }

      return String(value);
    });
  }

  /**
   * Add or update frontmatter in content
   */
  private addFrontmatter(content: string, frontmatter: Record<string, any>): string {
    const parsed = parseMarkdown(content);

    // Merge with existing frontmatter
    const merged = {
      ...parsed.frontmatter,
      ...frontmatter,
    };

    // Generate YAML frontmatter
    const yamlLines = ['---'];
    for (const [key, value] of Object.entries(merged)) {
      if (Array.isArray(value)) {
        yamlLines.push(`${key}:`);
        value.forEach(item => yamlLines.push(`  - ${item}`));
      } else if (typeof value === 'object' && value !== null) {
        yamlLines.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    }
    yamlLines.push('---');

    // Remove existing frontmatter if present
    let bodyContent = content;
    if (content.startsWith('---')) {
      const endIndex = content.indexOf('---', 3);
      if (endIndex !== -1) {
        bodyContent = content.slice(endIndex + 3).trim();
      }
    }

    return yamlLines.join('\n') + '\n\n' + bodyContent;
  }

  /**
   * Format date according to format string
   */
  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    const replacements: Record<string, string> = {
      'YYYY': String(date.getFullYear()),
      'YY': String(date.getFullYear()).slice(-2),
      'MM': pad(date.getMonth() + 1),
      'M': String(date.getMonth() + 1),
      'DD': pad(date.getDate()),
      'D': String(date.getDate()),
      'HH': pad(date.getHours()),
      'H': String(date.getHours()),
      'mm': pad(date.getMinutes()),
      'm': String(date.getMinutes()),
      'ss': pad(date.getSeconds()),
      's': String(date.getSeconds()),
      'WW': pad(this.getWeekNumber(date)),
      'W': String(this.getWeekNumber(date)),
    };

    let result = format;
    for (const [token, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    return result;
  }

  /**
   * Get weekday name
   */
  private getWeekday(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
