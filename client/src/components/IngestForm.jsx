import { useState } from 'react';
import LoadingState from './LoadingState.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function IngestForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setProgress([]);
    setDone(null);
    setError(null);

    try {
      const res = await fetch(`${API}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url.trim() }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.status === 'progress') {
            setProgress(prev => [...prev, data.message]);
          } else if (data.status === 'done') {
            setDone(data.message);
            setLoading(false);
          } else if (data.status === 'error') {
            setError(data.message);
            setLoading(false);
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Indexing...' : 'Index Repository'}
        </button>
      </form>

      {progress.length > 0 && (
        <ul className="mt-4 space-y-1">
          {progress.map((msg, i) => (
            <li key={i} className="text-sm text-gray-500 flex items-center gap-2">
              <span className="text-green-500">✓</span> {msg}
            </li>
          ))}
        </ul>
      )}

      {loading && <LoadingState message="Embedding chunks one by one like it's 2005... (free tier life 🐢)" />}

      {done && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {done}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error: {error}
        </div>
      )}
    </div>
  );
}
