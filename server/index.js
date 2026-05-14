import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ingestRouter from './routes/ingest.js';
import reviewRouter from './routes/review.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/ingest', ingestRouter);
app.use('/api/review', reviewRouter);

app.listen(PORT, () => {
  console.log(`PR Reviewer server running on http://localhost:${PORT}`);
});
