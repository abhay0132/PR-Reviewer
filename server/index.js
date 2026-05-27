import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ingestRouter from './routes/ingest.js';
import reviewRouter from './routes/review.js';
import slackRouter from './routes/slack.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Capture raw body for Slack signature verification BEFORE json/urlencoded parsers
app.use((req, _res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => { req.rawBody = data; next(); });
});

app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/ingest', ingestRouter);
app.use('/api/review', reviewRouter);
app.use('/api/slack', slackRouter);

app.listen(PORT, () => {
  console.log(`PR Reviewer server running on http://localhost:${PORT}`);
});
