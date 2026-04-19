import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '../../types/index';
import { equations, concepts, toughSpots } from '../content/sieContent';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
});

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

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessageToClaudeStream(
  userMessage: string,
  chatHistory: ChatMessage[],
  onChunk: (chunk: string) => void,
): Promise<{ fullResponse: string; tokensUsed: { input: number; output: number } }> {
  const messages: MessageParam[] = chatHistory
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .slice(-10) // Keep last 10 messages to manage context
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  let fullResponse = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        fullResponse += chunk.delta.text;
        onChunk(chunk.delta.text);
      }
      if (chunk.type === 'message_delta' && chunk.usage) {
        outputTokens = chunk.usage.output_tokens;
      }
      if (chunk.type === 'message_start' && chunk.message.usage) {
        inputTokens = chunk.message.usage.input_tokens;
      }
    }
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }

  return {
    fullResponse,
    tokensUsed: { input: inputTokens, output: outputTokens },
  };
}

export async function sendMessage(
  userMessage: string,
  chatHistory: ChatMessage[],
): Promise<{ response: string; tokensUsed: { input: number; output: number } }> {
  const messages: MessageParam[] = chatHistory
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .slice(-10)
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      response: text,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

// Simple token counter (estimates)
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function estimateTotalTokens(chatHistory: ChatMessage[], systemPrompt: string): number {
  let total = estimateTokenCount(systemPrompt);
  chatHistory.forEach((msg) => {
    total += estimateTokenCount(msg.content);
  });
  return total;
}
