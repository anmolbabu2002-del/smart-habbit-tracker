// How a habit is proven, decided from its name:
//   'photo' → a live photo checked on the phone by CLIP (several descriptions per activity)
//   'tick'  → a normal tick (things neither can show, "avoid" habits, unknown names)
// The word lists live in proof-data.json, which tools/photo-proof/precompute.mjs also reads.
import data from './proof-data.json';

export type Proof = { mode: 'photo' | 'tick'; category?: string | null; show?: string; prompts?: string[]; exclude?: string[]; timer?: boolean; known: boolean };
export type Category = { id: string; show: string[]; words: string[]; timer?: boolean; exclude?: string[] };

export const CATEGORIES = data.categories as Category[];
export const SCENES = data.scenes as string[];
const AVOID = new RegExp(data.avoid, 'i');

const clean = (s: unknown) => ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ'\- ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const has = (text: string, word: string) => text.includes(word.length <= 4 ? ' ' + word : word) || text.includes(' ' + word);

export function classify(name: string): Proof {
  let text = clean(name);
  // "No skipping workout" / "Don't miss gym" still mean doing it: judge the rest of the name
  const dontSkip = /^ (no|not|don'?t|do not|never|stop) (skipping|skip|missing|miss) /i;
  const keepsProof = dontSkip.test(text);
  if (keepsProof) text = ' ' + text.replace(dontSkip, '').trim() + ' ';
  if (!keepsProof && AVOID.test(text.trim())) return { mode: 'tick', known: true };
  const cat = CATEGORIES.find(c => c.words.some(w => has(text, w)));
  if (cat) return { mode: 'photo', category: cat.id, show: cat.show[0], prompts: cat.show, exclude: cat.exclude, timer: !!cat.timer, known: true };
  if (data.nonVisual.some(w => has(text, w))) return { mode: 'tick', known: true };
  // Unknown names: a photo can't be judged reliably against vague words, so a simple tick
  return { mode: 'tick', category: null, known: false };
}
