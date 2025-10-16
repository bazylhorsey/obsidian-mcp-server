/**
 * Types for periodic notes (daily, weekly, monthly, yearly)
 */

export type PeriodicNoteType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PeriodicNoteConfig {
  enabled: boolean;
  folder: string;
  templatePath?: string;
  format: string; // Date format for filename
}

export interface PeriodicNotesSettings {
  daily: PeriodicNoteConfig;
  weekly: PeriodicNoteConfig;
  monthly: PeriodicNoteConfig;
  yearly: PeriodicNoteConfig;
}

export interface PeriodicNoteInfo {
  type: PeriodicNoteType;
  date: Date;
  path: string;
  title: string;
  exists: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Default periodic note configurations
 */
export const DEFAULT_PERIODIC_NOTES_SETTINGS: PeriodicNotesSettings = {
  daily: {
    enabled: true,
    folder: 'Daily Notes',
    format: 'YYYY-MM-DD',
  },
  weekly: {
    enabled: true,
    folder: 'Weekly Notes',
    format: 'YYYY-[W]WW',
  },
  monthly: {
    enabled: true,
    folder: 'Monthly Notes',
    format: 'YYYY-MM',
  },
  yearly: {
    enabled: true,
    folder: 'Yearly Notes',
    format: 'YYYY',
  },
};
