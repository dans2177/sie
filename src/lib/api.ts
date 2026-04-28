import Anthropic from '@anthropic-ai/sdk';
import type { Domain, Topic, ChatMessage, PdfState } from '../types';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export function buildSystemPrompt(topic: Topic | null, domain: Domain | null, hasPdf: boolean): string {
  return `You are a focused SIE exam tutor. Current topic: "${topic?.title ?? ''}" — ${domain?.label ?? ''}: ${domain?.title ?? ''} (${domain?.weight ?? ''} of exam, ~${domain?.items ?? ''} questions).

Rules:
- Concise, exam-focused. No filler. Keep initial response under 350 words unless asked to go deeper.
- Mark key terms [DEF] and top exam traps [EXAM TIP].
- After your initial explanation, always end with ONE practice exam-style multiple-choice question (4 options, A–D).
- If they answer correctly, confirm and give a harder follow-up. If wrong, explain why and retry.
- Cite FINRA/SEC rule numbers when directly relevant.
- Use mnemonics where genuinely helpful.
${hasPdf ? '- A study book PDF has been provided — reference it when relevant.' : ''}`;
}

interface ContentBlock {
  type: 'document';
  source: {
    type: 'base64';
    media_type: 'application/pdf';
    data: string;
  };
}

interface TextBlock {
  type: 'text';
  text: string;
}

type MessageContent = string | (ContentBlock | TextBlock)[];

interface ApiMessage {
  role: 'user' | 'assistant';
  content: MessageContent;
}

export async function callClaude(
  messages: ChatMessage[],
  topic: Topic | null,
  domain: Domain | null,
  pdf: PdfState,
): Promise<string> {
  const apiMsgs: ApiMessage[] = messages.map((m, i) => {
    if (i === 0 && pdf.b64) {
      return {
        role: m.role,
        content: [
          { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: pdf.b64 } },
          { type: 'text' as const, text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: buildSystemPrompt(topic, domain, !!pdf.b64),
    messages: apiMsgs as any,
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  return '';
}
