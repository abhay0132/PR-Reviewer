import { useState } from 'react';
import IngestForm from './components/IngestForm.jsx';
import ReviewForm from './components/ReviewForm.jsx';

export default function App() {
  const [tab, setTab] = useState('ingest');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">PR Reviewer</h1>
          <p className="mt-2 text-gray-500 text-sm">Codebase-aware AI code review powered by Gemini + pgvector</p>
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
                Paste a public GitHub repo URL. The system will fetch all code files, generate embeddings, and store them for context-aware review.
              </p>
              <IngestForm />
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Review a Pull Request</h2>
              <p className="text-sm text-gray-500 mb-4">
                Paste a GitHub PR URL from a repository you've already indexed. The review will use codebase context to find architectural issues, bugs, and patterns.
              </p>
              <ReviewForm />
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Make sure to index the repository before reviewing a PR from it.
        </p>
      </div>
    </div>
  );
}
