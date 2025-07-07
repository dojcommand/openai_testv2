import { useState } from 'react';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Brain, User, Copy, Star, ThumbsUp, ThumbsDown, Edit } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const renderContent = () => {
    const content = message.content;
    
    // Simple markdown-like rendering for code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2];
      parts.push(
        <div key={`code-${match.index}`} className="my-4">
          <div className="code-block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{language}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-gray-400 hover:text-white"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                background: 'transparent',
                padding: 0,
                margin: 0,
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div
      className={cn(
        "message-container flex items-start space-x-3 chat-message",
        isHovered && "group"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={cn(
          "text-white text-sm font-medium",
          isUser ? "bg-blue-600" : "bg-primary"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className={cn(
          "rounded-lg p-4",
          isUser 
            ? "bg-gray-100 dark:bg-gray-800" 
            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        )}>
          <div className="prose dark:prose-invert max-w-none">
            <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {renderContent()}
            </div>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>📎</span>
                  <span>{attachment.filename}</span>
                  <span>({(attachment.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className={cn(
          "message-actions flex items-center space-x-2 mt-2 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>

          {isUser && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}

          {isAssistant && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Star className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Like
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Dislike
              </Button>
            </>
          )}

          <span className="text-gray-400 text-xs">
            {formatRelativeTime(message.timestamp)}
          </span>

          {message.tokens && (
            <span className="text-gray-400 text-xs">
              • {message.tokens} tokens
            </span>
          )}

          {message.cost && (
            <span className="text-gray-400 text-xs">
              • ${message.cost.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
