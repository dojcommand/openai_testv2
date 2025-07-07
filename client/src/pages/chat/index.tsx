import { useState, useEffect } from 'react';
import { useChats, useChatMutations } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import { Button } from '@/components/ui/button';
import { Brain, Code, Search, FileText } from 'lucide-react';
import { Message, Chat } from '@/types';
import { generateChatTitle } from '@/lib/utils';

export default function ChatPage() {
  const { user } = useAuth();
  const { data: chats, isLoading } = useChats();
  const { createChat, updateChat, sendMessage, isSendingMessage } = useChatMutations();
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (chats && chats.length > 0 && !currentChat) {
      setCurrentChat(chats[0]);
      setMessages(chats[0].messages);
    }
  }, [chats, currentChat]);

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // If no current chat, create a new one
      if (!currentChat) {
        const newChat: Partial<Chat> = {
          title: generateChatTitle(content),
          messages: [userMessage],
          tags: [],
          isFavorite: false,
          isArchived: false,
          settings: {
            model: user?.settings.defaultModel || 'gpt-4o',
            temperature: 0.7,
            maxTokens: 2000,
          },
        };

        createChat(newChat as any, {
          onSuccess: (chat) => {
            setCurrentChat(chat);
            // Now send the message to AI
            sendMessageToAI(newMessages, chat);
          },
        });
      } else {
        // Update existing chat with new message
        const updatedChat = {
          ...currentChat,
          messages: newMessages,
        };
        
        updateChat(updatedChat);
        sendMessageToAI(newMessages, currentChat);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  const sendMessageToAI = async (messagesArray: Message[], chat: Chat) => {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        sendMessage(
          { 
            messages: messagesArray, 
            options: chat.settings 
          },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        tokens: response.tokens,
        cost: response.cost,
      };

      const finalMessages = [...messagesArray, aiMessage];
      setMessages(finalMessages);

      // Update chat with AI response
      const updatedChat = {
        ...chat,
        messages: finalMessages,
      };
      
      updateChat(updatedChat);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages([...messagesArray, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts = {
      code: "I need help with coding. Can you assist me with writing, debugging, or explaining code?",
      research: "I need help with research. Can you help me find information and analyze topics?",
      document: "I'd like to analyze a document. Can you help me understand and summarize content?",
    };
    
    handleSendMessage(prompts[action as keyof typeof prompts] || prompts.code);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to OpenMind AI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              I'm here to help you with research, coding, document analysis, and more!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => handleQuickAction('code')}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                Help with coding
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleQuickAction('research')}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Research assistance
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleQuickAction('document')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Analyze documents
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-gray-500 text-sm">OpenMind AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isSendingMessage}
          currentChat={currentChat}
        />
      </div>
    </div>
  );
}
