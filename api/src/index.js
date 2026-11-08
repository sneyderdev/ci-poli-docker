import express from 'express';
import { pool } from './db.js';

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: process.env.DB_HOST });
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message });
  }
});

app.get('/notes', async (req, res) => {
  const { rows } = await pool.query('SELECT id, text, created_at FROM notes ORDER BY id');
  res.json(rows);
});

app.post('/notes', async (req, res) => {
  const { text } = req.body ?? {};
  if (!text) {
    return res.status(400).json({ error: 'El campo "text" es obligatorio' });
  }
  const { rows } = await pool.query(
    'INSERT INTO notes (text) VALUES ($1) RETURNING id, text, created_at',
    [text],
  );
  res.status(201).json(rows[0]);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API escuchando en el puerto ${port}`));
