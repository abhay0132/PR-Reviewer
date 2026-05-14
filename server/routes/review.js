import express from 'express';
import { fetchPRData } from '../services/githubService.js';
import { embedText } from '../services/embeddingService.js';
import { similaritySearch } from '../services/vectorStore.js';
import { reviewPR } from '../services/geminiService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { prUrl } = req.body;
  if (!prUrl || typeof prUrl !== 'string') {
    return res.status(400).json({ error: 'prUrl is required' });
  }

  try {
    const prData = await fetchPRData(prUrl);

    // Gather context: embed each changed file's patch and search for similar codebase chunks
    const contextChunks = [];
    const seen = new Set();

    for (const file of prData.changedFiles) {
      if (!file.patch) continue;
      const queryText = `File: ${file.filename}\n\n${file.patch}`;
      const embedding = await embedText(queryText);
      const results = await similaritySearch(prData.repoUrl, embedding, 5);

      for (const r of results) {
        const key = `${r.file_path}:${r.start_line}`;
        if (!seen.has(key)) {
          seen.add(key);
          contextChunks.push(r);
        }
      }
    }

    const review = await reviewPR({ ...prData, codebaseContext: contextChunks });
    res.json({ review, prTitle: prData.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
