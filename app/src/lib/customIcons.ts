// Custom habit icons: any of ~1,500 Phosphor icons ("ph:Guitar|purple") or a photo
// ("img:ab12|orange"). The drawing itself is kept in state.iconArt so icons show instantly,
// offline; the full icon list (public/ph-icons.json) loads only when the search opens.
import { getState, update } from './store';
import type { Color } from './types';
import { COLORS } from './types';

export const isCustom = (icon: string) => icon.startsWith('ph:') || icon.startsWith('img:');
/** "ph:Guitar|purple" → { kind: 'ph', name: 'Guitar', color: 'purple' } */
export function parseCustom(icon: string) {
  const [head, color] = icon.split('|');
  const [kind, name] = head.split(':');
  return { kind: kind as 'ph' | 'img', name, color: (COLORS.includes(color as Color) ? color : 'orange') as Color };
}
export const artOf = (icon: string) => getState().iconArt?.[icon.split('|')[0]] || '';

/** Remember a new custom icon: its drawing, and a place in the "Yours" row (latest first, 12 kept) */
export function saveCustom(icon: string, art: string) {
  const key = icon.split('|')[0];
  update(s => {
    s.iconArt = { ...(s.iconArt || {}), [key]: art };
    s.myIcons = [icon, ...(s.myIcons || []).filter(x => x !== icon)].slice(0, 12);
    // forget drawings nothing uses any more
    const used = new Set([...s.habits.map(h => h.icon.split('|')[0]), ...s.myIcons.map(i => i.split('|')[0])]);
    for (const k of Object.keys(s.iconArt)) if (!used.has(k)) delete s.iconArt[k];
  });
}

// ── Search ──
type Entry = [name: string, svg: string];
let list: Promise<Entry[]> | null = null;
export const loadIcons = (): Promise<Entry[]> => (list ??= fetch('ph-icons.json').then(r => r.json() as Promise<Entry[]>).catch(() => { list = null; return [] as Entry[]; }));

/** Habit words → icon names, for when the word isn't in the icon's name */
const ALIASES: Record<string, string[]> = {
  water: ['Drop', 'Bottle'], hydrate: ['Drop'], gym: ['Barbell'], workout: ['Barbell', 'Lightning'], exercise: ['Barbell', 'PersonSimpleRun'],
  lift: ['Barbell'], run: ['PersonSimpleRun', 'Sneaker'], jog: ['PersonSimpleRun'], walk: ['PersonSimpleWalk', 'Footprints'],
  swim: ['PersonSimpleSwim', 'SwimmingPool'], bike: ['Bicycle'], cycle: ['Bicycle'], yoga: ['FlowerLotus'], meditate: ['FlowerLotus', 'Leaf'],
  sleep: ['Bed', 'Moon'], wake: ['AlarmClock', 'SunHorizon'], pray: ['HandsPraying'], god: ['HandsPraying'], read: ['BookOpen', 'Book'],
  study: ['GraduationCap', 'Books'], learn: ['Brain', 'GraduationCap'], write: ['PencilSimple', 'Notebook'], journal: ['Notebook', 'NotePencil'],
  code: ['Code', 'Terminal'], money: ['Money', 'PiggyBank', 'Wallet'], save: ['PiggyBank'], budget: ['Wallet', 'Calculator'], eat: ['ForkKnife', 'Carrot'],
  food: ['ForkKnife', 'Carrot'], cook: ['CookingPot'], diet: ['Carrot', 'AppleLogo'], fruit: ['Orange', 'AppleLogo'], vegetable: ['Carrot'],
  music: ['MusicNotes'], sing: ['Microphone'], song: ['MusicNotes'], pet: ['PawPrint', 'Dog', 'Cat'], plant: ['Plant', 'Leaf'], garden: ['Plant', 'Flower'],
  clean: ['Broom', 'Sparkle'], tidy: ['Broom'], laundry: ['TShirt'], phone: ['DeviceMobile'], social: ['ChatsCircle'], call: ['Phone'],
  family: ['UsersThree', 'House'], friend: ['Users', 'HandHeart'], love: ['Heart'], gratitude: ['HandHeart', 'Heart'], coffee: ['Coffee'],
  smoke: ['Cigarette', 'CigaretteSlash'], alcohol: ['Wine', 'BeerBottle'], drink: ['Wine', 'Drop'], sugar: ['Cookie', 'Cake'], medicine: ['Pill'],
  vitamin: ['Pill'], teeth: ['Tooth'], floss: ['Tooth'], skin: ['Drop', 'Sparkle'], shower: ['Shower'], game: ['GameController'], chess: ['Strategy'],
  language: ['Translate'], travel: ['AirplaneTilt', 'Suitcase'], photo: ['Camera'], draw: ['PaintBrush', 'Palette'], paint: ['PaintBrush', 'Palette'],
  work: ['Briefcase', 'Laptop'], focus: ['Target', 'Timer'], plan: ['CalendarCheck', 'ListChecks'], todo: ['ListChecks'], baby: ['Baby'], kids: ['Baby'],
  dog: ['Dog', 'PawPrint', 'Bone'], cat: ['Cat', 'PawPrint'], car: ['Car'], drive: ['Car'], sun: ['Sun'], nature: ['Tree', 'Mountains'], hike: ['Mountains', 'Boot'], dance: ['MusicNotes', 'Sparkle'],
  football: ['SoccerBall'], soccer: ['SoccerBall'], basketball: ['Basketball'], tennis: ['TennisBall'], cricket: ['Baseball']
};
const words = (name: string) => name.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase().split(' ');

export async function searchIcons(q: string, max = 60): Promise<Entry[]> {
  const all = await loadIcons();
  const toks = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!toks.length) return all.filter(([n]) => POPULAR.includes(n)).sort((a, b) => POPULAR.indexOf(a[0]) - POPULAR.indexOf(b[0]));
  const alias = new Set(toks.flatMap(t => Object.entries(ALIASES).filter(([k]) => k.startsWith(t) || t.startsWith(k)).flatMap(([, v]) => v)));
  const scored: [number, Entry][] = [];
  for (const e of all) {
    const w = words(e[0]);
    let score = alias.has(e[0]) ? 3 : 0;
    if (toks.every(t => w.some(x => x.startsWith(t)))) score += w.length <= 2 ? 2 : 1;
    if (score) scored.push([score, e]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1][0].length - b[1][0].length).slice(0, max).map(x => x[1]);
}
const POPULAR = ['Barbell', 'BookOpen', 'Drop', 'PersonSimpleRun', 'FlowerLotus', 'Bed', 'Notebook', 'Code', 'MusicNotes', 'PiggyBank', 'Carrot',
  'Coffee', 'HandsPraying', 'Translate', 'PawPrint', 'Plant', 'Broom', 'GameController', 'Camera', 'Palette', 'Heart', 'Sun', 'Bicycle', 'Pill'];

/** Identity for a searched icon (see lib/identity.ts) */
const ID_WORDS: [RegExp, string][] = [
  [/barbell|dumbbell|lightning/i, 'someone who trains'], [/run|sneaker|footprint|walk/i, 'someone who moves every day'], [/swim/i, 'a swimmer'],
  [/bicycle/i, 'a cyclist'], [/book|books/i, 'a reader'], [/graduation|brain|student/i, 'a lifelong learner'], [/pencil|notebook|note|pen\b/i, 'a writer'],
  [/code|terminal|laptop/i, 'a coder'], [/music|guitar|piano|microphone|vinyl/i, 'a musician'], [/paw|dog|cat|bird|fish/i, 'a great pet parent'],
  [/plant|leaf|flower|tree/i, 'a plant parent'], [/money|piggy|wallet|coin|calculator/i, 'someone who’s good with money'],
  [/carrot|apple|orange|fork|cooking|bowl/i, 'someone who eats well'], [/drop|bottle/i, 'someone who stays hydrated'], [/bed|moon/i, 'someone who sleeps well'],
  [/alarm|sunhorizon|sun/i, 'an early riser'], [/praying|church|cross/i, 'someone with faith'], [/lotus|yin/i, 'a calm person'],
  [/translate|globe/i, 'a language learner'], [/airplane|suitcase|map/i, 'a traveller'], [/camera|image/i, 'a photographer'],
  [/paint|palette|pen/i, 'an artist'], [/heart|handheart/i, 'a kind person'], [/broom|sparkle|house|tshirt/i, 'someone with a tidy home'],
  [/pill|tooth|shower|firstaid/i, 'someone who looks after themselves'], [/slash|cigarette|wine|beer|cookie|cake/i, 'someone in control'],
  [/soccer|basket|tennis|baseball|volleyball|football/i, 'an athlete'], [/game|strategy|puzzle/i, 'a sharp thinker'], [/users|phone|chat/i, 'someone who stays in touch']
];
export function identityForCustom(icon: string) {
  const { kind, name } = parseCustom(icon);
  if (kind !== 'ph') return null;
  return ID_WORDS.find(([re]) => re.test(name))?.[1] || null;
}

// ── Photo ──
const HEX: Record<Color, [number, number, number]> = { orange: [255, 140, 66], mint: [18, 199, 155], blue: [28, 176, 246], purple: [165, 96, 232], yellow: [255, 200, 0], red: [255, 75, 75] };
/** A photo → a small square icon (centre crop, 160 px), and the app colour closest to it */
export function photoToIcon(file: File): Promise<{ art: string; color: Color }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 160, c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d')!;
      const side = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      URL.revokeObjectURL(url);
      // average colour of the middle → nearest app colour (tints the habit's calendar and rows)
      const d = x.getImageData(40, 40, 80, 80).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4; r /= n; g /= n; b /= n;
      const color = (Object.keys(HEX) as Color[]).reduce((best, k) => {
        const dist = (h: Color) => (HEX[h][0] - r) ** 2 + (HEX[h][1] - g) ** 2 + (HEX[h][2] - b) ** 2;
        return dist(k) < dist(best) ? k : best;
      }, 'orange' as Color);
      resolve({ art: c.toDataURL('image/jpeg', 0.82), color });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that photo')); };
    img.src = url;
  });
}
