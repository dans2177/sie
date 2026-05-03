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
      return send(res, 200, { ok: true, lastTopicId: null });
    }

    if (req.method === 'GET') {
      const profileId = String(req.query.profileId || '').trim();
      if (!profileId) return send(res, 400, { ok: false, error: 'Missing profileId' });

      const rows = await sql`
        select last_topic_id as "lastTopicId"
        from profile_state
        where profile_id = ${profileId}
        limit 1
      `;

      return send(res, 200, { ok: true, lastTopicId: rows[0]?.lastTopicId || null });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const profileId = String(body.profileId || '').trim();
      const lastTopicId = body.lastTopicId == null ? null : String(body.lastTopicId).trim();

      if (!profileId) return send(res, 400, { ok: false, error: 'Missing profileId' });

      await sql`
        insert into profile_state (profile_id, last_topic_id)
        values (${profileId}, ${lastTopicId})
        on conflict (profile_id)
        do update set
          last_topic_id = excluded.last_topic_id,
          updated_at = now()
      `;

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
