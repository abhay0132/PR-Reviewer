import express from 'express';
import { fetchRepoFiles } from '../services/githubService.js';
import { chunkFiles } from '../services/chunker.js';
import { embedBatch } from '../services/embeddingService.js';
import { initSchema, clearRepoChunks, insertChunks, createIndexIfNeeded } from '../services/vectorStore.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  // Use SSE so the client can stream progress updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    send({ status: 'progress', message: 'Initializing database schema...' });
    await initSchema();

    send({ status: 'progress', message: 'Fetching repository files from GitHub...' });
    const files = await fetchRepoFiles(repoUrl);
    send({ status: 'progress', message: `Fetched ${files.length} code files. Chunking...` });

    const MAX_CHUNKS = 300;
    let chunks = chunkFiles(files);
    if (chunks.length > MAX_CHUNKS) {
      send({ status: 'progress', message: `${chunks.length} chunks generated — capping at ${MAX_CHUNKS} to stay within API limits.` });
      chunks = chunks.slice(0, MAX_CHUNKS);
    }
    send({ status: 'progress', message: `Using ${chunks.length} chunks. Clearing old data...` });

    await clearRepoChunks(repoUrl);
    send({ status: 'progress', message: 'Generating embeddings (this may take a while)...' });

    const texts = chunks.map(c => `File: ${c.filePath}\n\n${c.content}`);
    const embeddings = await embedBatch(texts);

    send({ status: 'progress', message: `Embeddings ready. Storing ${chunks.length} chunks in vector DB...` });
    await insertChunks(chunks, embeddings, repoUrl);

    send({ status: 'progress', message: 'Building vector index...' });
    await createIndexIfNeeded();

    send({ status: 'done', message: `Done — ${chunks.length} chunks indexed from ${files.length} files.`, count: chunks.length });
  } catch (err) {
    send({ status: 'error', message: err.message });
  } finally {
    res.end();
  }
});

export default router;
