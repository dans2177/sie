import { useState } from 'react';
import { CheatsheetPanel } from '../Cheatsheet/CheatsheetPanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { ResourcesPanel } from '../Resources/ResourcesPanel';
import type { ChatMessage } from '../../types/index';

export function MainLayout() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory] = useState<any>('all');

  const handleSendMessage = async (message: string) => {
    // Will be connected to Claude API
    const newMessage: ChatMessage = {
      id: Math.random().toString(36),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    // Simulate API response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: Math.random().toString(36),
        role: 'assistant',
        content: 'This feature will be connected to Claude API. Ask me about SIE exam topics!',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 shadow-lg">
        <h1 className="text-3xl font-bold">SIE Math & Exam Tutor</h1>
        <p className="text-blue-100 text-sm mt-1">Pass the Securities Industry Essentials Exam with Confidence</p>
      </header>

      {/* Main Grid: 3 Columns */}
      <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4 p-4">
        {/* LEFT COLUMN: Cheatsheet */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 border-b">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Equation Cheatsheet</h2>
            <input
              type="text"
              placeholder="Search equations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-3 w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-600 dark:text-white dark:border-slate-500"
            />
          </div>
          <CheatsheetPanel searchQuery={searchQuery} selectedCategory={selectedCategory} />
        </div>

        {/* CENTER COLUMN: Chat Interface */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 border-b">
            <h2 className="font-bold text-lg">AI Tutor Chat</h2>
            <p className="text-blue-100 text-xs mt-1">Ask anything about SIE exam topics</p>
          </div>
          <ChatPanel messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} />
        </div>

        {/* RIGHT COLUMN: Resources & Tough Spots */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="bg-slate-100 dark:bg-slate-700 p-4 border-b">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Study Resources</h2>
          </div>
          <ResourcesPanel userStats={{ topicsStudied: {}, questionsAsked: 0, difficultTopics: [], mastered: [], sessionStartTime: Date.now() }} toughSpots={[]} />
        </div>
      </div>
    </div>
  );
}
