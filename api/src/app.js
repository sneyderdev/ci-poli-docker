import express from 'express';

export function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: process.env.DB_HOST });
    } catch (error) {
      res.status(503).json({ status: 'error', message: error.message });
    }
  });

  app.get('/notes', async (req, res) => {
    const { rows } = await db.query('SELECT id, text, created_at FROM notes ORDER BY id');
    res.json(rows);
  });

  app.post('/notes', async (req, res) => {
    const { text } = req.body ?? {};
    if (!text.trim()) {
      return res.status(400).json({ error: 'El campo "text" es obligatorio' });
    }
    const { rows } = await db.query(
      'INSERT INTO notes (text) VALUES ($1) RETURNING id, text, created_at',
      [text.trim()],
    );
    res.status(201).json(rows[0]);
  });

  return app;
}
