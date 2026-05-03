import postgres from 'postgres';

const sql = postgres(process.env.SUPABASE_DB_URL_DIRECT, { ssl: 'require', max: 1 });

const rows = await sql`select profile_id, topic_id, messages from topic_chats`;
let healed = 0, skipped = 0;
for (const r of rows) {
  let m = r.messages;
  let changed = false;
  for (let i = 0; i < 3 && typeof m === 'string'; i += 1) {
    try { m = JSON.parse(m); changed = true; } catch { break; }
  }
  if (!Array.isArray(m)) { skipped++; continue; }
  if (changed) {
    await sql`update topic_chats set messages = ${sql.json(m)}, updated_at = now() where profile_id = ${r.profile_id} and topic_id = ${r.topic_id}`;
    healed++;
  }
}
console.log('healed:', healed, 'skipped:', skipped, 'total:', rows.length);
await sql.end({ timeout: 2 });
