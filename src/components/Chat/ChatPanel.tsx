import { useRef, useEffect, useState } from 'react';
import type { ChatPanelProps } from '../../types/index';
import { MessageItem } from './MessageItem';

export function ChatPanel({ messages, isLoading, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput('');
    await onSendMessage(message);
  };

  const suggestedQuestions = [
    'Explain bond pricing and YTM',
    'What is the difference between duration types?',
    'Help me with NPV vs IRR',
    'Explain insider trading rules',
    'What are put-call parity implications?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Welcome to SIE Tutor</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-xs">
              Ask me anything about the SIE exam - equations, regulations, ethics, or tough concepts!
            </p>

            {/* Suggested Questions */}
            <div className="w-full space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-500 font-semibold mb-3">
                Try asking about:
              </p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="w-full text-left text-sm p-3 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question about SIE exam topics..."
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-500 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-600 dark:text-white text-sm"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isLoading ? '...' : '📤'}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Shift+Enter for new line, Enter to send
        </p>
      </div>
    </div>
  );
}
