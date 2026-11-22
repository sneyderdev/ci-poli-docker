import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

// Base de datos falsa: registra las consultas y responde con lo que indique cada prueba.
function fakeDb(respond) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return respond(sql, params);
    },
  };
}

async function startServer(t, db) {
  const server = createApp(db).listen(0);
  await once(server, 'listening');
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

test('GET /health responde 200 cuando la base de datos contesta', async (t) => {
  const url = await startServer(t, fakeDb(() => ({ rows: [{ '?column?': 1 }] })));

  const res = await fetch(`${url}/health`);

  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('GET /health responde 503 cuando la base de datos no está disponible', async (t) => {
  const url = await startServer(t, fakeDb(() => {
    throw new Error('connect ECONNREFUSED');
  }));

  const res = await fetch(`${url}/health`);

  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: 'error', message: 'connect ECONNREFUSED' });
});

test('GET /notes devuelve las notas guardadas', async (t) => {
  const notes = [{ id: 1, text: 'primera', created_at: '2026-11-21T00:00:00.000Z' }];
  const url = await startServer(t, fakeDb(() => ({ rows: notes })));

  const res = await fetch(`${url}/notes`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), notes);
});

test('POST /notes guarda la nota y responde 201', async (t) => {
  const db = fakeDb((sql, [text]) => ({ rows: [{ id: 7, text, created_at: '2026-11-21T00:00:00.000Z' }] }));
  const url = await startServer(t, db);

  const res = await fetch(`${url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hola' }),
  });

  assert.equal(res.status, 201);
  assert.equal((await res.json()).text, 'hola');
  assert.deepEqual(db.calls[0].params, ['hola']);
});

test('POST /notes sin texto responde 400 y no toca la base de datos', async (t) => {
  const db = fakeDb(() => ({ rows: [] }));
  const url = await startServer(t, db);

  const res = await fetch(`${url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
  assert.equal(db.calls.length, 0);
});
