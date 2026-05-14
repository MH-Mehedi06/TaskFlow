import { generateEmbedding, cosineSimilarity } from '../../src/services/embedding.service';

const DIMS = 256;

describe('generateEmbedding (local fallback)', () => {
  it('returns a vector of length 256', async () => {
    const vec = await generateEmbedding('hello world');
    expect(vec).toHaveLength(DIMS);
  });

  it('returns a normalized (unit) vector', async () => {
    const vec = await generateEmbedding('plumber bathroom pipe fix');
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('produces different vectors for different texts', async () => {
    const a = await generateEmbedding('electrician wiring');
    const b = await generateEmbedding('gardening lawn mowing');
    expect(a).not.toEqual(b);
  });

  it('produces identical vectors for identical texts', async () => {
    const a = await generateEmbedding('house cleaning');
    const b = await generateEmbedding('house cleaning');
    expect(a).toEqual(b);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [0.6, 0.8, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns 0 for empty arrays', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('similar texts score higher than unrelated texts', async () => {
    const query = await generateEmbedding('plumber pipe repair');
    const similar = await generateEmbedding('fix leaking pipe bathroom');
    const unrelated = await generateEmbedding('guitar lessons music teacher');
    const simScore = cosineSimilarity(query, similar);
    const unrelScore = cosineSimilarity(query, unrelated);
    expect(simScore).toBeGreaterThan(unrelScore);
  });
});
