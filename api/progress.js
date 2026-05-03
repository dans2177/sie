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
      return send(res, 200, { ok: true, done: [] });
    }

    if (req.method === 'GET') {
      const profileId = String(req.query.profileId || '').trim();
      if (!profileId) {
        return send(res, 400, { ok: false, error: 'Missing profileId' });
      }

      const rows = await sql`
        select topic_id
        from profile_progress
        where profile_id = ${profileId} and completed = true
      `;
      return send(res, 200, { ok: true, done: rows.map((r) => r.topic_id) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const profileId = String(body.profileId || '').trim();
      const done = Array.isArray(body.done) ? body.done.map(String) : [];

      if (!profileId) {
        return send(res, 400, { ok: false, error: 'Missing profileId' });
      }

      await sql.begin(async (tx) => {
        await tx`delete from profile_progress where profile_id = ${profileId}`;
        if (done.length) {
          const values = done.map((topicId) => ({ profile_id: profileId, topic_id: topicId, completed: true }));
          await tx`insert into profile_progress ${tx(values)}`;
        }
      });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
