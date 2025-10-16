/**
 * Service for managing periodic notes (daily, weekly, monthly, yearly)
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  PeriodicNoteType,
  PeriodicNotesSettings,
  PeriodicNoteInfo,
  DateRange
} from '../types/periodic.js';
import { DEFAULT_PERIODIC_NOTES_SETTINGS } from '../types/periodic.js';
import type { VaultOperationResult } from '../types/index.js';
import { TemplateService } from './TemplateService.js';

export class PeriodicNotesService {
  private settings: PeriodicNotesSettings;
  private templateService: TemplateService;

  constructor(settings?: Partial<PeriodicNotesSettings>, templateService?: TemplateService) {
    this.settings = {
      daily: { ...DEFAULT_PERIODIC_NOTES_SETTINGS.daily, ...settings?.daily },
      weekly: { ...DEFAULT_PERIODIC_NOTES_SETTINGS.weekly, ...settings?.weekly },
      monthly: { ...DEFAULT_PERIODIC_NOTES_SETTINGS.monthly, ...settings?.monthly },
      yearly: { ...DEFAULT_PERIODIC_NOTES_SETTINGS.yearly, ...settings?.yearly },
    };
    this.templateService = templateService || new TemplateService();
  }

  /**
   * Create a periodic note for a specific date
   */
  async createPeriodicNote(
    vaultPath: string,
    type: PeriodicNoteType,
    date?: Date,
    variables?: Record<string, any>
  ): Promise<VaultOperationResult<string>> {
    try {
      const noteDate = date || new Date();
      const config = this.settings[type];

      if (!config.enabled) {
        return { success: false, error: `${type} notes are not enabled` };
      }

      // Generate note path
      const notePath = this.getPeriodicNotePath(type, noteDate);
      const fullPath = path.join(vaultPath, notePath);

      // Check if note already exists
      try {
        await fs.access(fullPath);
        return { success: true, data: notePath }; // Already exists
      } catch {
        // Note doesn't exist, continue to create
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      let content: string;

      // Use template if specified
      if (config.templatePath) {
        const renderResult = await this.templateService.renderTemplate(
          vaultPath,
          config.templatePath,
          {
            targetPath: notePath,
            variables: {
              ...this.getPeriodicNoteVariables(type, noteDate),
              ...variables,
            },
          }
        );

        if (!renderResult.success || !renderResult.data) {
          return { success: false, error: renderResult.error };
        }

        content = renderResult.data.content;
      } else {
        // Generate default content
        content = this.generateDefaultContent(type, noteDate);
      }

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');

      return { success: true, data: notePath };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create ${type} note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get info about a periodic note
   */
  async getPeriodicNoteInfo(
    vaultPath: string,
    type: PeriodicNoteType,
    date?: Date
  ): Promise<VaultOperationResult<PeriodicNoteInfo>> {
    try {
      const noteDate = date || new Date();
      const notePath = this.getPeriodicNotePath(type, noteDate);
      const fullPath = path.join(vaultPath, notePath);

      let exists = false;
      try {
        await fs.access(fullPath);
        exists = true;
      } catch {
        exists = false;
      }

      const info: PeriodicNoteInfo = {
        type,
        date: noteDate,
        path: notePath,
        title: this.getPeriodicNoteTitle(type, noteDate),
        exists,
      };

      return { success: true, data: info };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get ${type} note info: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * List all periodic notes of a type within a date range
   */
  async listPeriodicNotes(
    vaultPath: string,
    type: PeriodicNoteType,
    startDate?: Date,
    endDate?: Date
  ): Promise<VaultOperationResult<PeriodicNoteInfo[]>> {
    try {
      const config = this.settings[type];
      const folderPath = path.join(vaultPath, config.folder);

      // Check if folder exists
      try {
        await fs.access(folderPath);
      } catch {
        return { success: true, data: [] };
      }

      const { glob } = await import('glob');
      const pattern = path.join(folderPath, '**/*.md');
      const files = await glob(pattern);

      const notes: PeriodicNoteInfo[] = [];

      for (const file of files) {
        const relativePath = path.relative(vaultPath, file);
        const filename = path.basename(file, '.md');

        // Try to parse date from filename
        const date = this.parseDateFromFilename(filename, config.format);
        if (!date) continue;

        // Filter by date range if specified
        if (startDate && date < startDate) continue;
        if (endDate && date > endDate) continue;

        notes.push({
          type,
          date,
          path: relativePath,
          title: filename,
          exists: true,
        });
      }

      // Sort by date descending
      notes.sort((a, b) => b.date.getTime() - a.date.getTime());

      return { success: true, data: notes };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list ${type} notes: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get the date range for a periodic note
   */
  getDateRange(type: PeriodicNoteType, date: Date): DateRange {
    const start = new Date(date);
    const end = new Date(date);

    switch (type) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'weekly':
        // Start on Monday
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'yearly':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  /**
   * Generate the path for a periodic note
   */
  private getPeriodicNotePath(type: PeriodicNoteType, date: Date): string {
    const config = this.settings[type];
    const filename = this.formatDate(date, config.format);
    return path.join(config.folder, `${filename}.md`);
  }

  /**
   * Generate the title for a periodic note
   */
  private getPeriodicNoteTitle(type: PeriodicNoteType, date: Date): string {
    const config = this.settings[type];
    return this.formatDate(date, config.format);
  }

  /**
   * Get template variables specific to periodic notes
   */
  private getPeriodicNoteVariables(type: PeriodicNoteType, date: Date): Record<string, any> {
    const range = this.getDateRange(type, date);

    const vars: Record<string, any> = {
      type,
      date: this.formatDate(date, 'YYYY-MM-DD'),
      startDate: this.formatDate(range.start, 'YYYY-MM-DD'),
      endDate: this.formatDate(range.end, 'YYYY-MM-DD'),
    };

    switch (type) {
      case 'daily':
        vars.weekday = this.getWeekday(date);
        break;

      case 'weekly':
        vars.week = this.getWeekNumber(date);
        vars.year = date.getFullYear();
        break;

      case 'monthly':
        vars.month = this.getMonthName(date);
        vars.monthNumber = date.getMonth() + 1;
        vars.year = date.getFullYear();
        break;

      case 'yearly':
        vars.year = date.getFullYear();
        break;
    }

    return vars;
  }

  /**
   * Generate default content for a periodic note
   */
  private generateDefaultContent(type: PeriodicNoteType, date: Date): string {
    const vars = this.getPeriodicNoteVariables(type, date);
    const title = this.getPeriodicNoteTitle(type, date);

    let content = `---\ndate: ${vars.date}\ntype: ${type}\n---\n\n`;
    content += `# ${title}\n\n`;

    switch (type) {
      case 'daily':
        content += `## Tasks\n\n- [ ] \n\n## Notes\n\n`;
        break;

      case 'weekly':
        content += `## Week ${vars.week} Overview\n\n`;
        content += `**Period:** ${vars.startDate} to ${vars.endDate}\n\n`;
        content += `## Goals\n\n- \n\n## Reflection\n\n`;
        break;

      case 'monthly':
        content += `## ${vars.month} ${vars.year}\n\n`;
        content += `## Goals\n\n- \n\n## Highlights\n\n`;
        break;

      case 'yearly':
        content += `## ${vars.year} Overview\n\n`;
        content += `## Goals\n\n- \n\n## Review\n\n`;
        break;
    }

    return content;
  }

  /**
   * Format date according to format string
   */
  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    let result = format;

    // Handle literals in square brackets
    const literals: string[] = [];
    result = result.replace(/\[([^\]]+)\]/g, (_match, literal) => {
      literals.push(literal);
      return `__LITERAL_${literals.length - 1}__`;
    });

    const replacements: Record<string, string> = {
      'YYYY': String(date.getFullYear()),
      'YY': String(date.getFullYear()).slice(-2),
      'MM': pad(date.getMonth() + 1),
      'M': String(date.getMonth() + 1),
      'DD': pad(date.getDate()),
      'D': String(date.getDate()),
      'WW': pad(this.getWeekNumber(date)),
      'W': String(this.getWeekNumber(date)),
    };

    for (const [token, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    // Restore literals
    result = result.replace(/__LITERAL_(\d+)__/g, (_match, index) => {
      return literals[parseInt(index)];
    });

    return result;
  }

  /**
   * Parse date from filename using format
   */
  private parseDateFromFilename(filename: string, _format: string): Date | null {
    try {
      // Simple parsing for common formats
      // YYYY-MM-DD
      const dailyMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dailyMatch) {
        return new Date(parseInt(dailyMatch[1]), parseInt(dailyMatch[2]) - 1, parseInt(dailyMatch[3]));
      }

      // YYYY-WXX
      const weeklyMatch = filename.match(/^(\d{4})-W(\d{2})$/);
      if (weeklyMatch) {
        const year = parseInt(weeklyMatch[1]);
        const week = parseInt(weeklyMatch[2]);
        return this.getDateFromWeek(year, week);
      }

      // YYYY-MM
      const monthlyMatch = filename.match(/^(\d{4})-(\d{2})$/);
      if (monthlyMatch) {
        return new Date(parseInt(monthlyMatch[1]), parseInt(monthlyMatch[2]) - 1, 1);
      }

      // YYYY
      const yearlyMatch = filename.match(/^(\d{4})$/);
      if (yearlyMatch) {
        return new Date(parseInt(yearlyMatch[1]), 0, 1);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get date from ISO week number
   */
  private getDateFromWeek(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  }

  /**
   * Get weekday name
   */
  private getWeekday(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Get month name
   */
  private getMonthName(date: Date): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[date.getMonth()];
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
