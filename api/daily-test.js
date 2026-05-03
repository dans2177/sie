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
      return send(res, 503, { ok: false, error: 'Database unavailable' });
    }

    if (req.method === 'GET') {
      const profileId = String(req.query.profileId || '').trim();
      const date = String(req.query.date || '').trim();
      if (!profileId) return send(res, 400, { ok: false, error: 'Missing profileId' });

      const history = await sql`
        select test_date as date, score, total, completed_at as "completedAt"
        from daily_tests
        where profile_id = ${profileId}
        order by completed_at desc
        limit 14
      `;

      let today = null;
      if (date) {
        const rows = await sql`
          select test_date as date, score, total, payload, weak_topics as "weakTopicIds", completed_at as "completedAt"
          from daily_tests
          where profile_id = ${profileId} and test_date = ${date}
          limit 1
        `;
        today = rows[0] || null;
      }

      return send(res, 200, { ok: true, today, history });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const profileId = String(body.profileId || '').trim();
      const date = String(body.date || '').trim();
      const score = Number(body.score || 0);
      const total = Number(body.total || 0);
      const payload = body.payload || {};
      const weakTopicIds = Array.isArray(body.weakTopicIds) ? body.weakTopicIds.map(String) : [];

      if (!profileId || !date || !total) {
        return send(res, 400, { ok: false, error: 'Missing required fields' });
      }

      await sql`
        insert into daily_tests (profile_id, test_date, score, total, payload, weak_topics)
        values (${profileId}, ${date}, ${score}, ${total}, ${sql.json(payload)}, ${sql.json(weakTopicIds)})
        on conflict (profile_id, test_date)
        do update set
          score = excluded.score,
          total = excluded.total,
          payload = excluded.payload,
          weak_topics = excluded.weak_topics,
          completed_at = now()
      `;

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
