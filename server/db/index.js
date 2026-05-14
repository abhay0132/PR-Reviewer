import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isRemote = process.env.DATABASE_URL?.includes('render.com') ||
                 process.env.DATABASE_URL?.includes('amazonaws.com') ||
                 process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

export default pool;
