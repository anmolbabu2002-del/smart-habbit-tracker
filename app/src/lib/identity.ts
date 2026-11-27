// "Every action is a vote for the type of person you wish to become." (Atomic Habits)
// Each habit's identity comes from its icon (which the app already picks from the habit's name),
// so nothing extra is asked when creating a habit. The user can type their own in the calendar.
import type { Habit } from './types';
import { identityForCustom } from './customIcons';

const BY_ICON: Record<string, string> = {
  // body
  dumbbell: 'someone who trains', kettlebell: 'someone who trains',
  shoe: 'someone who moves every day', footsteps: 'someone who moves every day',
  bike: 'a cyclist', ring: 'a swimmer', ball: 'an athlete', bat: 'an athlete', racket: 'an athlete',
  mountain: 'an adventurer', lotus: 'a calm person', candle: 'someone at peace', tea: 'someone who slows down',
  // health and care
  apple: 'someone who eats well', salad: 'someone who eats well', pan: 'a home cook',
  glass: 'someone who stays hydrated', bottle: 'someone who stays hydrated',
  pill: 'someone who takes care of their health', heart: 'someone who takes care of their health',
  tooth: 'someone who looks after themselves', shower: 'someone who looks after themselves', sparkle: 'someone who looks after themselves',
  moon: 'someone who sleeps well', bed: 'someone who starts the day right',
  sun: 'an early riser', sunrise: 'an early riser', alarm: 'an early riser',
  // breaking bad habits
  nosugar: 'someone in control', nophone: 'someone in control', nocaffeine: 'someone in control',
  nocig: 'someone in control', noalcohol: 'someone in control', nojunk: 'someone in control',
  // mind and learning
  book: 'a reader', cap: 'a lifelong learner', globe: 'a language learner', flask: 'a scientist',
  brain: 'a sharp thinker', chess: 'a sharp thinker', puzzle: 'a sharp thinker', calculator: 'someone who’s good with numbers',
  pencil: 'a writer', notebook: 'a writer', note: 'a writer',
  speech: 'a confident speaker', mic: 'a confident speaker',
  // making things
  code: 'a coder', laptop: 'a coder', palette: 'an artist', camera: 'a photographer', bulb: 'a creator',
  guitar: 'a musician', piano: 'a musician', headphones: 'a curious listener',
  // life
  coin: 'someone who’s good with money', piggy: 'someone who’s good with money',
  broom: 'someone with a tidy home', home: 'someone with a tidy home',
  plant: 'a plant parent', leaf: 'a plant parent', paw: 'a great pet parent',
  phone: 'someone who stays in touch', smile: 'a positive person',
  clock: 'someone who’s always on time', calendar: 'someone who’s always on time',
  checklist: 'someone who gets things done', target: 'someone who hits their goals', trophy: 'someone who hits their goals',
  star: 'someone who shows up'
};
export const DEFAULT_IDENTITY = 'someone who shows up';

/** Who this habit makes you: your own words, or the one that goes with its icon */
export const autoIdentity = (icon: string) => BY_ICON[icon] || identityForCustom(icon) || DEFAULT_IDENTITY;
export const identityOf = (h: Habit) => (h.identity || '').trim() || autoIdentity(h.icon);

/** Real votes only: days it was done (free-pass days aren't a vote) */
export function votesOf(h: Habit) {
  const pass = new Set(h.passDays || []);
  return h.history.filter(d => !pass.has(d)).length;
}
