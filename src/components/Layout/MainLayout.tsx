import { useState, useEffect } from 'react';
import { CheatsheetPanel } from '../Cheatsheet/CheatsheetPanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { ResourcesPanel } from '../Resources/ResourcesPanel';
import { QuizMode } from '../Quiz/QuizMode';
import { sendMessageToClaudeStream } from '../../lib/api/claudeClient';
import type { ChatMessage, ExamCategory } from '../../types/index';

export function MainLayout() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | 'all'>('all');
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem('darkMode') === 'true',
  );

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSendMessage = async (message: string) => {
    const userMsgId = Math.random().toString(36);
    const assistantMsgId = Math.random().toString(36);
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage, placeholderAssistant]);
    setIsLoading(true);

    let fullResponse = '';

    try {
      await sendMessageToClaudeStream(
        message,
        [...messages, newUserMessage],
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: fullResponse } : m,
            ),
          );
        },
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: '❌ Error: Could not connect to AI. Check your API key in .env' }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white px-8 py-6 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tight">🎓 SIE Master</h1>
            <p className="text-blue-100 text-sm mt-2 max-w-2xl">
              AI-powered exam preparation with real-time feedback, progress tracking, and expert explanations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setMode(mode === 'study' ? 'quiz' : 'study')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                mode === 'quiz'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {mode === 'quiz' ? '📚 Study' : '🎯 Quiz Mode'}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Mode Switcher */}
      {mode === 'quiz' ? (
        <QuizMode onBackToStudy={() => setMode('study')} />
      ) : (
        /* Main Grid: 3 Columns */
        <div className="flex-1 overflow-hidden grid grid-cols-3 gap-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          {/* LEFT COLUMN: Cheatsheet */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 p-4 border-b border-emerald-200 dark:border-emerald-700">
              <h2 className="font-bold text-lg text-emerald-900 dark:text-emerald-100">
                📐 Equation Cheatsheet
              </h2>
              <input
                type="text"
                placeholder="Search equations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-emerald-300 dark:border-emerald-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <CheatsheetPanel
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* CENTER COLUMN: Chat Interface */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-4 border-b border-blue-500 dark:border-blue-600">
              <h2 className="font-bold text-lg">🤖 AI Tutor Chat</h2>
              <p className="text-blue-100 text-xs mt-1">Ask anything about SIE topics</p>
            </div>
            <ChatPanel messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} />
          </div>

          {/* RIGHT COLUMN: Resources & Tough Spots */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 border-b border-purple-200 dark:border-purple-700">
              <h2 className="font-bold text-lg text-purple-900 dark:text-purple-100">
                📊 Progress & Resources
              </h2>
            </div>
            <ResourcesPanel
              userStats={{
                topicsStudied: {},
                questionsAsked: messages.filter((m) => m.role === 'user').length,
                difficultTopics: [],
                mastered: [],
                sessionStartTime: Date.now(),
              }}
              toughSpots={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
