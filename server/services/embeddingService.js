import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-embedding-001';
// Free tier: 100 items/min (each item counts separately even in batch calls).
// Batch of 5 every 4s = 75 items/min — safely under the limit.
const BATCH_SIZE = 5;
const DELAY_MS = 4000;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function batchEmbedWithRetry(texts, retries = 6) {
  const body = {
    requests: texts.map(text => ({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
    })),
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (res.ok) {
      const data = await res.json();
      return data.embeddings.map(e => e.values);
    }

    const errText = await res.text();
    const is429 = res.status === 429;
    if (!is429 || attempt === retries - 1) throw new Error(`Gemini embedding error: ${errText}`);

    const delayMatch = errText.match(/"retryDelay":"(\d+)s"/);
    const waitMs = delayMatch ? parseInt(delayMatch[1]) * 1000 + 2000 : (attempt + 1) * 20000;
    console.log(`Rate limited. Waiting ${Math.round(waitMs / 1000)}s before retry...`);
    await sleep(waitMs);
  }
}

export async function embedText(text) {
  const results = await batchEmbedWithRetry([text]);
  return results[0];
}

export async function embedBatch(texts) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`Embedding chunks ${i + 1}–${i + batch.length} of ${texts.length}...`);
    const results = await batchEmbedWithRetry(batch);
    embeddings.push(...results);
    if (i + BATCH_SIZE < texts.length) await sleep(DELAY_MS);
  }
  return embeddings;
}
