import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let topic: string;
  let difficulty: string;
  let count: number;

  try {
    const body = await req.json();
    topic = body.topic;
    difficulty = body.difficulty;
    count = body.count ?? 10;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Failed to parse questions from response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(jsonMatch[0], {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
