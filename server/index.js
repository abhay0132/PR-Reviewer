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

// Capture raw body via verify callbacks — works for both JSON and urlencoded.
// This is the standard way to get rawBody for Slack signature verification
// without double-consuming the stream.
const rawBodyCapture = (req, _res, buf) => { req.rawBody = buf.toString(); };

app.use(express.json({ verify: rawBodyCapture }));
app.use(express.urlencoded({ extended: true, verify: rawBodyCapture }));

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/ingest', ingestRouter);
app.use('/api/review', reviewRouter);
app.use('/api/slack', slackRouter);

app.listen(PORT, () => {
  console.log(`PR Reviewer server running on http://localhost:${PORT}`);
});
