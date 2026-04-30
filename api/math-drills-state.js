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
      return send(res, 200, { ok: true, cards: [] });
    }

    if (req.method === 'GET') {
      const profileId = String(req.query.profileId || '').trim();
      if (!profileId) {
        return send(res, 400, { ok: false, error: 'Missing profileId' });
      }
      const rows = await sql`
        select cards
        from math_drills
        where profile_id = ${profileId}
        limit 1
      `;
      const cards = rows.length && Array.isArray(rows[0].cards) ? rows[0].cards : [];
      return send(res, 200, { ok: true, cards });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const profileId = String(body.profileId || '').trim();
      const cards = Array.isArray(body.cards) ? body.cards : null;

      if (!profileId) {
        return send(res, 400, { ok: false, error: 'Missing profileId' });
      }
      if (!cards) {
        return send(res, 400, { ok: false, error: 'Missing cards array' });
      }

      await sql`
        insert into math_drills (profile_id, cards, updated_at)
        values (${profileId}, ${sql.json(cards)}, now())
        on conflict (profile_id) do update
        set cards = excluded.cards,
            updated_at = now()
      `;
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
