import crypto from 'crypto';
import { fetchPRData } from '../services/githubService.js';
import { embedText } from '../services/embeddingService.js';
import { similaritySearch } from '../services/vectorStore.js';
import { reviewPR } from '../services/geminiService.js';
import { formatReviewForSlack } from '../services/slackService.js';

const router = express.Router();

// ─── Slack request verification ────────────────────────────────────────────
function verifySlackRequest(req) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // Skip verification if secret not set yet (dev mode)

  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  if (!timestamp || !signature) return false;

  // Reject replays older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${req.rawBody}`;
  const expected = 'v0=' + crypto.createHmac('sha256', secret).update(sigBase).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── POST result back to Slack's response_url ──────────────────────────────
async function postToSlack(responseUrl, payload) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── Full review pipeline (same logic as /api/review) ──────────────────────
async function runReview(prUrl) {
  const prData = await fetchPRData(prUrl);
  const contextChunks = [];
  const seen = new Set();

  for (const file of prData.changedFiles) {
    if (!file.patch) continue;
    const embedding = await embedText(`File: ${file.filename}\n\n${file.patch}`);
    const results = await similaritySearch(prData.repoUrl, embedding, 5);
    for (const r of results) {
      const key = `${r.file_path}:${r.start_line}`;
      if (!seen.has(key)) { seen.add(key); contextChunks.push(r); }
    }
  }

  const review = await reviewPR({ ...prData, codebaseContext: contextChunks });
  return { review, prTitle: prData.title };
}

// ─── /api/slack/review ─────────────────────────────────────────────────────
router.post('/review', async (req, res) => {
  // Verify the request came from Slack
  if (!verifySlackRequest(req)) {
    return res.status(401).json({ error: 'Invalid Slack signature' });
  }

  const prUrl = (req.body.text || '').trim();
  const responseUrl = req.body.response_url;

  // Validate it looks like a GitHub PR URL
  if (!prUrl.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/)) {
    return res.json({
      response_type: 'ephemeral',
      text: '❌ That doesn\'t look like a GitHub PR URL. Try:\n`/review https://github.com/owner/repo/pull/123`',
    });
  }

  // ✅ Step 1: Acknowledge Slack immediately (must happen within 3s)
  res.json({
    response_type: 'ephemeral',
    text: '🤖 On it! Fetching the diff, running semantic search, and bribing Gemini... (~30–60 seconds)',
  });

  // ✅ Step 2: Run review async, post result back via response_url
  runReview(prUrl)
    .then(({ review, prTitle }) => {
      const payload = formatReviewForSlack(review, prTitle);
      return postToSlack(responseUrl, payload);
    })
    .catch(err => {
      return postToSlack(responseUrl, {
        response_type: 'ephemeral',
        text: `❌ Review failed: ${err.message}`,
      });
    });
});

export default router;
