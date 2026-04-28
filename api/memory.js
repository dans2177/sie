import { ensureTables, getSql } from './_db.js';

function send(res, code, payload) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function buildAdaptiveBrief(progressRows, weakRows, chatRows) {
  const weak = weakRows.map((r) => r.topic_id).filter(Boolean);
  const inProgress = progressRows.slice(0, 6).map((r) => r.topic_id);
  const chatHints = chatRows.map((r) => `- ${String(r.user_message || '').slice(0, 80)}`).filter(Boolean);

  const lines = [];
  if (weak.length) lines.push(`Weak topics from recent tests: ${weak.join(', ')}`);
  if (inProgress.length) lines.push(`Completed topics to occasionally spiral-review: ${inProgress.join(', ')}`);
  if (chatHints.length) lines.push(`Recent asks to build on:\n${chatHints.join('\n')}`);
  return lines.join('\n');
}

export default async function handler(req, res) {
  try {
    await ensureTables();
    const sql = getSql();
    if (!sql) {
      return send(res, 200, { ok: true, adaptiveBrief: '', weakTopicIds: [], recentScores: [] });
    }

    if (req.method === 'GET') {
      const profileId = String(req.query.profileId || '').trim();
      if (!profileId) return send(res, 400, { ok: false, error: 'Missing profileId' });

      const [progressRows, weakRows, recentScores, chatRows] = await Promise.all([
        sql`select topic_id from profile_progress where profile_id = ${profileId} and completed = true order by updated_at desc limit 10`,
        sql`
          select jt.value::text as topic_id, count(*)::int as misses
          from daily_tests dt,
          jsonb_array_elements_text(dt.weak_topics) jt
          where dt.profile_id = ${profileId}
            and dt.completed_at >= now() - interval '21 days'
          group by jt.value
          order by misses desc
          limit 6
        `,
        sql`
          select test_date, score, total, completed_at
          from daily_tests
          where profile_id = ${profileId}
          order by completed_at desc
          limit 7
        `,
        sql`
          select user_message
          from chat_events
          where profile_id = ${profileId}
          order by created_at desc
          limit 4
        `,
      ]);

      return send(res, 200, {
        ok: true,
        weakTopicIds: weakRows.map((r) => r.topic_id),
        recentScores,
        adaptiveBrief: buildAdaptiveBrief(progressRows, weakRows, chatRows),
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const profileId = String(body.profileId || '').trim();
      const topicId = String(body.topicId || '').trim();
      const userMessage = String(body.userMessage || '').trim();
      const assistantMessage = String(body.assistantMessage || '').trim();

      if (!profileId || !userMessage || !assistantMessage) {
        return send(res, 400, { ok: false, error: 'Missing required fields' });
      }

      await sql`
        insert into chat_events (profile_id, topic_id, user_message, assistant_message)
        values (${profileId}, ${topicId || null}, ${userMessage}, ${assistantMessage})
      `;

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
