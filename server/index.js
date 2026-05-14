import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ingestRouter from './routes/ingest.js';
import reviewRouter from './routes/review.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  }
}));

app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/ingest', ingestRouter);
app.use('/api/review', reviewRouter);

app.listen(PORT, () => {
  console.log(`PR Reviewer server running on http://localhost:${PORT}`);
});
