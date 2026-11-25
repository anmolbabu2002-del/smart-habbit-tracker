// How a habit is proven, decided from its name:
//   'photo' → a live photo checked on the phone by CLIP
//   'tick'  → a normal tick (things a photo can't show, and "avoid" habits)
// Ported from habit-proof-dictionary.js (same lists; tools/photo-proof/precompute.mjs reads that file).

export type Proof = { mode: 'photo' | 'tick'; category?: string | null; show?: string; timer?: boolean; known: boolean };

// Order matters: the first category whose keywords match wins (specific before general)
export const CATEGORIES: { id: string; show: string; words: string[]; timer?: boolean }[] = [
    { id: 'pushups', timer: true, show: 'a person doing push-ups', words: ['push-up', 'push up', 'pushup', 'press-up', 'press up'] },
    { id: 'squats', timer: true, show: 'a person doing squats', words: ['squat'] },
    { id: 'plank', timer: true, show: 'a person doing a plank exercise', words: ['plank'] },
    { id: 'yoga', timer: true, show: 'a person doing yoga', words: ['yoga', 'surya namaskar', 'sun salutation', 'asana'] },
    { id: 'stretch', timer: true, show: 'a person stretching', words: ['stretch', 'mobility', 'flexibility'] },
    { id: 'skipping', timer: true, show: 'a person skipping rope', words: ['skipping', 'skip rope', 'jump rope', 'rope jump'] },
    { id: 'gym', timer: true, show: 'a person lifting weights at a gym', words: ['gym', 'weights', 'weight lifting', 'weightlifting', 'dumbbell', 'barbell', 'deadlift', 'bench press', 'kettlebell'] },
    { id: 'meditate', timer: true, show: 'a person meditating sitting cross-legged', words: ['meditat', 'mindful', 'breathwork', 'pranayam'] },
    { id: 'workout', timer: true, show: 'a person doing a bodyweight workout exercise', words: ['workout', 'work out', 'exercise', 'burpee', 'lunge', 'crunch', 'sit-up', 'sit up', 'situp', 'abs', 'core', 'hiit', 'jumping jack', 'star jump', 'high knee', 'mountain climber', 'calisthenic', 'pull-up', 'pull up', 'pullup', 'chin-up', 'dips', 'cardio', 'fitness', 'training', 'bodyweight', 'body weight', 'warm up', 'warm-up', 'pilates', 'zumba', 'aerobic', 'dance', 'leg day', 'arm day', 'glute'] },
    { id: 'walkdog', show: 'a person walking a dog', words: ['walk the dog', 'walk dog', 'dog walk'] },
    { id: 'running', show: 'a person running', words: ['run', 'jog', 'sprint', 'marathon'] },
    { id: 'walking', show: 'a person walking outdoors', words: ['walk', 'steps', 'hike', 'hiking', 'trek'] },
    { id: 'cycling', show: 'a person riding a bicycle', words: ['cycl', 'bike', 'bicycle'] },
    { id: 'swimming', show: 'a person swimming', words: ['swim'] },
    { id: 'sports', show: 'a person playing a sport', words: ['football', 'soccer', 'cricket', 'basketball', 'badminton', 'tennis', 'volleyball', 'table tennis', 'boxing', 'martial art', 'karate'] },
    { id: 'reading', show: 'a person reading a book', words: ['read', 'book', 'pages', 'novel', 'chapter'] },
    { id: 'study', show: 'a person studying with books and notes', words: ['study', 'homework', 'revise', 'revision', 'notes', 'learn', 'course', 'lecture', 'exam', 'practice question', 'coding', 'code', 'program', 'language'] },
    { id: 'writing', show: 'a person writing in a notebook', words: ['journal', 'diary', 'write', 'writing', 'essay', 'blog'] },
    { id: 'cooking', show: 'a person cooking food', words: ['cook', 'meal prep', 'bake', 'recipe', 'dinner', 'lunch'] },
    { id: 'healthyfood', show: 'a healthy meal with fruit and vegetables on a plate', words: ['salad', 'fruit', 'vegetable', 'veggies', 'healthy meal', 'healthy breakfast', 'protein', 'breakfast'] },
    { id: 'plants', show: 'a person watering plants in a garden', words: ['garden', 'plant'] },
    { id: 'water', show: 'a person drinking a glass of water', words: ['water', 'hydrat', 'drink'] },
    { id: 'dishes', show: 'a person washing dishes', words: ['dishes', 'utensils', 'wash plates'] },
    { id: 'makebed', show: 'a neatly made bed', words: ['make bed', 'make the bed', 'make my bed', 'bed made'] },
    { id: 'cleaning', show: 'a person cleaning the house', words: ['clean', 'tidy', 'declutter', 'laundry', 'vacuum', 'mop', 'sweep', 'organize', 'organise', 'chores'] },
    { id: 'music', show: 'a person playing a musical instrument', words: ['guitar', 'piano', 'keyboard', 'violin', 'flute', 'drum', 'ukulele', 'instrument', 'sing', 'music practice', 'riyaz'] },
    { id: 'art', show: 'a person drawing or painting', words: ['draw', 'sketch', 'paint', 'art', 'doodle', 'calligraphy'] },
    { id: 'teeth', show: 'a person brushing their teeth', words: ['brush', 'floss', 'teeth'] },
    { id: 'skincare', show: 'a person doing a skincare routine', words: ['skincare', 'skin care', 'face wash', 'moisturi', 'sunscreen'] }
];

// A photo can't show these — they stay a normal tick
const AVOID = /^(no|not|don'?t|do not|never|quit|stop|avoid|less|limit|cut|reduce|skip|without|zero)\b/i;
const NON_VISUAL = ['call', 'phone ', 'text ', 'message', 'pray', 'namaz', 'puja', 'gratitude', 'grateful', 'thank', 'wake up', 'wake at', 'wakeup',
    'sleep', 'bed by', 'bedtime', 'plan', 'think', 'reflect', 'smile', 'compliment', 'be kind', 'affirmation', 'budget', 'save money', 'saving',
    'invest', 'vitamin', 'medicine', 'pill', 'tablet', 'supplement', 'fast', 'intermittent', 'listen', 'podcast', 'gratitude', 'kind', 'forgive',
    'posture', 'deep breath', 'screen time', 'social media', 'phone free', 'digital detox', 'early', 'on time'];

const clean = (s: unknown) => ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ'\- ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const has = (text: string, word: string) => text.includes(word.length <= 4 ? ' ' + word : word) || text.includes(' ' + word);

// → { mode: 'photo' | 'tick', category, show, timer, known }
export function classify(name: string): Proof {
    let text = clean(name);
    // "No skipping workout" / "Don't miss gym" still mean doing it: judge the rest of the name
    const dontSkip = /^ (no|not|don'?t|do not|never|stop) (skipping|skip|missing|miss) /i;
    const keepsProof = dontSkip.test(text);
    if (keepsProof) text = ' ' + text.replace(dontSkip, '').trim() + ' ';
    const photoCat = CATEGORIES.find(c => c.words.some(w => has(text, w)));
    // Other "avoid" habits are ticks
    if (!keepsProof && AVOID.test(text.trim())) return { mode: 'tick', known: true };
    if (photoCat) return { mode: 'photo', category: photoCat.id, show: photoCat.show, timer: !!photoCat.timer, known: true };
    if (NON_VISUAL.some(w => has(text, w))) return { mode: 'tick', known: true };
  // Unknown names: a photo can't be judged reliably against vague words ("Build something"),
  // so they get a normal tick, like everything else a photo can't clearly show
  return { mode: 'tick', category: null, known: false };
}

// Everyday scenes and cheats every photo is compared against
export const SCENES = ['a person sitting on a couch', 'a person lying in bed with a phone', 'an empty room', 'a selfie of a person\'s face',
    'a phone or computer screen', 'a person standing doing nothing', 'a person watching television', 'a person using a phone', 'a person using a laptop'];

