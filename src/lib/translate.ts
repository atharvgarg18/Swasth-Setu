/**
 * Real-time text translation using MyMemory API (free, no key needed).
 * Supports: en ↔ mr (Marathi), en ↔ hi (Hindi), mr ↔ hi
 */

const LANG_CODES: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  mr: 'mr',
};

/**
 * Translate text from one language to another.
 * Falls back to original text if API fails or rate-limited.
 */
export async function translateText(
  text: string,
  from: string,
  to: string,
): Promise<string> {
  if (!text.trim() || from === to) return text;

  const fromCode = LANG_CODES[from] ?? from;
  const toCode = LANG_CODES[to] ?? to;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromCode}|${toCode}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return text;
    const json = await res.json();
    const translated = json?.responseData?.translatedText;
    // MyMemory sometimes returns the query string on error
    if (!translated || translated === text || json.responseStatus !== 200) return text;
    return translated;
  } catch {
    return text; // silent fallback
  }
}

/**
 * Detect likely language from text content (heuristic — checks Unicode ranges).
 */
export function detectLang(text: string): 'hi' | 'mr' | 'en' {
  if (!text) return 'en';
  // Devanagari script = Hindi and Marathi both
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  if (devanagariCount > text.length * 0.2) {
    // Marathi has some unique chars (ळ ॲ), but heuristic: default to hi for Devanagari
    return 'hi';
  }
  return 'en';
}
