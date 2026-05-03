import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: 'Missing ANTHROPIC_API_KEY' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { topic, difficulty, count = 10 } = body;

  if (!topic || !difficulty) {
    res.status(400).json({ ok: false, error: 'Missing topic or difficulty' });
    return;
  }

  const prompt = `Generate ${count} multiple-choice SIE exam questions about "${topic}" at ${difficulty} difficulty level.

Format as JSON array with this structure:
[
  {
    "id": "unique-id",
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct and why others are wrong",
    "topic": "${topic}",
    "difficulty": "${difficulty}"
  }
]

Make questions realistic for the SIE exam. Include math calculations when relevant.
Return only the JSON array, no surrounding text.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      res.status(500).json({ ok: false, error: 'Failed to parse questions from response' });
      return;
    }

    const questions = JSON.parse(jsonMatch[0]);
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
