import dotenv from 'dotenv';
dotenv.config();

const BASE = 'https://api.github.com';
const HEADERS = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '__pycache__']);
const MAX_FILE_SIZE = 100 * 1024; // 100 KB

function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  if (!match) throw new Error('Invalid GitHub repository URL');
  return { owner: match[1], repo: match[2] };
}

function parsePrUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) throw new Error('Invalid GitHub pull request URL');
  return { owner: match[1], repo: match[2], pull: match[3] };
}

async function ghFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (res.status === 404) throw new Error('Resource not found — repository may be private or the URL is incorrect');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchTree(owner, repo, sha) {
  const data = await ghFetch(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`);
  return data.tree;
}

function isCodeFile(path) {
  const ext = '.' + path.split('.').pop();
  if (!CODE_EXTENSIONS.has(ext)) return false;
  const parts = path.split('/');
  return !parts.some(p => SKIP_DIRS.has(p));
}

async function fetchFileContent(owner, repo, fileSha) {
  const data = await ghFetch(`/repos/${owner}/${repo}/git/blobs/${fileSha}`);
  if (data.size > MAX_FILE_SIZE) return null;
  return Buffer.from(data.content, 'base64').toString('utf8');
}

export async function fetchRepoFiles(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const repoData = await ghFetch(`/repos/${owner}/${repo}`);
  const defaultBranch = repoData.default_branch;

  const branchData = await ghFetch(`/repos/${owner}/${repo}/branches/${defaultBranch}`);
  const sha = branchData.commit.commit.tree.sha;

  const tree = await fetchTree(owner, repo, sha);
  const codeFiles = tree.filter(f => f.type === 'blob' && isCodeFile(f.path));

  const files = [];
  // Fetch files with concurrency limit to avoid rate limiting
  const CONCURRENCY = 5;
  for (let i = 0; i < codeFiles.length; i += CONCURRENCY) {
    const batch = codeFiles.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async f => {
        try {
          const content = await fetchFileContent(owner, repo, f.sha);
          if (content === null) return null;
          return { path: f.path, content };
        } catch {
          return null;
        }
      })
    );
    files.push(...results.filter(Boolean));
  }

  return files;
}

export async function fetchPRData(prUrl) {
  const { owner, repo, pull } = parsePrUrl(prUrl);

  const [pr, diff] = await Promise.all([
    ghFetch(`/repos/${owner}/${repo}/pulls/${pull}`),
    fetch(`${BASE}/repos/${owner}/${repo}/pulls/${pull}`, {
      headers: { ...HEADERS, Accept: 'application/vnd.github.v3.diff' },
    }).then(r => {
      if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
      return r.text();
    }),
  ]);

  if (!diff || diff.trim() === '') throw new Error('This PR has no diff — it may already be merged or empty');

  const files = await ghFetch(`/repos/${owner}/${repo}/pulls/${pull}/files`);

  return {
    repoUrl: `https://github.com/${owner}/${repo}`,
    title: pr.title,
    description: pr.body || '',
    diff,
    changedFiles: files.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch || '',
    })),
  };
}
