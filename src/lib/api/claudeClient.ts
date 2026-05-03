import type { ChatMessage } from '../../types/index';

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessageToClaudeStream(
  userMessage: string,
  chatHistory: ChatMessage[],
  onChunk: (chunk: string) => void,
): Promise<{ fullResponse: string }> {
  const messages: MessageParam[] = chatHistory
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .slice(-10)
    .map((msg) => ({ role: msg.role, content: msg.content }));

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return { fullResponse };
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (typeof parsed.text === 'string') {
          fullResponse += parsed.text;
          onChunk(parsed.text);
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }

  return { fullResponse };
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateTotalTokens(chatHistory: ChatMessage[], systemPrompt: string): number {
  let total = estimateTokenCount(systemPrompt);
  chatHistory.forEach((msg) => {
    total += estimateTokenCount(msg.content);
  });
  return total;
}
