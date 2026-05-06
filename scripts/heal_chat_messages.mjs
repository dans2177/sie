// Heal legacy AI replies stored before tool-use was deployed.
// - topic_chats.messages: jsonb array of { role, content }; sanitize each
//   assistant `content` (string).
// - chat_events.assistant_message: text; sanitize in place.
//
// Idempotent: only writes rows whose content actually changes.
// Pass --dry-run to preview without writing.

import postgres from 'postgres';
import { sanitizeMathDelimiters } from '../api/_sanitizeMath.js';

const dryRun = process.argv.includes('--dry-run');

const databaseUrl =
  process.env.SUPABASE_DB_URL_DIRECT ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('Missing SUPABASE_DB_URL_DIRECT / SUPABASE_DB_URL.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });

function healAssistantContent(content) {
  if (typeof content !== 'string' || !content) return { content, changed: false };
  const cleaned = sanitizeMathDelimiters(content);
  return { content: cleaned, changed: cleaned !== content };
}

let topicChatsScanned = 0;
let topicChatsHealed = 0;
let topicMessagesHealed = 0;
let chatEventsScanned = 0;
let chatEventsHealed = 0;

try {
  console.log(dryRun ? '[dry-run] no writes will happen' : '[apply] writing changes');

  // 1) topic_chats — array of {role, content}
  const chats = await sql`select profile_id, topic_id, messages from topic_chats`;
  for (const row of chats) {
    topicChatsScanned += 1;
    const messages = Array.isArray(row.messages) ? row.messages : null;
    if (!messages) continue;

    let rowChanged = false;
    const next = messages.map((msg) => {
      if (!msg || msg.role !== 'assistant') return msg;
      const { content, changed } = healAssistantContent(msg.content);
      if (changed) {
        rowChanged = true;
        topicMessagesHealed += 1;
        return { ...msg, content };
      }
      return msg;
    });

    if (rowChanged) {
      topicChatsHealed += 1;
      if (!dryRun) {
        await sql`
          update topic_chats
             set messages = ${sql.json(next)}, updated_at = now()
           where profile_id = ${row.profile_id}
             and topic_id = ${row.topic_id}
        `;
      }
    }
  }

  // 2) chat_events.assistant_message — plain text
  // Stream in batches to keep memory bounded.
  const batchSize = 500;
  let lastId = 0;
  while (true) {
    const batch = await sql`
      select id, assistant_message
        from chat_events
       where id > ${lastId}
       order by id asc
       limit ${batchSize}
    `;
    if (batch.length === 0) break;
    for (const row of batch) {
      chatEventsScanned += 1;
      lastId = Number(row.id);
      const { content, changed } = healAssistantContent(row.assistant_message);
      if (!changed) continue;
      chatEventsHealed += 1;
      if (!dryRun) {
        await sql`update chat_events set assistant_message = ${content} where id = ${row.id}`;
      }
    }
  }

  console.log('--- summary ---');
  console.log('topic_chats rows scanned :', topicChatsScanned);
  console.log('topic_chats rows healed  :', topicChatsHealed);
  console.log('  assistant msgs changed :', topicMessagesHealed);
  console.log('chat_events scanned      :', chatEventsScanned);
  console.log('chat_events healed       :', chatEventsHealed);
  if (dryRun) console.log('(dry-run — re-run without --dry-run to apply)');
} catch (err) {
  console.error('heal failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
