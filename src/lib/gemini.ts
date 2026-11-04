import type { FoodItem } from './db';
import type { Lang } from './i18n';
import { r1 } from './nutrition';

/** Primary first; the next one is used when Google reports overload (503) or rate limits (429). */
export const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'] as const;

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export type Confidence = 'high' | 'medium' | 'low';

export interface Analysis {
  name: string;
  items: FoodItem[];
  confidence: Confidence;
  notes: string;
  model: string;
}

/** Keys copied on a phone often carry spaces, line breaks or invisible characters; HTTP headers reject them. */
export function cleanKey(k: string): string {
  return k.replace(/[^!-~]/g, '');
}

export type AnalyzeErrorCode = 'busy' | 'rate' | 'key' | 'net' | 'generic';

export class AnalyzeError extends Error {
  constructor(public code: AnalyzeErrorCode, message?: string) {
    super(message ?? code);
  }
}

export interface AnalyzeInput {
  apiKey: string;
  lang: Lang;
  imageBase64?: string | null;
  /** User-provided food name (optional). */
  foodName?: string;
  /** User-provided ingredients / grams / free text (optional). */
  details?: string;
}

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Short dish name' },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          grams: { type: 'number', description: 'Estimated edible weight in grams' },
          kcal: { type: 'number' },
          protein: { type: 'number', description: 'grams' },
          carbs: { type: 'number', description: 'grams' },
          fat: { type: 'number', description: 'grams' },
        },
        required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
      },
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string', description: 'One short sentence: key assumption (e.g. cooking oil, portion).' },
  },
  required: ['name', 'items', 'confidence', 'notes'],
};

function buildPrompt(input: AnalyzeInput): string {
  const language = input.lang === 'az' ? 'Azerbaijani (Latin script)' : 'English';
  const lines = [
    'You are a precise sports nutritionist estimating the nutrition of ONE meal.',
    'Break the meal into its main components and estimate each component\'s edible weight in grams and its kcal, protein, carbs and fat.',
    'Rules:',
    '- Use standard food-composition values (USDA-like). Calories must be consistent with macros (≈ 4·protein + 4·carbs + 9·fat).',
    '- Account for hidden fats: cooking oil, butter, sauces, dressings. Azerbaijani and Turkish home cooking often uses generous oil and butter (plov, dolma, qutab, kabab, etc.).',
    '- Judge portion size from plate/utensil/hand size in the photo.',
    '- If the user gives a name, ingredients or grams, treat them as ground truth and override what you see.',
    '- confidence: "high" only when the portion is clear or the user gave grams; "low" if the food is unclear.',
    `- Write "name", item names and "notes" in ${language}.`,
  ];
  if (input.foodName?.trim()) lines.push(`User says the food is: "${input.foodName.trim()}".`);
  if (input.details?.trim()) lines.push(`User details: "${input.details.trim()}".`);
  if (!input.imageBase64) lines.push('There is no photo; estimate from the description using typical portions when amounts are missing.');
  return lines.join('\n');
}

async function callModel(model: string, input: AnalyzeInput, signal: AbortSignal): Promise<Analysis> {
  const parts: object[] = [{ text: buildPrompt(input) }];
  if (input.imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: input.imageBase64 } });

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleanKey(input.apiKey) },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: SCHEMA,
        },
      }),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new AnalyzeError('busy', 'timeout');
    throw new AnalyzeError('net', String(e));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 503 || res.status === 500) throw new AnalyzeError('busy', body);
    if (res.status === 429) throw new AnalyzeError('rate', body);
    if (res.status === 400 && /api key|API_KEY/i.test(body)) throw new AnalyzeError('key', body);
    if (res.status === 401 || res.status === 403) throw new AnalyzeError('key', body);
    throw new AnalyzeError('generic', `${res.status} ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string; thought?: boolean }) => typeof p.text === 'string' && !p.thought)
    .map((p: { text: string }) => p.text)
    .join('');
  if (!text) throw new AnalyzeError('generic', 'empty response');

  let parsed: { name?: string; items?: Partial<FoodItem>[]; confidence?: string; notes?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AnalyzeError('generic', 'bad json');
  }

  const items: FoodItem[] = (parsed.items ?? [])
    .map((it) => ({
      name: String(it.name ?? '').trim() || '—',
      grams: Math.max(0, Math.round(Number(it.grams) || 0)),
      kcal: Math.max(0, Math.round(Number(it.kcal) || 0)),
      protein: Math.max(0, r1(Number(it.protein) || 0)),
      carbs: Math.max(0, r1(Number(it.carbs) || 0)),
      fat: Math.max(0, r1(Number(it.fat) || 0)),
    }))
    .filter((it) => it.kcal > 0 || it.grams > 0);
  if (items.length === 0) throw new AnalyzeError('generic', 'no items');

  const confidence: Confidence =
    parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium';

  return {
    name: String(parsed.name ?? '').trim() || items[0].name,
    items,
    confidence,
    notes: String(parsed.notes ?? '').trim(),
    model,
  };
}

export async function analyzeMeal(input: AnalyzeInput): Promise<Analysis> {
  if (!input.imageBase64 && !input.details?.trim() && !input.foodName?.trim()) {
    throw new AnalyzeError('generic', 'no input');
  }
  // Alternate models so an overloaded primary costs one short timeout, not a long wait.
  const plan = [MODELS[0], MODELS[1], MODELS[0], MODELS[1]];
  let lastErr: AnalyzeError = new AnalyzeError('generic');
  for (let i = 0; i < plan.length; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), i < 2 ? 20_000 : 35_000);
    try {
      return await callModel(plan[i], input, ctrl.signal);
    } catch (e) {
      lastErr = e instanceof AnalyzeError ? e : new AnalyzeError('generic', String(e));
      if (lastErr.code === 'key' || lastErr.code === 'net') throw lastErr;
      if (i < plan.length - 1) await new Promise((r) => setTimeout(r, 600));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Which hosts are reachable from the device: separates "no internet" from "Google API blocked". */
export async function networkProbe(): Promise<string> {
  const targets: [string, string][] = [
    ['Google', 'https://www.google.com/generate_204'],
    ['Gemini API', `${ENDPOINT}?pageSize=1`],
    ['Open Food Facts', 'https://world.openfoodfacts.org/api/v2/product/5449000000996.json?fields=code'],
  ];
  const lines: string[] = [];
  for (const [name, url] of targets) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      lines.push(`${name}: HTTP ${r.status}`);
    } catch (e) {
      lines.push(`${name}: ✗ ${(e as Error)?.message ?? String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return lines.join('\n');
}

/** Cheap text-only call used by the "Test key" button. */
export async function testKey(apiKey: string): Promise<void> {
  await analyzeMeal({ apiKey, lang: 'en', details: '1 banana' });
}

/** Scale an item's macros to a new gram amount, keeping its ratios. */
export function scaleItem(item: FoodItem, grams: number): FoodItem {
  const g = Math.max(0, Math.round(grams));
  if (item.grams <= 0) return { ...item, grams: g };
  const f = g / item.grams;
  return {
    ...item,
    grams: g,
    kcal: Math.round(item.kcal * f),
    protein: r1(item.protein * f),
    carbs: r1(item.carbs * f),
    fat: r1(item.fat * f),
  };
}
