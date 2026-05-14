import { env } from '../config/env';

const DIMS = 256;

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function buildLocalVector(text: string): number[] {
  const vec = new Array<number>(DIMS).fill(0);
  for (const tok of tokenize(text)) {
    vec[simpleHash(tok) % DIMS] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
        dimensions: DIMS,
      });
      return res.data[0].embedding;
    } catch {
      // fall through
    }
  }
  return buildLocalVector(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
