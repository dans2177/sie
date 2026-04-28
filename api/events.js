import { ensureTables, getSql } from './_db.js';

function send(res, code, payload) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    await ensureTables();
    const sql = getSql();
    if (!sql) {
      return send(res, 200, { ok: true });
    }

    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const entries = Array.isArray(body.entries) ? body.entries : [body];

    const rows = entries
      .map((x) => ({
        profile_id: String(x.profileId || '').trim(),
        event_type: String(x.eventType || '').trim(),
        payload: x.payload && typeof x.payload === 'object' ? x.payload : {},
      }))
      .filter((x) => x.profile_id && x.event_type)
      .map((x) => ({ ...x, payload: JSON.stringify(x.payload) }));

    if (!rows.length) {
      return send(res, 400, { ok: false, error: 'No valid entries provided' });
    }

    await sql`
      insert into event_logs ${sql(rows, 'profile_id', 'event_type', 'payload')}
    `;

    return send(res, 200, { ok: true, inserted: rows.length });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
