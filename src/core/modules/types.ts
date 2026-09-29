import type { ComponentType, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { ZodType } from 'zod';

export type Locale = 'uk' | 'en';
/** Translation key, e.g. 'dashboard:title'. */
export type I18nKey = string;

export interface StudyDay {
  /** ISO date (yyyy-MM-dd) in the user's timezone, after applying the rollover hour. */
  date: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface DailyTaskDescriptor {
  key: string;
  title: I18nKey;
  emoji?: string;
  xp: number;
  estimatedMinutes?: number;
  route?: string;
  progress?: { current: number; target: number };
}

export interface DailyTaskProvider {
  getTasksForDay(ctx: {
    userId: string;
    day: StudyDay;
    settings: unknown;
  }): Promise<DailyTaskDescriptor[]>;
}

export interface StatSummaryItem {
  key: string;
  label: I18nKey;
  value: number | string;
  emoji?: string;
}

export interface StatsProvider {
  getSummary(range: DateRange): Promise<StatSummaryItem[]>;
  Widgets?: LazyExoticComponent<ComponentType<{ range: DateRange }>>[];
}

export interface DashboardWidget {
  id: string;
  Component: LazyExoticComponent<ComponentType>;
}

export interface AchievementDefinition {
  id: string;
  title: I18nKey;
  description: I18nKey;
  emoji: string;
}

export interface AppModule {
  id: string;
  version: string;
  title: I18nKey;
  icon: LucideIcon;
  emoji?: string;
  enabledByDefault: boolean;

  /** Lazy-loaded pages, mounted under /m/<id> */
  routes?: RouteObject[];
  nav?: { order: number; placement: 'main' | 'more' };

  dailyTaskProvider?: DailyTaskProvider;
  statsProvider?: StatsProvider;
  dashboardWidgets?: DashboardWidget[];
  settings?: { schema: ZodType; defaults: unknown; Component: ComponentType };
  achievements?: AchievementDefinition[];

  /** Translations for this module's own i18n namespace (namespace = module id). */
  i18n?: Record<Locale, Record<string, unknown>>;
}
