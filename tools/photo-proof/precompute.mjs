// Turns every photo description in app/src/lib/proof-data.json and "fake scene" into a CLIP text fingerprint and
// writes habit-proof-text.json, so the phone only needs CLIP's photo part for known habits.
// Run from a folder with @huggingface/transformers installed:
//   REPO=<path to repo> node precompute.mjs   (MODEL_CACHE=<dir> to reuse downloaded models)
import { AutoTokenizer, CLIPTextModelWithProjection, env } from '@huggingface/transformers';
import fs from 'node:fs';
import path from 'node:path';

const repo = process.env.REPO || process.argv[2] || '.';
if (process.env.MODEL_CACHE) env.cacheDir = process.env.MODEL_CACHE;
// The same word lists and descriptions the app uses
const D = JSON.parse(fs.readFileSync(path.resolve(repo, 'app/src/lib/proof-data.json'), 'utf8'));
const MODEL = 'Xenova/clip-vit-base-patch32';
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });

const texts = [...new Set([...D.categories.flatMap(c => c.show), ...D.scenes])].map(t => 'a photo of ' + t);
const prompts = {};
for (const t of texts) {
  const { text_embeds } = await textModel(tokenizer([t], { padding: 'max_length', truncation: true }));
  const v = Array.from(text_embeds.data);
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  prompts[t] = Buffer.from(new Float32Array(v.map(x => x / n)).buffer).toString('base64');
}
const out = { model: MODEL, dtype: 'q8', dims: 512, scale: 100, prompts };
fs.writeFileSync(path.resolve(repo, 'app/public/habit-proof-text.json'), JSON.stringify(out));
console.log(`${texts.length} fingerprints → habit-proof-text.json (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
