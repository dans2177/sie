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
      return send(res, 200, { ok: true, messages: [] });
    }

    if (req.method === 'GET') {
      const profileId = String(req.query.profileId || '').trim();
      const topicId = String(req.query.topicId || '').trim();
      if (!profileId || !topicId) {
        return send(res, 400, { ok: false, error: 'Missing profileId/topicId' });
      }

      const rows = await sql`
        select messages
        from topic_chats
        where profile_id = ${profileId} and topic_id = ${topicId}
        limit 1
      `;

      const raw = rows[0]?.messages;
      // Tolerate legacy rows where messages was stored as a JSON-encoded string
      // (or even double-encoded). Unwrap until we find an array, then heal the row.
      let messages = raw;
      let healed = false;
      for (let i = 0; i < 3 && typeof messages === 'string'; i += 1) {
        try { messages = JSON.parse(messages); healed = true; } catch { break; }
      }
      if (!Array.isArray(messages)) messages = [];
      if (healed && messages.length > 0) {
        try {
          await sql`update topic_chats set messages = ${sql.json(messages)}, updated_at = now() where profile_id = ${profileId} and topic_id = ${topicId}`;
        } catch { /* best-effort */ }
      }
      return send(res, 200, { ok: true, messages });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const profileId = String(body.profileId || '').trim();
      const topicId = String(body.topicId || '').trim();
      const messages = Array.isArray(body.messages) ? body.messages : [];

      if (!profileId || !topicId) {
        return send(res, 400, { ok: false, error: 'Missing profileId/topicId' });
      }

      await sql`
        insert into topic_chats (profile_id, topic_id, messages)
        values (${profileId}, ${topicId}, ${sql.json(messages)})
        on conflict (profile_id, topic_id)
        do update set
          messages = excluded.messages,
          updated_at = now()
      `;

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
