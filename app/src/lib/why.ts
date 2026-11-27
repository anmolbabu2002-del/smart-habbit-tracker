// "Your why": the user's own line, or this default.
import { getState, legacyGet, update } from './store';

export const WHY_DEFAULT = 'I’m not going to stay average.';
export const whyText = () => (getState().why || '').trim() || WHY_DEFAULT;

/** Once: bring over the custom quote from the old app (localStorage, or its IndexedDB backup) */
export async function importOldQuote() {
  if (getState().why !== undefined) return;
  const read = async (k: string) => localStorage.getItem(k) ?? (await legacyGet<string>(k));
  let text = '';
  try {
    if ((await read('quoteMode')) === 'custom') text = String((await read('customQuoteText')) || '').trim().slice(0, 120);
  } catch { /* nothing to bring over */ }
  update(d => { d.why = text; });
}
