import { useState } from 'react';
import IngestForm from './components/IngestForm.jsx';
import ReviewForm from './components/ReviewForm.jsx';

function IngestWarning() {
  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-1">
      <p className="font-semibold">⚠️ Read before you paste a 50,000-file monorepo</p>
      <ul className="list-disc list-inside space-y-1 text-amber-700">
        <li>Use a <strong>small public repo</strong> (under ~50 files). Try <code className="bg-amber-100 px-1 rounded">vercel/ms</code> or <code className="bg-amber-100 px-1 rounded">expressjs/cors</code>.</li>
        <li>We're running on the <strong>Gemini free tier</strong> — 75 embeddings/min. Translation: this is intentionally slow. Grab a coffee. ☕</li>
        <li>Indexing takes <strong>5–10 minutes</strong> for a small repo. Don't close the tab or your progress disappears into the void.</li>
        <li>Each repo has a <strong>300-chunk cap</strong> — because we're broke, not lazy.</li>
      </ul>
    </div>
  );
}

function ReviewWarning() {
  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
      <p className="font-semibold">🧠 A few things before you hit Review</p>
      <ul className="list-disc list-inside space-y-1 text-blue-700">
        <li><strong>Index the repo first</strong> (Step 1). Reviewing without indexing is like asking someone to review code they've never seen. Oh wait, that's every other PR tool.</li>
        <li>Review takes <strong>30–60 seconds</strong>. Gemini is thinking, not broken.</li>
        <li>Only works on <strong>public GitHub PRs</strong> from repos you've already indexed.</li>
      </ul>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('ingest');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">PR Reviewer</h1>
          <p className="mt-2 text-gray-500 text-sm">Codebase-aware AI code review — because the diff is only half the story</p>
          <p className="mt-1 text-xs text-gray-400">Powered by Gemini + pgvector · Free tier · Intentionally not fast</p>
        </div>

        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setTab('ingest')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'ingest'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Step 1 — Index Repository
          </button>
          <button
            onClick={() => setTab('review')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'review'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Step 2 — Review a PR
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {tab === 'ingest' ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Index a GitHub Repository</h2>
              <p className="text-sm text-gray-500 mb-4">
                Fetch all code files, chunk them, embed them with Gemini, and store in pgvector. Done once per repo.
              </p>
              <IngestWarning />
              <IngestForm />
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Review a Pull Request</h2>
              <p className="text-sm text-gray-500 mb-4">
                Fetches the diff, finds relevant codebase context via semantic search, and asks Gemini to review it like a senior engineer who's read the whole codebase.
              </p>
              <ReviewWarning />
              <ReviewForm />
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          💡 Tip: Try <code className="bg-gray-100 px-1 rounded">https://github.com/vercel/ms</code> — it's tiny, fast to index, and has real PRs to review.
        </p>
      </div>
    </div>
  );
}
