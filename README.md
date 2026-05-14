# PR Reviewer 🔍

> **Codebase-aware AI code review — because the diff is only half the story.**

Most PR reviewers only see the diff. They have no idea how the change fits into the rest of the codebase. So bugs slip through, patterns get broken, and duplicate code gets merged.

**PR Reviewer** fixes that. It reads your entire codebase first, stores it as searchable vector memory, and reviews every PR in full context — catching architectural conflicts, duplicate implementations, and pattern mismatches that generic tools completely miss.

This is a **RAG (Retrieval-Augmented Generation)** pipeline applied to code review.

---

## 🚀 Live Demo

- **Frontend:** [pr-reviewer-mocha.vercel.app](https://pr-reviewer-mocha.vercel.app)
- **Backend:** [pr-reviewer-8tfx.onrender.com](https://pr-reviewer-8tfx.onrender.com)

> ⚠️ Running on Gemini free tier. Indexing takes 5–10 minutes for small repos. Grab a coffee. ☕

---

## ✨ How It Works

### Phase 1 — Index a Repository (done once)
1. Paste a public GitHub repo URL
2. Fetches all `.ts`, `.js`, `.py`, `.tsx`, `.jsx`, `.go`, `.java` files via GitHub API
3. Splits files into ~4000 character chunks (function-boundary aware)
4. Generates **3072-dimensional vector embeddings** using `gemini-embedding-001`
5. Stores everything in **PostgreSQL + pgvector**

### Phase 2 — Review a PR (done per PR)
1. Paste a GitHub PR URL
2. Fetches the diff and changed files
3. Embeds the diff → runs **cosine similarity search** against the indexed codebase
4. Builds a prompt: PR diff + top relevant codebase chunks + system instructions
5. Sends to **Gemini** → returns a structured JSON review
6. Renders a clean report with bugs, security issues, architectural conflicts, and positives

---

## 📋 Review Output

Each review is structured into 6 categories:

| Category | What it catches |
|---|---|
| 🏗️ Architectural Conflicts | Changes that break existing patterns |
| 🐛 Bugs | Logic errors with file + line number |
| 🔐 Security Issues | Vulnerabilities introduced by the PR |
| 🧹 Code Smell | Redundancy, bad types, quality issues |
| ✅ Positives | What the contributor did well |
| 💬 Suggested Action | Concrete ask for the contributor |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express (ESM) |
| AI — Embeddings | Gemini `gemini-embedding-001` (3072 dims) |
| AI — Review | Gemini `gemini-2.0-flash-lite` |
| Vector DB | PostgreSQL + pgvector |
| GitHub Data | GitHub REST API |
| Deploy — Frontend | Vercel |
| Deploy — Backend | Render |

---

## 📁 Project Structure

```
pr-reviewer/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── App.jsx                # Two-tab layout with warnings
│       └── components/
│           ├── IngestForm.jsx     # SSE progress streaming UI
│           ├── ReviewForm.jsx     # PR URL input + review trigger
│           ├── ReviewReport.jsx   # Color-coded review cards
│           └── LoadingState.jsx   # Loading indicator
│
└── server/                        # Node.js + Express backend
    ├── index.js                   # Entry point
    ├── routes/
    │   ├── ingest.js              # POST /api/ingest (SSE stream)
    │   └── review.js              # POST /api/review
    ├── services/
    │   ├── githubService.js       # GitHub REST API integration
    │   ├── chunker.js             # Smart file chunking
    │   ├── embeddingService.js    # Gemini embeddings + rate limit handling
    │   ├── vectorStore.js         # pgvector insert + similarity search
    │   └── geminiService.js       # Gemini review generation
    └── db/
        └── index.js               # PostgreSQL connection pool (SSL-aware)
```

---

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL with pgvector extension (or use [Postgres.app](https://postgresapp.com))
- GitHub Personal Access Token
- Gemini API Key from [aistudio.google.com](https://aistudio.google.com/apikey)

### 1. Clone the repo

```bash
git clone https://github.com/abhay0132/PR-Reviewer.git
cd PR-Reviewer
```

### 2. Set up the database

```bash
psql postgres
CREATE DATABASE prreviewer;
\c prreviewer
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
GITHUB_TOKEN=your_github_personal_access_token
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://your_username@localhost:5433/prreviewer
PORT=3001
```

### 4. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 5. Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## ☁️ Deploying

### Backend → Render
- Root directory: `server/`
- Build command: `npm install`
- Start command: `node index.js`
- Environment variables: `GITHUB_TOKEN`, `GEMINI_API_KEY`, `DATABASE_URL`, `NODE_ENV=production`

### Frontend → Vercel
- Root directory: `client/`
- Environment variable: `VITE_API_URL=https://your-render-url.onrender.com`

---

## ⚠️ Free Tier Limitations

This project runs on the Gemini free tier. Here's what that means in practice:

- **Embedding rate limit:** ~75 chunks/min → indexing takes 5–10 min for small repos
- **Daily embedding limit:** 1000 requests/day
- **Chunk cap:** 300 chunks per repo
- **Recommended repos to test:** [`vercel/ms`](https://github.com/vercel/ms), [`expressjs/cors`](https://github.com/expressjs/cors)

For production use, swap in a paid Gemini API key and remove the chunk cap in `server/routes/ingest.js`.

---

## 💡 What Makes This Different

| Feature | Generic PR Tools | PR Reviewer |
|---|---|---|
| Sees the diff | ✅ | ✅ |
| Reads the full codebase | ❌ | ✅ |
| Catches architectural conflicts | ❌ | ✅ |
| Finds duplicate implementations | ❌ | ✅ |
| References actual file/line numbers | ❌ | ✅ |
| Understands existing patterns | ❌ | ✅ |

---

## 📄 License

MIT
