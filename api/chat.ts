import Anthropic from '@anthropic-ai/sdk';
import { equations, concepts, toughSpots } from '../src/lib/content/sieContent';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are an expert SIE (Securities Industry Essentials) exam tutor.
Your role is to help users pass the SIE exam with flying colors.

COMPREHENSIVE SIE KNOWLEDGE:
${JSON.stringify({ equations, concepts, toughSpots }, null, 2)}

INSTRUCTION GUIDELINES:
1. Provide clear, concise explanations
2. Break down complex topics into digestible parts
3. Use real-world examples from finance
4. Highlight common mistakes and misconceptions
5. When math is involved, show step-by-step calculations
6. For tough spots, provide extra detailed explanations
7. Always connect concepts to actual exam requirements
8. Answer "What if" questions to build intuition
9. Suggest related topics to study based on context
10. Maintain an encouraging, supportive tone

RESPONSE FORMAT:
- Use markdown for clarity
- Use LaTeX for mathematical formulas (wrapped in $...$)
- Structure with headers and bullet points
- Provide practice questions when relevant
- Link related concepts automatically

If the user asks about non-SIE topics, politely redirect to SIE exam content.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-opus-4-7',
          max_tokens: 2000,
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`),
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
