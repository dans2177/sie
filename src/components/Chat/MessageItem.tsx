import type { ChatMessage } from '../../types/index';

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  const formatMessage = (text: string) => {
    // Convert markdown-like formatting
    return text
      .split('\n')
      .map((line, i) => {
        // Handle bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Handle italic
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Handle code
        line = line.replace(/`(.*?)`/g, '<code>$1</code>');
        return <div key={i} dangerouslySetInnerHTML={{ __html: line }} />;
      });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-bl-none'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {formatMessage(message.content)}
        </div>
        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
