// Reflection entries (saved separately, same storage as the old journal)
import { makeSlice } from './store';
import { today, ymd } from './dates';

export type Template = 'night' | 'morning' | 'evening' | 'dump' | 'free';
export type Entry = { title: string; content: string; tags?: string[]; paperStyle?: string; doodle?: string | null; date: number; template?: Template; fields?: Record<string, string> };
export const journal = makeSlice<Entry[]>('journalEntries', []);

/** Tonight's reflection is written */
export const reflectedToday = (entries: Entry[]) => entries.some(e => e.template === 'night' && ymd(new Date(e.date)) === today());
export const openReflection = () => window.dispatchEvent(new CustomEvent('ultradian:page', { detail: 'journal' }));
