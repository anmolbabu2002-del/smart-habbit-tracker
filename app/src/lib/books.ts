// The library: classics from Project Gutenberg (via Gutendex) and your own books (TXT, EPUB,
// PDF). Uses the same storage keys as before, so shelves, progress and finished books carry over.
import { api } from './native';
import { blobGet, blobSet, legacyGet, uid } from './store';

export type BookRef = { id: string; title: string; author?: string; url?: string; coverUrl?: string; own?: boolean; fileType?: string };
export type Loaded = { kind: 'text'; text: string } | { kind: 'html'; chapters: string[] };
export type HistoryItem = { id: string; title: string; url?: string; coverUrl?: string; pageIndex?: number; totalPages?: number; lastRead: number; fraction?: number };
export type CustomBook = { id: string; title: string; emoji?: string; fileType: 'text' | 'epub' | 'pdf' | string; charCount?: number; addedAt: number; author?: string };

const json = <T,>(k: string, d: T): T => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : d; } catch { return d; } };
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

// ── Shelves ──
export const history = () => json<HistoryItem[]>('bookHistory', []).map(h => ({ ...h, id: String(h.id) }));
export const finished = () => json<{ id: string; title: string; url?: string; coverUrl?: string; finishedAt: number }[]>('finishedBooks', []);
export const customBooks = () => json<CustomBook[]>('customBooks', []);
export const position = (id: string) => { const f = parseFloat(localStorage.getItem(`bookpos_${id}`) || ''); return f >= 0 && f <= 1 ? f : 0; };

export function savePosition(b: BookRef, fraction: number) {
  localStorage.setItem(`bookpos_${b.id}`, fraction.toFixed(6));
  const list = history().filter(h => h.id !== b.id);
  list.unshift({ id: b.id, title: b.title, url: b.url, coverUrl: b.coverUrl, lastRead: Date.now(), fraction });
  save('bookHistory', list.slice(0, 12));
}
export function markFinished(b: BookRef) {
  const list = finished();
  if (list.some(x => String(x.id) === b.id)) return false;
  list.push({ id: b.id, title: b.title, url: b.url, coverUrl: b.coverUrl, finishedAt: Date.now() });
  save('finishedBooks', list);
  return true;
}
export function removeFromHistory(id: string) { save('bookHistory', history().filter(h => h.id !== id)); }

export async function deleteCustomBook(id: string) {
  save('customBooks', customBooks().filter(b => String(b.id) !== id));
  save('finishedBooks', finished().filter(b => String(b.id) !== id));
  removeFromHistory(id);
  localStorage.removeItem(`bookpos_${id}`);
  localStorage.removeItem(`bookmark_${id}`);
  await blobSet(`book_${id}`, null).catch(() => {});
}

// ── Catalogue ──
export type Found = BookRef & { downloads: number };
export async function search(q: string, signal?: AbortSignal): Promise<Found[]> {
  const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json() as { results: { id: number; title: string; authors: { name: string }[]; formats: Record<string, string>; download_count: number }[] };
  return data.results.map((b): Found | null => {
    const f = b.formats;
    const url = f['text/plain; charset=utf-8'] || f['text/plain; charset=us-ascii'] || f['text/plain'] || f['text/html'] || f['text/html; charset=utf-8'];
    return url ? { id: String(b.id), title: b.title, author: b.authors[0]?.name.split(', ').reverse().join(' '), url, coverUrl: f['image/jpeg'], downloads: b.download_count } : null;
  }).filter((x): x is Found => !!x);
}

export const POPULAR: BookRef[] = [
  { id: '1342', title: 'Pride and Prejudice', author: 'Jane Austen' },
  { id: '84', title: 'Frankenstein', author: 'Mary Shelley' },
  { id: '1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle' },
  { id: '11', title: 'Alice’s Adventures in Wonderland', author: 'Lewis Carroll' },
  { id: '2701', title: 'Moby Dick', author: 'Herman Melville' },
  { id: '345', title: 'Dracula', author: 'Bram Stoker' },
  { id: '1232', title: 'The Prince', author: 'Niccolò Machiavelli' },
  { id: '2680', title: 'Meditations', author: 'Marcus Aurelius' },
  { id: '132', title: 'The Art of War', author: 'Sun Tzu' },
  { id: '64317', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' }
].map(b => ({ ...b, url: `https://www.gutenberg.org/ebooks/${b.id}.txt.utf-8`, coverUrl: `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg` }));

function cleanGutenberg(raw: string, isHtml: boolean) {
  let text = raw;
  if (isHtml) { const doc = new DOMParser().parseFromString(text, 'text/html'); text = doc.body.innerText || doc.body.textContent || text; }
  const start = text.indexOf('*** START OF');
  if (start !== -1) { const after = text.indexOf('***', start + 12); if (after !== -1) text = text.substring(after + 3); }
  const end = text.indexOf('*** END OF');
  if (end !== -1) text = text.substring(0, end);
  return text.replace(/\r\n/g, '\n').replace(/([^\n])\n([^\n])/g, '$1 $2').replace(/\n{3,}/g, '\n\n').trim();
}

async function download(url: string) {
  const secure = url.replace('http://', 'https://');
  const tries = [api(`/.netlify/functions/book-proxy?url=${encodeURIComponent(secure)}`), `https://api.allorigins.win/raw?url=${encodeURIComponent(secure)}`, `https://corsproxy.io/?${encodeURIComponent(secure)}`];
  for (const u of tries) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 25000);
    try {
      const res = await fetch(u, { signal: ctl.signal });
      if (res.ok) { const text = await res.text(); if (text.length > 500) return text; }
    } catch { /* next */ } finally { clearTimeout(t); }
  }
  throw new Error('Couldn’t download the book. Are you online?');
}

// ── Opening a book ──
export async function load(b: BookRef): Promise<Loaded> {
  if (b.own) {
    const meta = customBooks().find(x => String(x.id) === b.id);
    const data = (await blobGet<ArrayBuffer | string>(`book_${b.id}`)) ?? (await legacyGet<ArrayBuffer | string>(`customBookBinary_${b.id}`)) ?? localStorage.getItem(`customBookText_${b.id}`);
    if (data == null) throw new Error('This book’s file is missing from the phone.');
    const type = meta?.fileType || 'text';
    if (type === 'epub' && typeof data !== 'string') return { kind: 'html', chapters: await parseEpub(data) };
    if (type === 'pdf' && typeof data !== 'string') return { kind: 'text', text: await pdfText(data) };
    return { kind: 'text', text: typeof data === 'string' ? data : new TextDecoder().decode(data) };
  }
  const cached = (await blobGet<string>(`cache_${b.id}`)) ?? (await legacyGet<string>(`bookCache_${b.id}`));
  if (typeof cached === 'string' && cached.length > 500) return { kind: 'text', text: cached };
  const text = cleanGutenberg(await download(b.url!), /\.html?($|\?)|text\/html/.test(b.url || ''));
  blobSet(`cache_${b.id}`, text).catch(() => {});
  return { kind: 'text', text };
}

// ── Adding your own ──
export async function addOwnBook(file: File): Promise<BookRef> {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buf = await file.arrayBuffer();
  let fileType: CustomBook['fileType'] = 'text';
  let title = name;
  if (ext === 'epub') { fileType = 'epub'; title = (await epubTitle(buf)) || name; await parseEpub(buf); }
  else if (ext === 'pdf') { fileType = 'pdf'; const t = await pdfText(buf); if (t.trim().length < 50) throw new Error('This PDF has no readable text (it may be scanned images).'); }
  else if (!['txt', 'md', 'text'].includes(ext)) throw new Error('Pick a .txt, .epub or .pdf file.');
  const id = 'custom_' + uid();
  await blobSet(`book_${id}`, buf);
  const books = customBooks();
  books.push({ id, title, fileType, charCount: buf.byteLength, addedAt: Date.now() });
  save('customBooks', books);
  return { id, title, own: true, fileType };
}

// ── EPUB ──
async function epubDoc(buf: ArrayBuffer) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);
  const parser = new DOMParser();
  const container = await zip.file('META-INF/container.xml')?.async('text');
  if (!container) throw new Error('This EPUB looks damaged.');
  const root = parser.parseFromString(container, 'application/xml').querySelector('rootfile')?.getAttribute('full-path');
  const opfText = root && await zip.file(root)?.async('text');
  if (!root || !opfText) throw new Error('This EPUB looks damaged.');
  return { zip, parser, opf: parser.parseFromString(opfText, 'application/xml'), dir: root.includes('/') ? root.slice(0, root.lastIndexOf('/') + 1) : '' };
}
async function epubTitle(buf: ArrayBuffer) {
  try { const { opf } = await epubDoc(buf); return opf.getElementsByTagName('dc:title')[0]?.textContent?.trim() || null; } catch { return null; }
}
const blobUrls: string[] = [];
async function parseEpub(buf: ArrayBuffer) {
  blobUrls.splice(0).forEach(u => URL.revokeObjectURL(u));
  const { zip, parser, opf, dir } = await epubDoc(buf);
  const manifest: Record<string, { href: string; type: string }> = {};
  opf.querySelectorAll('item').forEach(i => { manifest[i.getAttribute('id') || ''] = { href: i.getAttribute('href') || '', type: i.getAttribute('media-type') || '' }; });
  const chapters: string[] = [];
  for (const ref of Array.from(opf.querySelectorAll('itemref'))) {
    const item = manifest[ref.getAttribute('idref') || ''];
    if (!item || !/html|xml/.test(item.type)) continue;
    const path = dir + decodeURIComponent(item.href);
    const html = await (zip.file(path) || zip.file(dir + item.href))?.async('text');
    if (!html) continue;
    let doc: Document;
    try { doc = parser.parseFromString(html, 'application/xhtml+xml'); if (doc.querySelector('parsererror')) throw 0; } catch { doc = parser.parseFromString(html, 'text/html'); }
    const body = doc.body || doc.querySelector('body');
    if (!body) continue;
    const itemDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
    for (const svg of Array.from(body.querySelectorAll('svg'))) {
      const im = svg.querySelector('image');
      const href = im?.getAttribute('href') || im?.getAttribute('xlink:href');
      if (href) { const img = doc.createElement('img'); img.setAttribute('src', href); svg.replaceWith(img); }
    }
    for (const img of Array.from(body.querySelectorAll('img'))) {
      const src = img.getAttribute('src') || '';
      if (!src || /^(data:|https?:)/.test(src)) continue;
      const f = zip.file(resolvePath(itemDir, src)) || zip.file(decodeURIComponent(resolvePath(itemDir, src)));
      if (f) { const u = URL.createObjectURL(await f.async('blob')); blobUrls.push(u); img.setAttribute('src', u); }
    }
    const clean = sanitize(body);
    if (clean.replace(/<[^>]+>/g, '').trim() || clean.includes('<img')) chapters.push(clean);
  }
  if (!chapters.length) throw new Error('No readable text in this EPUB.');
  return chapters;
}
function resolvePath(base: string, rel: string) {
  const parts = (base + rel).split('/');
  const out: string[] = [];
  parts.forEach(p => { if (p === '..') out.pop(); else if (p !== '.') out.push(p); });
  return out.join('/');
}

// Untrusted book HTML: keep only plain reading markup
const ALLOWED = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'EM', 'I', 'STRONG', 'B', 'U', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'IMG', 'SPAN', 'DIV', 'HR', 'SUP', 'SUB', 'PRE', 'CODE', 'SECTION', 'ARTICLE', 'SMALL', 'A', 'TABLE', 'TBODY', 'TR', 'TD', 'TH', 'FIGURE', 'FIGCAPTION', 'CENTER']);
function sanitize(root: Element) {
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toUpperCase();
      if (!ALLOWED.has(tag)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON', 'SVG', 'MATH', 'NOSCRIPT'].includes(tag)) child.remove();
        else { walk(child); child.replaceWith(...Array.from(child.childNodes)); }
        continue;
      }
      for (const a of Array.from(child.attributes)) {
        const keep = tag === 'IMG' && (a.name === 'alt' || (a.name === 'src' && /^(blob:|data:image\/)/.test(a.value)));
        if (!keep) child.removeAttribute(a.name);
      }
      if (tag === 'IMG' && !child.getAttribute('src')) { child.remove(); continue; }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}

// ── PDF: the text, page by page ──
async function pdfText(buf: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    let page = '', lastY: number | null = null;
    for (const it of content.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      const y = it.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 14) page += '\n';
      else if (page && !page.endsWith(' ') && !page.endsWith('\n')) page += ' ';
      page += it.str;
      if (y !== undefined) lastY = y;
    }
    pages.push(page.replace(/([^\n])\n([^\n])/g, '$1 $2').trim());
  }
  return pages.join('\n\n');
}
