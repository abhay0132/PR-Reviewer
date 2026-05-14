import pool from '../db/index.js';

export async function initSchema() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS codebase_chunks (
      id SERIAL PRIMARY KEY,
      repo_url TEXT NOT NULL,
      file_path TEXT NOT NULL,
      start_line INTEGER,
      end_line INTEGER,
      content TEXT NOT NULL,
      embedding vector(3072),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create index only if it doesn't exist (ivfflat requires data first in practice)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'codebase_chunks' AND indexname = 'codebase_chunks_embedding_idx'
      ) THEN
        -- Index will be created after data is inserted
        NULL;
      END IF;
    END $$;
  `);
}

export async function clearRepoChunks(repoUrl) {
  await pool.query('DELETE FROM codebase_chunks WHERE repo_url = $1', [repoUrl]);
}

export async function insertChunks(chunks, embeddings, repoUrl) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < chunks.length; i++) {
      const { filePath, content, startLine, endLine } = chunks[i];
      const embedding = embeddings[i];
      await client.query(
        `INSERT INTO codebase_chunks (repo_url, file_path, start_line, end_line, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [repoUrl, filePath, startLine, endLine, content, JSON.stringify(embedding)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function similaritySearch(repoUrl, queryEmbedding, topK = 5) {
  const result = await pool.query(
    `SELECT file_path, start_line, end_line, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM codebase_chunks
     WHERE repo_url = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [JSON.stringify(queryEmbedding), repoUrl, topK]
  );
  return result.rows;
}

export async function createIndexIfNeeded() {
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS codebase_chunks_embedding_idx
      ON codebase_chunks USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  } catch {
    // Index creation can fail if not enough rows; that's fine
  }
}
